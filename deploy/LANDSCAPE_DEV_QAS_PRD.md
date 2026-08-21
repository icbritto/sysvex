# Paisagem DEV / QAS / PRD

Guia para manter três ambientes do SYSVEX — **DEV** (desenvolvimento/testes),
**QAS** (qualidade) e **PRD** (produção, usado pela empresa no dia a dia) —
e promover atualizações de um para o outro com segurança, sem nunca aplicar
uma mudança em PRD sem antes validá-la em DEV e QAS.

## Visão geral

- Cada ambiente é uma **LXC separada** (`sysvex-dev`, `sysvex-qas`,
  `sysvex-prd`), cada uma com seu próprio Docker, seu próprio banco e seu
  próprio ciclo de vida — problemas ou testes destrutivos em DEV/QAS nunca
  chegam perto dos dados reais do PRD.
- Cada ambiente roda uma **versão (tag de Release) explícita** do SYSVEX —
  nunca "latest" — para que fique sempre claro qual versão está em qual
  lugar.
- **Promoção de código**: DEV → QAS → PRD, sempre nessa ordem, sempre a
  mesma versão testada (nunca se pula direto pra PRD).
- **Refresh de dados**: PRD → DEV/QAS, sempre manual, sob demanda — nunca
  automático.
- **Ativar/desativar um ambiente**: `systemctl stop/start sysvex` na LXC
  correspondente — para os containers (sem uso de CPU/RAM) mas preserva os
  dados, pronto para religar rapidamente quando precisar.

## 1. Provisionar as três LXCs

Repita os passos 1 e 2 de [`PROXMOX_LXC_SETUP.md`](PROXMOX_LXC_SETUP.md)
três vezes, uma por ambiente:

| Ambiente | Hostname sugerido | Exposição de rede |
|----------|--------------------|--------------------|
| DEV      | `sysvex-dev`       | só rede interna/VPN — nunca exposto publicamente |
| QAS      | `sysvex-qas`       | só rede interna/VPN — nunca exposto publicamente |
| PRD      | `sysvex-prd`       | a que a empresa já usa (VPN/Tailscale ou reverse proxy, seção 9 do guia da LXC) |

DEV e QAS podem ter recursos menores (ex.: 1 vCPU / 1 GB RAM) já que não
atendem usuários reais simultaneamente.

## 2. Instalar cada ambiente (versão fixa, via Release)

Dentro de cada LXC, em vez de `releases/latest/download/...` (que muda a
cada Release nova), baixe a Release de uma **versão específica** — a mesma
que você decidiu promover:

```bash
mkdir -p /opt/sysvex && cd /opt/sysvex
curl -L https://github.com/icbritto/sysvex/releases/download/v1.0.0/sysvex.tar.gz | tar xz --strip-components=1
./install.sh
```

Repita em cada LXC (DEV, QAS e, quando for a hora — seção 4 —, PRD),
sempre com a mesma versão nas três, até promover a próxima. O
`install.sh` já habilita o boot automático sozinho (via `sysvex.service`,
incluído no pacote da Release) — não é preciso repetir a seção 8 do guia
da LXC.

Depois, defina o rótulo de ambiente correto e reaplique:

```bash
sed -i 's/^SYSVEX_ENV=.*/SYSVEX_ENV=dev/' .env   # ou qas / prd, conforme o ambiente
docker compose up -d
```

## 3. Refresh de dados (PRD → DEV/QAS)

Antes de testar uma atualização, equalize os dados de DEV/QAS com uma
cópia fresca do PRD, para que o teste reflita a realidade:

Dentro da LXC de **DEV** ou **QAS** (nunca dentro do PRD — o refresh só
puxa dados, nunca envia):

```bash
cd /opt/sysvex
/opt/sysvex/deploy/refresh-from-prd.sh root@IP-DA-LXC-PRD
```

O script pede confirmação explícita (`REFRESH`) antes de apagar os dados
atuais do ambiente local e substituí-los pelo dump do PRD — é destrutivo
para o ambiente de destino, mas nunca toca no PRD. Exige que a LXC de
destino consiga se conectar via SSH na do PRD (chave ou senha).

Depois de restaurar o dump, o script **mascara automaticamente os dados
pessoais dos parceiros** (nome, documento, e-mail, telefone, endereço) —
valores financeiros, pedidos, estoque e receitas continuam reais, para que
o teste ainda reflita volumes e valores realistas sem expor dados de
clientes/fornecedores reais em DEV/QAS.

## 4. Promovendo uma atualização (DEV → QAS → PRD)

1. Solicite a mudança normalmente — ela é desenvolvida, revisada e
   mesclada em `main` como qualquer outra.
2. Quando estiver pronta para um ciclo de testes, dispare o workflow
   **Release** (`Actions > Release > Run workflow`) com a próxima versão
   (ex.: `1.1.0`) — veja a seção "Instalando a partir de uma Release" no
   [`README.md`](../README.md).
3. **DEV**: baixe o `docker-compose.yml` dessa nova tag por cima do
   existente (o `.env` já configurado não é mexido) e suba:
   ```bash
   cd /opt/sysvex
   curl -L https://github.com/icbritto/sysvex/releases/download/v1.1.0/sysvex.tar.gz | tar xz --strip-components=1 sysvex/docker-compose.yml
   docker compose pull
   docker compose up -d
   docker compose ps   # confirme que backend/frontend subiram e não estão reiniciando em loop
   ```
   Rode o Refresh (seção 3) antes se quiser testar contra dados realistas,
   e valide a versão nova no DEV.
4. **QAS**: só depois do DEV validado, repita o mesmo passo 3 na LXC do
   QAS, com a mesma versão. É aqui que a qualidade é atestada antes de
   qualquer usuário real ver a mudança.
5. **PRD**: só depois do QAS validado, repita o mesmo passo 3 na LXC do
   PRD — **sempre tire um backup antes** (seção 11 do
   [`PROXMOX_LXC_SETUP.md`](PROXMOX_LXC_SETUP.md)):
   ```bash
   docker compose exec db pg_dump -U sysvex sysvex > backup-pre-update-$(date +%F-%H%M).sql
   ```

Nunca pule uma etapa: uma versão só chega em PRD depois de já ter passado
por DEV e QAS sem problemas.

## 5. Ativar/desativar um ambiente sob demanda

Os dados e a configuração de cada ambiente continuam intactos mesmo com os
containers parados — só religar quando precisar:

```bash
# Desativar (sem uso de CPU/RAM, dados preservados)
systemctl stop sysvex

# Reativar
systemctl start sysvex
```
