import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';

interface UploadedCsvFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface CsvTransactionRow {
  transactionCode: string;
  customerCode: string;
  amount: string;
  currency?: string;
  transactionDate: string;
  transactionHour: string;
  originLocation?: string;
  destinationLocation?: string;
}

const CSV_COLUMN_ALIASES: Record<string, keyof CsvTransactionRow> = {
  transactioncode: 'transactionCode',
  customercode: 'customerCode',
  amount: 'amount',
  currency: 'currency',
  transactiondate: 'transactionDate',
  transactionhour: 'transactionHour',
  originlocation: 'originLocation',
  destinationlocation: 'destinationLocation',
};

@Injectable()
export class FileProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
  ) {}

  async processCsv(file: UploadedCsvFile, userId: number) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar un archivo CSV.');
    }

    if (
      file.mimetype !== 'text/csv' &&
      !file.originalname.toLowerCase().endsWith('.csv')
    ) {
      throw new BadRequestException('Solo se permiten archivos CSV.');
    }

    let rows: CsvTransactionRow[];

    try {
      rows = parse(file.buffer, {
        bom: true,
        delimiter: [',', ';', '\t'],
        skip_empty_lines: true,
        trim: true,
        columns: (headers: string[]) =>
          headers.map((header) => this.normalizeCsvHeader(header)),
      }) as CsvTransactionRow[];
    } catch {
      throw new BadRequestException(
        'El archivo CSV no posee una estructura válida.',
      );
    }

    rows = rows.filter((row) => !this.isEmptyRow(row));

    if (rows.length === 0) {
      throw new BadRequestException(
        'El archivo CSV no contiene transacciones.',
      );
    }

    const uploadedFile = await this.prisma.uploadedFile.create({
      data: {
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        status: 'PROCESSING',
        userId,
      },
    });

    const batch = await this.prisma.processingBatch.create({
      data: {
        uploadedFileId: uploadedFile.id,
        totalRecords: rows.length,
        processedRecords: 0,
        status: 'PROCESSING',
      },
    });

    try {
      for (const row of rows) {
        this.validateRow(row);

        const transaction = await this.transactionService.create({
          transactionCode: row.transactionCode,
          customerCode: row.customerCode,
          amount: Number(row.amount),
          currency: row.currency || 'CLP',
          transactionDate: this.buildTransactionDateTime(
            row.transactionDate,
            row.transactionHour,
          ).toISOString(),
          transactionHour: row.transactionHour,
          originLocation: row.originLocation,
          destinationLocation: row.destinationLocation,
          batchId: batch.id,
        });

        await this.transactionService.classify(transaction.id);
      }

      const results = await this.prisma.riskResult.findMany({
        where: {
          transaction: {
            batchId: batch.id,
          },
        },
        include: {
          riskLevel: true,
        },
      });

      const lowRiskCount = results.filter(
        (result) => result.riskLevel.name === 'BAJO',
      ).length;

      const mediumRiskCount = results.filter(
        (result) => result.riskLevel.name === 'MEDIO',
      ).length;

      const highRiskCount = results.filter(
        (result) => result.riskLevel.name === 'ALTO',
      ).length;

      const dashboardMetric = await this.prisma.dashboardMetric.create({
        data: {
          totalRecords: rows.length,
          lowRiskCount,
          mediumRiskCount,
          highRiskCount,
          batchId: batch.id,
        },
      });

      await this.prisma.processingBatch.update({
        where: {
          id: batch.id,
        },
        data: {
          processedRecords: rows.length,
          status: 'COMPLETED',
          finishedAt: new Date(),
        },
      });

      await this.prisma.uploadedFile.update({
        where: {
          id: uploadedFile.id,
        },
        data: {
          status: 'PROCESSED',
        },
      });

      return {
        message: 'Archivo procesado correctamente.',
        uploadedFileId: uploadedFile.id,
        batchId: batch.id,
        totalRecords: rows.length,
        dashboardMetric,
      };
    } catch (error) {
      await this.prisma.processingBatch.update({
        where: {
          id: batch.id,
        },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
        },
      });

      await this.prisma.uploadedFile.update({
        where: {
          id: uploadedFile.id,
        },
        data: {
          status: 'FAILED',
        },
      });

      throw error;
    }
  }

  private validateRow(row: CsvTransactionRow) {
    if (
      !row.transactionCode ||
      !row.customerCode ||
      !row.amount ||
      !row.transactionDate ||
      !row.transactionHour
    ) {
      throw new BadRequestException(
        `Registro incompleto en la transacción ${
          row.transactionCode || 'sin código'
        }.`,
      );
    }

    if (Number.isNaN(Number(row.amount))) {
      throw new BadRequestException(
        `El monto de la transacción ${row.transactionCode} no es válido.`,
      );
    }

    const transactionDate = new Date(
      `${row.transactionDate}T00:00:00.000Z`,
    );

    if (Number.isNaN(transactionDate.getTime())) {
      throw new BadRequestException(
        `La fecha de la transacción ${row.transactionCode} no es válida.`,
      );
    }

    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(row.transactionHour)) {
      throw new BadRequestException(
        `La hora de la transacción ${row.transactionCode} no es válida.`,
      );
    }
  }

  private normalizeCsvHeader(header: string): string {
    const normalizedHeader = header
      .replace(/^\uFEFF/, '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s_-]/g, '')
      .toLowerCase();

    return CSV_COLUMN_ALIASES[normalizedHeader] ?? header.trim();
  }

  private isEmptyRow(row: CsvTransactionRow): boolean {
    return Object.values(row).every(
      (value) => value === undefined || String(value).trim() === '',
    );
  }

  private buildTransactionDateTime(date: string, hour: string) {
    const normalizedHour = /^\d{2}:\d{2}(:\d{2})?$/.test(hour)
      ? hour
      : '00:00';
    const timePart =
      normalizedHour.length === 5 ? `${normalizedHour}:00` : normalizedHour;

    return new Date(`${date}T${timePart}.000Z`);
  }
}
