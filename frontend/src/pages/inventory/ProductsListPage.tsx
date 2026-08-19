import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import SortModal from '../../components/SortModal';
import Spinner from '../../components/Spinner';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useSort } from '../../hooks/useSort';
import { FilterIcon, ListIcon, SortIcon } from '../../icons';
import { useNotify } from '../../notifications/NotificationContext';

interface Product {
  id: string;
  sku: string;
  name: string;
  type: 'RAW_MATERIAL' | 'FINISHED_GOOD';
  unit: string;
  costPrice: number;
  salePrice: number | null;
  stockQty: number;
  minStock: number;
  active: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Nome' },
  { key: 'stockQty', label: 'Estoque' },
  { key: 'costPrice', label: 'Custo' },
  { key: 'salePrice', label: 'Venda' },
  { key: 'status', label: 'Status' },
];

interface ProductsListPageProps {
  productType: 'RAW_MATERIAL' | 'FINISHED_GOOD';
  title: string;
  storageKey: string;
}

export default function ProductsListPage({ productType, title, storageKey }: ProductsListPageProps) {
  const notify = useNotify();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const onlyLowStock = searchParams.get('lowStock') === '1';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<{ kind: 'activate' | 'deactivate'; ids: string[] } | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const columns = useColumnVisibility(storageKey, COLUMNS);
  const sort = useSort(storageKey, COLUMNS, 'name');

  const [draftFilterName, setDraftFilterName] = useState('');
  const [draftFilterStatus, setDraftFilterStatus] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('un');
  const [costPrice, setCostPrice] = useState('0');
  const [salePrice, setSalePrice] = useState('');
  const [stockQty, setStockQty] = useState('0');
  const [minStock, setMinStock] = useState('0');

  const load = () => {
    setLoading(true);
    const endpoint = onlyLowStock ? '/products/low-stock' : '/products';
    apiClient
      .get<Product[]>(endpoint)
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [onlyLowStock]);

  const byType = products.filter((p) => p.type === productType);

  const filteredProducts = byType.filter((p) => {
    if (filterName) {
      const haystack = `${p.name} ${p.sku}`.toLowerCase();
      if (!haystack.includes(filterName.trim().toLowerCase())) return false;
    }
    if (filterStatus && String(p.active) !== filterStatus) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterName || filterStatus);

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterName(draftFilterName);
    setFilterStatus(draftFilterStatus);
  };

  const clearFilters = () => {
    setDraftFilterName('');
    setDraftFilterStatus('');
    setFilterName('');
    setFilterStatus('');
  };

  const compareValues = (a: number, b: number, dir: number) => (a - b) * dir;
  const compareProducts = (a: Product, b: Product) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.sortKey) {
      case 'sku':
        return a.sku.localeCompare(b.sku) * dir;
      case 'stockQty':
        return compareValues(a.stockQty, b.stockQty, dir);
      case 'costPrice':
        return compareValues(a.costPrice, b.costPrice, dir);
      case 'salePrice':
        return compareValues(a.salePrice ?? 0, b.salePrice ?? 0, dir);
      case 'status':
        return compareValues(Number(a.active), Number(b.active), dir);
      case 'name':
      default:
        return a.name.localeCompare(b.name) * dir;
    }
  };
  const sortedProducts = [...filteredProducts].sort(compareProducts);
  const visibleColumns = columns.orderedColumns.filter((c) => columns.isVisible(c.key));

  const renderCell = (key: string, p: Product) => {
    switch (key) {
      case 'sku':
        return p.sku;
      case 'name':
        return p.name;
      case 'stockQty':
        return (
          <>
            {p.stockQty} {p.unit}
            {p.stockQty <= p.minStock && (
              <span className="badge badge--warning" style={{ marginLeft: 6 }}>
                baixo
              </span>
            )}
          </>
        );
      case 'costPrice':
        return `R$ ${p.costPrice.toFixed(2)}`;
      case 'salePrice':
        return p.salePrice != null ? `R$ ${p.salePrice.toFixed(2)}` : '–';
      case 'status':
        return <span className={`badge ${p.active ? 'badge--success' : 'badge--danger'}`}>{p.active ? 'Ativo' : 'Inativo'}</span>;
      default:
        return null;
    }
  };

  const selectedProducts = products.filter((p) => selectedIds.has(p.id));
  const allSelectedActive = selectedProducts.length > 0 && selectedProducts.every((p) => p.active);
  const allSelectedInactive = selectedProducts.length > 0 && selectedProducts.every((p) => !p.active);

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
      if (filteredProducts.length > 0 && filteredProducts.every((p) => prev.has(p.id))) return new Set();
      return new Set(filteredProducts.map((p) => p.id));
    });
  };

  const resetForm = () => {
    setName('');
    setUnit('un');
    setCostPrice('0');
    setSalePrice('');
    setStockQty('0');
    setMinStock('0');
    setError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setUnit(product.unit);
    setCostPrice(String(product.costPrice));
    setSalePrice(product.salePrice != null ? String(product.salePrice) : '');
    setMinStock(String(product.minStock));
    setError(null);
    setShowModal(true);
  };

  const handleEditClick = () => {
    if (selectedIds.size !== 1) {
      notify('Selecione exatamente um registro para editar.');
      return;
    }
    const product = products.find((p) => p.id === [...selectedIds][0]);
    if (product) openEditModal(product);
  };

  const handleBomClick = () => {
    if (selectedIds.size !== 1) {
      notify('Selecione exatamente um produto para abrir a ficha técnica.');
      return;
    }
    navigate(`/products/${[...selectedIds][0]}/bom`);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await apiClient.patch(`/products/${editingId}`, {
          name,
          unit,
          costPrice: Number(costPrice),
          salePrice: salePrice ? Number(salePrice) : null,
          minStock: Number(minStock),
        });
      } else {
        await apiClient.post('/products', {
          name,
          type: productType,
          unit,
          costPrice: Number(costPrice),
          salePrice: salePrice ? Number(salePrice) : undefined,
          stockQty: Number(stockQty),
          minStock: Number(minStock),
        });
      }
      setShowModal(false);
      resetForm();
      setEditingId(null);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleActivateClick = () => {
    if (selectedProducts.length === 0) {
      notify('Selecione ao menos um registro inativo para ativar.');
      return;
    }
    if (!allSelectedInactive) {
      notify('Só é possível ativar em massa quando todos os selecionados estão inativos. Desmarque os que já estão ativos.');
      return;
    }
    setBulkAction({ kind: 'activate', ids: selectedProducts.map((p) => p.id) });
  };

  const handleDeactivateClick = () => {
    if (selectedProducts.length === 0) {
      notify('Selecione ao menos um registro ativo para desativar.');
      return;
    }
    if (!allSelectedActive) {
      notify('Só é possível desativar em massa quando todos os selecionados estão ativos. Desmarque os que já estão inativos.');
      return;
    }
    setBulkAction({ kind: 'deactivate', ids: selectedProducts.map((p) => p.id) });
  };

  const runBulkAction = async () => {
    if (!bulkAction) return;
    setBulkRunning(true);
    const active = bulkAction.kind === 'activate';
    let failures = 0;
    for (const id of bulkAction.ids) {
      try {
        await apiClient.patch(`/products/${id}`, { active });
      } catch {
        failures += 1;
      }
    }
    setBulkRunning(false);
    setBulkAction(null);
    setSelectedIds(new Set());
    load();
    if (failures > 0) {
      const verb = active ? 'ativados' : 'desativados';
      notify(`${failures} de ${bulkAction.ids.length} registro(s) não puderam ser ${verb}.`);
    }
  };

  const singularLabel = productType === 'FINISHED_GOOD' ? 'Produto Acabado' : 'Insumo';

  return (
    <div>
      <div className="page-header">
        <h1>{onlyLowStock ? `${title} com Estoque Baixo` : title}</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Nome / SKU</label>
          <input value={draftFilterName} onChange={(e) => setDraftFilterName(e.target.value)} placeholder="Buscar..." />
        </div>
        <div className="filter-field">
          <label>Status</label>
          <select value={draftFilterStatus} onChange={(e) => setDraftFilterStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
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
          className={`toolbar-btn${selectedIds.size !== 1 ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleEditClick}
        >
          Editar
        </button>
        <button
          className={`toolbar-btn${!allSelectedInactive ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleActivateClick}
        >
          Ativar
        </button>
        <button
          className={`toolbar-btn${!allSelectedActive ? ' toolbar-btn--disabled' : ''}`}
          onClick={handleDeactivateClick}
        >
          Desativar
        </button>
        {productType === 'FINISHED_GOOD' && (
          <button
            className={`toolbar-btn${selectedIds.size !== 1 ? ' toolbar-btn--disabled' : ''}`}
            onClick={handleBomClick}
          >
            Ficha Técnica
          </button>
        )}
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
                  checked={filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id))}
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
            {sortedProducts.map((p) => (
              <tr
                key={p.id}
                data-selectable
                className={selectedIds.has(p.id) ? 'selected' : ''}
                onClick={() => selectOnly(p.id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleOne(p.id)}
                    aria-label={`Selecionar ${p.name}`}
                  />
                </td>
                {visibleColumns.map((c) => (
                  <td key={c.key}>{renderCell(c.key, p)}</td>
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
        {!loading && filteredProducts.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhum registro encontrado para os filtros aplicados.' : 'Nenhum registro cadastrado.'}
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
          title={bulkAction.kind === 'activate' ? 'Ativar registros' : 'Desativar registros'}
          onClose={() => (bulkRunning ? undefined : setBulkAction(null))}
        >
          <p>
            {bulkAction.kind === 'activate'
              ? `Ativar ${bulkAction.ids.length} registro(s) selecionado(s)?`
              : `Desativar ${bulkAction.ids.length} registro(s) selecionado(s)? Eles deixarão de aparecer nas listas de seleção de novos pedidos/ordens.`}
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
        <Modal title={editingId ? `Editar ${singularLabel}` : `Novo ${singularLabel}`} onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>SKU</label>
                <input value={editingId ? products.find((p) => p.id === editingId)?.sku ?? '' : ''} disabled placeholder="Gerado automaticamente ao salvar" />
              </div>
              <div className="form-field">
                <label>Nome *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Unidade</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="un, kg, L..." />
              </div>
              <div className="form-field">
                <label>Preço de custo *</label>
                <input type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Preço de venda</label>
                <input type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </div>
              {!editingId && (
                <div className="form-field">
                  <label>Estoque inicial</label>
                  <input type="number" step="0.0001" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
                </div>
              )}
              <div className="form-field">
                <label>Estoque mínimo</label>
                <input type="number" step="0.0001" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
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
