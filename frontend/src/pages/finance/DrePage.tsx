import { FormEvent, useEffect, useState } from 'react';
import apiClient from '../../api/client';
import Spinner from '../../components/Spinner';

interface DreSummary {
  startDate: string;
  endDate: string;
  revenue: number;
  costOfGoods: number;
  grossResult: number;
}

function firstDayOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function DrePage() {
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<DreSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiClient
      .get<DreSummary>('/finance/dre', { params: { startDate, endDate } })
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
        <h1>DRE Simplificado</h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--sysvex-text-muted)', marginTop: -10 }}>
        Demonstrativo de resultado simplificado, por regime de competência (data de vencimento dos lançamentos).
      </p>

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
        <div className="card">
          <table className="data-table">
            <tbody>
              <tr>
                <td>Receita (contas a receber)</td>
                <td style={{ textAlign: 'right' }}>R$ {summary.revenue.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Custos e despesas (contas a pagar)</td>
                <td style={{ textAlign: 'right' }}>- R$ {summary.costOfGoods.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 700 }}>Resultado bruto</td>
                <td
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    color: summary.grossResult >= 0 ? 'var(--sysvex-success)' : 'var(--sysvex-danger)',
                  }}
                >
                  R$ {summary.grossResult.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
