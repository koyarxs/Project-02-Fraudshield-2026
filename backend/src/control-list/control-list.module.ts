import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ControlListController } from './control-list.controller';
import { ControlListService } from './control-list.service';

@Module({
  imports: [PrismaModule],
  controllers: [ControlListController],
  providers: [ControlListService],
})
export class ControlListModule {}
