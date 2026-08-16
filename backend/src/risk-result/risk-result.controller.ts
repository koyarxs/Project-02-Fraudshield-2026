import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RiskResultService } from './risk-result.service';
import { CreateRiskResultDto } from './dto/create-risk-result.dto';
import { UpdateRiskResultDto } from './dto/update-risk-result.dto';

@UseGuards(JwtAuthGuard)

@Controller('risk-result')
export class RiskResultController {
  constructor(private readonly riskResultService: RiskResultService) {}

  @Post()
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
  update(@Param('id') id: string, @Body() updateRiskResultDto: UpdateRiskResultDto) {
    return this.riskResultService.update(+id, updateRiskResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riskResultService.remove(+id);
  }
}
