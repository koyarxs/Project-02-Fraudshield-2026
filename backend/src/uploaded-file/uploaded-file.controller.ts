import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UploadedFileService } from './uploaded-file.service';
import { CreateUploadedFileDto } from './dto/create-uploaded-file.dto';
import { UpdateUploadedFileDto } from './dto/update-uploaded-file.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('uploaded-file')
export class UploadedFileController {
  constructor(private readonly uploadedFileService: UploadedFileService) {}

  @Post()
  @Roles(UserRole.ADMINISTRADOR)
  create(@Body() createUploadedFileDto: CreateUploadedFileDto) {
    return this.uploadedFileService.create(createUploadedFileDto);
  }

  @Get()
  findAll() {
    return this.uploadedFileService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.uploadedFileService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() updateUploadedFileDto: UpdateUploadedFileDto,
  ) {
    return this.uploadedFileService.update(+id, updateUploadedFileDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  remove(@Param('id') id: string) {
    return this.uploadedFileService.remove(+id);
  }
}
