import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await this.createAuditLog(
        'LOGIN_FAILED',
        `Intento de acceso con email no registrado: ${email}.`,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.active) {
      await this.createAuditLog(
        'LOGIN_FAILED',
        `Intento de acceso con cuenta inactiva: ${email}.`,
        user.id,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      await this.createAuditLog(
        'LOGIN_FAILED',
        `Credenciales incorrectas para ${email}.`,
        user.id,
      );
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    await this.createAuditLog(
      'LOGIN_SUCCESS',
      `Inicio de sesión correcto para ${user.email}.`,
      user.id,
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    };
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
