import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRiskCaseDto } from './dto/create-risk-case.dto';
import { UpdateRiskCaseDto } from './dto/update-risk-case.dto';
import { RiskCaseService } from './risk-case.service';

@UseGuards(JwtAuthGuard)
@Controller('risk-case')
export class RiskCaseController {
  constructor(private readonly riskCaseService: RiskCaseService) {}

  @Post()
  create(@Body() createRiskCaseDto: CreateRiskCaseDto, @Req() req) {
    return this.riskCaseService.create(createRiskCaseDto, req.user);
  }

  @Get()
  findAll() {
    return this.riskCaseService.findAll();
  }

  @Get('summary')
  getSummary() {
    return this.riskCaseService.getSummary();
  }

  @Get('transaction/:transactionId')
  findByTransaction(@Param('transactionId') transactionId: string) {
    return this.riskCaseService.findByTransaction(+transactionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riskCaseService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRiskCaseDto: UpdateRiskCaseDto,
    @Req() req,
  ) {
    return this.riskCaseService.update(+id, updateRiskCaseDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riskCaseService.remove(+id);
  }
}
