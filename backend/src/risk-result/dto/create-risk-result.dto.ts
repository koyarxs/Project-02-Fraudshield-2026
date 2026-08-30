import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRiskResultDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;

  @IsString()
  @IsNotEmpty()
  observation!: string;

  @IsDateString()
  classifiedAt!: string;

  @IsInt()
  @IsPositive()
  transactionId!: number;

  @IsInt()
  @IsPositive()
  riskLevelId!: number;
}
