import { PartialType } from '@nestjs/mapped-types';
import { CreateRiskCaseDto } from './create-risk-case.dto';

export class UpdateRiskCaseDto extends PartialType(CreateRiskCaseDto) {}
