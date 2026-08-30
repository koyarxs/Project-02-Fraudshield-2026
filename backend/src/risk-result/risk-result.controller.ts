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
import { RiskResultService } from './risk-result.service';
import { CreateRiskResultDto } from './dto/create-risk-result.dto';
import { UpdateRiskResultDto } from './dto/update-risk-result.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('risk-result')
export class RiskResultController {
  constructor(private readonly riskResultService: RiskResultService) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  create(@Body() createRiskResultDto: CreateRiskResultDto) {
    return this.riskResultService.create(createRiskResultDto);
  }

  @Get()
  findAll() {
    return this.riskResultService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riskResultService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() updateRiskResultDto: UpdateRiskResultDto,
  ) {
    return this.riskResultService.update(+id, updateRiskResultDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  remove(@Param('id') id: string) {
    return this.riskResultService.remove(+id);
  }
}
