import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const createContext = (role: UserRole) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    }) as unknown as ExecutionContext;
  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite al administrador acceder a funciones administrativas', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMINISTRADOR]);

    expect(guard.canActivate(createContext(UserRole.ADMINISTRADOR))).toBe(true);
  });

  it('rechaza al analista en funciones administrativas', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMINISTRADOR]);

    expect(() => guard.canActivate(createContext(UserRole.ANALISTA))).toThrow(
      ForbiddenException,
    );
  });

  it('permite endpoints operacionales sin restricción adicional de rol', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext(UserRole.ANALISTA))).toBe(true);
  });
});
