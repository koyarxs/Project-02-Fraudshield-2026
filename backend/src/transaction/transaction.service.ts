import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-request.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

interface AppliedRiskRule {
  code: string;
  name: string;
  description: string;
  scoreImpact: number;
  reason: string;
  condition?: string;
  observedValue?: string;
  threshold?: string;
  activated?: boolean;
}

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  create(createTransactionDto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: createTransactionDto,
    });
  }

  findAll(authUser?: AuthenticatedUser) {
    return this.prisma.transaction.findMany({
      include: {
        batch: true,
        riskResult: {
          include: {
            riskLevel: true,
          },
        },
        riskCases: {
          where: this.getRiskCaseAccess(authUser),
          include: {
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
          },
        },
        validationErrors: true,
      },
    });
  }

  findByBatchId(batchId: number, authUser?: AuthenticatedUser) {
    return this.prisma.transaction.findMany({
      where: {
        batchId,
      },
      orderBy: {
        id: 'asc',
      },
      include: {
        batch: true,
        riskResult: {
          include: {
            riskLevel: true,
          },
        },
        riskCases: {
          where: this.getRiskCaseAccess(authUser),
          include: {
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
          },
        },
        validationErrors: true,
      },
    });
  }

  findOne(id: number, authUser?: AuthenticatedUser) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        batch: true,
        riskResult: {
          include: {
            riskLevel: true,
          },
        },
        riskCases: {
          where: this.getRiskCaseAccess(authUser),
          include: {
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
          },
        },
        validationErrors: true,
      },
    });
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return this.prisma.transaction.update({
      where: { id },
      data: updateTransactionDto,
    });
  }

  remove(id: number) {
    return this.prisma.transaction.delete({
      where: { id },
    });
  }

  async classify(id: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transacción no encontrada');
    }

    const appliedRules: AppliedRiskRule[] = [];
    const evaluatedRules: AppliedRiskRule[] = [];
    let riskLevelName = 'BAJO';
    let score = 10;

    const amount = Number(transaction.amount);
    const transactionDateTime = this.buildTransactionDateTime(
      transaction.transactionDate,
      transaction.transactionHour,
    );

    // R1: monto mayor a $500.000 CLP
    if (amount > 500000) {
      appliedRules.push({
        code: 'R1',
        name: 'Monto superior',
        description: 'Monto superior a $500.000 CLP',
        scoreImpact: 90,
        reason: `Monto evaluado: ${amount} ${transaction.currency}.`,
        condition: 'amount > 500000',
        observedValue: `${amount} ${transaction.currency}`,
        threshold: '500000 CLP',
        activated: true,
      });
      riskLevelName = 'ALTO';
      score = 90;
    }
    evaluatedRules.push({
      code: 'R1',
      name: 'Monto superior',
      description: 'Monto superior a $500.000 CLP',
      scoreImpact: amount > 500000 ? 90 : 0,
      reason: `Monto evaluado: ${amount} ${transaction.currency}.`,
      condition: 'amount > 500000',
      observedValue: `${amount} ${transaction.currency}`,
      threshold: '500000 CLP',
      activated: amount > 500000,
    });

    // R2: horario nocturno entre 00:00 y 05:59
    const hour = Number(transaction.transactionHour.split(':')[0]);

    if (hour >= 0 && hour <= 5) {
      appliedRules.push({
        code: 'R2',
        name: 'Horario nocturno',
        description: 'Transacción realizada en horario nocturno',
        scoreImpact: 60,
        reason: `Hora evaluada: ${transaction.transactionHour}.`,
        condition: 'hour >= 0 && hour <= 5',
        observedValue: transaction.transactionHour,
        threshold: '00:00 a 05:59',
        activated: true,
      });

      if (riskLevelName !== 'ALTO') {
        riskLevelName = 'MEDIO';
        score = 60;
      }
    }
    evaluatedRules.push({
      code: 'R2',
      name: 'Horario nocturno',
      description: 'Transacción realizada en horario nocturno',
      scoreImpact: hour >= 0 && hour <= 5 ? 60 : 0,
      reason: `Hora evaluada: ${transaction.transactionHour}.`,
      condition: 'hour >= 0 && hour <= 5',
      observedValue: transaction.transactionHour,
      threshold: '00:00 a 05:59',
      activated: hour >= 0 && hour <= 5,
    });

    // Se consideran 10 minutos como período corto para R3
    const shortPeriodStart = new Date(
      transactionDateTime.getTime() - 10 * 60 * 1000,
    );
    const shortPeriodEnd = new Date(
      transactionDateTime.getTime() + 10 * 60 * 1000,
    );

    const nearbyTransactions = await this.prisma.transaction.count({
      where: {
        customerCode: transaction.customerCode,
        id: {
          not: transaction.id,
        },
        transactionDate: {
          gte: shortPeriodStart,
          lte: shortPeriodEnd,
        },
      },
    });

    // R3: más de 3 transacciones del mismo cliente
    if (nearbyTransactions >= 3) {
      appliedRules.push({
        code: 'R3',
        name: 'Frecuencia elevada',
        description:
          'Más de 3 transacciones del mismo cliente en un período corto',
        scoreImpact: 70,
        reason: `${nearbyTransactions} transacciones cercanas del mismo cliente.`,
        condition: 'nearbyTransactions >= 3',
        observedValue: `${nearbyTransactions} transacciones cercanas`,
        threshold: '3 transacciones',
        activated: true,
      });

      if (riskLevelName !== 'ALTO') {
        riskLevelName = 'MEDIO';
        score = 70;
      }
    }
    evaluatedRules.push({
      code: 'R3',
      name: 'Frecuencia elevada',
      description:
        'Más de 3 transacciones del mismo cliente en un período corto',
      scoreImpact: nearbyTransactions >= 3 ? 70 : 0,
      reason: `${nearbyTransactions} transacciones cercanas del mismo cliente.`,
      condition: 'nearbyTransactions >= 3',
      observedValue: `${nearbyTransactions} transacciones cercanas`,
      threshold: '3 transacciones',
      activated: nearbyTransactions >= 3,
    });

    // R4: distinta ubicación en menos de una hora
    const oneHourBefore = new Date(
      transactionDateTime.getTime() - 60 * 60 * 1000,
    );
    const oneHourAfter = new Date(
      transactionDateTime.getTime() + 60 * 60 * 1000,
    );

    const differentLocationTransaction =
      await this.prisma.transaction.findFirst({
        where: {
          customerCode: transaction.customerCode,
          id: {
            not: transaction.id,
          },
          transactionDate: {
            gte: oneHourBefore,
            lte: oneHourAfter,
          },
          OR: [
            {
              originLocation: {
                not: transaction.originLocation,
              },
            },
            {
              destinationLocation: {
                not: transaction.destinationLocation,
              },
            },
          ],
        },
      });

    if (differentLocationTransaction) {
      appliedRules.push({
        code: 'R4',
        name: 'Ubicaciones distintas',
        description:
          'Transacciones en ubicaciones distintas en menos de una hora',
        scoreImpact: 95,
        reason: `Existe otra transacción cercana del cliente ${transaction.customerCode} con ubicación distinta.`,
        condition: 'Existe transacción cercana con ubicación distinta',
        observedValue: 'Coincidencia encontrada',
        threshold: 'Menos de una hora',
        activated: true,
      });
      riskLevelName = 'ALTO';
      score = 95;
    }
    evaluatedRules.push({
      code: 'R4',
      name: 'Ubicaciones distintas',
      description:
        'Transacciones en ubicaciones distintas en menos de una hora',
      scoreImpact: differentLocationTransaction ? 95 : 0,
      reason: differentLocationTransaction
        ? `Existe otra transacción cercana del cliente ${transaction.customerCode} con ubicación distinta.`
        : 'No se encontró otra transacción cercana con ubicación distinta.',
      condition: 'Existe transacción cercana con ubicación distinta',
      observedValue: differentLocationTransaction
        ? 'Coincidencia encontrada'
        : 'Sin coincidencia',
      threshold: 'Menos de una hora',
      activated: Boolean(differentLocationTransaction),
    });

    // R5: ninguna regla anterior
    if (appliedRules.length === 0) {
      appliedRules.push({
        code: 'R5',
        name: 'Sin condiciones relevantes',
        description: 'No se detectaron condiciones relevantes de riesgo',
        scoreImpact: 10,
        reason: 'No se activaron R1, R2, R3 ni R4.',
        condition: 'No existen reglas R1-R4 activadas',
        observedValue: 'Sin reglas críticas activadas',
        threshold: '0 reglas críticas',
        activated: true,
      });
    }
    evaluatedRules.push({
      code: 'R5',
      name: 'Sin condiciones relevantes',
      description: 'No se detectaron condiciones relevantes de riesgo',
      scoreImpact: appliedRules.some((rule) => rule.code === 'R5') ? 10 : 0,
      reason: appliedRules.some((rule) => rule.code === 'R5')
        ? 'No se activaron R1, R2, R3 ni R4.'
        : 'No aplica porque se activó al menos una regla R1-R4.',
      condition: 'No existen reglas R1-R4 activadas',
      observedValue: appliedRules.some((rule) => rule.code === 'R5')
        ? 'Sin reglas críticas activadas'
        : 'Existen reglas activadas',
      threshold: '0 reglas críticas',
      activated: appliedRules.some((rule) => rule.code === 'R5'),
    });

    const riskLevel = await this.prisma.riskLevel.findUnique({
      where: {
        name: riskLevelName,
      },
    });

    if (!riskLevel) {
      throw new NotFoundException(
        `No existe el nivel de riesgo ${riskLevelName}`,
      );
    }

    const observation = appliedRules
      .map((rule) => `${rule.code}: ${rule.description}`)
      .join(' | ');
    const finalReason = `${score} puntos -> Riesgo ${riskLevelName}`;
    const recommendedAction =
      riskLevelName === 'BAJO'
        ? 'Registrar y monitorear.'
        : riskLevelName === 'MEDIO'
          ? 'Requiere revisión.'
          : 'Revisión prioritaria.';
    const ruleDetails: Prisma.InputJsonObject = {
      algorithm:
        'Score por prioridad de regla: R1=90, R2=60, R3=70, R4=95; base/R5=10. No es suma ponderada.',
      finalReason,
      recommendedAction,
      rules: appliedRules.map((rule) => ({
        code: rule.code,
        name: rule.name,
        description: rule.description,
        scoreImpact: rule.scoreImpact,
        reason: rule.reason,
        condition: rule.condition ?? null,
        observedValue: rule.observedValue ?? null,
        threshold: rule.threshold ?? null,
        activated: rule.activated ?? true,
      })),
      evaluatedRules: evaluatedRules.map((rule) => ({
        code: rule.code,
        name: rule.name,
        description: rule.description,
        scoreImpact: rule.scoreImpact,
        reason: rule.reason,
        condition: rule.condition ?? null,
        observedValue: rule.observedValue ?? null,
        threshold: rule.threshold ?? null,
        activated: rule.activated ?? false,
      })),
    };

    const riskResult = await this.prisma.riskResult.upsert({
      where: {
        transactionId: transaction.id,
      },
      update: {
        score,
        observation,
        ruleDetails,
        riskLevelId: riskLevel.id,
        classifiedAt: new Date(),
      },
      create: {
        score,
        observation,
        ruleDetails,
        transactionId: transaction.id,
        riskLevelId: riskLevel.id,
      },
      include: {
        transaction: true,
        riskLevel: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CLASSIFY_TRANSACTION',
        module: 'TRANSACTION',
        detail: `Transacción #${transaction.id} clasificada como ${riskLevelName} con score ${score}.`,
      },
    });

    return riskResult;
  }

  private buildTransactionDateTime(
    transactionDate: Date,
    transactionHour: string,
  ) {
    const datePart = transactionDate.toISOString().slice(0, 10);
    const normalizedHour = /^\d{2}:\d{2}(:\d{2})?$/.test(transactionHour)
      ? transactionHour
      : '00:00';
    const timePart =
      normalizedHour.length === 5 ? `${normalizedHour}:00` : normalizedHour;

    return new Date(`${datePart}T${timePart}.000Z`);
  }

  private getRiskCaseAccess(authUser?: AuthenticatedUser) {
    return authUser?.role === UserRole.ANALISTA
      ? { responsibleUserId: authUser.userId }
      : undefined;
  }
}
