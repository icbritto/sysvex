import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string };
  orderDate: string;
  totalAmount: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  deliveryStatus: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  shippedAt: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
}

type DeliveryAction = { id: string; orderNumber: string; kind: 'ship' | 'deliver' };

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

export default function DeliveryTrackingPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [action, setAction] = useState<DeliveryAction | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    apiClient.get<SalesOrder[]>('/sales-orders').then((res) => setOrders(res.data.filter((o) => o.status === 'CONFIRMED')));
  };

  useEffect(load, []);

  const openAction = (order: SalesOrder, kind: DeliveryAction['kind']) => {
    setAction({ id: order.id, orderNumber: order.orderNumber, kind });
    setNotes(order.deliveryNotes ?? '');
    setError(null);
  };

  const closeAction = () => {
    setAction(null);
    setNotes('');
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setError(null);
    try {
      await apiClient.patch(`/sales-orders/${action.id}/${action.kind}`, { notes: notes || undefined });
      closeAction();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Acompanhamento de Entregas</h1>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Data do pedido</th>
              <th>Total</th>
              <th>Status da entrega</th>
              <th>Enviado em</th>
              <th>Entregue em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{o.customer?.name}</td>
                <td>{o.orderDate}</td>
                <td>R$ {o.totalAmount.toFixed(2)}</td>
                <td>
                  <StatusBadge status={o.deliveryStatus} />
                </td>
                <td>{formatDate(o.shippedAt)}</td>
                <td>{formatDate(o.deliveredAt)}</td>
                <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {o.deliveryStatus === 'PENDING' && (
                    <button className="btn btn--sm" onClick={() => openAction(o, 'ship')}>
                      Marcar como Enviado
                    </button>
                  )}
                  {o.deliveryStatus === 'SHIPPED' && (
                    <button className="btn btn--sm" onClick={() => openAction(o, 'deliver')}>
                      Marcar como Entregue
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="empty-state">Nenhum pedido confirmado aguardando entrega.</div>}
      </div>

      {action && (
        <Modal
          title={action.kind === 'ship' ? `Marcar ${action.orderNumber} como enviado` : `Marcar ${action.orderNumber} como entregue`}
          onClose={closeAction}
        >
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Observações (opcional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: transportadora, código de rastreio..." />
            </div>
            <div className="form-actions">
              <button className="btn" type="submit">
                Confirmar
              </button>
              <button className="btn btn--secondary" type="button" onClick={closeAction}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
