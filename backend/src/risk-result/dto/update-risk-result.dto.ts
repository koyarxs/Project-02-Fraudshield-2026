import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskResultDto } from './create-risk-result.dto';

export class UpdateRiskResultDto extends PartialType(CreateRiskResultDto) {}
