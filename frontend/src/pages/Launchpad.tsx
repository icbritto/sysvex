import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface Tile {
  to: string;
  icon: string;
  title: string;
  kpiLabel: string;
  kpiValue: string;
}

interface Group {
  title: string;
  tiles: Tile[];
}

export default function Launchpad() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      const results: Record<string, number> = {};
      const jobs: Array<[string, Promise<unknown>]> = [
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

  const groups: Group[] = [
    {
      title: 'Financeiro',
      tiles: [
        {
          to: '/finance/entries',
          icon: '💰',
          title: 'Contas a Pagar/Receber',
          kpiLabel: 'Em aberto',
          kpiValue: String(counts.openFinance ?? '–'),
        },
        { to: '/finance/cash-flow', icon: '📊', title: 'Fluxo de Caixa', kpiLabel: '', kpiValue: '' },
        { to: '/finance/dre', icon: '📈', title: 'DRE Simplificado', kpiLabel: '', kpiValue: '' },
      ],
    },
    {
      title: 'Compras',
      tiles: [
        {
          to: '/purchase-orders',
          icon: '🛒',
          title: 'Pedidos de Compra',
          kpiLabel: 'Total',
          kpiValue: String(counts.purchaseOrders ?? '–'),
        },
        {
          to: '/partners?type=SUPPLIER',
          icon: '🏭',
          title: 'Fornecedores',
          kpiLabel: '',
          kpiValue: '',
        },
      ],
    },
    {
      title: 'Vendas',
      tiles: [
        {
          to: '/sales-orders',
          icon: '🧾',
          title: 'Pedidos de Venda',
          kpiLabel: 'Total',
          kpiValue: String(counts.salesOrders ?? '–'),
        },
        { to: '/partners?type=CUSTOMER', icon: '🧑‍🤝‍🧑', title: 'Clientes', kpiLabel: '', kpiValue: '' },
      ],
    },
    {
      title: 'Estoque & Produção',
      tiles: [
        {
          to: '/products',
          icon: '📦',
          title: 'Produtos & Insumos',
          kpiLabel: 'Cadastrados',
          kpiValue: String(counts.products ?? '–'),
        },
        {
          to: '/products?lowStock=1',
          icon: '⚠️',
          title: 'Estoque Baixo',
          kpiLabel: 'Alertas',
          kpiValue: String(counts.lowStock ?? '–'),
        },
        {
          to: '/production-orders',
          icon: '🍬',
          title: 'Ordens de Produção',
          kpiLabel: 'Total',
          kpiValue: String(counts.productionOrders ?? '–'),
        },
        { to: '/inventory/movements', icon: '📋', title: 'Movimentações de Estoque', kpiLabel: '', kpiValue: '' },
      ],
    },
  ];

  if (user?.role === 'ADMIN') {
    groups.push({
      title: 'Administração',
      tiles: [{ to: '/admin/users', icon: '👤', title: 'Usuários & Roles', kpiLabel: '', kpiValue: '' }],
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1>Página Inicial</h1>
      </div>
      {groups.map((group) => (
        <div className="launchpad-group" key={group.title}>
          <h2>{group.title}</h2>
          <div className="tile-grid">
            {group.tiles.map((tile) => (
              <Link className="tile" to={tile.to} key={tile.to}>
                <span className="tile__icon">{tile.icon}</span>
                <div>
                  {tile.kpiValue !== '' && <div className="tile__kpi">{tile.kpiValue}</div>}
                  <div className="tile__title">{tile.title}</div>
                  {tile.kpiLabel && <div className="tile__subtitle">{tile.kpiLabel}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
