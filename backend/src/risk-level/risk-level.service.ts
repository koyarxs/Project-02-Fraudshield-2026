import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskLevelDto } from './dto/create-risk-level.dto';
import { UpdateRiskLevelDto } from './dto/update-risk-level.dto';

@Injectable()
export class RiskLevelService {
  constructor(private readonly prisma: PrismaService) {}

  create(createRiskLevelDto: CreateRiskLevelDto) {
    return this.prisma.riskLevel.create({
      data: createRiskLevelDto,
    });
  }

  findAll() {
    return this.prisma.riskLevel.findMany({
      include: {
        riskRules: true,
        riskResults: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.riskLevel.findUnique({
      where: { id },
      include: {
        riskRules: true,
        riskResults: true,
      },
    });
  }

  update(id: number, updateRiskLevelDto: UpdateRiskLevelDto) {
    return this.prisma.riskLevel.update({
      where: { id },
      data: updateRiskLevelDto,
    });
  }

  remove(id: number) {
    return this.prisma.riskLevel.delete({
      where: { id },
    });
  }
}