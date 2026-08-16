import { Module } from '@nestjs/common';
import { RiskLevelService } from './risk-level.service';
import { RiskLevelController } from './risk-level.controller';

@Module({
  controllers: [RiskLevelController],
  providers: [RiskLevelService],
})
export class RiskLevelModule {}
