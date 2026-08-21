import { useEffect, useState } from 'react';
import apiClient from '../../api/client';
import Spinner from '../../components/Spinner';

interface SystemStatus {
  appVersion: string;
  environment: string;
  sysvexEnv: string | null;
  serverTime: string;
  uptimeSeconds: number;
  database: { ok: boolean; latencyMs?: number; error?: string };
  recordCounts: {
    users: number;
    partners: number;
    products: number;
    purchaseOrders: number;
    salesOrders: number;
    productionOrders: number;
    financeEntries: number;
  };
}

const LANDSCAPE_LABELS: Record<string, string> = {
  dev: 'Desenvolvimento (DEV)',
  qas: 'Qualidade (QAS)',
  prd: 'Produção (PRD)',
};

const RECORD_LABELS: Record<keyof SystemStatus['recordCounts'], string> = {
  users: 'Usuários',
  partners: 'Parceiros',
  products: 'Produtos',
  purchaseOrders: 'Pedidos de Compra',
  salesOrders: 'Pedidos de Venda',
  productionOrders: 'Ordens de Produção',
  financeEntries: 'Lançamentos Financeiros',
};

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}min`;
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    apiClient
      .get<SystemStatus>('/system/status')
      .then((res) => setStatus(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="page-header">
        <h1>Administração de Sistema</h1>
        <button className="btn btn--secondary" onClick={load} disabled={loading}>
          {loading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {loading && !status && (
        <div className="loading-state">
          <Spinner />
        </div>
      )}

      {status && (
        <>
          <div className="kpi-row">
            <div className="kpi-tile">
              <div className="kpi-tile__label">Versão</div>
              <div className="kpi-tile__value">{status.appVersion}</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile__label">Ambiente</div>
              <div className="kpi-tile__value">{status.environment}</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile__label">Ambiente da Paisagem</div>
              <div className="kpi-tile__value">
                {status.sysvexEnv ? (LANDSCAPE_LABELS[status.sysvexEnv] ?? status.sysvexEnv) : 'Não definido'}
              </div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile__label">Banco de Dados</div>
              <div className="kpi-tile__value">
                {status.database.ok ? (
                  <span className="badge badge--success">OK · {status.database.latencyMs}ms</span>
                ) : (
                  <span className="badge badge--danger">Erro</span>
                )}
              </div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile__label">Uptime</div>
              <div className="kpi-tile__value">{formatUptime(status.uptimeSeconds)}</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-tile__label">Hora do Servidor</div>
              <div className="kpi-tile__value">{new Date(status.serverTime).toLocaleTimeString('pt-BR')}</div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Contagem de registros</h2>
            <div className="table-wrap">
              <table className="data-table">
                <tbody>
                  {(Object.keys(RECORD_LABELS) as Array<keyof SystemStatus['recordCounts']>).map((key) => (
                    <tr key={key}>
                      <td>{RECORD_LABELS[key]}</td>
                      <td>{status.recordCounts[key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
