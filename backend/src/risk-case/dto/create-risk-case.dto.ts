import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const RISK_CASE_STATUSES = [
  'PENDIENTE',
  'EN_REVISION',
  'RESUELTO',
] as const;

export const RISK_CASE_REVIEW_RESULTS = [
  'REQUIERE_ANTECEDENTES',
  'SOSPECHA_DESCARTADA',
  'OPERACION_SOSPECHOSA',
] as const;

export const RISK_CASE_PRIORITIES = ['NORMAL', 'ALTA', 'URGENTE'] as const;

export class CreateRiskCaseDto {
  @IsInt()
  transactionId!: number;

  @IsOptional()
  @IsIn(RISK_CASE_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(RISK_CASE_PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsIn(RISK_CASE_REVIEW_RESULTS)
  reviewResult?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  actionTaken?: string;

  @IsOptional()
  @IsString()
  internalComments?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  responsibleName?: string;

  @IsOptional()
  @IsInt()
  responsibleUserId?: number;
}
