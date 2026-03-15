export type DraftPlan = {
  date: string;
  typeId: number;
  mealId: number;
  mealName?: string;
  mealVideoUrl?: string;
  mealImageUrl?: string;
  mealIngredients?: { id: number; name: string }[];
  isOwnMeal?: boolean;
};
