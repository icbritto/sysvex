import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { CountKey } from '../launchpadGroups';

// Contagens reais usadas como KPI nos tiles de processo (Página Inicial e
// telas de visão geral por linha de negócio) — uma única fonte para não
// duplicar as mesmas chamadas de API em cada tela.
export function useProcessCounts(): Record<CountKey, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      const results: Record<string, number> = {};
      const jobs: Array<[CountKey, Promise<unknown>]> = [
        ['partners', apiClient.get('/partners')],
        ['products', apiClient.get('/products')],
        ['lowStock', apiClient.get('/products/low-stock')],
        ['purchaseOrders', apiClient.get('/purchase-orders')],
        ['salesOrders', apiClient.get('/sales-orders')],
        ['productionOrders', apiClient.get('/production-orders')],
        ['openFinance', apiClient.get('/finance/entries', { params: { status: 'OPEN' } })],
      ];
      await Promise.all(
        jobs.map(async ([key, promise]) => {
          try {
            const res = (await promise) as { data: unknown[] };
            results[key] = Array.isArray(res.data) ? res.data.length : 0;
          } catch {
            results[key] = 0;
          }
        }),
      );
      setCounts(results);
    }
    loadCounts();
  }, []);

  return counts as Record<CountKey, number>;
}
