import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FiActivity,
  FiCheckCircle,
  FiEdit3,
  FiEye,
  FiList,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import DashboardLayout from '../components/layout/DashboardLayout';
import auditLogService, { type ApiAuditLog } from '../services/audit-log.service';
import controlListService, {
  type ApiControlListEntry,
  type ControlListPayload,
} from '../services/control-list.service';
import { formatDate, formatNumber } from '../utils/formatDate';

type ListType = 'WATCHLIST' | 'ALLOWLIST';
type ListFilter = 'TODOS' | ListType;
type IdentifierType = 'CUSTOMER' | 'TRANSACTION' | 'LOCATION';
type StatusFilter = 'TODOS' | 'ACTIVA' | 'INACTIVA';
type SortKey = 'updatedAt' | 'identifier' | 'listType' | 'identifierType';
type SortDirection = 'asc' | 'desc';

interface FormState {
  listType: ListType;
  identifierType: IdentifierType;
  identifier: string;
  reason: string;
  active: boolean;
}

interface FiltersState {
  listType: ListFilter;
  identifierType: 'TODOS' | IdentifierType;
  status: StatusFilter;
  query: string;
}

const initialForm: FormState = {
  listType: 'WATCHLIST',
  identifierType: 'CUSTOMER',
  identifier: '',
  reason: '',
  active: true,
};

const initialFilters: FiltersState = {
  listType: 'WATCHLIST',
  identifierType: 'TODOS',
  status: 'TODOS',
  query: '',
};

const pageSizeOptions = [8, 15, 30];

const identifierLabels: Record<IdentifierType, string> = {
  CUSTOMER: 'Cliente',
  TRANSACTION: 'Transaccion',
  LOCATION: 'Ubicacion',
};

const listLabels: Record<ListType, string> = {
  WATCHLIST: 'Watchlist',
  ALLOWLIST: 'Allowlist',
};

export default function ControlLists() {
  const [entries, setEntries] = useState<ApiControlListEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] =
    useState<ApiControlListEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);

  const loadControlLists = async () => {
    setIsRefreshing(true);
    setError('');

    const [entriesResult, auditResult] = await Promise.allSettled([
      controlListService.findAll(),
      auditLogService.findAll(),
    ]);

    if (entriesResult.status === 'fulfilled') {
      setEntries(entriesResult.value);
    } else {
      setError('No fue posible cargar las listas de control.');
    }

    if (auditResult.status === 'fulfilled') {
      setAuditLogs(
        auditResult.value.filter((log) => log.module === 'CONTROL_LIST'),
      );
    } else {
      setAuditLogs([]);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    void loadControlLists();
  }, []);

  const kpis = useMemo(() => {
    const lastUpdated = entries
      .map((entry) => entry.updatedAt)
      .sort((first, second) => new Date(second).getTime() - new Date(first).getTime())[0];

    return {
      total: entries.length,
      activeWatchlist: entries.filter(
        (entry) => entry.listType === 'WATCHLIST' && entry.active,
      ).length,
      activeAllowlist: entries.filter(
        (entry) => entry.listType === 'ALLOWLIST' && entry.active,
      ).length,
      lastUpdated,
    };
  }, [entries]);

  const filteredEntries = useMemo(
    () => filterEntries(entries, filters),
    [entries, filters],
  );

  const sortedEntries = useMemo(
    () => sortEntries(filteredEntries, sortKey, sortDirection),
    [filteredEntries, sortDirection, sortKey],
  );

  const totalPages = Math.max(1, Math.ceil(sortedEntries.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleEntries = sortedEntries.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const recentActivity = useMemo(
    () =>
      auditLogs
        .filter((log) =>
          [
            'UPSERT_CONTROL_LIST_ENTRY',
            'UPDATE_CONTROL_LIST_ENTRY',
            'DELETE_CONTROL_LIST_ENTRY',
          ].includes(log.action),
        )
        .slice(0, 6),
    [auditLogs],
  );

  const setFilter = (key: keyof FiltersState, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      ...initialFilters,
      listType: filters.listType,
    });
    setCurrentPage(1);
  };

  const handleTabChange = (listType: ListType) => {
    setFilters((current) => ({
      ...current,
      listType,
    }));
    setForm((current) => ({
      ...current,
      listType,
    }));
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setError('');

    const validationError = validateForm(form, entries, editingEntryId);

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const payload: ControlListPayload = {
        listType: form.listType,
        identifierType: form.identifierType,
        identifier: form.identifier.trim(),
        reason: form.reason.trim(),
        active: editingEntryId ? form.active : true,
      };

      if (editingEntryId) {
        await controlListService.update(editingEntryId, payload);
      } else {
        await controlListService.create(payload);
      }

      setEditingEntryId(null);
      setForm({
        ...initialForm,
        listType: form.listType,
      });
      setMessage(
        editingEntryId
          ? 'Entrada actualizada correctamente.'
          : 'Entrada registrada correctamente.',
      );
      await loadControlLists();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (entry: ApiControlListEntry) => {
    setEditingEntryId(entry.id);
    setSelectedEntry(null);
    setForm({
      listType: entry.listType,
      identifierType: entry.identifierType,
      identifier: entry.identifier,
      reason: entry.reason ?? '',
      active: entry.active,
    });
    setMessage('');
    setError('');
  };

  const cancelEditing = () => {
    setEditingEntryId(null);
    setForm({
      ...initialForm,
      listType: filters.listType === 'ALLOWLIST' ? 'ALLOWLIST' : 'WATCHLIST',
    });
    setMessage('');
    setError('');
  };

  const toggleEntry = async (entry: ApiControlListEntry) => {
    setError('');
    setMessage('');
    setIsSaving(true);

    try {
      await controlListService.update(entry.id, {
        active: !entry.active,
      });
      setMessage(
        entry.active
          ? 'Entrada desactivada correctamente.'
          : 'Entrada activada correctamente.',
      );
      await loadControlLists();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const removeEntry = async (entry: ApiControlListEntry) => {
    setError('');
    setMessage('');

    const confirmed = window.confirm(
      `Eliminar ${listLabels[entry.listType]} ${entry.identifierType}:${entry.identifier}?`,
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);

    try {
      await controlListService.remove(entry.id);
      setMessage('Entrada eliminada correctamente.');
      await loadControlLists();
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <section className="app-card rounded-[24px] p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Listas de control
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-950">
                Watchlist y allowlist para apoyo operacional.
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Estas listas registran identificadores relevantes para revision
                y trazabilidad. Son apoyo operacional y no determinan fraude
                automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadControlLists()}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Actualizar
            </button>
          </div>
        </section>

        {isLoading ? (
          <ControlListsSkeleton />
        ) : error && entries.length === 0 ? (
          <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadControlLists()}
                className="rounded-2xl bg-red-700 px-4 py-2 text-white"
              >
                Reintentar
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ControlListKpi
                title="Entradas totales"
                value={kpis.total}
                description="Registros persistidos en PostgreSQL."
                icon={FiList}
                tone="blue"
              />
              <ControlListKpi
                title="Watchlist activas"
                value={kpis.activeWatchlist}
                description="Identificadores bajo observacion."
                icon={FiShield}
                tone="red"
              />
              <ControlListKpi
                title="Allowlist activas"
                value={kpis.activeAllowlist}
                description="Identificadores permitidos para apoyo."
                icon={FiCheckCircle}
                tone="emerald"
              />
              <ControlListKpi
                title="Ultima actualizacion"
                value={kpis.lastUpdated ? formatDate(kpis.lastUpdated) : 'Sin datos'}
                description="Movimiento mas reciente registrado."
                icon={FiActivity}
                tone="cyan"
              />
            </section>

            <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
              <ControlListForm
                form={form}
                editingEntryId={editingEntryId}
                isSaving={isSaving}
                message={message}
                error={error}
                onChange={(patch) =>
                  setForm((current) => ({
                    ...current,
                    ...patch,
                  }))
                }
                onSubmit={handleSubmit}
                onCancel={cancelEditing}
              />

              <section className="app-card rounded-[24px] p-5 lg:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    {(['WATCHLIST', 'ALLOWLIST'] as ListType[]).map((tab) => {
                      const isActive = filters.listType === tab;

                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => handleTabChange(tab)}
                          className={[
                            'rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100',
                            isActive
                              ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/20'
                              : 'border border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700',
                          ].join(' ')}
                        >
                          {listLabels[tab]}
                        </button>
                      );
                    })}
                  </div>

                  <ControlListFilters
                    filters={filters}
                    onChange={setFilter}
                    onClear={clearFilters}
                  />
                </div>

                {visibleEntries.length === 0 ? (
                  <EmptyState text="No hay entradas que coincidan con los filtros." />
                ) : (
                  <>
                    <ControlListTable
                      entries={visibleEntries}
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      onView={setSelectedEntry}
                      onEdit={startEditing}
                      onToggle={(entry) => void toggleEntry(entry)}
                      onRemove={(entry) => void removeEntry(entry)}
                    />
                    <Pagination
                      page={safePage}
                      pageSize={pageSize}
                      totalPages={totalPages}
                      totalRecords={sortedEntries.length}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(value) => {
                        setPageSize(value);
                        setCurrentPage(1);
                      }}
                    />
                  </>
                )}
              </section>
            </div>

            <RecentControlListActivity logs={recentActivity} />
          </>
        )}
      </div>

      {selectedEntry ? (
        <EntryDetailDrawer
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={() => startEditing(selectedEntry)}
          onToggle={() => void toggleEntry(selectedEntry)}
        />
      ) : null}
    </DashboardLayout>
  );
}

function ControlListForm({
  form,
  editingEntryId,
  isSaving,
  message,
  error,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: FormState;
  editingEntryId: number | null;
  isSaving: boolean;
  message: string;
  error: string;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">
        {editingEntryId ? 'Editar entrada' : 'Nueva entrada'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Registra identificadores de apoyo operacional. El motivo es obligatorio
        para conservar trazabilidad.
      </p>

      {editingEntryId ? (
        <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Editando entrada #{editingEntryId}.
        </p>
      ) : null}

      <div className="mt-5 space-y-4">
        <SelectField
          label="Lista"
          value={form.listType}
          options={[
            { label: 'Watchlist', value: 'WATCHLIST' },
            { label: 'Allowlist', value: 'ALLOWLIST' },
          ]}
          onChange={(value) => onChange({ listType: value as ListType })}
        />
        <SelectField
          label="Tipo de identificador"
          value={form.identifierType}
          options={[
            { label: 'Cliente', value: 'CUSTOMER' },
            { label: 'Transaccion', value: 'TRANSACTION' },
            { label: 'Ubicacion', value: 'LOCATION' },
          ]}
          onChange={(value) =>
            onChange({ identifierType: value as IdentifierType })
          }
        />
        <TextField
          label="Identificador"
          value={form.identifier}
          onChange={(identifier) => onChange({ identifier })}
          placeholder="Ej: cliente_001"
        />
        <label className="block text-sm font-semibold text-slate-700">
          Motivo obligatorio
          <textarea
            value={form.reason}
            onChange={(event) => onChange({ reason: event.target.value })}
            rows={4}
            minLength={8}
            required
            placeholder="Describe por que este identificador debe quedar registrado."
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        {editingEntryId ? (
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Entrada activa
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => onChange({ active: event.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
            />
          </label>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving
            ? 'Guardando...'
            : editingEntryId
              ? 'Actualizar entrada'
              : 'Guardar entrada'}
        </button>
        {editingEntryId ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ControlListFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: FiltersState;
  onChange: (key: keyof FiltersState, value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(3,minmax(130px,1fr))_minmax(220px,1.4fr)]">
      <FilterField label="Lista">
        <select
          value={filters.listType}
          onChange={(event) => onChange('listType', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="TODOS">Todas</option>
          <option value="WATCHLIST">Watchlist</option>
          <option value="ALLOWLIST">Allowlist</option>
        </select>
      </FilterField>
      <FilterField label="Tipo">
        <select
          value={filters.identifierType}
          onChange={(event) => onChange('identifierType', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="TODOS">Todos</option>
          <option value="CUSTOMER">Cliente</option>
          <option value="TRANSACTION">Transaccion</option>
          <option value="LOCATION">Ubicacion</option>
        </select>
      </FilterField>
      <FilterField label="Estado">
        <select
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          <option value="TODOS">Todos</option>
          <option value="ACTIVA">Activa</option>
          <option value="INACTIVA">Inactiva</option>
        </select>
      </FilterField>
      <FilterField label="Busqueda">
        <div className="flex gap-2">
          <span className="relative min-w-0 flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.query}
              onChange={(event) => onChange('query', event.target.value)}
              placeholder="Identificador o motivo"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </span>
          <button
            type="button"
            onClick={onClear}
            className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Limpiar
          </button>
        </div>
      </FilterField>
    </div>
  );
}

function ControlListTable({
  entries,
  sortKey,
  sortDirection,
  onSort,
  onView,
  onEdit,
  onToggle,
  onRemove,
}: {
  entries: ApiControlListEntry[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onView: (entry: ApiControlListEntry) => void;
  onEdit: (entry: ApiControlListEntry) => void;
  onToggle: (entry: ApiControlListEntry) => void;
  onRemove: (entry: ApiControlListEntry) => void;
}) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[980px] divide-y divide-slate-200 bg-white">
        <thead className="bg-slate-50">
          <tr>
            <SortableHeader label="Lista" id="listType" sortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableHeader label="Tipo" id="identifierType" sortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <SortableHeader label="Identificador" id="identifier" sortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Motivo
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Estado
            </th>
            <SortableHeader label="Fecha" id="updatedAt" sortKey={sortKey} direction={sortDirection} onSort={onSort} />
            <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr key={entry.id} className="align-top hover:bg-blue-50/40">
              <td className="whitespace-nowrap px-3 py-2.5">
                <ListBadge listType={entry.listType} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                {identifierLabels[entry.identifierType]}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-950">
                {entry.identifier}
              </td>
              <td className="min-w-72 px-3 py-2.5 text-sm leading-5 text-slate-700">
                {entry.reason ?? 'No disponible'}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <StatusBadge active={entry.active} />
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-sm text-slate-700">
                {formatDate(entry.updatedAt)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <div className="flex flex-nowrap gap-1.5">
                  <ActionButton icon={FiEye} label="Ver" onClick={() => onView(entry)} />
                  <ActionButton icon={FiEdit3} label="Editar" onClick={() => onEdit(entry)} />
                  <ActionButton
                    icon={FiRefreshCw}
                    label={entry.active ? 'Desactivar' : 'Activar'}
                    onClick={() => onToggle(entry)}
                  />
                  <ActionButton
                    icon={FiTrash2}
                    label="Eliminar"
                    tone="danger"
                    onClick={() => onRemove(entry)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentControlListActivity({ logs }: { logs: ApiAuditLog[] }) {
  return (
    <section className="app-card rounded-[24px] p-5 lg:p-6">
      <h2 className="text-lg font-bold text-slate-950">Actividad reciente</h2>
      {logs.length === 0 ? (
        <EmptyState text="No hay actividad reciente de listas de control." />
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {logs.map((log) => (
            <article
              key={log.id}
              className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">
                  {log.action}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {log.detail ?? 'Sin detalle'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {log.user?.name ?? log.user?.email ?? 'Sistema'}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EntryDetailDrawer({
  entry,
  onClose,
  onEdit,
  onToggle,
}: {
  entry: ApiControlListEntry;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/35 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="control-list-detail-title"
    >
      <div className="ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Detalle de entrada
            </p>
            <h2
              id="control-list-detail-title"
              className="mt-2 text-2xl font-bold text-slate-950"
            >
              {entry.identifier}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Cerrar detalle"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <dl className="divide-y divide-slate-200 border-y border-slate-200">
            <DetailRow label="Lista" value={listLabels[entry.listType]} />
            <DetailRow
              label="Tipo"
              value={identifierLabels[entry.identifierType]}
            />
            <DetailRow label="Identificador" value={entry.identifier} />
            <DetailRow label="Estado" value={entry.active ? 'Activa' : 'Inactiva'} />
            <DetailRow label="Creada" value={formatDate(entry.createdAt)} />
            <DetailRow label="Actualizada" value={formatDate(entry.updatedAt)} />
            <DetailRow
              label="Creada por"
              value={entry.createdBy?.name ?? entry.createdBy?.email ?? 'Sistema'}
            />
          </dl>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-950">Motivo</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {entry.reason ?? 'No disponible'}
            </p>
          </section>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-200 p-5">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            {entry.active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ControlListKpi({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: IconType;
  tone: 'blue' | 'red' | 'emerald' | 'cyan';
}) {
  const tones = {
    blue: {
      indicator: 'bg-blue-600',
      icon: 'border-blue-100 bg-blue-50 text-blue-700',
    },
    red: {
      indicator: 'bg-red-500',
      icon: 'border-red-100 bg-red-50 text-red-700',
    },
    emerald: {
      indicator: 'bg-emerald-500',
      icon: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    },
    cyan: {
      indicator: 'bg-cyan-500',
      icon: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    },
  };

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80">
      <span className={`absolute inset-x-0 top-0 h-1 ${tones[tone].indicator}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${tones[tone].icon}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="relative mt-4 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </article>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={2}
        required
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SortableHeader({
  label,
  id,
  sortKey,
  direction,
  onSort,
}: {
  label: string;
  id: SortKey;
  sortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = id === sortKey;

  return (
    <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      <button
        type="button"
        onClick={() => onSort(id)}
        className="inline-flex items-center gap-1 hover:text-blue-700"
      >
        {label}
        {active ? (direction === 'asc' ? '↑' : '↓') : null}
      </button>
    </th>
  );
}

function ActionButton({
  icon: Icon,
  label,
  tone = 'default',
  onClick,
}: {
  icon: IconType;
  label: string;
  tone?: 'default' | 'danger';
  onClick: () => void;
}) {
  const classes =
    tone === 'danger'
      ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold ${classes}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

function ListBadge({ listType }: { listType: ListType }) {
  const classes =
    listType === 'WATCHLIST'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${classes}`}>
      {listLabels[listType]}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      }`}
    >
      {active ? 'Activa' : 'Inactiva'}
    </span>
  );
}

function Pagination({
  page,
  pageSize,
  totalPages,
  totalRecords,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Pagina {page} de {totalPages} - {formatNumber(totalRecords)} entradas
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option} por pagina
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)]">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-semibold text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function ControlListsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="skeleton h-4 w-28 rounded-full" />
            <div className="skeleton mt-4 h-9 w-20 rounded-xl" />
            <div className="skeleton mt-5 h-4 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="skeleton h-96 rounded-[24px]" />
    </div>
  );
}

function filterEntries(entries: ApiControlListEntry[], filters: FiltersState) {
  const query = filters.query.trim().toLowerCase();

  return entries.filter((entry) => {
    const searchable = [
      entry.listType,
      entry.identifierType,
      entry.identifier,
      entry.reason,
      entry.createdBy?.name,
      entry.createdBy?.email,
    ]
      .join(' ')
      .toLowerCase();

    return (
      (filters.listType === 'TODOS' || entry.listType === filters.listType) &&
      (filters.identifierType === 'TODOS' ||
        entry.identifierType === filters.identifierType) &&
      (filters.status === 'TODOS' ||
        (filters.status === 'ACTIVA' ? entry.active : !entry.active)) &&
      searchable.includes(query)
    );
  });
}

function sortEntries(
  entries: ApiControlListEntry[],
  sortKey: SortKey,
  direction: SortDirection,
) {
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...entries].sort((first, second) => {
    if (sortKey === 'updatedAt') {
      return (
        (new Date(first.updatedAt).getTime() -
          new Date(second.updatedAt).getTime()) *
        multiplier
      );
    }

    return String(first[sortKey]).localeCompare(String(second[sortKey]), 'es-CL') * multiplier;
  });
}

function validateForm(
  form: FormState,
  entries: ApiControlListEntry[],
  editingEntryId: number | null,
) {
  const identifier = form.identifier.trim();
  const reason = form.reason.trim();

  if (identifier.length < 2) {
    return 'Ingresa un identificador valido.';
  }

  if (reason.length < 8) {
    return 'El motivo es obligatorio y debe tener al menos 8 caracteres.';
  }

  const duplicate = entries.find(
    (entry) =>
      entry.id !== editingEntryId &&
      entry.listType === form.listType &&
      entry.identifierType === form.identifierType &&
      entry.identifier.trim().toLowerCase() === identifier.toLowerCase(),
  );

  if (duplicate) {
    return `Ya existe una entrada ${listLabels[duplicate.listType]} para ${duplicate.identifierType}:${duplicate.identifier}.`;
  }

  return '';
}

function getRequestErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response
      ?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data
      .message;
  }

  return 'No fue posible completar la operacion.';
}
