#!/bin/sh
set -e

if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "==> Aplicando migrations versionadas"
  npx prisma migrate deploy
else
  # Primeira subida do projeto: ainda não existe histórico de migrations.
  # Gere o primeiro com:  npm run prisma:migrate -- --name init
  echo "==> Nenhuma migration encontrada — sincronizando o schema com db push"
  npx prisma db push --skip-generate
fi

echo "==> Iniciando API"
exec node dist/src/main
