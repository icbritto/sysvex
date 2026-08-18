import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import StatusBadge from '../../components/StatusBadge';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useSort } from '../../hooks/useSort';
import SortModal from '../../components/SortModal';
import { FilterIcon, ListIcon, SortIcon } from '../../icons';
import { useNotify } from '../../notifications/NotificationContext';

const COLUMNS: ColumnDef[] = [
  { key: 'orderNumber', label: 'Número' },
  { key: 'customer', label: 'Cliente' },
  { key: 'orderDate', label: 'Data do pedido' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'deliveryStatus', label: 'Status da entrega' },
  { key: 'shippedAt', label: 'Enviado em' },
  { key: 'deliveredAt', label: 'Entregue em' },
  { key: 'address', label: 'Endereço' },
];

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
};

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string; address: string | null };
  orderDate: string;
  totalAmount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  deliveryStatus: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  shippedAt: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
}

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export default function DeliveryTrackingPage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ kind: 'ship' | 'deliver'; ids: string[] } | null>(null);
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const columns = useColumnVisibility('delivery-tracking', COLUMNS);
  const sort = useSort('delivery-tracking', COLUMNS, 'orderNumber');

  const [draftFilterNumber, setDraftFilterNumber] = useState('');
  const [draftFilterCustomerId, setDraftFilterCustomerId] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');
  const [filterNumber, setFilterNumber] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    apiClient.get<SalesOrder[]>('/sales-orders').then((res) => setOrders(res.data.filter((o) => o.status === 'CONFIRMED')));
  };

  useEffect(load, []);

  const customerOptions = [...new Map(orders.map((o) => [o.customer.id, o.customer.name])).entries()];

  const filteredOrders = orders.filter((o) => {
    if (filterNumber && !o.orderNumber.toLowerCase().includes(filterNumber.trim().toLowerCase())) return false;
    if (filterCustomerId && o.customer?.id !== filterCustomerId) return false;
    if (filterStatus && o.deliveryStatus !== filterStatus) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterNumber || filterCustomerId || filterStatus);

  const compareOrders = (a: SalesOrder, b: SalesOrder) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.sortKey) {
      case 'customer':
        return (a.customer?.name ?? '').localeCompare(b.customer?.name ?? '') * dir;
      case 'orderDate':
        return a.orderDate.localeCompare(b.orderDate) * dir;
      case 'totalAmount':
        return (a.totalAmount - b.totalAmount) * dir;
      case 'deliveryStatus':
        return a.deliveryStatus.localeCompare(b.deliveryStatus) * dir;
      case 'shippedAt':
        return (new Date(a.shippedAt ?? 0).getTime() - new Date(b.shippedAt ?? 0).getTime()) * dir;
      case 'deliveredAt':
        return (new Date(a.deliveredAt ?? 0).getTime() - new Date(b.deliveredAt ?? 0).getTime()) * dir;
      case 'address':
        return (a.customer?.address ?? '').localeCompare(b.customer?.address ?? '') * dir;
      case 'orderNumber':
      default:
        return a.orderNumber.localeCompare(b.orderNumber) * dir;
    }
  };
  const sortedOrders = [...filteredOrders].sort(compareOrders);

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterNumber(draftFilterNumber);
    setFilterCustomerId(draftFilterCustomerId);
    setFilterStatus(draftFilterStatus);
  };

  const clearFilters = () => {
    setDraftFilterNumber('');
    setDraftFilterCustomerId('');
    setDraftFilterStatus('');
    setFilterNumber('');
    setFilterCustomerId('');
    setFilterStatus('');
  };

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
  const allSelectedPending = selectedOrders.length > 0 && selectedOrders.every((o) => o.deliveryStatus === 'PENDING');
  const allSelectedShipped = selectedOrders.length > 0 && selectedOrders.every((o) => o.deliveryStatus === 'SHIPPED');

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
      if (filteredOrders.length > 0 && filteredOrders.every((o) => prev.has(o.id))) return new Set();
      return new Set(filteredOrders.map((o) => o.id));
    });
  };

  const handleOpenClick = () => {
    if (selectedIds.size !== 1) {
      notify('Selecione exatamente um pedido para abrir.');
      return;
    }
    navigate(`/sales-orders/${[...selectedIds][0]}`);
  };

  const handleShipClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos um pedido pendente para marcar como enviado.');
      return;
    }
    if (!allSelectedPending) {
      notify('Só é possível marcar como enviado em massa quando todos os selecionados estão pendentes.');
      return;
    }
    setBulkNotes('');
    setError(null);
    setBulkAction({ kind: 'ship', ids: selectedOrders.map((o) => o.id) });
  };

  const handleDeliverClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos um pedido enviado para marcar como entregue.');
      return;
    }
    if (!allSelectedShipped) {
      notify('Só é possível marcar como entregue em massa quando todos os selecionados estão enviados.');
      return;
    }
    setBulkNotes('');
    setError(null);
    setBulkAction({ kind: 'deliver', ids: selectedOrders.map((o) => o.id) });
  };

  const runBulkAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!bulkAction) return;
    setBulkRunning(true);
    setError(null);
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/sales-orders/${id}/${bulkAction.kind}`, { notes: bulkNotes || undefined });
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    load();
    if (failures > 0) {
      const verb = bulkAction.kind === 'ship' ? 'marcados como enviados' : 'marcados como entregues';
      notify(`${failures} de ${bulkAction.ids.length} pedido(s) não puderam ser ${verb}.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Acompanhamento de Entregas</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Número</label>
          <input value={draftFilterNumber} onChange={(e) => setDraftFilterNumber(e.target.value)} placeholder="Ex.: PV-0001" />
        </div>
        <div className="filter-field">
          <label>Cliente</label>
          <select value={draftFilterCustomerId} onChange={(e) => setDraftFilterCustomerId(e.target.value)}>
            <option value="">Todos</option>
            {customerOptions.map(([id, customerName]) => (
              <option key={id} value={id}>
                {customerName}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Status da entrega</label>
          <select value={draftFilterStatus} onChange={(e) => setDraftFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => (
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
        <button
          className={`toolbar-btn${selectedIds.size !== 1 ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleOpenClick}
        >
          Abrir
        </button>
        <button
          className={`toolbar-btn${!allSelectedPending ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleShipClick}
        >
          Marcar como Enviado
        </button>
        <button
          className={`toolbar-btn${!allSelectedShipped ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleDeliverClick}
        >
          Marcar como Entregue
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
                  checked={filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o.id))}
                  onChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </th>
              {columns.isVisible('orderNumber') && <th>Número</th>}
              {columns.isVisible('customer') && <th>Cliente</th>}
              {columns.isVisible('orderDate') && <th>Data do pedido</th>}
              {columns.isVisible('totalAmount') && <th>Total</th>}
              {columns.isVisible('deliveryStatus') && <th>Status da entrega</th>}
              {columns.isVisible('shippedAt') && <th>Enviado em</th>}
              {columns.isVisible('deliveredAt') && <th>Entregue em</th>}
              {columns.isVisible('address') && <th>Endereço</th>}
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((o) => (
              <tr
                key={o.id}
                data-selectable
                className={selectedIds.has(o.id) ? 'selected' : ''}
                onClick={() => selectOnly(o.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(o.id)}
                    onChange={() => toggleOne(o.id)}
                    aria-label={`Selecionar pedido ${o.orderNumber}`}
                  />
                </td>
                {columns.isVisible('orderNumber') && <td>{o.orderNumber}</td>}
                {columns.isVisible('customer') && <td>{o.customer?.name}</td>}
                {columns.isVisible('orderDate') && <td>{o.orderDate}</td>}
                {columns.isVisible('totalAmount') && <td>R$ {o.totalAmount.toFixed(2)}</td>}
                {columns.isVisible('deliveryStatus') && (
                  <td>
                    <StatusBadge status={o.deliveryStatus} />
                  </td>
                )}
                {columns.isVisible('shippedAt') && <td>{formatDate(o.shippedAt)}</td>}
                {columns.isVisible('deliveredAt') && <td>{formatDate(o.deliveredAt)}</td>}
                {columns.isVisible('address') && <td>{o.customer?.address ?? '–'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhum pedido encontrado para os filtros aplicados.' : 'Nenhum pedido confirmado aguardando entrega.'}
          </div>
        )}
      </div>

      {showColumnsModal && (
        <ColumnVisibilityModal
          columns={COLUMNS}
          isVisible={columns.isVisible}
          onToggle={columns.toggle}
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
          title={bulkAction.kind === 'ship' ? `Marcar ${bulkAction.ids.length} pedido(s) como enviado` : `Marcar ${bulkAction.ids.length} pedido(s) como entregue`}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={runBulkAction}>
            <div className="form-field">
              <label>Observações (opcional, aplicada a todos os pedidos selecionados)</label>
              <input
                type="text"
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Ex.: transportadora, código de rastreio..."
              />
            </div>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={bulkRunning}>
                {bulkRunning ? 'Processando...' : 'Confirmar'}
              </button>
              <button className="btn btn--secondary" type="button" onClick={() => setBulkAction(null)} disabled={bulkRunning}>
                Voltar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
