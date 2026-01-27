import { IsInt, IsOptional } from 'class-validator';

export class WeeklyPreviewDTO {
  @IsOptional()
  @IsInt()
  userId?: number;
}

export class WeeklyCommitDTO {
  plans: {
    date: string;
    typeId: number;
    mealId: number;
    userId?: number;
  }[];
}
