import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskRuleDto } from './create-risk-rule.dto';

export class UpdateRiskRuleDto extends PartialType(
  CreateRiskRuleDto,
) {}