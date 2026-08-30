import { PartialType } from '@nestjs/mapped-types';
import { CreateDashboardMetricDto } from './create-dashboard-metric.dto';

export class UpdateDashboardMetricDto extends PartialType(
  CreateDashboardMetricDto,
) {}
