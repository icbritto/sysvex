# SYSVEX

SYSVEX é um ERP próprio, self-hosted, para pequenas e médias empresas —
pensado inicialmente para uma fábrica/loja de doces que hoje controla compras,
vendas e contabilidade no papel e quer digitalizar esse processo.

A navegação é organizada por **linhas de negócio** (Financeiro, Compras,
Vendas, Estoque & Produção, Administração), com uma tela inicial em formato
de tiles inspirada no launchpad do SAP Fiori, e controle de acesso por
usuário com **ID e role próprios** (Admin, Financeiro, Compras, Vendas,
Produção).

> SYSVEX é uma aplicação própria, com código aberto neste repositório — não é
> o produto SAP S/4HANA. A SAP S/4HANA Cloud Private Edition é software
> proprietário licenciado pela SAP, hospedado em infraestrutura própria da
> SAP/hyperscalers, com custos de licenciamento corporativo e requisitos de
> hardware que não são compatíveis com uma LXC doméstica — por isso o SYSVEX
> foi construído do zero, usando os mesmos princípios (navegação por linha de
> negócio, roles de usuário, fluxo compra→estoque→produção→venda→financeiro)
> em uma stack simples de hospedar você mesmo.

## Módulos do MVP

- **Financeiro** — contas a pagar/receber (geradas automaticamente a partir
  de compras e vendas, ou lançadas manualmente), fluxo de caixa e um DRE
  simplificado por período.
- **Compras** — cadastro de fornecedores, pedidos de compra (com forma de
  pagamento); ao "receber" um pedido, o estoque de insumos entra
  automaticamente, um título de contas a pagar é criado e um **Recibo de
  Compra** imprimível fica disponível.
- **Vendas** — cadastro de clientes, pedidos de venda (com forma de
  pagamento); ao "confirmar" um pedido, o estoque de produtos acabados é
  baixado (com checagem de saldo) e um título de contas a receber é criado.
  Todo pedido de venda, independente do status, tem um **Recibo de Venda**
  imprimível com QR Code Pix para pagamento.
- **Estoque & Produção** — cadastro de produtos (insumos e produtos
  acabados), ficha técnica (BOM) por produto acabado, ordens de produção que
  consomem os insumos da ficha técnica, dão entrada no produto acabado e
  calculam o custo de produção, e um ledger completo de movimentações de
  estoque.
- **Administração** — usuários com login próprio e role (Admin, Financeiro,
  Compras, Vendas, Produção, Administração de Sistema, Segurança &
  Compliance), controlando o que cada um pode fazer; e os **Dados da
  Empresa** (razão social, cidade/UF, chave Pix e dados bancários) usados
  na emissão dos recibos de compra e venda.
- **Segurança & Compliance** (role `SX_SECURITY`) — matriz de acesso que
  liga cada linha de negócio (App) às roles autorizadas a vê-la, com
  ativação/desativação por App; análise de conflitos de segregação de
  funções (SoD) sobre essa matriz; concessão de acesso emergencial
  (firefighter) por tempo limitado, com efeito imediato e revogação; e um
  log de auditoria dos eventos sensíveis (troca de role, mudança de
  permissão de App, concessão/revogação de acesso emergencial).
- **Administração de Sistema** (role `SX_SYSTEM`) — painel de status real
  do ambiente (conectividade com o banco, versão, uptime, contagem de
  registros por módulo).

A página inicial ("Launchpad") lista as linhas de negócio como Apps
independentes: cada App pode ser ativado/desativado e restrito a roles
específicas pela Matriz de Acesso em Segurança & Compliance — só aparece
para quem tem permissão.

## Arquitetura

```
sysvex/
├── backend/     API REST em NestJS + TypeORM + PostgreSQL, autenticação JWT
├── frontend/    SPA em React + Vite, launchpad estilo tiles, Nginx no deploy
├── deploy/      systemd unit + guia passo a passo para Proxmox LXC
└── docker-compose.yml
```

- **Backend:** NestJS (TypeScript), PostgreSQL via TypeORM, autenticação por
  JWT, autorização por role (guards `@Roles(...)`), lançamentos financeiros e
  movimentações de estoque gerados dentro de transações de banco para manter
  consistência.
- **Frontend:** React + Vite + TypeScript, React Router, tema visual próprio
  (paleta azul/petróleo, tiles, tabelas) inspirado no Fiori mas sem usar
  marca, logo ou paleta oficial da SAP.
- **Banco de dados:** PostgreSQL 16.

## Rodando localmente (desenvolvimento)

Pré-requisitos: Node.js 20+, PostgreSQL 16 (ou Docker).

```bash
# Banco de dados via Docker (ou use um Postgres local)
docker run -d --name sysvex-db -e POSTGRES_USER=sysvex -e POSTGRES_PASSWORD=sysvex \
  -e POSTGRES_DB=sysvex -p 5432:5432 postgres:16-alpine

# Backend
cd backend
cp .env.example .env
npm install
npm run start:dev   # http://localhost:3000/api

# Em outro terminal: cria o usuário admin (+ dados de exemplo de uma fábrica de doces)
npm run seed

# Frontend
cd ../frontend
npm install
npm run dev          # http://localhost:5173
```

Login inicial (definido no seed): usuário `admin`, senha a que você definir
em `SEED_ADMIN_PASSWORD` no `.env` do backend (padrão `ChangeMe123!` — troque
antes de usar em produção). Depois de logado, cada usuário pode trocar a
própria senha em **Minha Conta** (clique no seu nome, no topo da tela).

## Publicando na sua LXC (Proxmox, Ubuntu 24.04)

Veja o passo a passo completo em
[`deploy/PROXMOX_LXC_SETUP.md`](deploy/PROXMOX_LXC_SETUP.md): criação da LXC,
instalação do Docker, `docker compose up`, systemd para subir no boot, e
como acessar de qualquer lugar com segurança (VPN/Tailscale ou reverse proxy
com HTTPS).

Resumo rápido, já dentro da LXC com Docker instalado:

```bash
git clone <url-do-seu-fork> /opt/sysvex
cd /opt/sysvex
cp .env.example .env && nano .env   # defina senhas e o JWT_SECRET
docker compose up -d --build
docker compose exec backend node dist/seed/seed.js
```

## Roles de usuário

| Role             | Pode fazer                                                        |
|------------------|--------------------------------------------------------------------|
| `SX_ADMIN`       | Tudo, incluindo gestão de usuários                                  |
| `SX_FINANCE`     | Lançamentos financeiros, marcar pago/recebido, fluxo de caixa/DRE   |
| `SX_PURCHASING`  | Pedidos de compra, recebimento de mercadoria                       |
| `SX_SALES`       | Pedidos de venda, confirmação de venda                             |
| `SX_PRODUCTION`  | Ordens de produção, ficha técnica                                   |
| `SX_SYSTEM`      | Painel de status real do ambiente (Administração de Sistema)       |
| `SX_SECURITY`    | Matriz de acesso, SoD, acesso emergencial e auditoria (Segurança & Compliance) |

Todas as roles seguem o padrão `SX_*`. Todas têm acesso de leitura aos
dados para visualizar a operação como um todo; as ações de escrita
específicas de cada área são restritas por role (além do `SX_ADMIN`, que
sempre pode tudo).

## Roadmap sugerido (pós-MVP)

- Migrations do TypeORM em vez de `synchronize: true`
- Emissão de nota fiscal (integração com um provedor de NF-e)
- Relatórios exportáveis (PDF/Excel)
- Multi-empresa / multi-filial
- App mobile ou PWA para uso no balcão
