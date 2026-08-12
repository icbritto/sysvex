export type CountKey =
  | 'partners'
  | 'products'
  | 'lowStock'
  | 'purchaseOrders'
  | 'salesOrders'
  | 'productionOrders'
  | 'openFinance';

export interface GroupTile {
  to: string;
  icon: string;
  title: string;
  kpiLabel?: string;
  kpiCountKey?: CountKey;
}

export interface LaunchpadGroup {
  key: string;
  title: string;
  color: string;
  tiles: GroupTile[];
}

// Fonte única da estrutura de navegação (linhas de negócio -> páginas),
// compartilhada pela Página Inicial, pelo dropdown das abas do topo e pela
// busca global — todos precisam da mesma lista de páginas navegáveis.
export const LAUNCHPAD_GROUPS: LaunchpadGroup[] = [
  {
    key: 'financeiro',
    title: 'Financeiro',
    color: '#0f6bab',
    tiles: [
      { to: '/finance/entries', icon: '💰', title: 'Contas a Pagar/Receber', kpiLabel: 'Em aberto', kpiCountKey: 'openFinance' },
      { to: '/finance/cash-flow', icon: '📊', title: 'Fluxo de Caixa' },
      { to: '/finance/dre', icon: '📈', title: 'DRE Simplificado' },
    ],
  },
  {
    key: 'compras',
    title: 'Compras',
    color: '#c0388b',
    tiles: [
      { to: '/purchase-orders', icon: '🛒', title: 'Pedidos de Compra', kpiLabel: 'Total', kpiCountKey: 'purchaseOrders' },
      { to: '/partners?type=SUPPLIER', icon: '🏭', title: 'Fornecedores' },
    ],
  },
  {
    key: 'vendas',
    title: 'Vendas',
    color: '#c9701c',
    tiles: [
      { to: '/sales-orders', icon: '🧾', title: 'Pedidos de Venda', kpiLabel: 'Total', kpiCountKey: 'salesOrders' },
      { to: '/partners?type=CUSTOMER', icon: '🧑‍🤝‍🧑', title: 'Clientes' },
    ],
  },
  {
    key: 'estoque_producao',
    title: 'Estoque & Produção',
    color: '#6a3fa0',
    tiles: [
      { to: '/products', icon: '📦', title: 'Produtos & Insumos', kpiLabel: 'Cadastrados', kpiCountKey: 'products' },
      { to: '/products?lowStock=1', icon: '⚠️', title: 'Estoque Baixo', kpiLabel: 'Alertas', kpiCountKey: 'lowStock' },
      { to: '/production-orders', icon: '🍬', title: 'Ordens de Produção', kpiLabel: 'Total', kpiCountKey: 'productionOrders' },
      { to: '/inventory/movements', icon: '📋', title: 'Movimentações de Estoque' },
    ],
  },
  {
    key: 'administracao',
    title: 'Administração',
    color: '#b3261e',
    tiles: [{ to: '/admin/users', icon: '👤', title: 'Usuários & Roles' }],
  },
  {
    key: 'seguranca_compliance',
    title: 'Segurança & Compliance',
    color: '#1a7f8e',
    tiles: [{ to: '/security/compliance', icon: '🛡️', title: 'Segurança & Compliance' }],
  },
  {
    key: 'administracao_sistema',
    title: 'Administração de Sistema',
    color: '#3a4750',
    tiles: [{ to: '/system/status', icon: '🖥️', title: 'Status do Sistema' }],
  },
];
