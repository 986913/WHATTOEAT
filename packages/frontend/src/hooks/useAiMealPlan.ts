// packages/frontend/src/hooks/useAiMealPlan.ts
import { useState, useRef } from 'react';
import axiosInstance from '../utils/axios';
import { API_BASE_URL } from '../config/api';

export type AiMeal = {
  typeId: number;
  mealId: number | null;
  reason: string;
  mealName?: string;
  mealImageUrl?: string | null;
  mealVideoUrl?: string | null;
  mealIngredients?: { id: number; name: string }[];
  isOwnMeal?: boolean;
  suggestion?: { name: string; ingredients: string[] };
};

export type AiDay = {
  date: string;
  meals: AiMeal[];
};

type Callbacks = {
  onDay: (day: AiDay) => void;
  onDone: () => void;
  onError: (msg: string) => void;
};

export function useAiMealPlan(callbacks: Callbacks) {
  const [isConnecting, setIsConnecting] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const startGeneration = async (preference: string, startDate: string) => {
    // Close any existing connection
    esRef.current?.close();

    setIsConnecting(true);
    try {
      const res = await axiosInstance.post<{ taskId: string }>('/ai/generate', {
        preference,
        startDate,
      });
      const { taskId } = res.data;

      const url = `${API_BASE_URL}/api/v1/ai/stream?taskId=${taskId}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (e: MessageEvent) => {
        const data = JSON.parse(e.data as string) as {
          type: string;
          data?: AiDay;
          message?: string;
        };

        if (data.type === 'day' && data.data) {
          callbacks.onDay(data.data);
        } else if (data.type === 'done') {
          es.close();
          callbacks.onDone();
        } else if (data.type === 'error') {
          es.close();
          callbacks.onError(data.message ?? 'Generation failed');
        }
        // heartbeat: ignore
      };

      es.onerror = () => {
        es.close();
        callbacks.onError('Connection lost. Please try again.');
      };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      callbacks.onError(
        axiosErr?.response?.data?.message ?? 'Failed to start generation',
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const cancel = () => {
    esRef.current?.close();
    esRef.current = null;
  };

  return { startGeneration, isConnecting, cancel };
}
