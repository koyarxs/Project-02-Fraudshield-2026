import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';

interface CaseNotificationInput {
  riskCaseId: number;
  sourceId: number;
  actor: AuthenticatedUser | { id: number; name: string; role: UserRole };
}

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(recipientUserId: number) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientUserId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          actor: { select: { id: true, name: true } },
          riskCase: { select: { id: true, transactionId: true } },
        },
      }),
      this.prisma.notification.count({
        where: { recipientUserId, readAt: null },
      }),
    ]);

    return { items, unreadCount };
  }

  async markAsRead(id: number, recipientUserId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientUserId, readAt: null },
      data: { readAt: new Date() },
    });

    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientUserId },
      include: {
        actor: { select: { id: true, name: true } },
        riskCase: { select: { id: true, transactionId: true } },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada.');
    }

    return { ...notification, changed: result.count > 0 };
  }

  async markAllAsRead(recipientUserId: number) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientUserId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  async notifyAssignment(
    input: CaseNotificationInput & { recipientUserId: number },
  ) {
    const recipient = await this.prisma.user.findFirst({
      where: {
        id: input.recipientUserId,
        active: true,
      },
      select: { id: true },
    });

    if (!recipient) {
      return { count: 0 };
    }

    return this.prisma.notification.createMany({
      data: [
        {
          type: 'CASE_ASSIGNED',
          message: `${input.actor.name} te asignó el caso ${formatCaseReference(input.riskCaseId)}.`,
          eventKey: `CASE_ASSIGNED:${input.sourceId}:${recipient.id}`,
          recipientUserId: recipient.id,
          actorUserId: getActorId(input.actor),
          riskCaseId: input.riskCaseId,
        },
      ],
      skipDuplicates: true,
    });
  }

  async notifyAdministrators(
    input: CaseNotificationInput & {
      type: 'REVIEW_STARTED' | 'REVIEW_UPDATED' | 'CASE_RESOLVED';
    },
  ) {
    if (input.actor.role !== UserRole.ANALISTA) {
      return { count: 0 };
    }

    const administrators = await this.prisma.user.findMany({
      where: { active: true, role: UserRole.ADMINISTRADOR },
      select: { id: true },
    });
    const action =
      input.type === 'REVIEW_STARTED'
        ? 'inició la revisión del'
        : input.type === 'CASE_RESOLVED'
          ? 'resolvió el'
          : 'actualizó la revisión del';

    return this.prisma.notification.createMany({
      data: administrators.map((administrator) => ({
        type: input.type,
        message: `${input.actor.name} ${action} caso ${formatCaseReference(input.riskCaseId)}.`,
        eventKey: `${input.type}:${input.sourceId}:${administrator.id}`,
        recipientUserId: administrator.id,
        actorUserId: getActorId(input.actor),
        riskCaseId: input.riskCaseId,
      })),
      skipDuplicates: true,
    });
  }

  async notifyAnalystParticipants(input: CaseNotificationInput) {
    if (input.actor.role !== UserRole.ADMINISTRADOR) {
      return { count: 0 };
    }

    const participants = await this.prisma.riskCaseTimeline.findMany({
      where: {
        riskCaseId: input.riskCaseId,
        userId: { not: null },
        user: { active: true, role: UserRole.ANALISTA },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    const recipientIds = participants.flatMap((participant) =>
      participant.userId ? [participant.userId] : [],
    );

    return this.prisma.notification.createMany({
      data: recipientIds.map((recipientUserId) => ({
        type: 'CASE_RESOLVED',
        message: `${input.actor.name} cerró el caso ${formatCaseReference(input.riskCaseId)} como Resuelto.`,
        eventKey: `CASE_RESOLVED:${input.sourceId}:${recipientUserId}`,
        recipientUserId,
        actorUserId: getActorId(input.actor),
        riskCaseId: input.riskCaseId,
      })),
      skipDuplicates: true,
    });
  }
}

function formatCaseReference(riskCaseId: number) {
  return `RC-${String(riskCaseId).padStart(3, '0')}`;
}

function getActorId(
  actor: AuthenticatedUser | { id: number; name: string; role: UserRole },
) {
  return 'userId' in actor ? actor.userId : actor.id;
}
