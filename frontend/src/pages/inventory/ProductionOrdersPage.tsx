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
  { key: 'orderNumber', label: 'Número' },
  { key: 'product', label: 'Produto' },
  { key: 'recipe', label: 'Receita' },
  { key: 'quantity', label: 'Quantidade' },
  { key: 'plannedDate', label: 'Data planejada' },
  { key: 'totalCost', label: 'Custo total' },
  { key: 'status', label: 'Status' },
];

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planejada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface BomRecipe {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  product: Product;
  recipe: BomRecipe | null;
  quantity: number;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
  plannedDate: string;
  completedDate: string | null;
  totalCost: number | null;
}

export default function ProductionOrdersPage() {
  const notify = useNotify();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<{ kind: 'complete' | 'cancel'; ids: string[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const columns = useColumnVisibility('production-orders', COLUMNS);
  const sort = useSort('production-orders', COLUMNS, 'orderNumber');

  const [draftFilterNumber, setDraftFilterNumber] = useState('');
  const [draftFilterProductId, setDraftFilterProductId] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');

  const [filterNumber, setFilterNumber] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [productId, setProductId] = useState('');
  const [recipes, setRecipes] = useState<BomRecipe[]>([]);
  const [recipeId, setRecipeId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));

  const load = () => {
    setLoading(true);
    apiClient
      .get<ProductionOrder[]>('/production-orders')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    apiClient.get<Product[]>('/products').then((res) => setProducts(res.data.filter((p: any) => p.type === 'FINISHED_GOOD')));
  }, []);

  useEffect(() => {
    if (!productId) {
      setRecipes([]);
      setRecipeId('');
      return;
    }
    apiClient.get<BomRecipe[]>(`/bom/product/${productId}`).then((res) => {
      setRecipes(res.data);
      setRecipeId(res.data.find((r) => r.isDefault)?.id ?? res.data[0]?.id ?? '');
    });
  }, [productId]);

  const filteredOrders = orders.filter((o) => {
    if (filterNumber && !o.orderNumber.toLowerCase().includes(filterNumber.trim().toLowerCase())) return false;
    if (filterProductId && o.product?.id !== filterProductId) return false;
    if (filterStatus && o.status !== filterStatus) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterNumber || filterProductId || filterStatus);

  const compareOrders = (a: ProductionOrder, b: ProductionOrder) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.sortKey) {
      case 'product':
        return (a.product?.name ?? '').localeCompare(b.product?.name ?? '') * dir;
      case 'recipe':
        return (a.recipe?.name ?? '').localeCompare(b.recipe?.name ?? '') * dir;
      case 'quantity':
        return (a.quantity - b.quantity) * dir;
      case 'plannedDate':
        return a.plannedDate.localeCompare(b.plannedDate) * dir;
      case 'totalCost':
        return ((a.totalCost ?? 0) - (b.totalCost ?? 0)) * dir;
      case 'status':
        return a.status.localeCompare(b.status) * dir;
      case 'orderNumber':
      default:
        return a.orderNumber.localeCompare(b.orderNumber) * dir;
    }
  };
  const sortedOrders = [...filteredOrders].sort(compareOrders);
  const visibleColumns = columns.orderedColumns.filter((c) => columns.isVisible(c.key));

  const renderCell = (key: string, o: ProductionOrder) => {
    switch (key) {
      case 'orderNumber':
        return o.orderNumber;
      case 'product':
        return o.product?.name;
      case 'recipe':
        return o.recipe?.name ?? '—';
      case 'quantity':
        return `${o.quantity} ${o.product?.unit ?? ''}`;
      case 'plannedDate':
        return o.plannedDate;
      case 'totalCost':
        return o.totalCost != null ? `R$ ${o.totalCost.toFixed(2)}` : '–';
      case 'status':
        return <StatusBadge status={o.status} />;
      default:
        return null;
    }
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterNumber(draftFilterNumber);
    setFilterProductId(draftFilterProductId);
    setFilterStatus(draftFilterStatus);
  };

  const clearFilters = () => {
    setDraftFilterNumber('');
    setDraftFilterProductId('');
    setDraftFilterStatus('');
    setFilterNumber('');
    setFilterProductId('');
    setFilterStatus('');
  };

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
  const allSelectedArePlanned = selectedOrders.length > 0 && selectedOrders.every((o) => o.status === 'PLANNED');

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

  const resetForm = () => {
    setProductId('');
    setRecipes([]);
    setRecipeId('');
    setQuantity('1');
    setPlannedDate(new Date().toISOString().slice(0, 10));
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
      await apiClient.post('/production-orders', { productId, recipeId: recipeId || undefined, quantity: Number(quantity), plannedDate });
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleCompleteClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos uma ordem planejada para concluir.');
      return;
    }
    if (!allSelectedArePlanned) {
      notify('Só é possível concluir em massa quando todas as ordens selecionadas estão planejadas. Desmarque as que já foram concluídas ou canceladas.');
      return;
    }
    setBulkAction({ kind: 'complete', ids: selectedOrders.map((o) => o.id) });
  };

  const handleCancelClick = () => {
    if (selectedOrders.length === 0) {
      notify('Selecione ao menos uma ordem planejada para cancelar.');
      return;
    }
    if (!allSelectedArePlanned) {
      notify('Só é possível cancelar em massa quando todas as ordens selecionadas estão planejadas. Desmarque as que já foram concluídas ou canceladas.');
      return;
    }
    setBulkAction({ kind: 'cancel', ids: selectedOrders.map((o) => o.id) });
  };

  const runBulkAction = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const endpoint = bulkAction.kind === 'complete' ? 'complete' : 'cancel';
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/production-orders/${id}/${endpoint}`);
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    load();
    if (failures > 0) {
      const verb = bulkAction.kind === 'complete' ? 'concluídas' : 'canceladas';
      notify(`${failures} de ${bulkAction.ids.length} ordem(ns) não puderam ser ${verb}.`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Ordens de Produção</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Número</label>
          <input value={draftFilterNumber} onChange={(e) => setDraftFilterNumber(e.target.value)} placeholder="Ex.: OP-0001" />
        </div>
        <div className="filter-field">
          <label>Produto</label>
          <select value={draftFilterProductId} onChange={(e) => setDraftFilterProductId(e.target.value)}>
            <option value="">Todos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
          className={`toolbar-btn${!allSelectedArePlanned ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleCompleteClick}
        >
          Concluir
        </button>
        <button
          className={`toolbar-btn${!allSelectedArePlanned ? ' toolbar-btn--disabled' : ''}`}
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
                    aria-label={`Selecionar ordem ${o.orderNumber}`}
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
            {hasActiveFilters ? 'Nenhuma ordem de produção encontrada para os filtros aplicados.' : 'Nenhuma ordem de produção cadastrada.'}
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
          title={bulkAction.kind === 'complete' ? 'Concluir ordens de produção' : 'Cancelar ordens de produção'}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          <p>
            {bulkAction.kind === 'complete'
              ? `Concluir ${bulkAction.ids.length} ordem(ns) de produção selecionada(s)? O estoque dos insumos será baixado e o estoque do produto acabado será atualizado.`
              : `Cancelar ${bulkAction.ids.length} ordem(ns) de produção selecionada(s)? Essa ação não pode ser desfeita.`}
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
        <Modal title="Nova Ordem de Produção" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <p style={{ fontSize: 12, color: 'var(--sysvex-text-muted)' }}>
            O produto precisa ter uma ficha técnica cadastrada para que a produção possa ser concluída.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Produto *</label>
                <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              {productId && (
                <div className="form-field">
                  <label>Receita *</label>
                  <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.isDefault ? ' (Padrão)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-field">
                <label>Quantidade a produzir *</label>
                <input type="number" step="0.0001" min="0.0001" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Data planejada *</label>
                <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} required />
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
