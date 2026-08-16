import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { useNotify } from '../../notifications/NotificationContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  product: Product;
  quantity: number;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED';
  plannedDate: string;
  completedDate: string | null;
  totalCost: number | null;
}

export default function ProductionOrdersPage() {
  const notify = useNotify();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));

  const load = () => {
    apiClient.get<ProductionOrder[]>('/production-orders').then((res) => setOrders(res.data));
  };

  useEffect(() => {
    load();
    apiClient.get<Product[]>('/products').then((res) => setProducts(res.data.filter((p: any) => p.type === 'FINISHED_GOOD')));
  }, []);

  const resetForm = () => {
    setProductId('');
    setQuantity('1');
    setPlannedDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/production-orders', { productId, quantity: Number(quantity), plannedDate });
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await apiClient.patch(`/production-orders/${id}/complete`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiClient.patch(`/production-orders/${id}/cancel`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Ordens de Produção</h1>
        <button className="btn" onClick={() => setShowModal(true)}>
          + Nova Ordem
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Data planejada</th>
              <th>Custo total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{o.product?.name}</td>
                <td>
                  {o.quantity} {o.product?.unit}
                </td>
                <td>{o.plannedDate}</td>
                <td>{o.totalCost != null ? `R$ ${o.totalCost.toFixed(2)}` : '–'}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td>
                  {o.status === 'PLANNED' && (
                    <>
                      <button className="btn btn--sm" onClick={() => handleComplete(o.id)} style={{ marginRight: 6 }}>
                        Concluir
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleCancel(o.id)}>
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="empty-state">Nenhuma ordem de produção cadastrada.</div>}
      </div>

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
