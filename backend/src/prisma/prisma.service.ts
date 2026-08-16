import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.ensureRiskCatalog();
  }

  private async ensureRiskCatalog() {
    const [low, medium, high] = await Promise.all([
      this.riskLevel.upsert({
        where: { name: 'BAJO' },
        update: {
          description: 'Registrar y monitorear.',
          priority: 1,
        },
        create: {
          name: 'BAJO',
          description: 'Registrar y monitorear.',
          priority: 1,
        },
      }),
      this.riskLevel.upsert({
        where: { name: 'MEDIO' },
        update: {
          description: 'Requiere revisión.',
          priority: 2,
        },
        create: {
          name: 'MEDIO',
          description: 'Requiere revisión.',
          priority: 2,
        },
      }),
      this.riskLevel.upsert({
        where: { name: 'ALTO' },
        update: {
          description: 'Revisión prioritaria.',
          priority: 3,
        },
        create: {
          name: 'ALTO',
          description: 'Revisión prioritaria.',
          priority: 3,
        },
      }),
    ]);

    await Promise.all([
      this.riskRule.upsert({
        where: { code: 'R1' },
        update: {
          name: 'Monto superior',
          condition: 'amount > 500000',
          description: 'Monto superior a $500.000 CLP',
          active: true,
          riskLevelId: high.id,
        },
        create: {
          code: 'R1',
          name: 'Monto superior',
          condition: 'amount > 500000',
          description: 'Monto superior a $500.000 CLP',
          active: true,
          riskLevelId: high.id,
        },
      }),
      this.riskRule.upsert({
        where: { code: 'R2' },
        update: {
          name: 'Horario nocturno',
          condition: 'hour >= 0 && hour <= 5',
          description: 'Transacción realizada en horario nocturno',
          active: true,
          riskLevelId: medium.id,
        },
        create: {
          code: 'R2',
          name: 'Horario nocturno',
          condition: 'hour >= 0 && hour <= 5',
          description: 'Transacción realizada en horario nocturno',
          active: true,
          riskLevelId: medium.id,
        },
      }),
      this.riskRule.upsert({
        where: { code: 'R3' },
        update: {
          name: 'Frecuencia elevada',
          condition: 'nearbyTransactions >= 3',
          description:
            'Más de 3 transacciones del mismo cliente en un período corto',
          active: true,
          riskLevelId: medium.id,
        },
        create: {
          code: 'R3',
          name: 'Frecuencia elevada',
          condition: 'nearbyTransactions >= 3',
          description:
            'Más de 3 transacciones del mismo cliente en un período corto',
          active: true,
          riskLevelId: medium.id,
        },
      }),
      this.riskRule.upsert({
        where: { code: 'R4' },
        update: {
          name: 'Ubicaciones distintas',
          condition: 'Existe transacción cercana con ubicación distinta',
          description:
            'Transacciones en ubicaciones distintas en menos de una hora',
          active: true,
          riskLevelId: high.id,
        },
        create: {
          code: 'R4',
          name: 'Ubicaciones distintas',
          condition: 'Existe transacción cercana con ubicación distinta',
          description:
            'Transacciones en ubicaciones distintas en menos de una hora',
          active: true,
          riskLevelId: high.id,
        },
      }),
      this.riskRule.upsert({
        where: { code: 'R5' },
        update: {
          name: 'Sin condiciones relevantes',
          condition: 'No existen reglas R1-R4 activadas',
          description: 'No se detectaron condiciones relevantes de riesgo',
          active: true,
          riskLevelId: low.id,
        },
        create: {
          code: 'R5',
          name: 'Sin condiciones relevantes',
          condition: 'No existen reglas R1-R4 activadas',
          description: 'No se detectaron condiciones relevantes de riesgo',
          active: true,
          riskLevelId: low.id,
        },
      }),
    ]);
  }
}
