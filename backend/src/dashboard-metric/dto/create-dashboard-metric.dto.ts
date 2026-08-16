import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateDashboardMetricDto {
  @IsInt()
  @Min(0)
  totalRecords!: number;

  @IsInt()
  @Min(0)
  lowRiskCount!: number;

  @IsInt()
  @Min(0)
  mediumRiskCount!: number;

  @IsInt()
  @Min(0)
  highRiskCount!: number;

  @IsOptional()
  @IsDateString()
  generatedAt?: string;

  @IsInt()
  @IsPositive()
  batchId!: number;
}