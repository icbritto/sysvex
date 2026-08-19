import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import SortModal from '../../components/SortModal';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import { useNotify } from '../../notifications/NotificationContext';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useSort } from '../../hooks/useSort';
import { FilterIcon, ListIcon, SortIcon } from '../../icons';

const COLUMNS: ColumnDef[] = [
  { key: 'type', label: 'Tipo' },
  { key: 'description', label: 'Descrição' },
  { key: 'partner', label: 'Parceiro' },
  { key: 'amount', label: 'Valor' },
  { key: 'dueDate', label: 'Vencimento' },
  { key: 'status', label: 'Status' },
];

const TYPE_LABELS: Record<string, string> = {
  PAYABLE: 'A pagar',
  RECEIVABLE: 'A receber',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  PAID: 'Pago',
  CANCELLED: 'Cancelado',
};

interface Partner {
  id: string;
  name: string;
}

interface FinanceEntry {
  id: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  partner: Partner | null;
  amount: number;
  dueDate: string;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  paidDate: string | null;
}

export default function FinanceEntriesPage() {
  const notify = useNotify();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ kind: 'pay' | 'cancel'; ids: string[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const columns = useColumnVisibility('finance-entries', COLUMNS);
  const sort = useSort('finance-entries', COLUMNS, 'dueDate');

  const [draftFilterDescription, setDraftFilterDescription] = useState('');
  const [draftFilterType, setDraftFilterType] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');

  const [filterDescription, setFilterDescription] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [type, setType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [description, setDescription] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const load = () => {
    setLoading(true);
    apiClient
      .get<FinanceEntry[]>('/finance/entries')
      .then((res) => setEntries(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => {
    apiClient.get<Partner[]>('/partners').then((res) => setPartners(res.data));
  }, []);

  const filteredEntries = entries.filter((e) => {
    if (filterDescription && !e.description.toLowerCase().includes(filterDescription.trim().toLowerCase())) return false;
    if (filterType && e.type !== filterType) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterDescription || filterType || filterStatus);

  const compareEntries = (a: FinanceEntry, b: FinanceEntry) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.sortKey) {
      case 'type':
        return TYPE_LABELS[a.type].localeCompare(TYPE_LABELS[b.type]) * dir;
      case 'partner':
        return (a.partner?.name ?? '').localeCompare(b.partner?.name ?? '') * dir;
      case 'amount':
        return (a.amount - b.amount) * dir;
      case 'status':
        return a.status.localeCompare(b.status) * dir;
      case 'description':
        return a.description.localeCompare(b.description) * dir;
      case 'dueDate':
      default:
        return a.dueDate.localeCompare(b.dueDate) * dir;
    }
  };
  const sortedEntries = [...filteredEntries].sort(compareEntries);
  const visibleColumns = columns.orderedColumns.filter((c) => columns.isVisible(c.key));

  const renderCell = (key: string, e: FinanceEntry) => {
    switch (key) {
      case 'type':
        return TYPE_LABELS[e.type];
      case 'description':
        return e.description;
      case 'partner':
        return e.partner?.name ?? '–';
      case 'amount':
        return `R$ ${e.amount.toFixed(2)}`;
      case 'dueDate':
        return e.dueDate;
      case 'status':
        return <StatusBadge status={e.status} />;
      default:
        return null;
    }
  };

  const applyFilters = (ev: FormEvent) => {
    ev.preventDefault();
    setFilterDescription(draftFilterDescription);
    setFilterType(draftFilterType);
    setFilterStatus(draftFilterStatus);
  };

  const clearFilters = () => {
    setDraftFilterDescription('');
    setDraftFilterType('');
    setDraftFilterStatus('');
    setFilterDescription('');
    setFilterType('');
    setFilterStatus('');
  };

  const selectedEntries = entries.filter((e) => selectedIds.has(e.id));
  const allSelectedAreOpen = selectedEntries.length > 0 && selectedEntries.every((e) => e.status === 'OPEN');

  const selectOnly = (id: string) => setSelectedIds(new Set([id]));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (filteredEntries.length > 0 && filteredEntries.every((e) => prev.has(e.id))) return new Set();
      return new Set(filteredEntries.map((e) => e.id));
    });
  };

  const resetForm = () => {
    setType('PAYABLE');
    setDescription('');
    setPartnerId('');
    setAmount('');
    setDueDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/finance/entries', {
        type,
        description,
        partnerId: partnerId || undefined,
        amount: Number(amount),
        dueDate,
      });
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handlePayClick = () => {
    if (selectedEntries.length === 0) {
      notify('Selecione ao menos um lançamento em aberto para dar baixa.');
      return;
    }
    if (!allSelectedAreOpen) {
      notify('Só é possível dar baixa em massa quando todos os selecionados estão em aberto. Desmarque os que já foram pagos/recebidos ou cancelados.');
      return;
    }
    setBulkAction({ kind: 'pay', ids: selectedEntries.map((e) => e.id) });
  };

  const handleCancelClick = () => {
    if (selectedEntries.length === 0) {
      notify('Selecione ao menos um lançamento em aberto para cancelar.');
      return;
    }
    if (!allSelectedAreOpen) {
      notify('Só é possível cancelar em massa quando todos os selecionados estão em aberto. Desmarque os que já foram pagos/recebidos ou cancelados.');
      return;
    }
    setBulkAction({ kind: 'cancel', ids: selectedEntries.map((e) => e.id) });
  };

  const runBulkAction = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const endpoint = bulkAction.kind === 'pay' ? 'pay' : 'cancel';
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/finance/entries/${id}/${endpoint}`);
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    load();
    if (failures > 0) {
      const verb = bulkAction.kind === 'pay' ? 'baixados' : 'cancelados';
      notify(`${failures} de ${bulkAction.ids.length} lançamento(s) não puderam ser ${verb}.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Contas a Pagar & Receber</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Descrição</label>
          <input value={draftFilterDescription} onChange={(e) => setDraftFilterDescription(e.target.value)} placeholder="Buscar por descrição..." />
        </div>
        <div className="filter-field">
          <label>Tipo</label>
          <select value={draftFilterType} onChange={(e) => setDraftFilterType(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Status</label>
          <select value={draftFilterStatus} onChange={(e) => setDraftFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn--sm" title="Filtrar" aria-label="Filtrar">
          <FilterIcon size={14} />
        </button>
        {hasActiveFilters && (
          <button type="button" className="filter-bar__clear" onClick={clearFilters}>
            Limpar filtros
          </button>
        )}
      </form>

      <div className="toolbar">
        <button className="toolbar-btn" onClick={openCreateModal}>
          Criar
        </button>
        <button
          className={`toolbar-btn${!allSelectedAreOpen ? ' toolbar-btn--disabled' : ''}`}
          onClick={handlePayClick}
        >
          Dar Baixa
        </button>
        <button
          className={`toolbar-btn${!allSelectedAreOpen ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleCancelClick}
        >
          Cancelar
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowColumnsModal(true)}
          title="Colunas"
          aria-label="Colunas visíveis"
        >
          <ListIcon size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowSortModal(true)}
          title="Ordenar por"
          aria-label="Ordenar por"
        >
          <SortIcon size={16} />
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input
                  type="checkbox"
                  checked={filteredEntries.length > 0 && filteredEntries.every((e) => selectedIds.has(e.id))}
                  onChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
              {visibleColumns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((e) => (
              <tr
                key={e.id}
                data-selectable
                className={selectedIds.has(e.id) ? 'selected' : ''}
                onClick={() => selectOnly(e.id)}
              >
                <td onClick={(ev) => ev.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(e.id)}
                    onChange={() => toggleOne(e.id)}
                    aria-label={`Selecionar lançamento ${e.description}`}
                  />
                </td>
                {visibleColumns.map((c) => (
                  <td key={c.key}>{renderCell(c.key, e)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="loading-state">
            <Spinner />
          </div>
        )}
        {!loading && filteredEntries.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhum lançamento encontrado para os filtros aplicados.' : 'Nenhum lançamento cadastrado.'}
          </div>
        )}
      </div>

      {showColumnsModal && (
        <ColumnVisibilityModal
          orderedColumns={columns.orderedColumns}
          isVisible={columns.isVisible}
          onToggle={columns.toggle}
          onMoveUp={columns.moveUp}
          onMoveDown={columns.moveDown}
          onClose={() => setShowColumnsModal(false)}
        />
      )}

      {showSortModal && (
        <SortModal
          options={sort.options}
          sortKey={sort.sortKey}
          direction={sort.direction}
          onChange={sort.setSort}
          onClose={() => setShowSortModal(false)}
        />
      )}

      {bulkAction && (
        <Modal
          title={bulkAction.kind === 'pay' ? 'Dar baixa em lançamentos' : 'Cancelar lançamentos'}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          <p>
            {bulkAction.kind === 'pay'
              ? `Dar baixa em ${bulkAction.ids.length} lançamento(s) selecionado(s)?`
              : `Cancelar ${bulkAction.ids.length} lançamento(s) selecionado(s)? Essa ação não pode ser desfeita.`}
          </p>
          <div className="form-actions">
            <button className="btn" onClick={runBulkAction} disabled={bulkRunning}>
              {bulkRunning ? 'Processando...' : 'Confirmar'}
            </button>
            <button className="btn btn--secondary" onClick={() => setBulkAction(null)} disabled={bulkRunning}>
              Voltar
            </button>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title="Novo Lançamento Financeiro" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Tipo *</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                  <option value="PAYABLE">A pagar</option>
                  <option value="RECEIVABLE">A receber</option>
                </select>
              </div>
              <div className="form-field">
                <label>Descrição *</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Parceiro</label>
                <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Valor *</label>
                <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Vencimento *</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" type="submit">
                Salvar
              </button>
              <button className="btn btn--secondary" type="button" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
