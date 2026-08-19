import { FormEvent, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import SortModal from '../../components/SortModal';
import Spinner from '../../components/Spinner';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useSort } from '../../hooks/useSort';
import { FilterIcon, ListIcon, SortIcon } from '../../icons';

const COLUMNS: ColumnDef[] = [
  { key: 'createdAt', label: 'Data' },
  { key: 'product', label: 'Produto' },
  { key: 'type', label: 'Tipo' },
  { key: 'reason', label: 'Motivo' },
  { key: 'quantity', label: 'Quantidade' },
];

const REASON_LABELS: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venda',
  PRODUCTION_CONSUME: 'Consumo de produção',
  PRODUCTION_OUTPUT: 'Saída de produção',
  ADJUSTMENT: 'Ajuste',
};

interface Movement {
  id: string;
  product: { name: string; sku: string; unit: string };
  type: 'IN' | 'OUT';
  reason: string;
  quantity: number;
  createdAt: string;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const columns = useColumnVisibility('stock-movements', COLUMNS);
  const sort = useSort('stock-movements', COLUMNS, 'createdAt');

  const [draftFilterProduct, setDraftFilterProduct] = useState('');
  const [draftFilterType, setDraftFilterType] = useState('');
  const [draftFilterReason, setDraftFilterReason] = useState('');

  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterReason, setFilterReason] = useState('');

  useEffect(() => {
    setLoading(true);
    apiClient
      .get<Movement[]>('/inventory/movements')
      .then((res) => setMovements(res.data))
      .finally(() => setLoading(false));
  }, []);

  const filteredMovements = movements.filter((m) => {
    if (filterProduct) {
      const haystack = `${m.product?.name ?? ''} ${m.product?.sku ?? ''}`.toLowerCase();
      if (!haystack.includes(filterProduct.trim().toLowerCase())) return false;
    }
    if (filterType && m.type !== filterType) return false;
    if (filterReason && m.reason !== filterReason) return false;
    return true;
  });
  const hasActiveFilters = Boolean(filterProduct || filterType || filterReason);

  const compareMovements = (a: Movement, b: Movement) => {
    const dir = sort.direction === 'asc' ? 1 : -1;
    switch (sort.sortKey) {
      case 'product':
        return (a.product?.name ?? '').localeCompare(b.product?.name ?? '') * dir;
      case 'type':
        return a.type.localeCompare(b.type) * dir;
      case 'reason':
        return (REASON_LABELS[a.reason] ?? a.reason).localeCompare(REASON_LABELS[b.reason] ?? b.reason) * dir;
      case 'quantity':
        return (a.quantity - b.quantity) * dir;
      case 'createdAt':
      default:
        return a.createdAt.localeCompare(b.createdAt) * dir;
    }
  };
  const sortedMovements = [...filteredMovements].sort(compareMovements);
  const visibleColumns = columns.orderedColumns.filter((c) => columns.isVisible(c.key));

  const renderCell = (key: string, m: Movement) => {
    switch (key) {
      case 'createdAt':
        return new Date(m.createdAt).toLocaleString('pt-BR');
      case 'product':
        return `${m.product?.name} (${m.product?.sku})`;
      case 'type':
        return (
          <span className={`badge ${m.type === 'IN' ? 'badge--success' : 'badge--danger'}`}>
            {m.type === 'IN' ? 'Entrada' : 'Saída'}
          </span>
        );
      case 'reason':
        return REASON_LABELS[m.reason] ?? m.reason;
      case 'quantity':
        return `${m.quantity} ${m.product?.unit ?? ''}`;
      default:
        return null;
    }
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setFilterProduct(draftFilterProduct);
    setFilterType(draftFilterType);
    setFilterReason(draftFilterReason);
  };

  const clearFilters = () => {
    setDraftFilterProduct('');
    setDraftFilterType('');
    setDraftFilterReason('');
    setFilterProduct('');
    setFilterType('');
    setFilterReason('');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Movimentações de Estoque</h1>
      </div>

      <form className="filter-bar" onSubmit={applyFilters}>
        <div className="filter-field">
          <label>Produto</label>
          <input value={draftFilterProduct} onChange={(e) => setDraftFilterProduct(e.target.value)} placeholder="Nome ou SKU..." />
        </div>
        <div className="filter-field">
          <label>Tipo</label>
          <select value={draftFilterType} onChange={(e) => setDraftFilterType(e.target.value)}>
            <option value="">Todos</option>
            <option value="IN">Entrada</option>
            <option value="OUT">Saída</option>
          </select>
        </div>
        <div className="filter-field">
          <label>Motivo</label>
          <select value={draftFilterReason} onChange={(e) => setDraftFilterReason(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(REASON_LABELS).map(([value, label]) => (
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
              {visibleColumns.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMovements.map((m) => (
              <tr key={m.id}>
                {visibleColumns.map((c) => (
                  <td key={c.key}>{renderCell(c.key, m)}</td>
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
        {!loading && filteredMovements.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? 'Nenhuma movimentação encontrada para os filtros aplicados.' : 'Nenhuma movimentação registrada.'}
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
    </div>
  );
}
