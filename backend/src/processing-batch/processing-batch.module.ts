import { Module } from '@nestjs/common';
import { ProcessingBatchService } from './processing-batch.service';
import { ProcessingBatchController } from './processing-batch.controller';

@Module({
  controllers: [ProcessingBatchController],
  providers: [ProcessingBatchService],
})
export class ProcessingBatchModule {}
