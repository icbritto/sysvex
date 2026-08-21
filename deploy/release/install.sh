#!/usr/bin/env bash
# Instalador do SYSVEX a partir de uma Release baixada do GitHub.
# Uso: extraia o tarball da release e rode este script de dentro da pasta.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Instalador do SYSVEX =="

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não encontrado. Instale antes de continuar: https://docs.docker.com/engine/install/" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Plugin do Docker Compose não encontrado. Instale antes de continuar." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Criando .env com senhas e segredo JWT gerados automaticamente..."
  cp .env.example .env
  sed -i.bak \
    -e "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 24)|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 48)|" \
    -e "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=$(openssl rand -hex 8)|" \
    .env
  rm -f .env.bak
else
  echo ".env já existe, mantendo os valores atuais."
fi

echo "Baixando as imagens..."
docker compose pull

echo "Subindo os containers..."
docker compose up -d

echo "Aguardando o backend ficar pronto..."
ready=false
for _ in $(seq 1 30); do
  if docker compose exec -T backend node -e "process.exit(0)" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 2
done
if [ "$ready" != "true" ]; then
  echo "O backend não respondeu a tempo. Verifique com 'docker compose logs backend'." >&2
  exit 1
fi

echo "Criando o usuário administrador e dados de exemplo..."
docker compose exec -T backend node dist/seed/seed.js

if [ -f sysvex.service ] && command -v systemctl >/dev/null 2>&1; then
  echo "Configurando para iniciar automaticamente no boot..."
  INSTALL_DIR="$(pwd)"
  sed "s|WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}|" sysvex.service > /etc/systemd/system/sysvex.service
  systemctl daemon-reload
  systemctl enable --now sysvex.service >/dev/null 2>&1 || echo "Aviso: não foi possível habilitar o serviço systemd automaticamente — veja deploy/PROXMOX_LXC_SETUP.md (seção 8)." >&2
fi

HTTP_PORT="$(grep -E '^HTTP_PORT=' .env | cut -d= -f2)"
ADMIN_USER="$(grep -E '^SEED_ADMIN_USERNAME=' .env | cut -d= -f2)"
ADMIN_PASSWORD="$(grep -E '^SEED_ADMIN_PASSWORD=' .env | cut -d= -f2)"

echo ""
echo "== SYSVEX instalado com sucesso =="
echo "Acesse: http://localhost:${HTTP_PORT:-8080} (ou http://IP-DO-SERVIDOR:${HTTP_PORT:-8080})"
echo "Usuário: ${ADMIN_USER:-admin}"
echo "Senha:   ${ADMIN_PASSWORD}"
echo ""
echo "Troque a senha em \"Minha Conta\" após o primeiro login."
