import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDashboardMetricDto } from './dto/create-dashboard-metric.dto';
import { UpdateDashboardMetricDto } from './dto/update-dashboard-metric.dto';

@Injectable()
export class DashboardMetricService {
  constructor(private readonly prisma: PrismaService) {}

  create(createDashboardMetricDto: CreateDashboardMetricDto) {
    return this.prisma.dashboardMetric.create({
      data: {
        totalRecords: createDashboardMetricDto.totalRecords,
        lowRiskCount: createDashboardMetricDto.lowRiskCount,
        mediumRiskCount: createDashboardMetricDto.mediumRiskCount,
        highRiskCount: createDashboardMetricDto.highRiskCount,
        generatedAt: createDashboardMetricDto.generatedAt
          ? new Date(createDashboardMetricDto.generatedAt)
          : new Date(),
        batchId: createDashboardMetricDto.batchId,
      },
    });
  }

  findAll() {
    return this.prisma.dashboardMetric.findMany({
      include: {
        batch: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.dashboardMetric.findUnique({
      where: { id },
      include: {
        batch: true,
      },
    });
  }

  update(
    id: number,
    updateDashboardMetricDto: UpdateDashboardMetricDto,
  ) {
    return this.prisma.dashboardMetric.update({
      where: { id },
      data: {
        ...(updateDashboardMetricDto.totalRecords !== undefined && {
          totalRecords: updateDashboardMetricDto.totalRecords,
        }),

        ...(updateDashboardMetricDto.lowRiskCount !== undefined && {
          lowRiskCount: updateDashboardMetricDto.lowRiskCount,
        }),

        ...(updateDashboardMetricDto.mediumRiskCount !== undefined && {
          mediumRiskCount: updateDashboardMetricDto.mediumRiskCount,
        }),

        ...(updateDashboardMetricDto.highRiskCount !== undefined && {
          highRiskCount: updateDashboardMetricDto.highRiskCount,
        }),

        ...(updateDashboardMetricDto.generatedAt !== undefined && {
          generatedAt: new Date(updateDashboardMetricDto.generatedAt),
        }),

        ...(updateDashboardMetricDto.batchId !== undefined && {
          batchId: updateDashboardMetricDto.batchId,
        }),
      },
    });
  }

  remove(id: number) {
    return this.prisma.dashboardMetric.delete({
      where: { id },
    });
  }
}