#!/usr/bin/env bash
# Executado no servidor pelo usuário "deploy" (via SSH, como forced command —
# veja deploy/GITHUB_ACTIONS_DEPLOY.md). Não é para ser rodado manualmente
# como root; espera as permissões do usuário "deploy" (grupo docker, dono de
# /opt/sysvex).
set -euo pipefail

APP_DIR="/opt/sysvex"
BACKUP_DIR="$APP_DIR/backups"
STAMP="$(date +%F-%H%M%S)"

cd "$APP_DIR"

# Lê DB_USERNAME/DB_NAME do .env sem executá-lo como shell — o .env do
# docker compose não é bash válido (ex.: valores com espaços não citados),
# então "source" pode tentar rodar parte do conteúdo como comando.
DB_USERNAME="$(grep -E '^DB_USERNAME=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
DB_NAME="$(grep -E '^DB_NAME=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
DB_USERNAME="${DB_USERNAME:-sysvex}"
DB_NAME="${DB_NAME:-sysvex}"

mkdir -p "$BACKUP_DIR"
echo "==> Backup do banco antes de atualizar"
docker compose exec -T db pg_dump -U "${DB_USERNAME:-sysvex}" "${DB_NAME:-sysvex}" \
  > "$BACKUP_DIR/backup-pre-update-$STAMP.sql"

echo "==> Atualizando código (git pull)"
git pull --ff-only

echo "==> Subindo containers"
docker compose up -d --build

echo "==> Aguardando o backend estabilizar"
sleep 5
docker compose ps

if ! docker compose ps backend | grep -q "Up"; then
  echo "ERRO: container backend não está 'Up' após o deploy." >&2
  docker compose logs backend --tail 80 >&2
  exit 1
fi

echo "==> Últimas linhas do log do backend"
docker compose logs backend --tail 30

echo "==> Deploy concluído com sucesso ($STAMP)"
