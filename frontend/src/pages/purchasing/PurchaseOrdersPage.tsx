import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import SortModal from '../../components/SortModal';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PaymentMethod } from '../../constants/paymentMethods';
import { useNotify } from '../../notifications/NotificationContext';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useSort } from '../../hooks/useSort';
import { FilterIcon, ListIcon, SortIcon } from '../../icons';

const COLUMNS: ColumnDef[] = [
  { key: 'orderNumber', label: 'Número' },
  { key: 'supplier', label: 'Fornecedor' },
  { key: 'orderDate', label: 'Data' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'status', label: 'Status' },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

interface Partner {
  id: string;
  name: string;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  costPrice: number;
}

interface OrderItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: Partner;
  orderDate: string;
  status: 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
  totalAmount: number;
  paymentMethod: PaymentMethod;
}

const emptyItem = (): OrderItem => ({ productId: '', quantity: '1', unitPrice: '0' });

export default function PurchaseOrdersPage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ kind: 'receive' | 'cancel'; ids: string[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const columns = useColumnVisibility('purchase-orders', COLUMNS);
  const sort = useSort('purchase-orders', COLUMNS, 'orderNumber');

  const [draftFilterNumber, setDraftFilterNumber] = useState('');
  const [draftFilterSupplierId, setDraftFilterSupplierId] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');
  const [draftFilterDate, setDraftFilterDate] = useState('');

  const [filterNumber, setFilterNumber] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  const load = () => {
    setLoading(true);
    apiClient
      .get<PurchaseOrder[]>('/purchase-orders')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiClient
      .get<Partner[]>('/partners')
      .then((res) => setSuppliers(res.data.filter((p: any) => p.type !== 'CUSTOMER' && p.active)));
    apiClient.get<Product[]>('/products').then((res) => setProducts(res.data.filter((p: any) => p.type === 'RAW_MATERIAL')));
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (filterNumber && !o.orderNumber.toLowerCase().includes(filterNumber.trim().toLowerCase())) return false;
    if (filterSupplierId && o.supplier?.id !== filterSupplierId) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    if (filterDate && o.orderDate !== filterDate) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterNumber || filterSupplierId || filterStatus || filterDate);

  const compareOrders = (a: PurchaseOrder, b: PurchaseOrder) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.sortKey) {
      case 'supplier':
        return (a.supplier?.name ?? '').localeCompare(b.supplier?.name ?? '') * dir;
      case 'orderDate':
        return a.orderDate.localeCompare(b.orderDate) * dir;
      case 'totalAmount':
        return (a.totalAmount - b.totalAmount) * dir;
      case 'status':
        return a.status.localeCompare(b.status) * dir;
      case 'orderNumber':
      default:
        return a.orderNumber.localeCompare(b.orderNumber) * dir;
    }
  };
  const sortedOrders = [...filteredOrders].sort(compareOrders);
  const visibleColumns = columns.orderedColumns.filter((c) => columns.isVisible(c.key));

  const renderCell = (key: string, o: PurchaseOrder) => {
    switch (key) {
      case 'orderNumber':
        return o.orderNumber;
      case 'supplier':
        return o.supplier?.name;
      case 'orderDate':
        return o.orderDate;
      case 'totalAmount':
        return `R$ ${o.totalAmount.toFixed(2)}`;
      case 'status':
        return <StatusBadge status={o.status} />;
      default:
        return null;
    }
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterNumber(draftFilterNumber);
    setFilterSupplierId(draftFilterSupplierId);
    setFilterStatus(draftFilterStatus);
    setFilterDate(draftFilterDate);
  };

  const clearFilters = () => {
    setDraftFilterNumber('');
    setDraftFilterSupplierId('');
    setDraftFilterStatus('');
    setDraftFilterDate('');
    setFilterNumber('');
    setFilterSupplierId('');
    setFilterStatus('');
    setFilterDate('');
  };

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
  const allSelectedAreDraft = selectedOrders.length > 0 && selectedOrders.every((o) => o.status === 'DRAFT');

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

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const total = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);

  const resetForm = () => {
    setSupplierId('');
    setOrderDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('PIX');
    setItems([emptyItem()]);
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
      await apiClient.post('/purchase-orders', {
        supplierId,
        orderDate,
        paymentMethod,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      });
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleOpenClick = () => {
    if (selectedIds.size !== 1) {
      notify('Selecione exatamente um pedido para abrir.');
      return;
    }
    navigate(`/purchase-orders/${[...selectedIds][0]}`);
  };

  const handleReceiptClick = () => {
    if (selectedIds.size !== 1) {
      notify('Selecione exatamente um pedido recebido para ver o recibo.');
      return;
    }
    const order = orders.find((o) => o.id === [...selectedIds][0]);
    if (!order || order.status !== 'RECEIVED') {
      notify('Só é possível ver o recibo de um pedido recebido.');
      return;
    }
    navigate(`/purchase-orders/${order.id}/receipt`);
  };

  const handleReceiveClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos um pedido em rascunho para marcar como recebido.');
      return;
    }
    if (!allSelectedAreDraft) {
      notify('Só é possível marcar como recebido em massa quando todos os selecionados estão em rascunho. Desmarque os que já foram recebidos ou cancelados.');
      return;
    }
    setBulkAction({ kind: 'receive', ids: selectedOrders.map((o) => o.id) });
  };

  const handleCancelClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos um pedido em rascunho para cancelar.');
      return;
    }
    if (!allSelectedAreDraft) {
      notify('Só é possível cancelar em massa quando todos os pedidos selecionados estão em rascunho. Desmarque os que já foram recebidos ou cancelados.');
      return;
    }
    setBulkAction({ kind: 'cancel', ids: selectedOrders.map((o) => o.id) });
  };

  const runBulkAction = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const endpoint = bulkAction.kind === 'receive' ? 'receive' : 'cancel';
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/purchase-orders/${id}/${endpoint}`);
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    load();
    if (failures > 0) {
      const verb = bulkAction.kind === 'receive' ? 'marcados como recebidos' : 'cancelados';
      notify(`${failures} de ${bulkAction.ids.length} pedido(s) não puderam ser ${verb}.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Pedidos de Compra</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Número</label>
          <input value={draftFilterNumber} onChange={(e) => setDraftFilterNumber(e.target.value)} placeholder="Ex.: PC-0001" />
        </div>
        <div className="filter-field">
          <label>Fornecedor</label>
          <select value={draftFilterSupplierId} onChange={(e) => setDraftFilterSupplierId(e.target.value)}>
            <option value="">Todos</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
        <div className="filter-field">
          <label>Data</label>
          <input type="date" value={draftFilterDate} onChange={(e) => setDraftFilterDate(e.target.value)} />
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
          className={`toolbar-btn${selectedIds.size !== 1 ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleOpenClick}
        >
          Abrir
        </button>
        <button
          className={`toolbar-btn${!allSelectedAreDraft ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleReceiveClick}
        >
          Receber
        </button>
        <button
          className={`toolbar-btn${!allSelectedAreDraft ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleCancelClick}
        >
          Cancelar
        </button>
        <button
          className={`toolbar-btn${selectedIds.size !== 1 ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleReceiptClick}
        >
          Recibo
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
              {visibleColumns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
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
                {visibleColumns.map((c) => (
                  <td key={c.key}>{renderCell(c.key, o)}</td>
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
        {!loading && filteredOrders.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhum pedido de compra encontrado para os filtros aplicados.' : 'Nenhum pedido de compra cadastrado.'}
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
          title={bulkAction.kind === 'receive' ? 'Marcar pedidos como recebidos' : 'Cancelar pedidos de compra'}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          <p>
            {bulkAction.kind === 'receive'
              ? `Marcar ${bulkAction.ids.length} pedido(s) de compra como recebido(s)? O estoque dos insumos será atualizado.`
              : `Cancelar ${bulkAction.ids.length} pedido(s) de compra selecionado(s)? Essa ação não pode ser desfeita.`}
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
        <Modal title="Novo Pedido de Compra" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Fornecedor *</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Data *</label>
                <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Forma de pagamento *</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {PAYMENT_METHOD_LABELS[pm]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <h3 style={{ fontSize: 13, marginBottom: 8 }}>Itens</h3>
            {items.map((it, idx) => (
              <div className="form-grid" key={idx} style={{ alignItems: 'end' }}>
                <div className="form-field">
                  <label>Insumo</label>
                  <select
                    value={it.productId}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      updateItem(idx, { productId: e.target.value, unitPrice: prod ? String(prod.costPrice) : it.unitPrice });
                    }}
                    required
                  >
                    <option value="">Selecione...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label>Quantidade</label>
                  <input type="number" step="0.0001" min="0.0001" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} required />
                </div>
                <div className="form-field">
                  <label>Preço unitário</label>
                  <input type="number" step="0.01" min="0" value={it.unitPrice} onChange={(e) => updateItem(idx, { unitPrice: e.target.value })} required />
                </div>
                <div className="form-field">
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setItems((prev) => [...prev, emptyItem()])}
              style={{ marginBottom: 14 }}
            >
              + Adicionar item
            </button>

            <p style={{ fontWeight: 600 }}>Total: R$ {total.toFixed(2)}</p>

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
