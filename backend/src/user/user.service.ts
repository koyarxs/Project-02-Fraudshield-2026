import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/authenticated-request.interface';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, actor?: AuthenticatedUser) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        role: createUserDto.role,
        active: createUserDto.active ?? true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.createAuditLog(
      'CREATE_USER',
      `Usuario #${user.id} creado con rol ${user.role}.`,
      actor?.userId,
    );

    return user;
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findAssignable() {
    return this.prisma.user.findMany({
      where: {
        active: true,
        role: { in: ['ADMINISTRADOR', 'ANALISTA'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    actor?: AuthenticatedUser,
  ) {
    const data: {
      name?: string;
      email?: string;
      password?: string;
      role?: CreateUserDto['role'];
      active?: boolean;
    } = {};

    if (updateUserDto.name !== undefined) {
      data.name = updateUserDto.name;
    }

    if (updateUserDto.email !== undefined) {
      data.email = updateUserDto.email;
    }

    if (updateUserDto.password !== undefined) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role !== undefined) {
      data.role = updateUserDto.role;
    }

    if (updateUserDto.active !== undefined) {
      data.active = updateUserDto.active;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.createAuditLog(
      'UPDATE_USER',
      `Usuario #${user.id} actualizado. Rol: ${user.role}. Estado: ${user.active ? 'activo' : 'inactivo'}.`,
      actor?.userId,
    );

    return user;
  }

  async remove(id: number, actor?: AuthenticatedUser) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.createAuditLog(
      'DEACTIVATE_USER',
      `Usuario #${user.id} desactivado.`,
      actor?.userId,
    );

    return user;
  }

  private createAuditLog(action: string, detail: string, userId?: number) {
    return this.prisma.auditLog.create({
      data: {
        action,
        module: 'AUTH',
        detail,
        userId,
      },
    });
  }
}
