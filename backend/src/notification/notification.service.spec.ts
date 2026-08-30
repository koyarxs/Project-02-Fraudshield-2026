import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const prisma = {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    riskCaseTimeline: {
      findMany: jest.fn(),
    },
  };
  let service: NotificationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(NotificationService);
  });

  it('lista únicamente las notificaciones del usuario autenticado', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValue(2);

    await expect(service.findAll(7)).resolves.toEqual({
      items: [],
      unreadCount: 2,
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientUserId: 7 } }),
    );
  });

  it('marca como leída solamente una notificación propia', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.findFirst.mockResolvedValue({
      id: 4,
      readAt: new Date(),
    });

    const result = await service.markAsRead(4, 7);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4, recipientUserId: 7, readAt: null },
      }),
    );
    expect(result.changed).toBe(true);
  });

  it('rechaza la lectura de una notificación ajena o inexistente', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markAsRead(9, 7)).rejects.toThrow(NotFoundException);
  });

  it('marca todas las notificaciones no leídas del usuario', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    await expect(service.markAllAsRead(7)).resolves.toEqual({ updated: 3 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientUserId: 7, readAt: null },
      }),
    );
  });

  it('notifica la asignación al Analista con una clave deduplicable', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1 });
    prisma.notification.createMany.mockResolvedValue({ count: 1 });
    const input = {
      riskCaseId: 22,
      recipientUserId: 1,
      sourceId: 80,
      actor: {
        id: 4,
        name: 'Administrador FraudShield',
        role: UserRole.ADMINISTRADOR,
      },
    };

    await service.notifyAssignment(input);
    await service.notifyAssignment(input);

    expect(prisma.notification.createMany).toHaveBeenCalledTimes(2);
    expect(prisma.notification.createMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            eventKey: 'CASE_ASSIGNED:80:1',
            recipientUserId: 1,
            riskCaseId: 22,
          }),
        ],
      }),
    );
    expect(prisma.notification.createMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        skipDuplicates: true,
        data: [
          expect.objectContaining({
            eventKey: 'CASE_ASSIGNED:80:1',
            recipientUserId: 1,
            riskCaseId: 22,
          }),
        ],
      }),
    );
  });

  it('notifica a los administradores cuando el Analista actualiza un caso', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 4 }]);
    prisma.notification.createMany.mockResolvedValue({ count: 1 });

    await service.notifyAdministrators({
      type: 'REVIEW_UPDATED',
      riskCaseId: 22,
      sourceId: 95,
      actor: {
        id: 1,
        name: 'Yerko Barrera',
        role: UserRole.ANALISTA,
      },
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          type: 'REVIEW_UPDATED',
          eventKey: 'REVIEW_UPDATED:95:4',
          recipientUserId: 4,
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('notifica al Analista participante cuando el Administrador cierra el caso', async () => {
    prisma.riskCaseTimeline.findMany.mockResolvedValue([{ userId: 1 }]);
    prisma.notification.createMany.mockResolvedValue({ count: 1 });

    await service.notifyAnalystParticipants({
      riskCaseId: 22,
      sourceId: 120,
      actor: {
        id: 4,
        name: 'Administrador FraudShield',
        role: UserRole.ADMINISTRADOR,
      },
    });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventKey: 'CASE_RESOLVED:120:1',
          recipientUserId: 1,
        }),
      ],
      skipDuplicates: true,
    });
  });
});
