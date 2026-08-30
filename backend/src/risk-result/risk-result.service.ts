import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskResultDto } from './dto/create-risk-result.dto';
import { UpdateRiskResultDto } from './dto/update-risk-result.dto';

@Injectable()
export class RiskResultService {
  constructor(private readonly prisma: PrismaService) {}

  create(createRiskResultDto: CreateRiskResultDto) {
    return this.prisma.riskResult.create({
      data: createRiskResultDto,
    });
  }

  findAll() {
    return this.prisma.riskResult.findMany({
      include: {
        transaction: true,
        riskLevel: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.riskResult.findUnique({
      where: { id },
      include: {
        transaction: true,
        riskLevel: true,
      },
    });
  }

  update(id: number, updateRiskResultDto: UpdateRiskResultDto) {
    return this.prisma.riskResult.update({
      where: { id },
      data: updateRiskResultDto,
    });
  }

  remove(id: number) {
    return this.prisma.riskResult.delete({
      where: { id },
    });
  }
}
