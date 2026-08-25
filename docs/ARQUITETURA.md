# Arquitetura — TI Warehouse

## 1. Princípio central

O sistema não é um CRUD de equipamentos. As duas peças que sustentam a
arquitetura são:

1. **Asset Tag / patrimônio** — a identidade permanente e única do equipamento.
2. **Timeline de movimentações** — o histórico imutável de tudo que aconteceu.

Os campos `status`, `currentEmployeeId` e `currentSectorId` do `Asset` são
**projeções de leitura**: existem para a tela de estoque ser rápida. A verdade
histórica está sempre em `AssetMovement`. Se as duas divergirem, a timeline
ganha.

Por isso `dispositivo`, `entrada`, `movimentação` e `responsável` são entidades
separadas. Um notebook comprado, entregue, devolvido, mandado para manutenção e
entregue a outra pessoa é **um** `Asset` com **cinco** `AssetMovement`.

## 2. Modelo de dados

```text
                    Invoice
                       │
                    Purchase ──── responsible (User)
                       │
                 PurchaseItem
                       │
                       ▼
Employee ────────►   Asset   ◄──────── Sector
                       │                 ▲
                       │                 │
                       ▼                 │
                AssetMovement ───────────┘
                       │
                       ▼
                     User (performedBy)
```

| Entidade        | Papel                                                         |
| --------------- | ------------------------------------------------------------- |
| `User`          | quem usa o sistema (ADMIN / OPERATOR / VIEWER)                 |
| `Employee`      | quem recebe equipamento — **não** é usuário do sistema         |
| `Sector`        | setor da empresa                                              |
| `AssetCategory` | Notebook, Monitor, Switch...                                  |
| `Asset`         | o equipamento, com identidade permanente                      |
| `Invoice`       | nota fiscal, separada do equipamento                          |
| `Purchase`      | o recebimento de uma NF por um responsável do TI              |
| `PurchaseItem`  | liga cada ativo à compra que o originou                       |
| `AssetMovement` | linha imutável da timeline                                    |
| `RefreshToken`  | sessão ativa, com rotação e revogação                         |

**Colaborador ≠ usuário.** O João da Engenharia recebe um notebook mas nunca
loga no Warehouse. Misturar as duas coisas obrigaria a criar login para toda a
empresa.

**NF separada do ativo.** Uma nota fiscal pode conter dez notebooks e vinte
monitores. Modelar a NF dentro do equipamento duplicaria o número, a data e o
fornecedor em cada linha — e quebraria a auditoria.

## 3. Ciclo de vida do ativo

Estados (`AssetStatus`):

| Status        | Significado               |
| ------------- | ------------------------- |
| `AVAILABLE`   | disponível no estoque     |
| `ASSIGNED`    | entregue a um colaborador |
| `MAINTENANCE` | em manutenção             |
| `RESERVED`    | reservado                 |
| `RETIRED`     | retirado de operação      |
| `DISPOSED`    | descartado (terminal)     |

Estado físico (`AssetCondition`) é **separado** do status operacional:
`NEW`, `EXCELLENT`, `GOOD`, `FAIR`, `DAMAGED`, `INOPERATIVE`. Assim
"danificado" nunca vira status de estoque.

### Máquina de estados

Implementada em `backend/src/movements/movement-rules.ts` e validada em toda
movimentação. Uma movimentação só é aceita se o status atual do ativo estiver
na lista `from` do tipo.

| Movimentação         | De                                                   | Para                                       |
| -------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `PURCHASE_ENTRY`     | (criação)                                            | `AVAILABLE`                                |
| `ASSIGNMENT`         | `AVAILABLE`, `RESERVED`                              | `ASSIGNED`                                 |
| `RETURN`             | `ASSIGNED`                                           | `AVAILABLE`, `MAINTENANCE`, `DISPOSED`     |
| `MAINTENANCE`        | `AVAILABLE`, `ASSIGNED`, `RESERVED`                  | `MAINTENANCE`                              |
| `MAINTENANCE_RETURN` | `MAINTENANCE`                                        | `AVAILABLE`, `RETIRED`, `DISPOSED`         |
| `RETIREMENT`         | `AVAILABLE`, `ASSIGNED`, `MAINTENANCE`, `RESERVED`   | `RETIRED`                                  |
| `DISPOSAL`           | `AVAILABLE`, `MAINTENANCE`, `RETIRED`                | `DISPOSED`                                 |

É isso que impede entregar um notebook que já está com outra pessoa ou devolver
algo que nunca saiu do estoque. As regras estão cobertas por teste unitário
(`movements.service.spec.ts`).

A rota `GET /api/movements/rules` devolve a máquina de estados para o frontend
habilitar ou esconder ações sem duplicar a regra.

## 4. Transações

Duas operações são atômicas por natureza e usam `$transaction`:

- **Entrada por compra** — cria/reaproveita a NF, cria a compra, cria N ativos,
  cria N itens e cria N movimentações. Ou a nota inteira entra, ou nada entra.
- **Qualquer movimentação** — atualiza a projeção do `Asset` e grava a linha da
  timeline no mesmo commit. Nunca existe ativo com status novo sem histórico.

## 5. Autenticação

```text
POST /api/auth/login  →  accessToken (15 min) + refreshToken (7 dias)
POST /api/auth/refresh →  rotaciona: o token usado é revogado no mesmo instante
POST /api/auth/logout  →  revoga a sessão (ou todas, se nenhum token for enviado)
```

- Senha armazenada apenas como hash **Argon2id**.
- Refresh token guardado como **SHA-256** no banco, com `expiresAt` e
  `revokedAt` — permite revogar sessão sem esperar o token expirar.
- Login responde a mesma mensagem para e-mail inexistente e senha errada.
- Guard global: toda rota é privada até que `@Public()` diga o contrário.
- `RolesGuard` aplica RBAC por `@Roles(...)`.

No frontend, o interceptor renova o access token automaticamente em `401` e
segura requisições concorrentes para disparar **um** refresh só.

## 6. Decisões e trade-offs

**Prisma em vez de TypeORM.** Migrations e modelagem mais simples, tipagem
melhor com TypeScript. O custo é menos flexibilidade em queries muito
complexas — nenhuma delas aparece neste escopo.

**Soft delete onde importa.** `Asset`, `User` e `Employee` usam `deletedAt`.
Apagar de verdade quebraria o histórico, que é justamente o ativo mais valioso
do sistema.

**Paginação e filtros no backend.** A tela de estoque é a mais usada e cresce
com o parque; filtrar no cliente pararia de funcionar em algumas centenas de
equipamentos.

**RBAC completo desde o início, uso gradual.** Os três perfis existem no modelo
e nos guards. Nada impede operar só com `ADMIN` no começo.

**Auditoria mínima.** `createdById`/`updatedById` no ativo e `performedById` em
toda movimentação. Quem fez o quê, e quando, sem tabela de auditoria genérica.

## 7. O que ficou fora do MVP

| Item                                   | Por quê                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| Upload do PDF da NF                    | `Invoice.fileUrl` já existe; falta o storage (S3/MinIO)             |
| Fluxo de reserva (`RESERVED`)          | o status existe, mas não há movimentação que leve a ele             |
| Termo de responsabilidade em PDF       | próximo passo natural depois da entrega                             |
| Importação em massa (CSV/planilha)     | inventário inicial pode exigir; hoje é item a item ou por NF        |
| Testes e2e                             | previstos para login, compra, entrega e devolução                   |
| Manual de marca                        | as cores são aproximações; o manual interno prevalece               |

## 8. Design system

Interface de software corporativo, não cópia do site institucional: base branca
e cinza claro, grafite para texto e navegação, **laranja como accent usado com
moderação** em botões primários, seleção e indicadores. Cards planos, bordas
discretas, sombra quase inexistente, bastante espaço em branco.

Todos os tokens estão no `:root` de `frontend/src/styles.scss`. Se houver manual
de marca interno, trocar apenas aquele bloco basta — os HEX atuais são
aproximações e devem ceder ao manual oficial.
