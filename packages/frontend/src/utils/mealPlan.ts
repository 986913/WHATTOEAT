import { type MealCardPlan } from '../components/MealCard';
import dayjs from 'dayjs';

export const TYPE_NAME_TO_ID: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
};

export function getMealType(typeId: number): { label: string; icon: string } {
  if (typeId === 1) return { label: 'Breakfast', icon: '🍳' };
  if (typeId === 2) return { label: 'Lunch', icon: '🥗' };
  if (typeId === 3) return { label: 'Dinner', icon: '🍝' };
  return { label: 'Unknown', icon: '❓' };
}

export function formatDayHeader(dateStr: string): {
  weekday: string;
  date: string;
} {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

export function groupPlansByDate(
  plans: MealCardPlan[],
): Record<string, MealCardPlan[]> {
  const grouped: Record<string, MealCardPlan[]> = {};
  plans.forEach((p) => {
    if (!grouped[p.date]) grouped[p.date] = [];
    grouped[p.date].push(p);
  });
  return grouped;
}

export function buildSkeletonPlans(startDate: string): MealCardPlan[] {
  return Array.from({ length: 7 }, (_, i) =>
    dayjs(startDate).add(i, 'day').format('YYYY-MM-DD'),
  ).flatMap((date) =>
    [1, 2, 3].map((typeId) => ({
      date,
      typeId,
      mealId: null,
      isSkeleton: true,
    })),
  );
}
