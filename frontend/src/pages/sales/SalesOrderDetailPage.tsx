import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apiClient, { extractErrorMessage } from '../../api/client';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import { ArrowLeftIcon, InspectionIcon } from '../../icons';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, PaymentMethod } from '../../constants/paymentMethods';
import { useNotify } from '../../notifications/NotificationContext';
import { formatMoney, sumLineAmounts } from '../../utils/money';

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
  items: { productId: string; quantity: number; unitPrice: number; product?: Product }[];
  deliveryStatus: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  shippedAt: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
}

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

const emptyItem = (): OrderItem => ({ productId: '', quantity: '1', unitPrice: '0' });

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [customers, setCustomers] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  const load = () => {
    if (!id) return;
    apiClient.get<SalesOrder>(`/sales-orders/${id}`).then((res) => setOrder(res.data));
  };

  useEffect(() => {
    load();
    apiClient
      .get<Partner[]>('/partners')
      .then((res) => setCustomers(res.data.filter((p: any) => p.type !== 'SUPPLIER' && p.active)));
    apiClient.get<Product[]>('/products').then((res) => setProducts(res.data.filter((p: any) => p.type === 'FINISHED_GOOD')));
  }, [id]);

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const editTotal = sumLineAmounts(items);

  const startEditing = () => {
    if (!order) return;
    setCustomerId(order.customer?.id ?? '');
    setOrderDate(order.orderDate);
    setPaymentMethod(order.paymentMethod);
    setItems(
      order.items.map((it) => ({
        productId: it.productId,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
      })),
    );
    setError(null);
    setEditing(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setError(null);
    try {
      await apiClient.patch(`/sales-orders/${order.id}`, {
        customerId,
        orderDate,
        paymentMethod,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      });
      setEditing(false);
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    try {
      await apiClient.patch(`/sales-orders/${order.id}/confirm`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    try {
      await apiClient.patch(`/sales-orders/${order.id}/cancel`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  if (!order) {
    return (
      <div className="loading-state">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <Link to="/sales-orders" className="page-header__back">
        <ArrowLeftIcon size={12} style={{ verticalAlign: -1.5 }} /> Pedidos de Venda
      </Link>
      <div className="page-header">
        <h1>Pedido {order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!editing ? (
        <>
          <div className="toolbar">
            <Link
              className="toolbar-btn"
              to={`/sales-orders/${order.id}/receipt`}
              title="Ver Recibo"
              aria-label="Ver Recibo"
            >
              <InspectionIcon size={16} />
            </Link>
            {order.status === 'DRAFT' && (
              <>
                <button className="toolbar-btn" onClick={startEditing}>
                  Editar
                </button>
                <button className="toolbar-btn" onClick={handleConfirm}>
                  Confirmar
                </button>
                <button className="toolbar-btn" onClick={handleCancel}>
                  Cancelar
                </button>
              </>
            )}
          </div>

          <div className="card">
            <div className="form-grid">
              <div className="form-field">
                <label>Cliente</label>
                <p style={{ margin: 0, fontSize: 13 }}>{order.customer?.name}</p>
              </div>
              <div className="form-field">
                <label>Data</label>
                <p style={{ margin: 0, fontSize: 13 }}>{order.orderDate}</p>
              </div>
              <div className="form-field">
                <label>Forma de pagamento</label>
                <p style={{ margin: 0, fontSize: 13 }}>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Quantidade</th>
                    <th>Preço unitário</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.product?.name ?? it.productId}</td>
                      <td>{it.quantity}</td>
                      <td>R$ {it.unitPrice.toFixed(2)}</td>
                      <td>R$ {formatMoney(it.quantity * it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontWeight: 600, marginTop: 12 }}>Total: R$ {order.totalAmount.toFixed(2)}</p>
          </div>

          {order.status === 'CONFIRMED' && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="page-header" style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 13, margin: 0 }}>Entrega</h3>
                <StatusBadge status={order.deliveryStatus} />
              </div>
              <div className="form-grid">
                <div className="form-field">
                  <label>Status</label>
                  <p style={{ margin: 0, fontSize: 13 }}>{DELIVERY_STATUS_LABELS[order.deliveryStatus]}</p>
                </div>
                <div className="form-field">
                  <label>Enviado em</label>
                  <p style={{ margin: 0, fontSize: 13 }}>{formatDate(order.shippedAt)}</p>
                </div>
                <div className="form-field">
                  <label>Entregue em</label>
                  <p style={{ margin: 0, fontSize: 13 }}>{formatDate(order.deliveredAt)}</p>
                </div>
                {order.deliveryNotes && (
                  <div className="form-field">
                    <label>Observações</label>
                    <p style={{ margin: 0, fontSize: 13 }}>{order.deliveryNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card">
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
              <div className="form-grid" key={idx} style={{ alignItems: 'end' }}>
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

            <p style={{ fontWeight: 600 }}>Total: R$ {editTotal.toFixed(2)}</p>

            <div className="form-actions">
              <button className="btn" type="submit">
                Salvar
              </button>
              <button className="btn btn--secondary" type="button" onClick={() => setEditing(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
