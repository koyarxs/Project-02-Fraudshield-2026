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
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateRiskCaseDto } from './dto/create-risk-case.dto';
import { UpdateRiskCaseDto } from './dto/update-risk-case.dto';
import { RiskCaseService } from './risk-case.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('risk-case')
export class RiskCaseController {
  constructor(private readonly riskCaseService: RiskCaseService) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  create(
    @Body() createRiskCaseDto: CreateRiskCaseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.riskCaseService.create(createRiskCaseDto, req.user);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.riskCaseService.findAll(req.user);
  }

  @Get('summary')
  getSummary(@Req() req: AuthenticatedRequest) {
    return this.riskCaseService.getSummary(req.user);
  }

  @Get('transaction/:transactionId')
  findByTransaction(
    @Param('transactionId') transactionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.riskCaseService.findByTransaction(+transactionId, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.riskCaseService.findOne(+id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRiskCaseDto: UpdateRiskCaseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.riskCaseService.update(+id, updateRiskCaseDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  remove(@Param('id') id: string) {
    return this.riskCaseService.remove(+id);
  }
}
