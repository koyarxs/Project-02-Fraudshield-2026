import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DashboardMetricService } from './dashboard-metric.service';
import { CreateDashboardMetricDto } from './dto/create-dashboard-metric.dto';
import { UpdateDashboardMetricDto } from './dto/update-dashboard-metric.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard-metric')
export class DashboardMetricController {
  constructor(
    private readonly dashboardMetricService: DashboardMetricService,
  ) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
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
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() updateDashboardMetricDto: UpdateDashboardMetricDto,
  ) {
    return this.dashboardMetricService.update(+id, updateDashboardMetricDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  remove(@Param('id') id: string) {
    return this.dashboardMetricService.remove(+id);
  }
}
