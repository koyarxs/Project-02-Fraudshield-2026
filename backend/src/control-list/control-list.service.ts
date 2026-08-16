import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateControlListEntryDto } from './dto/create-control-list-entry.dto';
import { UpdateControlListEntryDto } from './dto/update-control-list-entry.dto';

interface AuthenticatedUser {
  userId: number;
  email: string;
  name?: string;
}

@Injectable()
export class ControlListService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createControlListEntryDto: CreateControlListEntryDto,
    authUser?: AuthenticatedUser,
  ) {
    const entry = await this.prisma.controlListEntry.upsert({
      where: {
        listType_identifierType_identifier: {
          listType: createControlListEntryDto.listType,
          identifierType: createControlListEntryDto.identifierType,
          identifier: createControlListEntryDto.identifier.trim(),
        },
      },
      update: {
        reason: createControlListEntryDto.reason,
        active: createControlListEntryDto.active ?? true,
      },
      create: {
        listType: createControlListEntryDto.listType,
        identifierType: createControlListEntryDto.identifierType,
        identifier: createControlListEntryDto.identifier.trim(),
        reason: createControlListEntryDto.reason,
        active: createControlListEntryDto.active ?? true,
        createdById: authUser?.userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await this.createAuditLog(
      'UPSERT_CONTROL_LIST_ENTRY',
      `${entry.listType} ${entry.identifierType}:${entry.identifier}`,
      authUser?.userId,
    );

    return entry;
  }

  findAll() {
    return this.prisma.controlListEntry.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  findOne(id: number) {
    return this.prisma.controlListEntry.findUnique({
      where: {
        id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(
    id: number,
    updateControlListEntryDto: UpdateControlListEntryDto,
    authUser?: AuthenticatedUser,
  ) {
    const entry = await this.prisma.controlListEntry.update({
      where: {
        id,
      },
      data: {
        ...(updateControlListEntryDto.listType !== undefined && {
          listType: updateControlListEntryDto.listType,
        }),
        ...(updateControlListEntryDto.identifierType !== undefined && {
          identifierType: updateControlListEntryDto.identifierType,
        }),
        ...(updateControlListEntryDto.identifier !== undefined && {
          identifier: updateControlListEntryDto.identifier.trim(),
        }),
        ...(updateControlListEntryDto.reason !== undefined && {
          reason: updateControlListEntryDto.reason,
        }),
        ...(updateControlListEntryDto.active !== undefined && {
          active: updateControlListEntryDto.active,
        }),
      },
    });

    await this.createAuditLog(
      'UPDATE_CONTROL_LIST_ENTRY',
      `${entry.listType} ${entry.identifierType}:${entry.identifier}`,
      authUser?.userId,
    );

    return entry;
  }

  async remove(id: number, authUser?: AuthenticatedUser) {
    const entry = await this.prisma.controlListEntry.delete({
      where: {
        id,
      },
    });

    await this.createAuditLog(
      'DELETE_CONTROL_LIST_ENTRY',
      `${entry.listType} ${entry.identifierType}:${entry.identifier}`,
      authUser?.userId,
    );

    return entry;
  }

  private createAuditLog(action: string, detail: string, userId?: number) {
    return this.prisma.auditLog.create({
      data: {
        action,
        module: 'CONTROL_LIST',
        detail,
        userId,
      },
    });
  }
}
