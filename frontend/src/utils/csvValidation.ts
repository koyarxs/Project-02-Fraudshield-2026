export interface CsvPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface CsvValidationResult {
  isValid: boolean;
  headers: string[];
  missingColumns: string[];
  duplicateHeaders: string[];
  dataRowCount: number;
  previewRows: CsvPreviewRow[];
  errors: string[];
}

export const REQUIRED_CSV_COLUMNS = [
  'transactionCode',
  'customerCode',
  'amount',
  'transactionDate',
  'transactionHour',
];

export const OPTIONAL_CSV_COLUMNS = [
  'currency',
  'originLocation',
  'destinationLocation',
];

export const CSV_TEMPLATE = [
  'transactionCode,customerCode,amount,transactionDate,transactionHour,currency,originLocation,destinationLocation',
  'TX-0001,CLI-001,750000,2026-07-20,10:15:00,CLP,Santiago,Santiago',
  'TX-0002,CLI-002,120000,2026-07-20,02:30:00,CLP,Valparaiso,Valparaiso',
].join('\n');

export function validateCsvContent(content: string): CsvValidationResult {
  const normalizedContent = content.replace(/^\uFEFF/, '');
  const lines = normalizedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return emptyResult(['El archivo está vacío.']);
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((header) =>
    header.trim().replace(/^\uFEFF/, ''),
  );
  const normalizedHeaders = headers.map((header) => header.trim());
  const errors: string[] = [];
  const missingColumns = REQUIRED_CSV_COLUMNS.filter(
    (column) => !normalizedHeaders.includes(column),
  );
  const duplicateHeaders = findDuplicates(normalizedHeaders);

  missingColumns.forEach((column) => {
    errors.push(`Falta la columna ${column}.`);
  });

  duplicateHeaders.forEach((column) => {
    errors.push(`La columna ${column} está duplicada.`);
  });

  const rawDataRows = lines.slice(1);
  const rows = rawDataRows
    .map((line, index) => ({
      rowNumber: index + 2,
      columns: splitCsvLine(line, delimiter).map((value) => value.trim()),
    }))
    .filter((row) => row.columns.some((value) => value.length > 0));

  if (rows.length === 0) {
    errors.push('El archivo CSV no contiene filas de datos.');
  }

  const seenTransactionCodes = new Set<string>();
  const previewRows: CsvPreviewRow[] = [];

  rows.forEach((row) => {
    const values = normalizedHeaders.reduce<Record<string, string>>(
      (record, header, index) => ({
        ...record,
        [header]: row.columns[index] ?? '',
      }),
      {},
    );

    validateRow(values, row.rowNumber, seenTransactionCodes, errors);

    if (previewRows.length < 5) {
      previewRows.push({
        rowNumber: row.rowNumber,
        values,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    headers: normalizedHeaders,
    missingColumns,
    duplicateHeaders,
    dataRowCount: rows.length,
    previewRows,
    errors,
  };
}

function emptyResult(errors: string[]): CsvValidationResult {
  return {
    isValid: false,
    headers: [],
    missingColumns: REQUIRED_CSV_COLUMNS,
    duplicateHeaders: [],
    dataRowCount: 0,
    previewRows: [],
    errors,
  };
}

function detectDelimiter(headerLine: string) {
  const candidates = [',', ';', '\t'];

  return candidates
    .map((delimiter) => ({
      delimiter,
      count: headerLine.split(delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);

  return values;
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
    }

    seen.add(value);
  });

  return Array.from(duplicates);
}

function validateRow(
  values: Record<string, string>,
  rowNumber: number,
  seenTransactionCodes: Set<string>,
  errors: string[],
) {
  const transactionCode = values.transactionCode?.trim();
  const customerCode = values.customerCode?.trim();
  const amount = values.amount?.trim();
  const transactionDate = values.transactionDate?.trim();
  const transactionHour = values.transactionHour?.trim();

  if (!transactionCode) {
    errors.push(`La fila ${rowNumber} no contiene transactionCode.`);
  } else if (seenTransactionCodes.has(transactionCode)) {
    errors.push(`El código ${transactionCode} está repetido.`);
  } else {
    seenTransactionCodes.add(transactionCode);
  }

  if (!customerCode) {
    errors.push(`La fila ${rowNumber} no contiene customerCode.`);
  }

  if (!amount || Number.isNaN(Number(amount)) || Number(amount) < 0) {
    errors.push(`La fila ${rowNumber} contiene un monto inválido.`);
  }

  if (!transactionDate || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    errors.push(`La fila ${rowNumber} tiene una fecha inválida.`);
  }

  if (
    !transactionHour ||
    !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(transactionHour)
  ) {
    errors.push(`La fila ${rowNumber} tiene una hora inválida.`);
  }
}
