import type { RiskLevel } from '../../types/processing';
import type { ApiTransaction } from '../../types/transaction';
import { formatDate } from '../../utils/formatDate';

export type TransactionRiskFilter = RiskLevel | 'Todos';

export interface TransactionFiltersState {
  risk: TransactionRiskFilter;
  query: string;
  rule: string;
}

export function normalizeRiskLevel(value?: string | null): RiskLevel | null {
  const normalized = value?.toUpperCase();

  if (normalized === 'ALTO') {
    return 'Alto';
  }

  if (normalized === 'MEDIO') {
    return 'Medio';
  }

  if (normalized === 'BAJO') {
    return 'Bajo';
  }

  return null;
}

export function fallback(value?: string | number | null) {
  const text = String(value ?? '').trim();

  return text || 'No disponible';
}

export function formatTransactionDateTime(transaction: ApiTransaction) {
  const date = formatDate(transaction.transactionDate);

  return transaction.transactionHour
    ? `${date} · ${transaction.transactionHour}`
    : date;
}

export function getTransactionLocation(transaction: ApiTransaction) {
  const origin = transaction.originLocation?.trim();
  const destination = transaction.destinationLocation?.trim();

  if (origin && destination && origin !== destination) {
    return `${origin} -> ${destination}`;
  }

  return origin || destination || 'No disponible';
}

export function getTransactionRule(transaction: ApiTransaction) {
  return transaction.riskResult?.observation ?? '';
}

export function filterTransactions(
  transactions: ApiTransaction[],
  filters: TransactionFiltersState,
) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const normalizedRule = filters.rule.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const riskLevel = normalizeRiskLevel(
      transaction.riskResult?.riskLevel?.name,
    );
    const matchesRisk =
      filters.risk === 'Todos' || riskLevel === filters.risk;
    const searchable = [
      transaction.transactionCode,
      transaction.customerCode,
      transaction.originLocation,
      transaction.destinationLocation,
    ]
      .join(' ')
      .toLowerCase();
    const rule = getTransactionRule(transaction).toLowerCase();

    return (
      matchesRisk &&
      searchable.includes(normalizedQuery) &&
      rule.includes(normalizedRule)
    );
  });
}
