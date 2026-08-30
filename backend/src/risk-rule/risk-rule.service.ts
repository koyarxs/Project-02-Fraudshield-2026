import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskRuleDto } from './dto/create-risk-rule.dto';
import { UpdateRiskRuleDto } from './dto/update-risk-rule.dto';

@Injectable()
export class RiskRuleService {
  constructor(private readonly prisma: PrismaService) {}

  create(createRiskRuleDto: CreateRiskRuleDto) {
    return this.prisma.riskRule.create({
      data: createRiskRuleDto,
    });
  }

  findAll() {
    return this.prisma.riskRule.findMany({
      include: {
        riskLevel: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.riskRule.findUnique({
      where: { id },
      include: {
        riskLevel: true,
      },
    });
  }

  update(id: number, updateRiskRuleDto: UpdateRiskRuleDto) {
    return this.prisma.riskRule.update({
      where: { id },
      data: updateRiskRuleDto,
    });
  }

  remove(id: number) {
    return this.prisma.riskRule.delete({
      where: { id },
    });
  }
}
