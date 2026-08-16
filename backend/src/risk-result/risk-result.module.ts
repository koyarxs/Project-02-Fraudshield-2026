import { Module } from '@nestjs/common';
import { RiskResultService } from './risk-result.service';
import { RiskResultController } from './risk-result.controller';

@Module({
  controllers: [RiskResultController],
  providers: [RiskResultService],
})
export class RiskResultModule {}
