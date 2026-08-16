import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PaymentMethod } from '../../constants/paymentMethods';
import { useNotify } from '../../notifications/NotificationContext';

interface Partner {
  id: string;
  name: string;
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
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  const load = () => {
    apiClient.get<PurchaseOrder[]>('/purchase-orders').then((res) => setOrders(res.data));
  };

  useEffect(() => {
    load();
    apiClient.get<Partner[]>('/partners').then((res) => setSuppliers(res.data.filter((p: any) => p.type !== 'CUSTOMER')));
    apiClient.get<Product[]>('/products').then((res) => setProducts(res.data.filter((p: any) => p.type === 'RAW_MATERIAL')));
  }, []);

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

  const handleReceive = async (id: string) => {
    try {
      await apiClient.patch(`/purchase-orders/${id}/receive`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiClient.patch(`/purchase-orders/${id}/cancel`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Pedidos de Compra</h1>
        <button className="btn" onClick={() => setShowModal(true)}>
          + Novo Pedido
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Fornecedor</th>
              <th>Data</th>
              <th>Total</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{o.supplier?.name}</td>
                <td>{o.orderDate}</td>
                <td>R$ {o.totalAmount.toFixed(2)}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {o.status === 'RECEIVED' && (
                    <Link className="btn btn--secondary btn--sm" to={`/purchase-orders/${o.id}/receipt`} target="_blank">
                      Recibo
                    </Link>
                  )}
                  {o.status === 'DRAFT' && (
                    <>
                      <button className="btn btn--sm" onClick={() => handleReceive(o.id)}>
                        Receber
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
        {orders.length === 0 && <div className="empty-state">Nenhum pedido de compra cadastrado.</div>}
      </div>

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
              <div className="form-grid" key={idx}>
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
