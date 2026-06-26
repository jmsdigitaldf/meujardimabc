param(
  [string]$Database = "jardimabc",
  [string]$User = "postgres",
  [string]$HostName = "localhost",
  [string]$Port = "5432"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql não foi encontrado. Instale o PostgreSQL local e marque a opção de adicionar o binário ao PATH."
}

$env:PGHOST = $HostName
$env:PGPORT = $Port
$env:PGUSER = $User

$databaseExists = psql -d postgres -v ON_ERROR_STOP=1 -tc "select 1 from pg_database where datname = '$Database'"

if (-not ($databaseExists -match "1")) {
  psql -d postgres -v ON_ERROR_STOP=1 -c "create database $Database"
}

psql -d $Database -v ON_ERROR_STOP=1 -f ".\database\001_schema.sql"
psql -d $Database -v ON_ERROR_STOP=1 -f ".\database\002_seed.sql"

Write-Host "Banco $Database pronto em ${HostName}:$Port"
