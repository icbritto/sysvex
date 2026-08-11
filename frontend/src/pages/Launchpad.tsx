import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useAppUsage } from '../hooks/useAppUsage';

interface Tile {
  to: string;
  icon: string;
  title: string;
  kpiLabel: string;
  kpiValue: string;
}

interface Group {
  key: string;
  title: string;
  color: string;
  tiles: Tile[];
}

type UsageTab = 'favorites' | 'recents' | 'mostUsed';

const USAGE_TABS: Array<{ id: UsageTab; label: string }> = [
  { id: 'favorites', label: 'Favoritos' },
  { id: 'recents', label: 'Recentes' },
  { id: 'mostUsed', label: 'Mais usados' },
];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function Launchpad() {
  const { user, apps } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [usageTab, setUsageTab] = useState<UsageTab>('favorites');
  const { favorites, recents, mostUsed, toggleFavorite, isFavorite } = useAppUsage();

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

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, apps]);

  const allGroups: Group[] = [
    {
      key: 'financeiro',
      title: 'Financeiro',
      color: '#0f6bab',
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
      key: 'compras',
      title: 'Compras',
      color: '#c0388b',
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
      key: 'vendas',
      title: 'Vendas',
      color: '#c9701c',
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
      key: 'estoque_producao',
      title: 'Estoque & Produção',
      color: '#6a3fa0',
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
    {
      key: 'administracao',
      title: 'Administração',
      color: '#b3261e',
      tiles: [{ to: '/admin/users', icon: '👤', title: 'Usuários & Roles', kpiLabel: '', kpiValue: '' }],
    },
    {
      key: 'seguranca_compliance',
      title: 'Segurança & Compliance',
      color: '#1a7f8e',
      tiles: [
        { to: '/security/compliance', icon: '🛡️', title: 'Segurança & Compliance', kpiLabel: '', kpiValue: '' },
      ],
    },
    {
      key: 'administracao_sistema',
      title: 'Administração de Sistema',
      color: '#3a4750',
      tiles: [{ to: '/system/status', icon: '🖥️', title: 'Status do Sistema', kpiLabel: '', kpiValue: '' }],
    },
  ];

  const visibleKeys = apps.map((app) => app.key);
  const groups = allGroups
    .filter((group) => visibleKeys.includes(group.key))
    .sort((a, b) => visibleKeys.indexOf(a.key) - visibleKeys.indexOf(b.key));

  const tileByPath = useMemo(() => {
    const map = new Map<string, { tile: Tile; groupColor: string }>();
    groups.forEach((group) => group.tiles.forEach((tile) => map.set(tile.to, { tile, groupColor: group.color })));
    return map;
  }, [groups]);

  const usagePaths = usageTab === 'favorites' ? favorites : usageTab === 'recents' ? recents : mostUsed;
  const usageTiles = usagePaths.map((path) => tileByPath.get(path)).filter((entry): entry is NonNullable<typeof entry> => !!entry);

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const today = capitalize(
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(
      new Date(),
    ),
  );

  return (
    <div>
      <div className="launchpad-banner">
        <div className="launchpad-banner__date">{today}</div>
        <div className="launchpad-banner__greeting">Olá, {firstName}, bom te ver!</div>
      </div>

      {groups.map((group) => (
        <div className="launchpad-group" id={group.key} key={group.key}>
          <h2>{group.title}</h2>
          <div className="tile-grid">
            {group.tiles.map((tile) => (
              <div className="tile-wrap" key={tile.to}>
                <Link className="tile tile--colored" style={{ background: group.color }} to={tile.to}>
                  <span className="tile__icon">{tile.icon}</span>
                  <div>
                    {tile.kpiValue !== '' && <div className="tile__kpi">{tile.kpiValue}</div>}
                    <div className="tile__title">{tile.title}</div>
                    {tile.kpiLabel && <div className="tile__subtitle">{tile.kpiLabel}</div>}
                  </div>
                </Link>
                <button
                  type="button"
                  className={`tile-favorite ${isFavorite(tile.to) ? 'tile-favorite--active' : ''}`}
                  onClick={() => toggleFavorite(tile.to)}
                  title={isFavorite(tile.to) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  {isFavorite(tile.to) ? '★' : '☆'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="launchpad-group">
        <h2>Apps</h2>
        <div className="apps-tabs">
          {USAGE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`apps-tabs__tab ${usageTab === tab.id ? 'apps-tabs__tab--active' : ''}`}
              onClick={() => setUsageTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        {usageTiles.length === 0 ? (
          <div className="empty-state">
            {usageTab === 'favorites' && 'Clique na estrela de um app para adicioná-lo aos favoritos.'}
            {usageTab === 'recents' && 'Os apps que você acessar vão aparecer aqui.'}
            {usageTab === 'mostUsed' && 'Os apps mais acessados por você vão aparecer aqui.'}
          </div>
        ) : (
          <div className="apps-tile-grid">
            {usageTiles.map(({ tile, groupColor }) => (
              <Link className="apps-mini-tile" to={tile.to} key={tile.to}>
                <span className="apps-mini-tile__icon" style={{ background: groupColor }}>
                  {tile.icon}
                </span>
                <span className="apps-mini-tile__title">{tile.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
