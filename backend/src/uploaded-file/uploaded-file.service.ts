import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUploadedFileDto } from './dto/create-uploaded-file.dto';
import { UpdateUploadedFileDto } from './dto/update-uploaded-file.dto';

@Injectable()
export class UploadedFileService {
  constructor(private prisma: PrismaService) {}

  create(createUploadedFileDto: CreateUploadedFileDto) {
    return this.prisma.uploadedFile.create({
      data: createUploadedFileDto,
    });
  }

  findAll() {
    return this.prisma.uploadedFile.findMany({
      include: {
        user: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.uploadedFile.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  update(id: number, updateUploadedFileDto: UpdateUploadedFileDto) {
    return this.prisma.uploadedFile.update({
      where: { id },
      data: updateUploadedFileDto,
    });
  }

  remove(id: number) {
    return this.prisma.uploadedFile.delete({
      where: { id },
    });
  }
}