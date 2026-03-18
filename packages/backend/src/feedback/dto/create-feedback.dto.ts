import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFeedbackDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}
