import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateProcessingBatchDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  totalRecords?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  processedRecords?: number;

  @IsOptional()
  @IsIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])
  status?: string;

  @IsInt()
  @IsPositive()
  uploadedFileId!: number;
}