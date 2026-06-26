#!/usr/bin/env bash

# Script de configuração do banco de dados local para Linux

DB_NAME=${1:-"jardimabc"}
DB_USER=${2:-"postgres"}
DB_HOST=${3:-"localhost"}
DB_PORT=${4:-"5432"}

# Interrompe se ocorrer algum erro
set -e

if ! command -v psql &> /dev/null; then
  echo "Erro: psql não foi encontrado. Por favor, certifique-se de que o PostgreSQL está instalado e 'psql' está no seu PATH."
  exit 1
fi

export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$DB_USER"

echo "Verificando se o banco de dados '$DB_NAME' existe..."

# Verifica se o banco existe
DB_EXISTS=$(psql -d postgres -v ON_ERROR_STOP=1 -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | tr -d '[:space:]')

if [ "$DB_EXISTS" != "1" ]; then
  echo "Criando banco de dados '$DB_NAME'..."
  psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DB_NAME"
else
  echo "Banco de dados '$DB_NAME' já existe."
fi

echo "Aplicando schema (001_schema.sql)..."
psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "./database/001_schema.sql"

echo "Populando banco com dados de teste (002_seed.sql)..."
psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "./database/002_seed.sql"

echo "Banco de dados '$DB_NAME' configurado com sucesso em $DB_HOST:$DB_PORT"
