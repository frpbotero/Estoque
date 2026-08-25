# TI Warehouse

Aplicação web interna para **gestão de ativos e estoque de TI** — controla entrada,
situação, localização, responsabilidade e histórico dos equipamentos da empresa.

O sistema responde à pergunta que todo time de TI precisa responder:

> *Qual equipamento temos, de onde veio, onde está, quem está com ele, em qual
> estado está e tudo o que já aconteceu com ele.*

```text
COMPRA → ESTOQUE → ENTREGA → EM USO → DEVOLUÇÃO → ESTOQUE / MANUTENÇÃO / DESCARTE
```

## Stack

| Camada           | Tecnologia                     |
| ---------------- | ------------------------------ |
| Frontend         | Angular 19 (standalone + signals) |
| Backend          | NestJS 11                      |
| Banco            | PostgreSQL 16                  |
| ORM              | Prisma                         |
| Autenticação     | JWT (access + refresh rotativo) |
| Hash de senha    | Argon2id                       |
| Documentação API | Swagger / OpenAPI              |
| Infra local      | Docker + Docker Compose        |

## Subindo o projeto

```bash
cp .env.example .env      # ajuste os segredos JWT e a senha do admin
docker compose up --build
```

| Serviço  | URL                            |
| -------- | ------------------------------ |
| Frontend | http://localhost:4200          |
| API      | http://localhost:3000/api      |
| Swagger  | http://localhost:3000/api/docs |
| Health   | http://localhost:3000/api/health |

O backend cria o administrador inicial na primeira subida, a partir de
`ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. O processo é **idempotente**:
reiniciar os containers nunca cria administradores duplicados. Categorias e o
setor inicial também são criados quando as tabelas estão vazias.

> Troque a senha do administrador no primeiro acesso — `POST /api/auth/change-password`.

### Desenvolvimento sem Docker

```bash
# banco
docker compose up -d postgres

# backend
cd backend
npm install
npx prisma generate
npm run prisma:migrate -- --name init   # gera a primeira migration versionada
npm run start:dev

# frontend (proxy /api → localhost:3000 já configurado)
cd frontend
npm install
npm start
```

## Migrations

O repositório ainda não traz um histórico de migrations. Na primeira subida via
Docker o entrypoint usa `prisma db push` para sincronizar o schema. Assim que
você gerar a primeira migration com `npm run prisma:migrate -- --name init`, o
entrypoint passa a usar `prisma migrate deploy` automaticamente — o caminho
correto para ambientes compartilhados.

## Estrutura

```text
ti-warehouse/
├── backend/         NestJS + Prisma
│   ├── prisma/      schema.prisma, seed.ts
│   └── src/
│       ├── auth/            login, refresh, guards, RBAC
│       ├── assets/          ativos e timeline
│       ├── movements/       máquina de estados do ciclo de vida
│       ├── purchases/       entrada por compra (NF + itens)
│       ├── employees/ sectors/ categories/   cadastros
│       ├── dashboard/       indicadores
│       ├── bootstrap/       admin inicial idempotente
│       └── common/          paginação, filtros de erro, decorators
├── frontend/        Angular standalone
│   └── src/app/
│       ├── core/            auth, guards, interceptor, cliente da API
│       ├── layout/          shell com sidebar
│       └── features/        dashboard, estoque, movimentações, cadastros, admin
├── docs/            decisões de arquitetura
└── docker-compose.yml
```

## Perfis de acesso

| Perfil     | Permissões                             |
| ---------- | -------------------------------------- |
| `ADMIN`    | tudo, incluindo usuários               |
| `OPERATOR` | movimentações, cadastros e consulta    |
| `VIEWER`   | somente consulta                       |

As rotas da API são privadas por padrão (guard global); `@Public()` abre as
exceções e `@Roles()` restringe por perfil.

## Testes

```bash
cd backend && npm test        # regras da máquina de estados
```

## Documentação

- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — modelo de dados, ciclo de vida do
  ativo, decisões e o que ficou fora do MVP.
