# Banco de Dados Local

Este diretório contém a estrutura Postgres do Super App do Bairro.

## Requisitos

- PostgreSQL instalado localmente.
- `psql` disponível no PATH.

## Criar banco e tabelas

No PowerShell, dentro da pasta do projeto:

```powershell
.\database\setup-local.ps1
```

Parâmetros opcionais:

```powershell
.\database\setup-local.ps1 -Database jardimabc -User postgres -HostName localhost -Port 5432
```

Se o seu Postgres pedir senha, defina `PGPASSWORD` na sessão antes:

```powershell
$env:PGPASSWORD = "sua_senha"
.\database\setup-local.ps1
```

## Arquivos

- `001_schema.sql`: cria extensões, enums, tabelas, índices, triggers e view de permissões.
- `002_seed.sql`: cria planos, categorias e dados iniciais de teste.
- `setup-local.ps1`: cria o banco local e aplica os arquivos SQL.

## Conta base

O modelo usa `users` e `profiles` como conta de morador. As funções adicionais ficam em `user_roles`:

- `driver`
- `business_owner`
- `provider`
- `editor`
- `admin`

O admin é tratado como permissão separada. Motorista, empresário e prestador são ativações da mesma conta.

## Motorista mulher

A tabela `rides` possui:

- `passenger_prefers_female_driver`
- `female_driver_required`

A tabela `driver_profiles` possui:

- `is_available_for_women_only_request`

Esses campos permitem priorizar motoristas mulheres quando passageiras escolherem essa opção.
