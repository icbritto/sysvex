# Publicando o SYSVEX em uma LXC (Proxmox) — Ubuntu 24.04

Este guia cobre o caminho completo: criar o container LXC no Proxmox, instalar
o Docker, subir o SYSVEX com Docker Compose e deixá-lo acessível de qualquer
lugar com segurança.

## 1. Criar o container LXC no Proxmox

O SYSVEX roda dentro de containers Docker, e Docker dentro de uma LXC precisa
que a LXC seja **não-privilegiada com aninhamento (nesting) habilitado**.

No shell do host Proxmox (ou via `pct create` na UI):

1. Baixe o template Ubuntu 24.04, se ainda não tiver:
   ```bash
   pveam update
   pveam available | grep ubuntu-24.04
   pveam download local ubuntu-24.04-standard_24.04-*_amd64.tar.zst
   ```
2. Crie o container (ajuste `VMID`, storage, IP e recursos ao seu ambiente):
   ```bash
   pct create 200 local:vztmpl/ubuntu-24.04-standard_24.04-*_amd64.tar.zst \
     --hostname sysvex \
     --cores 2 \
     --memory 2048 \
     --swap 512 \
     --rootfs local-lvm:16 \
     --net0 name=eth0,bridge=vmbr0,ip=dhcp \
     --unprivileged 1 \
     --features nesting=1,keyctl=1 \
     --onboot 1
   ```
   - 2 vCPU / 2 GB RAM já atende bem uma operação pequena; ajuste depois se
     precisar.
   - `nesting=1,keyctl=1` é o que permite rodar Docker dentro da LXC.
3. Inicie o container e entre nele:
   ```bash
   pct start 200
   pct enter 200
   ```

## 2. Instalar o Docker no Ubuntu 24.04

Dentro do container (`pct enter 200`):

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

docker --version
docker compose version
```

## 3. Trazer o código do SYSVEX para a LXC

```bash
mkdir -p /opt
cd /opt
git clone <URL-DO-SEU-REPOSITORIO-SYSVEX> sysvex
cd sysvex
```

Se preferir não usar git na LXC, copie a pasta do projeto via `scp`/`rsync`
para `/opt/sysvex`.

## 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha pelo menos:
- `DB_PASSWORD` — senha do Postgres
- `JWT_SECRET` — gere com `openssl rand -base64 48`
- `SEED_ADMIN_PASSWORD` — senha do primeiro usuário administrador
- `CORS_ORIGIN` e `HTTP_PORT` — de acordo com como você vai acessar (ex.:
  `http://IP-DA-LXC:8080` ou o domínio que for configurar depois)

## 5. Subir os containers

```bash
cd /opt/sysvex
docker compose up -d --build
docker compose ps
```

Isso sobe três containers: `db` (Postgres), `backend` (API NestJS) e
`frontend` (React servido por Nginx, já com proxy para `/api`).

## 6. Criar o usuário administrador (seed)

```bash
docker compose exec backend node dist/seed/seed.js
```

Isso cria o usuário admin definido no `.env` (e, opcionalmente, alguns dados
de exemplo de uma fábrica de doces — insumos, ficha técnica, fornecedor e
cliente — que você pode apagar depois). Guarde a senha em local seguro e
troque-a após o primeiro login.

## 7. Testar o acesso

No navegador, acesse `http://IP-DA-LXC:8080` (ou a porta que você configurou
em `HTTP_PORT`). Você deve ver a tela de login do SYSVEX.

Para descobrir o IP da LXC: `pct exec 200 -- ip a` no host Proxmox, ou `ip a`
dentro do container.

## 8. Iniciar automaticamente com o boot da LXC

```bash
cp /opt/sysvex/deploy/sysvex.service /etc/systemd/system/sysvex.service
systemctl daemon-reload
systemctl enable --now sysvex.service
```

Assim, se a LXC reiniciar (ex.: após atualização do host Proxmox), o SYSVEX
sobe sozinho.

## 9. Acessar de qualquer lugar com segurança

Expor a porta 8080 diretamente na internet (via NAT/port-forward no seu
roteador) funciona, mas fica exposto a varreduras e ataques automatizados.
Duas alternativas mais seguras, da mais simples à mais robusta:

- **VPN pessoal (recomendado para uso solo/pequena equipe):** instale
  [Tailscale](https://tailscale.com/) ou WireGuard na LXC e nos seus
  dispositivos. Você acessa o SYSVEX como se estivesse na rede local, sem
  abrir nenhuma porta no roteador.
  ```bash
  curl -fsSL https://tailscale.com/install.sh | sh
  tailscale up
  ```
- **Reverse proxy com HTTPS (se quiser um domínio público):** coloque um
  Nginx Proxy Manager ou Caddy na frente do SYSVEX (em outra LXC ou no mesmo
  container), com certificado Let's Encrypt, e libere só a porta 443 no
  roteador — nunca a porta do Postgres.

Em qualquer um dos dois casos, **não exponha a porta do Postgres (5432)**
para fora da rede interna — no `docker-compose.yml` ela nem é publicada por
padrão, apenas acessível entre os containers.

## 10. Backup

O dado mais importante é o volume do Postgres (`sysvex_db_data`). Sugestões:

- Snapshot da LXC inteira pelo Proxmox (Backup Jobs, `vzdump`), agendado.
- Dump lógico do banco, para restaurações granulares:
  ```bash
  docker compose exec db pg_dump -U sysvex sysvex > backup-$(date +%F).sql
  ```

## 11. Atualizando o SYSVEX depois de mudanças no código

Com `DB_SYNCHRONIZE=true` (o padrão — veja a seção 12), o backend tenta
ajustar o schema do banco sozinho a cada boot. Isso funciona bem para
mudanças aditivas, mas uma mudança de schema que não seja diretamente
compatível com os dados já existentes (ex.: uma coluna nova obrigatória sem
como preencher automaticamente a partir do que já está na tabela) pode
travar o backend num loop de reinício — o container fica reiniciando sem
nunca terminar de subir, e a aplicação toda fica fora do ar, não só a
funcionalidade nova. Por isso, **sempre tire um backup antes de atualizar**:

```bash
cd /opt/sysvex
docker compose exec db pg_dump -U sysvex sysvex > backup-pre-update-$(date +%F-%H%M).sql
git pull
docker compose up -d --build
```

Depois de subir, confira se o backend realmente ficou de pé (e não está
reiniciando em loop):

```bash
docker compose ps
docker compose logs backend --tail 50
```

`sysvex-backend-1` deve aparecer com "Up" há mais de alguns segundos (não
reiniciando), e o último log deve ser `SYSVEX API rodando na porta 3000`,
sem `QueryFailedError` logo depois. Se o backend estiver preso em loop de
reinício após um `git pull`, é sinal de que a mudança de schema da versão
nova não é compatível com os dados atuais — pare aí, não insista em
reiniciar repetidamente, e trate como um migration manual: será preciso um
script SQL específico para adaptar os dados existentes ao novo schema antes
do backend conseguir subir. Tendo o backup em mãos, também dá para restaurar
o estado anterior enquanto isso é resolvido:

```bash
docker compose exec -T db psql -U sysvex -d sysvex < backup-pre-update-AAAA-MM-DD-HHMM.sql
```

## 12. Colocando `DB_SYNCHRONIZE=false` em produção

O SYSVEX usa `DB_SYNCHRONIZE=true` por padrão para criar o schema
automaticamente na primeira execução — é prático para começar, mas não é
recomendado para produção de longo prazo (alterações de schema aplicadas
automaticamente podem falhar ou ser destrutivas quando já existem dados —
veja o aviso na seção 11). Depois que a base estiver estável, mude
`DB_SYNCHRONIZE=false` no `.env` e passe a gerenciar mudanças de schema via
migrations do TypeORM, que rodam de forma controlada e reversível em vez de
tentar adivinhar o schema a cada boot.
