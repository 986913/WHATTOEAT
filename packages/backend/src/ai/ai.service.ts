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
import { buildSystemPrompt, buildUserPrompt } from './ai.prompts';

const MEAL_TYPE_IDS = [1, 2, 3];
const MEAL_TYPE_NAMES: Record<number, string> = {
  1: 'Breakfast',
  2: 'Lunch',
  3: 'Dinner',
};

type RawDay = {
  date: string;
  meals: {
    typeId: number;
    mealId: number | null;
    reason: string;
    suggestion?: { name: string; ingredients: string[] };
  }[];
};

@Injectable()
export class AiService {
  private anthropic: Anthropic;
  private readonly unsplashKey: string;

  constructor(
    private configService: ConfigService,
    private planService: PlanService,
    private redisPubSub: RedisPubSubService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>(ConfigEnum.ANTHROPIC_API_KEY),
    });
    this.unsplashKey =
      this.configService.get<string>(ConfigEnum.UNSPLASH_ACCESS_KEY) ?? '';
  }

  /**
   * Extract and parse a JSON object from a line that may contain surrounding text.
   * Finds the first '{' and last '}' to handle preamble text, inline comments, etc.
   * Returns null if no valid JSON object is found.
   */
  private extractDayJson(line: string): RawDay | null {
    const start = line.indexOf('{');
    const end = line.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try {
      const candidate = line.slice(start, end + 1);
      const parsed = JSON.parse(candidate) as RawDay;
      if (!parsed.date || !Array.isArray(parsed.meals)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private async enrichDay(
    day: RawDay,
    fullMealsByType: Map<number, MealEntity[]>,
  ): Promise<typeof day & { meals: unknown[] }> {
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
          ? await fetchFoodImage(suggestionName, this.unsplashKey)
          : '';
        return { ...m, mealImageUrl: imageUrl || null };
      }),
    );
    return { ...day, meals: enrichedMeals };
  }

  private async buildMealPool(userId: number): Promise<{
    mealPoolLines: string[];
    fullMealsByType: Map<number, MealEntity[]>;
  }> {
    const mealPoolLines: string[] = [];
    const fullMealsByType = new Map<number, MealEntity[]>();

    for (const typeId of MEAL_TYPE_IDS) {
      const meals = await this.planService.getMealsByTypeForUser(
        typeId,
        userId,
      );
      fullMealsByType.set(typeId, meals);
      const list = meals.map((m) => `${m.name} (id:${m.id})`).join(', ');
      mealPoolLines.push(`${MEAL_TYPE_NAMES[typeId]}: ${list}`);
    }

    return { mealPoolLines, fullMealsByType };
  }

  private parseJsonObjects(
    chunk: string,
    buffer: string,
    depth: number,
  ): { buffer: string; depth: number; completedObjects: string[] } {
    const completedObjects: string[] = [];

    for (const ch of chunk) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      buffer += ch;

      if (depth === 0) {
        completedObjects.push(buffer);
        buffer = '';
      }
    }

    return { buffer, depth, completedObjects };
  }

  /**
   * Regenerate a single AI-suggested meal for a specific type, date, and preference.
   * Uses a focused non-streaming Claude call so the response is immediate.
   */
  async regenerateMeal(
    userId: number,
    typeId: number,
    date: string,
    preference: string,
  ) {
    const typeName = MEAL_TYPE_NAMES[typeId] ?? 'Meal';
    const meals = await this.planService.getMealsByTypeForUser(typeId, userId);
    const poolList =
      meals.map((m) => `${m.name} (id:${m.id})`).join(', ') || '(none)';

    const systemPrompt = `You are a meal planning assistant. Suggest ONE ${typeName} meal.

AVAILABLE MEALS: ${poolList}

RULES:
- If an available meal fits the preference well, pick it and return its id
- If nothing fits, suggest a NEW meal (mealId: null) with a short ingredients list
- Respond in the same language as the preference
- Output ONLY a single JSON object — no markdown, no extra text

OUTPUT FORMAT:
{"mealId": 5, "name": "...", "reason": "..."}
or for a new meal:
{"mealId": null, "name": "...", "ingredients": ["..."], "reason": "..."}`;

    const userPrompt = `Date: ${date}\nMeal type: ${typeName}\nUser preference: ${preference}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: '{' },
      ],
    });

    const rawText =
      '{' +
      (response.content[0].type === 'text' ? response.content[0].text : '');
    const parsed = this.extractSingleMealJson(rawText);
    if (!parsed) {
      throw new BadRequestException('AI failed to generate a meal suggestion');
    }

    // Return a library meal if Claude picked one
    if (parsed.mealId !== null) {
      const found = meals.find((m) => m.id === parsed.mealId);
      if (found) {
        return {
          typeId,
          mealId: found.id,
          mealName: found.name,
          mealImageUrl: found.imageUrl ?? null,
          mealVideoUrl: found.videoUrl ?? null,
          mealIngredients:
            found.ingredients?.map((i) => ({ id: i.id, name: i.name })) ?? [],
          isOwnMeal: !!found.creator,
          isAiSuggestion: false,
          reason: parsed.reason,
        };
      }
    }

    // New AI suggestion — fetch Unsplash image
    const imageUrl = parsed.name
      ? await fetchFoodImage(parsed.name, this.unsplashKey)
      : '';
    return {
      typeId,
      mealId: null,
      mealName: parsed.name,
      mealImageUrl: imageUrl || null,
      mealVideoUrl: null,
      mealIngredients: [],
      isOwnMeal: false,
      isAiSuggestion: true,
      reason: parsed.reason,
      suggestion: { name: parsed.name, ingredients: parsed.ingredients ?? [] },
    };
  }

  private extractSingleMealJson(text: string): {
    mealId: number | null;
    name: string;
    reason: string;
    ingredients?: string[];
  } | null {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end <= start) return null;
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        mealId: number | null;
        name: string;
        reason: string;
        ingredients?: string[];
      };
      if (!parsed.name) return null;
      return parsed;
    } catch {
      return null;
    }
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
      // 1. Fetch meal pool
      const { mealPoolLines, fullMealsByType } =
        await this.buildMealPool(userId);

      // 2. Build 7 dates starting from startDate (or today)
      if (startDate && !dayjs(startDate).isValid()) {
        throw new BadRequestException('Invalid startDate format');
      }
      const start = startDate ? dayjs(startDate) : dayjs();
      const dates = Array.from({ length: 7 }, (_, i) =>
        start.add(i, 'day').format('YYYY-MM-DD'),
      );

      // 3. Build prompts
      const systemPrompt = buildSystemPrompt(mealPoolLines);
      const userPrompt = buildUserPrompt(dates, preference);

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

          const result = this.parseJsonObjects(chunk, buffer, depth);
          buffer = result.buffer;
          depth = result.depth;

          for (const obj of result.completedObjects) {
            const day = this.extractDayJson(obj);
            if (day) {
              const enriched = await this.enrichDay(day, fullMealsByType);
              await this.redisPubSub.publish(
                channel,
                JSON.stringify({ type: 'day', data: enriched }),
              );
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
