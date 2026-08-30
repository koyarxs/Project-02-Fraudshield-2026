/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';
import { UserRole } from '@prisma/client';

describe('UserService', () => {
  let service: UserService;
  const prisma = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.auditLog.create.mockResolvedValue({ id: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('crea usuarios almacenando la contraseña con hash', async () => {
    prisma.user.create.mockResolvedValue({
      id: 11,
      name: 'Usuario de prueba',
      email: 'nuevo.fixture@fraudshield.local',
      role: UserRole.ANALISTA,
      active: true,
    });

    await service.create({
      name: 'Usuario de prueba',
      email: 'nuevo.fixture@fraudshield.local',
      password: 'fixture-password',
      role: UserRole.ANALISTA,
    });

    const call = prisma.user.create.mock.calls[0][0];
    expect(call.data.password).not.toBe('fixture-password');
    await expect(
      bcrypt.compare('fixture-password', call.data.password),
    ).resolves.toBe(true);
    expect(call.select).not.toHaveProperty('password');
  });

  it('lista usuarios sin seleccionar el campo password', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: expect.not.objectContaining({ password: expect.anything() }),
    });
  });

  it('actualiza una contraseña utilizando un nuevo hash', async () => {
    prisma.user.update.mockResolvedValue({
      id: 11,
      name: 'Usuario de prueba',
      email: 'nuevo.fixture@fraudshield.local',
      role: UserRole.ANALISTA,
      active: true,
    });

    await service.update(11, { password: 'updated-fixture-password' });

    const call = prisma.user.update.mock.calls[0][0];
    expect(call.data.password).not.toBe('updated-fixture-password');
    await expect(
      bcrypt.compare('updated-fixture-password', call.data.password),
    ).resolves.toBe(true);
    expect(call.select).not.toHaveProperty('password');
  });

  it('desactiva un usuario sin eliminarlo', async () => {
    prisma.user.update.mockResolvedValue({
      id: 11,
      name: 'Usuario de prueba',
      email: 'nuevo.fixture@fraudshield.local',
      role: UserRole.ANALISTA,
      active: false,
    });

    await service.remove(11);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: { active: false },
      }),
    );
  });
});
