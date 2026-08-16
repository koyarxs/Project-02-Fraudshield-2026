type CsvValue = string | number | null | undefined;

function escapeCsvValue(value: CsvValue) {
  const text = String(value ?? '');

  if (/[",\n\r;]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function exportRowsToCsv(
  rows: Array<Record<string, CsvValue>>,
  fileName: string,
) {
  if (rows.length === 0) {
    return false;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(';'),
    ),
  ].join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);

  return true;
}
