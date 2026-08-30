import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ControlListService } from './control-list.service';
import { CreateControlListEntryDto } from './dto/create-control-list-entry.dto';
import { UpdateControlListEntryDto } from './dto/update-control-list-entry.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('control-list')
export class ControlListController {
  constructor(private readonly controlListService: ControlListService) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  create(
    @Body() dto: CreateControlListEntryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.controlListService.create(dto, req.user);
  }

  @Get()
  findAll() {
    return this.controlListService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.controlListService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateControlListEntryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.controlListService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.controlListService.remove(+id, req.user);
  }
}
