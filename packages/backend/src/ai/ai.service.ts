import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import { MealEntity } from 'src/meal/entities/meal.entity';
import { PlanService } from 'src/plan/plan.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { ConfigEnum } from 'src/enum/config.enum';
import { fetchFoodImage } from 'src/utils/unsplash';

@Injectable()
export class AiService {
  private anthropic: Anthropic;

  constructor(
    private configService: ConfigService,
    private planService: PlanService,
    private redisPubSub: RedisPubSubService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>(ConfigEnum.ANTHROPIC_API_KEY),
    });
  }

  /**
   * Extract and parse a JSON object from a line that may contain surrounding text.
   * Finds the first '{' and last '}' to handle preamble text, inline comments, etc.
   * Returns null if no valid JSON object is found.
   */
  private extractDayJson(line: string): {
    date: string;
    meals: {
      typeId: number;
      mealId: number | null;
      reason: string;
      suggestion?: { name: string; ingredients: string[] };
    }[];
  } | null {
    const start = line.indexOf('{');
    const end = line.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      const candidate = line.slice(start, end + 1);
      const parsed = JSON.parse(candidate) as {
        date: string;
        meals: {
          typeId: number;
          mealId: number | null;
          reason: string;
          suggestion?: { name: string; ingredients: string[] };
        }[];
      };
      if (!parsed.date || !Array.isArray(parsed.meals)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async enrichDay(
    day: {
      date: string;
      meals: {
        typeId: number;
        mealId: number | null;
        reason: string;
        suggestion?: { name: string; ingredients: string[] };
      }[];
    },
    fullMealsByType: Map<number, MealEntity[]>,
  ): Promise<typeof day & { meals: unknown[] }> {
    const unsplashKey =
      this.configService.get<string>(ConfigEnum.UNSPLASH_ACCESS_KEY) ?? '';

    const enrichedMeals = await Promise.all(
      day.meals.map(async (m) => {
        if (m.mealId !== null) {
          const poolMeals = fullMealsByType.get(m.typeId) ?? [];
          const found = poolMeals.find((p) => p.id === m.mealId);
          if (found) {
            return {
              ...m,
              mealName: found.name,
              mealImageUrl: found.imageUrl ?? null,
              mealVideoUrl: found.videoUrl ?? null,
              mealIngredients:
                found.ingredients?.map((i) => ({ id: i.id, name: i.name })) ??
                [],
              isOwnMeal: !!found.creator,
            };
          }
          console.warn(
            `[AiService] mealId ${m.mealId} not found in pool for typeId ${m.typeId}`,
          );
        }
        // AI suggestion — fetch a food image from Unsplash
        const suggestionName = m.suggestion?.name ?? '';
        const imageUrl = suggestionName
          ? await fetchFoodImage(suggestionName, unsplashKey)
          : '';
        return { ...m, mealImageUrl: imageUrl || null };
      }),
    );
    return { ...day, meals: enrichedMeals };
  }

  async startGeneration(
    userId: number,
    preference: string,
    startDate?: string,
  ): Promise<string> {
    const taskId = uuidv4();

    const acquired = await this.redisPubSub.acquireUserLock(userId, taskId);
    if (!acquired) {
      throw new BadRequestException(
        'A generation is already in progress for this user',
      );
    }

    await this.redisPubSub.setTaskStatus(taskId, 'running');

    // Fire and forget — SSE client subscribes separately via GET /ai/stream
    void this.runGeneration(taskId, userId, preference, startDate).finally(
      () => {
        void this.redisPubSub.releaseUserLock(userId);
      },
    );

    return taskId;
  }

  private async runGeneration(
    taskId: string,
    userId: number,
    preference: string,
    startDate?: string,
  ): Promise<void> {
    const channel = `ai:task:${taskId}`;
    console.log(
      `[AiService] runGeneration start — taskId=${taskId} channel=${channel}`,
    );

    try {
      // 1. Fetch meal pool — reuses PlanService's Redis cache-aside (no extra DB hit if cached)
      const typeIds = [1, 2, 3];
      const typeNames: Record<number, string> = {
        1: 'Breakfast',
        2: 'Lunch',
        3: 'Dinner',
      };

      const mealPoolLines: string[] = [];
      const fullMealsByType = new Map<number, MealEntity[]>();

      for (const typeId of typeIds) {
        const meals = await this.planService.getMealsByTypeForUser(
          typeId,
          userId,
        );
        fullMealsByType.set(typeId, meals);
        const list = meals.map((m) => `${m.name} (id:${m.id})`).join(', ');
        mealPoolLines.push(`${typeNames[typeId]}: ${list}`);
      }

      // 2. Build 7 dates starting from startDate (or today)
      if (startDate && !dayjs(startDate).isValid()) {
        throw new BadRequestException('Invalid startDate format');
      }
      const start = startDate ? dayjs(startDate) : dayjs();
      const dates = Array.from({ length: 7 }, (_, i) =>
        start.add(i, 'day').format('YYYY-MM-DD'),
      );

      // 3. Build system prompt
      const systemPrompt = `You are a meal planning assistant. Create a 7-day meal plan based on the available meals and user preference.

AVAILABLE MEALS:
${mealPoolLines.join('\n')}

RULES:
- Prefer meals from the available list (reference by their ID)
- You may suggest NEW meals if nothing in the list fits the preference (set mealId to null, provide a suggestion object)
- Avoid repeating the same meal within 3 consecutive days
- Output each day as a separate JSON object on its own line (JSONL format — no array wrapper, no markdown, no extra text)
- Respond in the same language the user used in their preference input

OUTPUT FORMAT (strictly one JSON object per line):
{"date":"YYYY-MM-DD","meals":[{"typeId":1,"mealId":5,"reason":"..."},{"typeId":2,"mealId":15,"reason":"..."},{"typeId":3,"mealId":null,"suggestion":{"name":"...","ingredients":["..."]},"reason":"..."}]}`;

      const userPrompt = `Plan for dates: ${dates.join(', ')}\n\nUSER PREFERENCE: ${preference}`;

      // 4. Stream Claude response
      // Prefilling forces Claude to start with '{', suppressing any preamble text
      const stream = this.anthropic.messages.stream({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: '{' },
        ],
      });

      // Bracket-depth parsing: accumulate chars, emit a complete object when depth hits 0.
      // Works regardless of whether Claude outputs compact or pretty-printed JSON.
      // Prefilling injected '{' so we start buffer with it and depth=1.
      let buffer = '{';
      let depth = 1;

      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          const chunk = event.delta.text;
          // Stream raw text to frontend for "thinking" display
          await this.redisPubSub.publish(
            channel,
            JSON.stringify({ type: 'chunk', text: chunk }),
          );

          for (const ch of chunk) {
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            buffer += ch;

            if (depth === 0) {
              // Complete top-level object assembled
              const day = this.extractDayJson(buffer);
              if (day) {
                const enriched = await this.enrichDay(day, fullMealsByType);
                await this.redisPubSub.publish(
                  channel,
                  JSON.stringify({ type: 'day', data: enriched }),
                );
              }
              buffer = '';
              depth = 0;
            }
          }
        }
      }

      console.log(`[AiService] runGeneration done — taskId=${taskId}`);
      await this.redisPubSub.publish(channel, JSON.stringify({ type: 'done' }));
      await this.redisPubSub.setTaskStatus(taskId, 'done');
    } catch (err) {
      console.error(`[AiService] runGeneration error — taskId=${taskId}`, err);
      await this.redisPubSub.publish(
        channel,
        JSON.stringify({
          type: 'error',
          message: (err as Error).message,
        }),
      );
      await this.redisPubSub.setTaskStatus(taskId, 'error');
    }
  }
}
