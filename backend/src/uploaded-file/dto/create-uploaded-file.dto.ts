import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateUploadedFileDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  fileType!: string;

  @IsInt()
  @IsPositive()
  fileSize!: number;

  @IsOptional()
  @IsIn(['PENDING', 'PROCESSING', 'UPLOADED', 'PROCESSED', 'FAILED'])
  status?: string;

  @IsInt()
  @IsPositive()
  userId!: number;
}