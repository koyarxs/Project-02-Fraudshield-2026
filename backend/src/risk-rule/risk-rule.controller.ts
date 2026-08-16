import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RiskRuleService } from './risk-rule.service';
import { CreateRiskRuleDto } from './dto/create-risk-rule.dto';
import { UpdateRiskRuleDto } from './dto/update-risk-rule.dto';

@UseGuards(JwtAuthGuard)

@Controller('risk-rule')
export class RiskRuleController {
  constructor(private readonly riskRuleService: RiskRuleService) {}

  @Post()
  create(@Body() createRiskRuleDto: CreateRiskRuleDto) {
    return this.riskRuleService.create(createRiskRuleDto);
  }

  @Get()
  findAll() {
    return this.riskRuleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riskRuleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRiskRuleDto: UpdateRiskRuleDto) {
    return this.riskRuleService.update(+id, updateRiskRuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riskRuleService.remove(+id);
  }
}
