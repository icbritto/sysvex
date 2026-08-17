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
  colorDark: string;
  tiles: GroupTile[];
}

// Fonte única da estrutura de navegação (linhas de negócio -> páginas),
// compartilhada pela Página Inicial, pelo dropdown das abas do topo e pela
// busca global — todos precisam da mesma lista de páginas navegáveis.
export const LAUNCHPAD_GROUPS: LaunchpadGroup[] = [
  {
    key: 'financeiro',
    title: 'Financeiro',
    color: '#1b69de',
    colorDark: '#8dc8f7',
    tiles: [
      { to: '/finance/entries', icon: 'wallet', title: 'Contas a Pagar/Receber', kpiLabel: 'Em aberto', kpiCountKey: 'openFinance' },
      { to: '/finance/cash-flow', icon: 'cashflow', title: 'Fluxo de Caixa' },
      { to: '/finance/dre', icon: 'trending-up', title: 'DRE Simplificado' },
    ],
  },
  {
    key: 'compras',
    title: 'Compras',
    color: '#e5257c',
    colorDark: '#f6a6c4',
    tiles: [
      { to: '/purchase-orders', icon: 'cart', title: 'Pedidos de Compra', kpiLabel: 'Total', kpiCountKey: 'purchaseOrders' },
      { to: '/partners?type=SUPPLIER', icon: 'factory', title: 'Fornecedores' },
    ],
  },
  {
    key: 'vendas',
    title: 'Vendas',
    color: '#de8300',
    colorDark: '#ffc46b',
    tiles: [
      { to: '/sales-orders', icon: 'receipt', title: 'Pedidos de Venda', kpiLabel: 'Total', kpiCountKey: 'salesOrders' },
      { to: '/sales-orders/deliveries', icon: 'truck', title: 'Acompanhamento de Entregas' },
      { to: '/partners?type=CUSTOMER', icon: 'users', title: 'Clientes' },
    ],
  },
  {
    key: 'estoque_producao',
    title: 'Estoque & Produção',
    color: '#6f42c1',
    colorDark: '#c9a6f0',
    tiles: [
      { to: '/products', icon: 'package', title: 'Produtos & Insumos', kpiLabel: 'Cadastrados', kpiCountKey: 'products' },
      { to: '/products?lowStock=1', icon: 'alert-triangle', title: 'Estoque Baixo', kpiLabel: 'Alertas', kpiCountKey: 'lowStock' },
      { to: '/production-orders', icon: 'layers', title: 'Ordens de Produção', kpiLabel: 'Total', kpiCountKey: 'productionOrders' },
      { to: '/inventory/movements', icon: 'clipboard-list', title: 'Movimentações de Estoque' },
    ],
  },
  {
    key: 'administracao',
    title: 'Administração',
    color: '#c0392b',
    colorDark: '#ffae94',
    tiles: [
      { to: '/admin/users', icon: 'user', title: 'Usuários & Roles' },
      { to: '/admin/company-settings', icon: 'gear', title: 'Dados da Empresa' },
    ],
  },
  {
    key: 'seguranca_compliance',
    title: 'Segurança & Compliance',
    color: '#00857a',
    colorDark: '#7ee8d6',
    tiles: [{ to: '/security/compliance', icon: 'shield-check', title: 'Segurança & Compliance' }],
  },
  {
    key: 'administracao_sistema',
    title: 'Administração de Sistema',
    color: '#5b738b',
    colorDark: '#aab8c8',
    tiles: [{ to: '/system/status', icon: 'monitor', title: 'Status do Sistema' }],
  },
];
