import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskLevelDto } from './create-risk-level.dto';

export class UpdateRiskLevelDto extends PartialType(CreateRiskLevelDto) {}
