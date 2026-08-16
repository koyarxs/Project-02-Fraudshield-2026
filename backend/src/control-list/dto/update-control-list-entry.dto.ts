import { PartialType } from '@nestjs/mapped-types';
import { CreateControlListEntryDto } from './create-control-list-entry.dto';

export class UpdateControlListEntryDto extends PartialType(
  CreateControlListEntryDto,
) {}
