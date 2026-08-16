import { FormEvent, useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '../../api/client';
import Modal from '../../components/Modal';
import StatusBadge from '../../components/StatusBadge';
import { useNotify } from '../../notifications/NotificationContext';

interface Partner {
  id: string;
  name: string;
}

interface FinanceEntry {
  id: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  description: string;
  partner: Partner | null;
  amount: number;
  dueDate: string;
  status: 'OPEN' | 'PAID' | 'CANCELLED';
  paidDate: string | null;
}

export default function FinanceEntriesPage() {
  const notify = useNotify();
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filterType, setFilterType] = useState<'' | 'PAYABLE' | 'RECEIVABLE'>('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [description, setDescription] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const load = () => {
    apiClient
      .get<FinanceEntry[]>('/finance/entries', { params: filterType ? { type: filterType } : {} })
      .then((res) => setEntries(res.data));
  };

  useEffect(load, [filterType]);
  useEffect(() => {
    apiClient.get<Partner[]>('/partners').then((res) => setPartners(res.data));
  }, []);

  const resetForm = () => {
    setType('PAYABLE');
    setDescription('');
    setPartnerId('');
    setAmount('');
    setDueDate(new Date().toISOString().slice(0, 10));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post('/finance/entries', {
        type,
        description,
        partnerId: partnerId || undefined,
        amount: Number(amount),
        dueDate,
      });
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handlePay = async (id: string) => {
    try {
      await apiClient.patch(`/finance/entries/${id}/pay`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiClient.patch(`/finance/entries/${id}/cancel`);
      load();
    } catch (err) {
      notify(extractErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Contas a Pagar & Receber</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)}>
            <option value="">Todos</option>
            <option value="PAYABLE">A pagar</option>
            <option value="RECEIVABLE">A receber</option>
          </select>
          <button className="btn" onClick={() => setShowModal(true)}>
            + Lançamento manual
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Parceiro</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.type === 'PAYABLE' ? 'A pagar' : 'A receber'}</td>
                <td>{e.description}</td>
                <td>{e.partner?.name ?? '–'}</td>
                <td>R$ {e.amount.toFixed(2)}</td>
                <td>{e.dueDate}</td>
                <td>
                  <StatusBadge status={e.status} />
                </td>
                <td>
                  {e.status === 'OPEN' && (
                    <>
                      <button className="btn btn--sm" onClick={() => handlePay(e.id)} style={{ marginRight: 6 }}>
                        {e.type === 'PAYABLE' ? 'Pagar' : 'Receber'}
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleCancel(e.id)}>
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <div className="empty-state">Nenhum lançamento encontrado.</div>}
      </div>

      {showModal && (
        <Modal title="Novo Lançamento Financeiro" onClose={() => setShowModal(false)}>
          {error && <div className="alert alert--error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Tipo *</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                  <option value="PAYABLE">A pagar</option>
                  <option value="RECEIVABLE">A receber</option>
                </select>
              </div>
              <div className="form-field">
                <label>Descrição *</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Parceiro</label>
                <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Valor *</label>
                <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="form-field">
                <label>Vencimento *</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
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
