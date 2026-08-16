import { Test, TestingModule } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FileProcessingService } from './file-processing.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';

describe('FileProcessingService', () => {
  let service: FileProcessingService;
  let prisma: {
    uploadedFile: {
      create: jest.Mock;
      update: jest.Mock;
    };
    processingBatch: {
      create: jest.Mock;
      update: jest.Mock;
    };
    riskResult: {
      findMany: jest.Mock;
    };
    dashboardMetric: {
      create: jest.Mock;
    };
  };
  let transactionService: {
    create: jest.Mock;
    classify: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      uploadedFile: {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({ id: 1 }),
      },
      processingBatch: {
        create: jest.fn().mockResolvedValue({ id: 10 }),
        update: jest.fn().mockResolvedValue({ id: 10 }),
      },
      riskResult: {
        findMany: jest.fn().mockResolvedValue([
          { riskLevel: { name: 'ALTO' } },
          { riskLevel: { name: 'MEDIO' } },
          { riskLevel: { name: 'BAJO' } },
        ]),
      },
      dashboardMetric: {
        create: jest.fn().mockResolvedValue({
          id: 1,
          totalRecords: 3,
          highRiskCount: 1,
          mediumRiskCount: 1,
          lowRiskCount: 1,
          batchId: 10,
        }),
      },
    };

    transactionService = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          id: transactionService.create.mock.calls.length,
          ...data,
        }),
      ),
      classify: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileProcessingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: TransactionService,
          useValue: transactionService,
        },
      ],
    }).compile();

    service = module.get<FileProcessingService>(FileProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('processes semicolon-delimited CSV files with real transaction headers', async () => {
    const csv = [
      'transactionCode;customerCode;amount;currency;transactionDate;transactionHour;originLocation;destinationLocation',
      'TX-001;CLI-001;750000;CLP;2026-07-10;01:30;Santiago;Valparaiso',
      'TX-002;CLI-002;120000;CLP;2026-07-10;12:15;Santiago;Santiago',
      'TX-003;CLI-003;250000;CLP;2026-07-10;14:00;Valparaiso;Valparaiso',
    ].join('\n');

    const response = await service.processCsv(
      {
        originalname: 'transacciones.csv',
        mimetype: 'text/csv',
        size: Buffer.byteLength(csv),
        buffer: Buffer.from(csv),
      },
      1,
    );

    expect(response.batchId).toBe(10);
    expect(transactionService.create).toHaveBeenCalledTimes(3);
    expect(transactionService.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        transactionCode: 'TX-001',
        customerCode: 'CLI-001',
        amount: 750000,
        batchId: 10,
      }),
    );
    expect(prisma.processingBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalRecords: 3,
          status: 'PROCESSING',
        }),
      }),
    );
    expect(prisma.dashboardMetric.create).toHaveBeenCalled();
  });

  it('ignores completely empty rows without removing required-field validation', async () => {
    const csv = [
      'transactionCode,customerCode,amount,currency,transactionDate,transactionHour,originLocation,destinationLocation',
      'TX-010,CLI-010,100000,CLP,2026-07-11,13:00,Santiago,Santiago',
      ',,,,,,,',
    ].join('\n');

    await service.processCsv(
      {
        originalname: 'transacciones.csv',
        mimetype: 'text/csv',
        size: Buffer.byteLength(csv),
        buffer: Buffer.from(csv),
      },
      1,
    );

    expect(transactionService.create).toHaveBeenCalledTimes(1);
    expect(prisma.processingBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalRecords: 1,
        }),
      }),
    );
  });

  it('processes the compatible 20-row CSV and completes the batch', async () => {
    const csv = readFileSync(
      join(process.cwd(), '..', 'fraudshield_transacciones_compatibles.csv'),
    );

    prisma.riskResult.findMany.mockResolvedValue([
      ...Array.from({ length: 6 }, () => ({ riskLevel: { name: 'ALTO' } })),
      ...Array.from({ length: 4 }, () => ({ riskLevel: { name: 'MEDIO' } })),
      ...Array.from({ length: 10 }, () => ({ riskLevel: { name: 'BAJO' } })),
    ]);

    await service.processCsv(
      {
        originalname: 'fraudshield_transacciones_compatibles.csv',
        mimetype: 'text/csv',
        size: csv.length,
        buffer: csv,
      },
      1,
    );

    expect(transactionService.create).toHaveBeenCalledTimes(20);
    expect(transactionService.classify).toHaveBeenCalledTimes(20);
    expect(prisma.dashboardMetric.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalRecords: 20,
          highRiskCount: 6,
          mediumRiskCount: 4,
          lowRiskCount: 10,
          batchId: 10,
        }),
      }),
    );
    expect(prisma.processingBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          processedRecords: 20,
          status: 'COMPLETED',
        }),
      }),
    );
    expect(prisma.uploadedFile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: {
          status: 'PROCESSED',
        },
      }),
    );
  });
});
