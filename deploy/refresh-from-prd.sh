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
echo "do PRD (${PRD_TARGET}:${PRD_PATH}), com os dados pessoais dos parceiros"
echo "mascarados (nome, documento, e-mail, telefone, endereço). Essa ação não"
echo "pode ser desfeita."
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

echo "==> Mascarando dados pessoais dos parceiros (nome, documento, e-mail,"
echo "    telefone, endereço) — valores financeiros, pedidos, estoque e"
echo "    receitas continuam reais para os testes."
docker compose exec -T db psql -U "$DB_USERNAME" -d "$DB_NAME" <<'SQL'
UPDATE partners SET
  name = 'Parceiro de Teste ' || left(id::text, 8),
  "legalName" = CASE WHEN "legalName" IS NOT NULL THEN 'Empresa de Teste ' || left(id::text, 8) END,
  "tradeName" = CASE WHEN "tradeName" IS NOT NULL THEN 'Fantasia Teste ' || left(id::text, 8) END,
  document = CASE WHEN document IS NOT NULL THEN lpad(left(replace(id::text, '-', ''), 11), 11, '0') END,
  email = 'parceiro+' || left(id::text, 8) || '@teste.invalid',
  phone = CASE WHEN phone IS NOT NULL THEN '+5511900000000' END,
  address = CASE WHEN address IS NOT NULL THEN 'Endereço de teste, s/n' END;
SQL

echo "==> Reiniciando o backend para garantir estado limpo..."
docker compose restart backend

echo "==> Refresh concluído."
