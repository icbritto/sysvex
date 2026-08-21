#!/usr/bin/env bash
# Sincroniza o banco deste ambiente (DEV ou QAS) com uma cópia fresca do PRD.
# Rode este script DENTRO da LXC de destino (DEV ou QAS), a partir da pasta
# onde estão o docker-compose.yml e o .env deste ambiente (ex.: /opt/sysvex).
#
# Uso: ./refresh-from-prd.sh usuario@host-do-prd [caminho-do-sysvex-no-prd]
#
# Pré-requisito: acesso SSH deste host até o host do PRD (chave ou senha
# interativa — este script não guarda nem transmite credenciais além da
# sessão SSH em si).
set -euo pipefail

PRD_TARGET="${1:?informe o SSH de destino do PRD, ex.: root@10.0.0.5}"
PRD_PATH="${2:-/opt/sysvex}"

if [ ! -f docker-compose.yml ] || [ ! -f .env ]; then
  echo "Rode este script de dentro da pasta do ambiente (onde estão docker-compose.yml e .env)." >&2
  exit 1
fi

DB_USERNAME="$(grep -E '^DB_USERNAME=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
DB_NAME="$(grep -E '^DB_NAME=' .env 2>/dev/null | tail -n1 | cut -d= -f2-)"
DB_USERNAME="${DB_USERNAME:-sysvex}"
DB_NAME="${DB_NAME:-sysvex}"

echo "Isso vai APAGAR os dados atuais deste ambiente e substituir por uma cópia"
echo "do PRD (${PRD_TARGET}:${PRD_PATH}). Essa ação não pode ser desfeita."
read -rp "Digite REFRESH para confirmar: " CONFIRM
if [ "$CONFIRM" != "REFRESH" ]; then
  echo "Cancelado."
  exit 1
fi

echo "==> Copiando o banco do PRD e restaurando localmente..."
ssh "$PRD_TARGET" "cd '$PRD_PATH' && \
  DB_USERNAME=\$(grep -E '^DB_USERNAME=' .env | tail -n1 | cut -d= -f2-); \
  DB_NAME=\$(grep -E '^DB_NAME=' .env | tail -n1 | cut -d= -f2-); \
  docker compose exec -T db pg_dump --clean --if-exists -U \"\${DB_USERNAME:-sysvex}\" \"\${DB_NAME:-sysvex}\"" \
  | docker compose exec -T db psql -U "$DB_USERNAME" -d "$DB_NAME"

echo "==> Reiniciando o backend para garantir estado limpo..."
docker compose restart backend

echo "==> Refresh concluído."
