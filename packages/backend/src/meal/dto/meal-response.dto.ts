import { MealType } from 'src/type/entities/type.entity';

export class MealResponseDTO {
  id: number;
  name: string;
  videoUrl?: string;
  imageUrl?: string;

  types: { id: number; name: MealType }[];
  ingredients: { id: number; name: string }[];
}
