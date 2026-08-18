import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import ColumnVisibilityModal from '../../components/ColumnVisibilityModal';
import StatusBadge from '../../components/StatusBadge';
import { ColumnDef, useColumnVisibility } from '../../hooks/useColumnVisibility';
import { ListIcon } from '../../icons';

const COLUMNS: ColumnDef[] = [
  { key: 'orderNumber', label: 'Número' },
  { key: 'customer', label: 'Cliente' },
  { key: 'orderDate', label: 'Data do pedido' },
  { key: 'totalAmount', label: 'Total' },
  { key: 'deliveryStatus', label: 'Status da entrega' },
  { key: 'shippedAt', label: 'Enviado em' },
  { key: 'deliveredAt', label: 'Entregue em' },
];

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
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const columns = useColumnVisibility('delivery-tracking', COLUMNS);

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

      <div className="toolbar">
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
              {columns.isVisible('orderNumber') && <th>Número</th>}
              {columns.isVisible('customer') && <th>Cliente</th>}
              {columns.isVisible('orderDate') && <th>Data do pedido</th>}
              {columns.isVisible('totalAmount') && <th>Total</th>}
              {columns.isVisible('deliveryStatus') && <th>Status da entrega</th>}
              {columns.isVisible('shippedAt') && <th>Enviado em</th>}
              {columns.isVisible('deliveredAt') && <th>Entregue em</th>}
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                {columns.isVisible('orderNumber') && <td>{o.orderNumber}</td>}
                {columns.isVisible('customer') && <td>{o.customer?.name}</td>}
                {columns.isVisible('orderDate') && <td>{o.orderDate}</td>}
                {columns.isVisible('totalAmount') && <td>R$ {o.totalAmount.toFixed(2)}</td>}
                {columns.isVisible('deliveryStatus') && (
                  <td>
                    <StatusBadge status={o.deliveryStatus} />
                  </td>
                )}
                {columns.isVisible('shippedAt') && <td>{formatDate(o.shippedAt)}</td>}
                {columns.isVisible('deliveredAt') && <td>{formatDate(o.deliveredAt)}</td>}
                <td style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {o.deliveryStatus === 'PENDING' && (
                    <button className="toolbar-btn" onClick={() => openAction(o, 'ship')}>
                      Marcar como Enviado
                    </button>
                  )}
                  {o.deliveryStatus === 'SHIPPED' && (
                    <button className="toolbar-btn" onClick={() => openAction(o, 'deliver')}>
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

      {showColumnsModal && (
        <ColumnVisibilityModal
          columns={COLUMNS}
          isVisible={columns.isVisible}
          onToggle={columns.toggle}
          onClose={() => setShowColumnsModal(false)}
        />
      )}

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
