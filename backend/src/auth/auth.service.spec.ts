/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('test-access-token');
    prisma.auditLog.create.mockResolvedValue({ id: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('inicia sesión y devuelve un JWT para credenciales válidas', async () => {
    const passwordHash = await bcrypt.hash('fixture-password', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 4,
      name: 'Usuario de prueba',
      email: 'usuario.fixture@fraudshield.local',
      password: passwordHash,
      role: UserRole.ADMINISTRADOR,
      active: true,
    });

    const result = await service.login(
      'usuario.fixture@fraudshield.local',
      'fixture-password',
    );

    expect(result).toEqual({
      access_token: 'test-access-token',
      user: {
        id: 4,
        name: 'Usuario de prueba',
        email: 'usuario.fixture@fraudshield.local',
        role: UserRole.ADMINISTRADOR,
        active: true,
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 4,
      email: 'usuario.fixture@fraudshield.local',
      role: UserRole.ADMINISTRADOR,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOGIN_SUCCESS',
        module: 'AUTH',
        userId: 4,
      }),
    });
  });

  it('inicia sesión como analista activo y conserva su rol en el JWT', async () => {
    const passwordHash = await bcrypt.hash('fixture-password', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Analista de prueba',
      email: 'analista.fixture@fraudshield.local',
      password: passwordHash,
      role: UserRole.ANALISTA,
      active: true,
    });

    const result = await service.login(
      'analista.fixture@fraudshield.local',
      'fixture-password',
    );

    expect(result.user).toEqual(
      expect.objectContaining({
        id: 1,
        role: UserRole.ANALISTA,
        active: true,
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'analista.fixture@fraudshield.local',
      role: UserRole.ANALISTA,
    });
  });

  it('rechaza una contraseña incorrecta y registra el intento', async () => {
    const passwordHash = await bcrypt.hash('fixture-password', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 4,
      name: 'Usuario de prueba',
      email: 'usuario.fixture@fraudshield.local',
      password: passwordHash,
      role: UserRole.ADMINISTRADOR,
      active: true,
    });

    await expect(
      service.login('usuario.fixture@fraudshield.local', 'incorrect-password'),
    ).rejects.toThrow(UnauthorizedException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOGIN_FAILED',
        module: 'AUTH',
        userId: 4,
      }),
    });
  });

  it('rechaza un usuario inexistente sin emitir JWT', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('inexistente@fraudshield.local', 'fixture-password'),
    ).rejects.toThrow(UnauthorizedException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOGIN_FAILED',
        module: 'AUTH',
      }),
    });
  });

  it('rechaza una cuenta inactiva sin comparar la contraseña', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      name: 'Cuenta inactiva',
      email: 'inactivo.fixture@fraudshield.local',
      password: 'hash-no-utilizado',
      role: UserRole.ANALISTA,
      active: false,
    });

    await expect(
      service.login('inactivo.fixture@fraudshield.local', 'fixture-password'),
    ).rejects.toThrow(UnauthorizedException);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'LOGIN_FAILED',
        userId: 12,
      }),
    });
  });
});
