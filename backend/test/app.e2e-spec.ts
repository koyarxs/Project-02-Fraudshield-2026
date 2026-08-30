/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('FraudShield authentication and authorization (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = app.get(JwtService);
    prisma = app.get(PrismaService);
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('rechaza el login cuando faltan los campos obligatorios', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({})
      .expect(400);

    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'El correo electrónico es obligatorio',
        'La contraseña es obligatoria',
      ]),
    );
  });

  it('rechaza un endpoint protegido sin token', () => {
    return request(app.getHttpServer()).get('/user').expect(401);
  });

  it('rechaza un token inválido', () => {
    return request(app.getHttpServer())
      .get('/user')
      .set('Authorization', 'Bearer invalid-test-token')
      .expect(401);
  });

  it('rechaza un token vencido', async () => {
    const expiredToken = await jwtService.signAsync(
      { sub: 999999, email: 'fixture@fraudshield.local' },
      { expiresIn: -1 },
    );

    return request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('permite al administrador consultar usuarios y auditoría', async () => {
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@fraudshield.cl' },
      select: { id: true, email: true, role: true, active: true },
    });

    expect(existingUser).not.toBeNull();
    const validToken = await jwtService.signAsync({
      sub: existingUser!.id,
      email: existingUser!.email,
      role: existingUser!.role,
    });

    const response = await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    response.body.forEach((user: Record<string, unknown>) => {
      expect(user).not.toHaveProperty('password');
    });

    await request(app.getHttpServer())
      .get('/audit-log')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    const casesResponse = await request(app.getHttpServer())
      .get('/risk-case')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(casesResponse.body).toHaveLength(await prisma.riskCase.count());
  });

  it('permite al analista consultar funciones operacionales', async () => {
    const analyst = await prisma.user.findUnique({
      where: { email: 'yerko@fraudshield.cl' },
      select: { id: true, email: true, role: true, active: true },
    });

    expect(analyst).toMatchObject({
      role: UserRole.ANALISTA,
      active: true,
    });
    const token = await jwtService.signAsync({
      sub: analyst!.id,
      email: analyst!.email,
      role: analyst!.role,
    });

    for (const path of [
      '/transaction',
      '/processing-batch',
      '/control-list',
      '/risk-case',
      '/notification',
      '/user/assignable',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    }

    const casesResponse = await request(app.getHttpServer())
      .get('/risk-case')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    casesResponse.body.forEach(
      (riskCase: { responsibleUserId: number | null }) => {
        expect(riskCase.responsibleUserId).toBe(analyst!.id);
      },
    );
  });

  it('rechaza con 403 la administración de usuarios y auditoría para analista', async () => {
    const analyst = await prisma.user.findUniqueOrThrow({
      where: { email: 'yerko@fraudshield.cl' },
      select: { id: true, email: true, role: true },
    });
    const token = await jwtService.signAsync({
      sub: analyst.id,
      email: analyst.email,
      role: analyst.role,
    });

    await request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/audit-log')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('impide al analista consultar, modificar o reasignar un caso ajeno', async () => {
    const analyst = await prisma.user.findUniqueOrThrow({
      where: { email: 'yerko@fraudshield.cl' },
      select: { id: true, email: true, role: true },
    });
    const foreignCase = await prisma.riskCase.findFirst({
      where: { responsibleUserId: { not: analyst.id } },
      select: { id: true },
    });

    expect(foreignCase).not.toBeNull();
    const token = await jwtService.signAsync({
      sub: analyst.id,
      email: analyst.email,
      role: analyst.role,
    });

    await request(app.getHttpServer())
      .get(`/risk-case/${foreignCase!.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/risk-case/${foreignCase!.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ responsibleUserId: analyst.id })
      .expect(403);
  });

  it('rechaza un JWT firmado para una cuenta inexistente', async () => {
    const orphanToken = await jwtService.signAsync({
      sub: 999999,
      email: 'inexistente@fraudshield.local',
    });

    return request(app.getHttpServer())
      .get('/user')
      .set('Authorization', `Bearer ${orphanToken}`)
      .expect(401);
  });

  afterAll(async () => {
    await app.close();
  });
});
