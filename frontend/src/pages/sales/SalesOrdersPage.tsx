import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import StatusBadge from '../../components/StatusBadge';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PaymentMethod } from '../../constants/paymentMethods';
import { useNotify } from '../../notifications/NotificationContext';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { FilterIcon, ListIcon } from '../../icons';

const COLUMNS: ColumnDef[] = [
  { key: 'orderNumber', label: 'Número' },
  { key: 'customer', label: 'Cliente' },
  { key: 'orderDate', label: 'Data' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'status', label: 'Status' },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  CONFIRMED: 'Confirmado',
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
  salePrice: number | null;
}

interface OrderItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: Partner;
  orderDate: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  totalAmount: number;
  paymentMethod: PaymentMethod;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

const emptyItem = (): OrderItem => ({ productId: '', quantity: '1', unitPrice: '0' });

export default function SalesOrdersPage() {
  const notify = useNotify();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ kind: 'confirm' | 'cancel'; ids: string[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const columns = useColumnVisibility('sales-orders', COLUMNS);

  const [draftFilterNumber, setDraftFilterNumber] = useState('');
  const [draftFilterCustomerId, setDraftFilterCustomerId] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');
  const [draftFilterDate, setDraftFilterDate] = useState('');

  const [filterNumber, setFilterNumber] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  const load = () => {
    apiClient.get<SalesOrder[]>('/sales-orders').then((res) => setOrders(res.data));
  };

  useEffect(() => {
    load();
    apiClient
      .get<Partner[]>('/partners')
      .then((res) => setCustomers(res.data.filter((p: any) => p.type !== 'SUPPLIER' && p.active)));
    apiClient.get<Product[]>('/products').then((res) => setProducts(res.data.filter((p: any) => p.type === 'FINISHED_GOOD')));
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (filterNumber && !o.orderNumber.toLowerCase().includes(filterNumber.trim().toLowerCase())) return false;
    if (filterCustomerId && o.customer?.id !== filterCustomerId) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    if (filterDate && o.orderDate !== filterDate) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterNumber || filterCustomerId || filterStatus || filterDate);

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterNumber(draftFilterNumber);
    setFilterCustomerId(draftFilterCustomerId);
    setFilterStatus(draftFilterStatus);
    setFilterDate(draftFilterDate);
  };

  const clearFilters = () => {
    setDraftFilterNumber('');
    setDraftFilterCustomerId('');
    setDraftFilterStatus('');
    setDraftFilterDate('');
    setFilterNumber('');
    setFilterCustomerId('');
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
    setCustomerId('');
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
      await apiClient.post('/sales-orders', {
        customerId,
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
    navigate(`/sales-orders/${[...selectedIds][0]}`);
  };

  const handleConfirmClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos um pedido em rascunho para confirmar.');
      return;
    }
    if (!allSelectedAreDraft) {
      notify('Só é possível confirmar em massa quando todos os pedidos selecionados estão em rascunho. Desmarque os que já foram confirmados ou cancelados.');
      return;
    }
    setBulkAction({ kind: 'confirm', ids: selectedOrders.map((o) => o.id) });
  };

  const handleCancelClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos um pedido em rascunho para cancelar.');
      return;
    }
    if (!allSelectedAreDraft) {
      notify('Só é possível cancelar em massa quando todos os pedidos selecionados estão em rascunho. Desmarque os que já foram confirmados ou cancelados.');
      return;
    }
    setBulkAction({ kind: 'cancel', ids: selectedOrders.map((o) => o.id) });
  };

  const runBulkAction = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const endpoint = bulkAction.kind === 'confirm' ? 'confirm' : 'cancel';
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/sales-orders/${id}/${endpoint}`);
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    load();
    if (failures > 0) {
      const verb = bulkAction.kind === 'confirm' ? 'confirmados' : 'cancelados';
      notify(`${failures} de ${bulkAction.ids.length} pedido(s) não puderam ser ${verb}.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Pedidos de Venda</h1>
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
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
          onClick={handleConfirmClick}
        >
          Confirmar
        </button>
        <button
          className={`toolbar-btn${!allSelectedAreDraft ? ' toolbar-btn--disabled' : ''}`}
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
              {columns.isVisible('orderDate') && <th>Data</th>}
              {columns.isVisible('totalAmount') && <th>Total</th>}
              {columns.isVisible('status') && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
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
                {columns.isVisible('status') && (
                  <td>
                    <StatusBadge status={o.status} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhum pedido de venda encontrado para os filtros aplicados.' : 'Nenhum pedido de venda cadastrado.'}
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

      {bulkAction && (
        <Modal
          title={bulkAction.kind === 'confirm' ? 'Confirmar pedidos de venda' : 'Cancelar pedidos de venda'}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          <p>
            {bulkAction.kind === 'confirm'
              ? `Confirmar ${bulkAction.ids.length} pedido(s) de venda selecionado(s)? O estoque dos produtos será baixado e os títulos de contas a receber serão gerados.`
              : `Cancelar ${bulkAction.ids.length} pedido(s) de venda selecionado(s)? Essa ação não pode ser desfeita.`}
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
        <Modal title="Novo Pedido de Venda" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Cliente *</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
              <div className="form-grid" key={idx}>
                <div className="form-field">
                  <label>Produto</label>
                  <select
                    value={it.productId}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      updateItem(idx, {
                        productId: e.target.value,
                        unitPrice: prod?.salePrice != null ? String(prod.salePrice) : it.unitPrice,
                      });
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
