import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateControlListEntryDto {
  @IsIn(['WATCHLIST', 'ALLOWLIST'])
  listType!: string;

  @IsIn(['CUSTOMER', 'TRANSACTION', 'LOCATION'])
  identifierType!: string;

  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
