import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

interface MockUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const prisma = {
    user: {
      findUnique: jest.fn<() => Promise<MockUser | null>>(),
    },
  };

  const configService = {
    getOrThrow: jest.fn().mockReturnValue('jwt-secret-exclusivo-para-pruebas'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('acepta el payload cuando la cuenta existe y el correo coincide', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 4,
      name: 'Usuario de prueba',
      email: 'usuario.fixture@fraudshield.local',
      role: UserRole.ADMINISTRADOR,
      active: true,
    });

    await expect(
      strategy.validate({
        sub: 4,
        email: 'usuario.fixture@fraudshield.local',
        role: UserRole.ADMINISTRADOR,
      }),
    ).resolves.toEqual({
      userId: 4,
      name: 'Usuario de prueba',
      email: 'usuario.fixture@fraudshield.local',
      role: UserRole.ADMINISTRADOR,
      active: true,
    });
  });

  it('rechaza el payload cuando la cuenta ya no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 999999,
        email: 'inexistente@fraudshield.local',
        role: UserRole.ANALISTA,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza el payload cuando el correo no coincide con la cuenta', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 4,
      name: 'Usuario de prueba',
      email: 'usuario.fixture@fraudshield.local',
      role: UserRole.ADMINISTRADOR,
      active: true,
    });

    await expect(
      strategy.validate({
        sub: 4,
        email: 'correo-alterado@fraudshield.local',
        role: UserRole.ADMINISTRADOR,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
