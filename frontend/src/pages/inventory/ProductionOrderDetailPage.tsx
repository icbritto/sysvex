import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import { ArrowLeftIcon } from '../../icons';
import { useNotify } from '../../notifications/NotificationContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  salePrice: number | null;
}

interface BomRecipe {
  id: string;
  name: string;
  outputQuantity: number;
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

interface RequirementItem {
  rawMaterialId: string;
  rawMaterialName: string;
  unit: string;
  requiredQty: number;
  availableQty: number;
  shortfall: number;
  costPrice: number;
}

interface Requirements {
  items: RequirementItem[];
  canComplete: boolean;
  blockedReason: string | null;
  estimatedCost: number;
  estimatedRevenue: number | null;
  estimatedProfit: number | null;
}

export default function ProductionOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const notify = useNotify();

  const [order, setOrder] = useState<ProductionOrder | null>(null);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    apiClient.get<ProductionOrder>(`/production-orders/${id}`).then((res) => setOrder(res.data));
    apiClient.get<Requirements>(`/production-orders/${id}/requirements`).then((res) => setRequirements(res.data));
  };

  useEffect(load, [id]);

  const handleComplete = async () => {
    if (!order) return;
    setError(null);
    try {
      await apiClient.patch(`/production-orders/${order.id}/complete`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    try {
      await apiClient.patch(`/production-orders/${order.id}/cancel`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  if (!order || !requirements) {
    return (
      <div className="loading-state">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <Link to="/production-orders" className="page-header__back">
        <ArrowLeftIcon size={12} style={{ verticalAlign: -1.5 }} /> Ordens de Produção
      </Link>
      <div className="page-header">
        <h1>Ordem {order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {order.status === 'PLANNED' && (
        <div className="toolbar">
          <button
            className={`toolbar-btn${!requirements.canComplete ? ' toolbar-btn--disabled' : ''}`}
            onClick={() => {
              if (!requirements.canComplete) {
                notify(requirements.blockedReason ?? 'Não é possível concluir esta ordem no momento.');
                return;
              }
              handleComplete();
            }}
          >
            Concluir
          </button>
          <button className="toolbar-btn" onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      )}

      <div className="card">
        <div className="form-grid">
          <div className="form-field">
            <label>Produto</label>
            <p style={{ margin: 0, fontSize: 13 }}>
              {order.product.name} ({order.product.sku})
            </p>
          </div>
          <div className="form-field">
            <label>Receita</label>
            <p style={{ margin: 0, fontSize: 13 }}>{order.recipe?.name ?? '—'}</p>
          </div>
          <div className="form-field">
            <label>Quantidade a produzir</label>
            <p style={{ margin: 0, fontSize: 13 }}>
              {order.quantity} {order.product.unit}
            </p>
          </div>
          <div className="form-field">
            <label>Data planejada</label>
            <p style={{ margin: 0, fontSize: 13 }}>{order.plannedDate}</p>
          </div>
          {order.completedDate && (
            <div className="form-field">
              <label>Data de conclusão</label>
              <p style={{ margin: 0, fontSize: 13 }}>{order.completedDate}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Insumos necessários</h2>
        {order.status === 'PLANNED' && requirements.blockedReason && (
          <div className="alert alert--error">{requirements.blockedReason}</div>
        )}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Necessário</th>
                <th>Disponível</th>
                <th>Faltante</th>
              </tr>
            </thead>
            <tbody>
              {requirements.items.map((item) => (
                <tr key={item.rawMaterialId}>
                  <td>{item.rawMaterialName}</td>
                  <td>
                    {item.requiredQty} {item.unit}
                  </td>
                  <td>
                    {item.availableQty} {item.unit}
                  </td>
                  <td>
                    {item.shortfall > 0 ? (
                      <span className="badge badge--warning">
                        {item.shortfall} {item.unit}
                      </span>
                    ) : (
                      '–'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requirements.items.length === 0 && <div className="empty-state">Nenhum insumo cadastrado nesta receita.</div>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>Custos {order.status === 'COMPLETED' ? '' : '(estimado)'}</h2>
        <div className="form-grid">
          <div className="form-field">
            <label>Custo {order.status === 'COMPLETED' ? '' : 'estimado'}</label>
            <p style={{ margin: 0, fontSize: 13 }}>
              R$ {(order.status === 'COMPLETED' ? order.totalCost ?? 0 : requirements.estimatedCost).toFixed(2)}
            </p>
          </div>
          <div className="form-field">
            <label>Receita estimada</label>
            <p style={{ margin: 0, fontSize: 13 }}>
              {requirements.estimatedRevenue != null ? `R$ ${requirements.estimatedRevenue.toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="form-field">
            <label>Lucro estimado</label>
            <p style={{ margin: 0, fontSize: 13 }}>
              {requirements.estimatedProfit != null ? `R$ ${requirements.estimatedProfit.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
        {requirements.estimatedRevenue == null && (
          <p style={{ fontSize: 12, color: 'var(--sysvex-text-muted)', marginBottom: 0 }}>
            Defina um preço de venda para "{order.product.name}" para ver a receita e o lucro estimados.
          </p>
        )}
      </div>
    </div>
  );
}
