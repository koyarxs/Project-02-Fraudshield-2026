import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { RiskCaseService } from './risk-case.service';

describe('RiskCaseService authorization', () => {
  const administrator: AuthenticatedUser = {
    userId: 4,
    name: 'Administrador FraudShield',
    email: 'admin@fraudshield.cl',
    role: UserRole.ADMINISTRADOR,
    active: true,
  };
  const analyst: AuthenticatedUser = {
    userId: 1,
    name: 'Analista de prueba',
    email: 'analista.fixture@fraudshield.local',
    role: UserRole.ANALISTA,
    active: true,
  };
  const administratorRecord = {
    id: administrator.userId,
    name: administrator.name,
    email: administrator.email,
    role: administrator.role,
    active: true,
  };
  const analystRecord = {
    id: analyst.userId,
    name: analyst.name,
    email: analyst.email,
    role: analyst.role,
    active: true,
  };
  const prisma = {
    riskCase: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    riskCaseTimeline: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  const notificationService = {
    notifyAssignment: jest.fn(),
    notifyAdministrators: jest.fn(),
    notifyAnalystParticipants: jest.fn(),
  };
  let service: RiskCaseService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskCaseService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(RiskCaseService);
  });

  it('limita el listado del analista a sus casos asignados', async () => {
    prisma.riskCase.findMany.mockResolvedValue([]);

    await service.findAll(analyst);

    expect(prisma.riskCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { responsibleUserId: analyst.userId } }),
    );
  });

  it('impide al analista modificar un caso ajeno', async () => {
    prisma.riskCase.findUnique.mockResolvedValue({
      id: 20,
      responsibleUserId: 4,
    });

    await expect(
      service.update(20, { observations: 'Intento no autorizado' }, analyst),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.riskCase.update).not.toHaveBeenCalled();
  });

  it('permite al Administrador asignar un caso pendiente al Analista', async () => {
    const currentCase = {
      id: 19,
      status: 'PENDIENTE',
      priority: 'NORMAL',
      reviewResult: null,
      observations: null,
      actionTaken: null,
      internalComments: null,
      responsibleUserId: null,
      responsibleName: 'Sin asignar',
    };
    const assignedCase = {
      ...currentCase,
      priority: 'ALTA',
      responsibleUserId: analyst.userId,
      responsibleName: analyst.name,
    };
    prisma.riskCase.findUnique
      .mockResolvedValueOnce(currentCase)
      .mockResolvedValueOnce(assignedCase);
    prisma.user.findUnique.mockImplementation(
      ({ where }: { where: { id: number } }) =>
        Promise.resolve(
          where.id === administrator.userId
            ? administratorRecord
            : analystRecord,
        ),
    );
    prisma.riskCase.update.mockResolvedValue(assignedCase);
    prisma.riskCaseTimeline.create.mockResolvedValue({ id: 70 });
    prisma.auditLog.create.mockResolvedValue({ id: 71 });
    notificationService.notifyAssignment.mockResolvedValue({ count: 1 });

    const result = await service.update(
      19,
      { priority: 'ALTA', responsibleUserId: analyst.userId },
      administrator,
    );

    expect(result).toEqual(assignedCase);
    expect(notificationService.notifyAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        riskCaseId: 19,
        recipientUserId: analyst.userId,
      }),
    );
  });

  it('permite al Analista iniciar la revisión de su caso asignado', async () => {
    const currentCase = {
      id: 20,
      status: 'PENDIENTE',
      priority: 'ALTA',
      reviewResult: null,
      observations: null,
      actionTaken: null,
      internalComments: null,
      responsibleUserId: analyst.userId,
      responsibleName: analyst.name,
    };
    const inReviewCase = { ...currentCase, status: 'EN_REVISION' };
    prisma.riskCase.findUnique
      .mockResolvedValueOnce(currentCase)
      .mockResolvedValueOnce(inReviewCase);
    prisma.user.findUnique.mockResolvedValue(analystRecord);
    prisma.riskCase.update.mockResolvedValue(inReviewCase);
    prisma.riskCaseTimeline.create.mockResolvedValue({ id: 75 });
    prisma.auditLog.create.mockResolvedValue({ id: 76 });
    notificationService.notifyAdministrators.mockResolvedValue({ count: 1 });

    const result = await service.update(20, { status: 'EN_REVISION' }, analyst);

    expect(result).toEqual(inReviewCase);
    expect(notificationService.notifyAdministrators).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REVIEW_STARTED',
        riskCaseId: 20,
      }),
    );
  });

  it('permite al Analista resolver su propio caso con la revisión completa', async () => {
    const currentCase = {
      id: 21,
      status: 'EN_REVISION',
      priority: 'ALTA',
      reviewResult: 'REQUIERE_ANTECEDENTES',
      observations: null,
      actionTaken: null,
      internalComments: null,
      responsibleUserId: analyst.userId,
      responsibleName: 'Analista de prueba',
    };
    const resolvedCase = {
      ...currentCase,
      status: 'RESUELTO',
      reviewResult: 'SOSPECHA_DESCARTADA',
      observations: 'Antecedentes revisados',
      actionTaken: 'Identidad del cliente validada',
    };
    prisma.riskCase.findUnique
      .mockResolvedValueOnce(currentCase)
      .mockResolvedValueOnce(resolvedCase);
    prisma.user.findUnique.mockResolvedValue({
      id: analyst.userId,
      name: analyst.name,
      email: analyst.email,
      active: true,
      role: UserRole.ANALISTA,
    });
    prisma.riskCase.update.mockResolvedValue(resolvedCase);
    prisma.riskCaseTimeline.create.mockResolvedValue({ id: 80 });
    prisma.auditLog.create.mockResolvedValue({ id: 90 });
    notificationService.notifyAdministrators.mockResolvedValue({ count: 1 });

    const result = await service.update(
      21,
      {
        status: 'RESUELTO',
        reviewResult: 'SOSPECHA_DESCARTADA',
        observations: 'Antecedentes revisados',
        actionTaken: 'Identidad del cliente validada',
      },
      analyst,
    );

    expect(result).toEqual(resolvedCase);
    expect(notificationService.notifyAdministrators).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CASE_RESOLVED',
        riskCaseId: 21,
      }),
    );
  });

  it('impide al Analista reasignar su propio caso', async () => {
    prisma.riskCase.findUnique.mockResolvedValue({
      id: 22,
      status: 'EN_REVISION',
      responsibleUserId: analyst.userId,
    });

    await expect(
      service.update(22, { responsibleUserId: 4 }, analyst),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.riskCase.update).not.toHaveBeenCalled();
  });
});
