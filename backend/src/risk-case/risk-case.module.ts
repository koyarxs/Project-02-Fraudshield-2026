import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RiskCaseController } from './risk-case.controller';
import { RiskCaseService } from './risk-case.service';

@Module({
  imports: [PrismaModule],
  controllers: [RiskCaseController],
  providers: [RiskCaseService],
})
export class RiskCaseModule {}
