#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f ".env.local" ]; then
  cp ".env.example" ".env.local"
  echo ".env.local criado a partir de .env.example"
fi

if command -v docker >/dev/null 2>&1; then
  docker compose up -d
else
  echo "Docker nao encontrado. Suba um PostgreSQL isolado manualmente antes de continuar."
  exit 1
fi

npx prisma generate
npx prisma db push
npx prisma db seed

echo ""
echo "Ambiente local do Pointer pronto."
echo "Login admin padrao:"
echo "  email: admin@pointer.local"
echo "  senha: ChangeMe123!"
