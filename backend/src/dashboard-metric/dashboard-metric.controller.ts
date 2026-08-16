import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DashboardMetricService } from './dashboard-metric.service';
import { CreateDashboardMetricDto } from './dto/create-dashboard-metric.dto';
import { UpdateDashboardMetricDto } from './dto/update-dashboard-metric.dto';

@UseGuards(JwtAuthGuard)

@Controller('dashboard-metric')
export class DashboardMetricController {
  constructor(private readonly dashboardMetricService: DashboardMetricService) {}

  @Post()
  create(@Body() createDashboardMetricDto: CreateDashboardMetricDto) {
    return this.dashboardMetricService.create(createDashboardMetricDto);
  }

  @Get()
  findAll() {
    return this.dashboardMetricService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dashboardMetricService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDashboardMetricDto: UpdateDashboardMetricDto) {
    return this.dashboardMetricService.update(+id, updateDashboardMetricDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dashboardMetricService.remove(+id);
  }
}
