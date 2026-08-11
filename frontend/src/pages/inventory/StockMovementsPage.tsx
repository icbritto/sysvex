import { useEffect, useState } from 'react';
import apiClient from '../../api/client';

interface Movement {
  id: string;
  product: { name: string; sku: string; unit: string };
  type: 'IN' | 'OUT';
  reason: string;
  quantity: number;
  createdAt: string;
}

const REASON_LABELS: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venda',
  PRODUCTION_CONSUME: 'Consumo de produção',
  PRODUCTION_OUTPUT: 'Saída de produção',
  ADJUSTMENT: 'Ajuste',
};

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    apiClient.get<Movement[]>('/inventory/movements').then((res) => setMovements(res.data));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Movimentações de Estoque</h1>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Motivo</th>
              <th>Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString('pt-BR')}</td>
                <td>
                  {m.product?.name} ({m.product?.sku})
                </td>
                <td>
                  <span className={`badge ${m.type === 'IN' ? 'badge--success' : 'badge--danger'}`}>
                    {m.type === 'IN' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td>{REASON_LABELS[m.reason] ?? m.reason}</td>
                <td>
                  {m.quantity} {m.product?.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {movements.length === 0 && <div className="empty-state">Nenhuma movimentação registrada.</div>}
      </div>
    </div>
  );
}
