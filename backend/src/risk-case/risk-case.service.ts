import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskCaseDto } from './dto/create-risk-case.dto';
import { UpdateRiskCaseDto } from './dto/update-risk-case.dto';

interface AuthenticatedUser {
  userId: number;
  email: string;
  name?: string;
}

const caseInclude = {
  transaction: {
    include: {
      riskResult: {
        include: {
          riskLevel: true,
        },
      },
    },
  },
  riskResult: {
    include: {
      riskLevel: true,
    },
  },
  responsibleUser: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  timelineEvents: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
} as const;

const CASE_STATUS_ORDER: Record<string, number> = {
  PENDIENTE: 1,
  EN_REVISION: 2,
  RESUELTO: 3,
};

@Injectable()
export class RiskCaseService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createRiskCaseDto: CreateRiskCaseDto,
    authUser?: AuthenticatedUser,
  ) {
    const transaction = await this.prisma.transaction.findUnique({
      where: {
        id: createRiskCaseDto.transactionId,
      },
      include: {
        riskResult: {
          include: {
            riskLevel: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    if (!transaction.riskResult) {
      throw new BadRequestException(
        'La transacción aún no posee clasificación de riesgo.',
      );
    }

    if (transaction.riskResult.riskLevel.name === 'BAJO') {
      throw new BadRequestException(
        'Las transacciones de riesgo Bajo quedan registradas para monitoreo y no requieren gestión de caso.',
      );
    }

    const actor = await this.findUser(authUser?.userId);
    const responsibleUser =
      createRiskCaseDto.responsibleUserId !== undefined
        ? await this.findUser(createRiskCaseDto.responsibleUserId)
        : actor;
    const responsibleName =
      createRiskCaseDto.responsibleUserId === 0
        ? 'Sin asignar'
        : createRiskCaseDto.responsibleName ??
          responsibleUser?.name ??
          responsibleUser?.email ??
          authUser?.email;
    const status = createRiskCaseDto.status ?? 'PENDIENTE';
    const priority =
      createRiskCaseDto.priority ??
      (transaction.riskResult.riskLevel.name === 'ALTO' ? 'ALTA' : 'NORMAL');

    this.validateCreateWorkflow(createRiskCaseDto, status);

    const resolvedAt = status === 'RESUELTO' ? new Date() : null;

    const riskCase = await this.prisma.riskCase.upsert({
      where: {
        transactionId: transaction.id,
      },
      update: {
        status,
        priority,
        reviewResult: createRiskCaseDto.reviewResult,
        observations: createRiskCaseDto.observations,
        actionTaken: createRiskCaseDto.actionTaken,
        internalComments: createRiskCaseDto.internalComments,
        responsibleName,
        responsibleUserId: responsibleUser?.id,
        resolvedAt,
      },
      create: {
        transactionId: transaction.id,
        riskResultId: transaction.riskResult.id,
        status,
        priority,
        reviewResult: createRiskCaseDto.reviewResult,
        observations: createRiskCaseDto.observations,
        actionTaken: createRiskCaseDto.actionTaken,
        internalComments: createRiskCaseDto.internalComments,
        responsibleName,
        responsibleUserId: responsibleUser?.id,
        riskLevelSnapshot: transaction.riskResult.riskLevel.name,
        scoreSnapshot: transaction.riskResult.score,
        classificationReason:
          transaction.riskResult.observation ??
          `${transaction.riskResult.score} puntos -> Riesgo ${transaction.riskResult.riskLevel.name}`,
        resolvedAt,
      },
      include: caseInclude,
    });

    await this.createTimelineEvent(
      riskCase.id,
      'CASE_UPSERTED',
      `Caso registrado o actualizado. Estado: ${status}. Prioridad: ${priority}.`,
      actor?.id,
      {
        status,
        priority,
        reviewResult: createRiskCaseDto.reviewResult ?? null,
      },
    );

    await this.createAuditLog(
      'UPSERT_RISK_CASE',
      `Caso #${riskCase.id} asociado a transacción #${transaction.id}. Estado: ${riskCase.status}.`,
      actor?.id,
    );

    return this.findOne(riskCase.id);
  }

  findAll() {
    return this.prisma.riskCase.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      include: caseInclude,
    });
  }

  async getSummary() {
    const [pending, inReview, resolved, highRiskPending, priorityOpen] =
      await this.prisma.$transaction([
        this.prisma.riskCase.count({
          where: {
            status: 'PENDIENTE',
          },
        }),
        this.prisma.riskCase.count({
          where: {
            status: 'EN_REVISION',
          },
        }),
        this.prisma.riskCase.count({
          where: {
            status: 'RESUELTO',
          },
        }),
        this.prisma.riskCase.count({
          where: {
            status: {
              in: ['PENDIENTE', 'EN_REVISION'],
            },
            riskLevelSnapshot: 'ALTO',
          },
        }),
        this.prisma.riskCase.count({
          where: {
            status: {
              not: 'RESUELTO',
            },
            priority: {
              in: ['ALTA', 'URGENTE'],
            },
          },
        }),
      ]);

    const [open, suspicious, discarded] = await this.prisma.$transaction([
      this.prisma.riskCase.count({
        where: {
          status: {
            not: 'RESUELTO',
          },
        },
      }),
      this.prisma.riskCase.count({
        where: {
          reviewResult: 'OPERACION_SOSPECHOSA',
        },
      }),
      this.prisma.riskCase.count({
        where: {
          reviewResult: 'SOSPECHA_DESCARTADA',
        },
      }),
    ]);

    return {
      open,
      pending,
      inReview,
      resolved,
      highRiskPending,
      priorityOpen,
      suspicious,
      discarded,
    };
  }

  async findOne(id: number) {
    const riskCase = await this.prisma.riskCase.findUnique({
      where: {
        id,
      },
      include: caseInclude,
    });

    if (!riskCase) {
      throw new NotFoundException('Caso no encontrado');
    }

    return riskCase;
  }

  findByTransaction(transactionId: number) {
    return this.prisma.riskCase.findUnique({
      where: {
        transactionId,
      },
      include: caseInclude,
    });
  }

  async update(
    id: number,
    updateRiskCaseDto: UpdateRiskCaseDto,
    authUser?: AuthenticatedUser,
  ) {
    const currentCase = await this.findOne(id);
    const actor = await this.findUser(authUser?.userId);
    const responsibleUser =
      updateRiskCaseDto.responsibleUserId !== undefined
        ? await this.findUser(updateRiskCaseDto.responsibleUserId)
        : null;
    const responsibleUserId =
      updateRiskCaseDto.responsibleUserId === 0
        ? null
        : responsibleUser?.id;
    const status = updateRiskCaseDto.status;
    const nextCaseState = {
      status: status ?? currentCase.status,
      reviewResult:
        updateRiskCaseDto.reviewResult !== undefined
          ? updateRiskCaseDto.reviewResult
          : currentCase.reviewResult,
      observations:
        updateRiskCaseDto.observations !== undefined
          ? updateRiskCaseDto.observations
          : currentCase.observations,
      actionTaken:
        updateRiskCaseDto.actionTaken !== undefined
          ? updateRiskCaseDto.actionTaken
          : currentCase.actionTaken,
      responsibleUserId:
        updateRiskCaseDto.responsibleUserId !== undefined
          ? responsibleUserId
          : currentCase.responsibleUserId,
      responsibleName:
        updateRiskCaseDto.responsibleUserId === 0
          ? 'Sin asignar'
          : updateRiskCaseDto.responsibleName ??
            currentCase.responsibleName,
    };
    this.validateUpdateWorkflow(currentCase.status, nextCaseState);

    const resolvedAt = status === 'RESUELTO' ? new Date() : undefined;
    const timelineDescriptions = this.buildTimelineDescriptions(
      currentCase,
      updateRiskCaseDto,
      updateRiskCaseDto.responsibleUserId !== undefined
        ? responsibleUserId
        : undefined,
    );

    const riskCase = await this.prisma.riskCase.update({
      where: {
        id,
      },
      data: {
        ...(status !== undefined && { status }),
        ...(updateRiskCaseDto.priority !== undefined && {
          priority: updateRiskCaseDto.priority,
        }),
        ...(updateRiskCaseDto.reviewResult !== undefined && {
          reviewResult: updateRiskCaseDto.reviewResult,
        }),
        ...(updateRiskCaseDto.observations !== undefined && {
          observations: updateRiskCaseDto.observations,
        }),
        ...(updateRiskCaseDto.actionTaken !== undefined && {
          actionTaken: updateRiskCaseDto.actionTaken,
        }),
        ...(updateRiskCaseDto.internalComments !== undefined && {
          internalComments: updateRiskCaseDto.internalComments,
        }),
        ...(updateRiskCaseDto.responsibleUserId !== undefined && {
          responsibleName:
            updateRiskCaseDto.responsibleUserId === 0
              ? 'Sin asignar'
              : updateRiskCaseDto.responsibleName ??
                responsibleUser?.name ??
                authUser?.email,
          responsibleUserId,
        }),
        ...(updateRiskCaseDto.responsibleUserId === undefined &&
          updateRiskCaseDto.responsibleName !== undefined && {
            responsibleName: updateRiskCaseDto.responsibleName,
          }),
        ...(resolvedAt !== undefined && { resolvedAt }),
      },
      include: caseInclude,
    });

    for (const description of timelineDescriptions) {
      await this.createTimelineEvent(
        riskCase.id,
        description.eventType,
        description.detail,
        actor?.id,
        description.metadata,
      );

      if (
        [
          'STATUS_CHANGED',
          'CASE_RESOLVED',
          'CASE_ASSIGNED',
          'PRIORITY_CHANGED',
        ].includes(description.eventType)
      ) {
        await this.createAuditLog(
          description.eventType,
          `Caso #${riskCase.id}: ${description.detail}`,
          actor?.id,
        );
      }
    }

    await this.createAuditLog(
      'UPDATE_RISK_CASE',
      `Caso #${riskCase.id} actualizado. Estado: ${riskCase.status}. Resultado: ${riskCase.reviewResult ?? 'sin resultado'}.`,
      actor?.id,
    );

    return this.findOne(riskCase.id);
  }

  remove(id: number) {
    return this.prisma.riskCase.delete({
      where: {
        id,
      },
    });
  }

  private createAuditLog(action: string, detail: string, userId?: number) {
    return this.prisma.auditLog.create({
      data: {
        action,
        module: 'RISK_CASE',
        detail,
        userId,
      },
    });
  }

  private async createTimelineEvent(
    riskCaseId: number,
    eventType: string,
    description: string,
    userId?: number,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.riskCaseTimeline.create({
      data: {
        riskCaseId,
        eventType,
        description,
        userId,
        metadata: metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  private findUser(userId?: number) {
    if (!userId) {
      return null;
    }

    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  }

  private buildTimelineDescriptions(
    currentCase: Awaited<ReturnType<RiskCaseService['findOne']>>,
    updateRiskCaseDto: UpdateRiskCaseDto,
    responsibleUserId?: number | null,
  ) {
    const events: Array<{
      eventType: string;
      detail: string;
      metadata: Record<string, unknown>;
    }> = [];

    if (
      updateRiskCaseDto.status !== undefined &&
      updateRiskCaseDto.status !== currentCase.status
    ) {
      events.push({
        eventType: 'STATUS_CHANGED',
        detail: `Estado cambiado de ${currentCase.status} a ${updateRiskCaseDto.status}.`,
        metadata: {
          from: currentCase.status,
          to: updateRiskCaseDto.status,
        },
      });
    }

    if (
      updateRiskCaseDto.status === 'RESUELTO' &&
      currentCase.status !== 'RESUELTO'
    ) {
      events.push({
        eventType: 'CASE_RESOLVED',
        detail: 'Caso resuelto con decisión registrada.',
        metadata: {
          reviewResult: updateRiskCaseDto.reviewResult,
        },
      });
    }

    if (
      updateRiskCaseDto.priority !== undefined &&
      updateRiskCaseDto.priority !== currentCase.priority
    ) {
      events.push({
        eventType: 'PRIORITY_CHANGED',
        detail: `Prioridad cambiada de ${currentCase.priority} a ${updateRiskCaseDto.priority}.`,
        metadata: {
          from: currentCase.priority,
          to: updateRiskCaseDto.priority,
        },
      });
    }

    if (
      updateRiskCaseDto.reviewResult !== undefined &&
      updateRiskCaseDto.reviewResult !== currentCase.reviewResult
    ) {
      events.push({
        eventType: 'RESULT_CHANGED',
        detail: `Resultado actualizado a ${updateRiskCaseDto.reviewResult}.`,
        metadata: {
          from: currentCase.reviewResult,
          to: updateRiskCaseDto.reviewResult,
        },
      });
    }

    if (
      responsibleUserId !== undefined &&
      responsibleUserId !== currentCase.responsibleUserId
    ) {
      const nextAssignment =
        responsibleUserId === null
          ? 'Sin asignar'
          : `usuario #${responsibleUserId}`;

      events.push({
        eventType: 'CASE_ASSIGNED',
        detail: `Caso asignado a ${nextAssignment}.`,
        metadata: {
          from: currentCase.responsibleUserId,
          to: responsibleUserId,
        },
      });
    }

    if (updateRiskCaseDto.observations !== undefined) {
      events.push({
        eventType: 'OBSERVATION_UPDATED',
        detail: 'Observaciones del caso actualizadas.',
        metadata: {},
      });
    }

    if (updateRiskCaseDto.actionTaken !== undefined) {
      events.push({
        eventType: 'ACTION_UPDATED',
        detail: 'Acción realizada actualizada.',
        metadata: {},
      });
    }

    return events.length > 0
      ? events
      : [
          {
            eventType: 'CASE_UPDATED',
            detail: 'Caso actualizado sin cambios de estado operacional.',
            metadata: {},
          },
        ];
  }

  private validateCreateWorkflow(
    createRiskCaseDto: CreateRiskCaseDto,
    status: string,
  ) {
    if (status === 'RESUELTO') {
      throw new BadRequestException(
        'Un caso nuevo no puede crearse directamente como Resuelto. Debe pasar por revisión.',
      );
    }

    if (status === 'EN_REVISION') {
      this.validateResponsible({
        responsibleUserId: createRiskCaseDto.responsibleUserId,
        responsibleName: createRiskCaseDto.responsibleName,
      });
    }
  }

  private validateUpdateWorkflow(
    currentStatus: string,
    nextCaseState: {
      status: string;
      reviewResult?: string | null;
      observations?: string | null;
      actionTaken?: string | null;
      responsibleUserId?: number | null;
      responsibleName?: string | null;
    },
  ) {
    if (currentStatus === 'RESUELTO' && nextCaseState.status !== 'RESUELTO') {
      throw new BadRequestException(
        'Un caso resuelto no puede volver a estados anteriores.',
      );
    }

    const currentOrder = CASE_STATUS_ORDER[currentStatus] ?? 0;
    const nextOrder = CASE_STATUS_ORDER[nextCaseState.status] ?? 0;

    if (nextOrder < currentOrder) {
      throw new BadRequestException(
        'La transición de estado solicitada no respeta el flujo Pendiente -> En revisión -> Resuelto.',
      );
    }

    if (nextCaseState.status === 'EN_REVISION') {
      this.validateResponsible(nextCaseState);
    }

    if (nextCaseState.status === 'RESUELTO') {
      if (currentStatus !== 'EN_REVISION') {
        throw new BadRequestException(
          'Para resolver un caso primero debe estar En revisión.',
        );
      }

      this.validateResponsible(nextCaseState);

      if (!nextCaseState.reviewResult) {
        throw new BadRequestException(
          'Para resolver un caso debes registrar el resultado de la revisión.',
        );
      }

      if (!nextCaseState.observations?.trim()) {
        throw new BadRequestException(
          'Para resolver un caso debes registrar observación o fundamento.',
        );
      }

      if (!nextCaseState.actionTaken?.trim()) {
        throw new BadRequestException(
          'Para resolver un caso debes registrar la acción realizada.',
        );
      }
    }

    if (
      nextCaseState.reviewResult === 'REQUIERE_ANTECEDENTES' &&
      nextCaseState.status === 'RESUELTO'
    ) {
      throw new BadRequestException(
        'Si requiere antecedentes, mantén el caso Pendiente o En revisión.',
      );
    }
  }

  private validateResponsible(caseState: {
    responsibleUserId?: number | null;
    responsibleName?: string | null;
  }) {
    const hasResponsibleUser = Boolean(caseState.responsibleUserId);
    const hasResponsibleName =
      Boolean(caseState.responsibleName?.trim()) &&
      caseState.responsibleName !== 'Sin asignar';

    if (!hasResponsibleUser && !hasResponsibleName) {
      throw new BadRequestException(
        'Para avanzar el caso debes asignar un responsable.',
      );
    }
  }
}
