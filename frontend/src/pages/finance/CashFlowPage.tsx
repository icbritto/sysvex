import { FormEvent, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import Spinner from '../../components/Spinner';

interface CashFlowSummary {
  startDate: string;
  endDate: string;
  totalReceived: number;
  totalPaid: number;
  netCashFlow: number;
  openReceivables: number;
  openPayables: number;
}

function firstDayOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function CashFlowPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiClient
      .get<CashFlowSummary>('/finance/cash-flow', { params: { startDate, endDate } })
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Fluxo de Caixa</h1>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-grid">
          <div className="form-field">
            <label>Data inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Data final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <button className="btn" type="submit">
          Atualizar
        </button>
      </form>

      {loading && (
        <div className="loading-state">
          <Spinner />
        </div>
      )}

      {!loading && summary && (
        <div className="kpi-row">
          <div className="kpi-tile">
            <div className="kpi-tile__label">Recebido no período</div>
            <div className="kpi-tile__value">R$ {summary.totalReceived.toFixed(2)}</div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile__label">Pago no período</div>
            <div className="kpi-tile__value">R$ {summary.totalPaid.toFixed(2)}</div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile__label">Saldo do período</div>
            <div className="kpi-tile__value" style={{ color: summary.netCashFlow >= 0 ? 'var(--sysvex-success)' : 'var(--sysvex-danger)' }}>
              R$ {summary.netCashFlow.toFixed(2)}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile__label">
              A receber em aberto (até {new Date(`${summary.endDate}T00:00:00`).toLocaleDateString('pt-BR')})
            </div>
            <div className="kpi-tile__value">R$ {summary.openReceivables.toFixed(2)}</div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-tile__label">
              A pagar em aberto (até {new Date(`${summary.endDate}T00:00:00`).toLocaleDateString('pt-BR')})
            </div>
            <div className="kpi-tile__value">R$ {summary.openPayables.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
