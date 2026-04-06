import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';
import { PlanService } from 'src/plan/plan.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { ConfigEnum } from 'src/enum/config.enum';

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

    try {
      // 1. Fetch meal pool — reuses PlanService's Redis cache-aside (no extra DB hit if cached)
      const typeIds = [1, 2, 3];
      const typeNames: Record<number, string> = {
        1: 'Breakfast',
        2: 'Lunch',
        3: 'Dinner',
      };

      const mealPoolLines: string[] = [];
      const fullMealsByType = new Map<
        number,
        import('src/meal/entities/meal.entity').MealEntity[]
      >();

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
      const stream = this.anthropic.messages.stream({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      let buffer = '';
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          buffer += event.delta.text;

          // Each complete line is one day's JSONL object
          const lines = buffer.split('\n');
          buffer = lines.pop()!; // keep the incomplete trailing chunk in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const day = JSON.parse(trimmed) as {
                date: string;
                meals: {
                  typeId: number;
                  mealId: number | null;
                  reason: string;
                  suggestion?: { name: string; ingredients: string[] };
                }[];
              };

              // Enrich library meals with full data
              const enrichedMeals = day.meals.map((m) => {
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
                        found.ingredients?.map((i) => ({
                          id: i.id,
                          name: i.name,
                        })) ?? [],
                      isOwnMeal: !!found.creator,
                    };
                  }
                }
                return m; // null mealId = AI suggestion, no enrichment needed
              });

              await this.redisPubSub.publish(
                channel,
                JSON.stringify({
                  type: 'day',
                  data: { ...day, meals: enrichedMeals },
                }),
              );
            } catch {
              // Skip malformed lines (e.g. Claude adds an unexpected comment)
            }
          }
        }
      }

      // Flush any remaining content in buffer (last line may not end with \n)
      if (buffer.trim()) {
        try {
          const day = JSON.parse(buffer.trim()) as {
            date: string;
            meals: {
              typeId: number;
              mealId: number | null;
              reason: string;
              suggestion?: { name: string; ingredients: string[] };
            }[];
          };

          // Enrich library meals with full data
          const enrichedMeals = day.meals.map((m) => {
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
                    found.ingredients?.map((i) => ({
                      id: i.id,
                      name: i.name,
                    })) ?? [],
                  isOwnMeal: !!found.creator,
                };
              }
            }
            return m; // null mealId = AI suggestion, no enrichment needed
          });

          await this.redisPubSub.publish(
            channel,
            JSON.stringify({
              type: 'day',
              data: { ...day, meals: enrichedMeals },
            }),
          );
        } catch {
          // skip
        }
      }

      await this.redisPubSub.publish(channel, JSON.stringify({ type: 'done' }));
      await this.redisPubSub.setTaskStatus(taskId, 'done');
    } catch (err) {
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
