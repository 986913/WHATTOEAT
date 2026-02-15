import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsInt,
  Min,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class WeeklyPreviewDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

// export class WeeklyCommitDTO {
//   plans: {
//     date: string;
//     typeId: number;
//     mealId: number;
//     userId?: number;
//   }[];
// }
export class WeeklyCommitDTO {
  @IsArray()
  @ArrayNotEmpty({ message: 'plans must be a non-empty array' })
  @ValidateNested({ each: true })
  @Type(() => WeeklyPlanItemDTO)
  plans: WeeklyPlanItemDTO[];
}

export class WeeklyPlanItemDTO {
  @IsDateString({}, { message: 'date must be a valid ISO date string' })
  date: string;

  @Type(() => Number)
  @IsInt({ message: 'typeId must be an integer' })
  @Min(1)
  typeId: number;

  @Type(() => Number)
  @IsInt({ message: 'mealId must be an integer' })
  @Min(1)
  mealId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'userId must be an integer' })
  @Min(1)
  userId?: number;
}
