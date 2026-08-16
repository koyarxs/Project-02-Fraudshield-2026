import { Module } from '@nestjs/common';
import { RiskRuleService } from './risk-rule.service';
import { RiskRuleController } from './risk-rule.controller';

@Module({
  controllers: [RiskRuleController],
  providers: [RiskRuleService],
})
export class RiskRuleModule {}
