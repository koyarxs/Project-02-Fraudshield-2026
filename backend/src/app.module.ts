import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { UploadedFileModule } from './uploaded-file/uploaded-file.module';
import { ProcessingBatchModule } from './processing-batch/processing-batch.module';
import { TransactionModule } from './transaction/transaction.module';
import { RiskLevelModule } from './risk-level/risk-level.module';
import { RiskRuleModule } from './risk-rule/risk-rule.module';
import { RiskResultModule } from './risk-result/risk-result.module';
import { DashboardMetricModule } from './dashboard-metric/dashboard-metric.module';
import { RiskCaseModule } from './risk-case/risk-case.module';
import { ControlListModule } from './control-list/control-list.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { FileProcessingService } from './file-processing/file-processing.service';
import { FileProcessingController } from './file-processing/file-processing.controller';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    UploadedFileModule,
    ProcessingBatchModule,
    TransactionModule,
    RiskLevelModule,
    RiskRuleModule,
    RiskResultModule,
    DashboardMetricModule,
    RiskCaseModule,
    ControlListModule,
    AuditLogModule,
  ],
  controllers: [
    AppController,
    FileProcessingController,
  ],
  providers: [
    AppService,
    FileProcessingService,
  ],
})
export class AppModule {}
