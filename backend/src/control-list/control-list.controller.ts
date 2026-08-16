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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ControlListService } from './control-list.service';
import { CreateControlListEntryDto } from './dto/create-control-list-entry.dto';
import { UpdateControlListEntryDto } from './dto/update-control-list-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('control-list')
export class ControlListController {
  constructor(private readonly controlListService: ControlListService) {}

  @Post()
  create(@Body() dto: CreateControlListEntryDto, @Req() req) {
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
  update(
    @Param('id') id: string,
    @Body() dto: UpdateControlListEntryDto,
    @Req() req,
  ) {
    return this.controlListService.update(+id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.controlListService.remove(+id, req.user);
  }
}
