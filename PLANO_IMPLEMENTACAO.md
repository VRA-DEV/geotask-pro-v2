# GeoTask Pro v2.0 — Plano de Implementacao

## Visao Geral

GeoTask Pro v2 e a evolucao do sistema de gestao de tarefas, incorporando modulos do GeoGIS Contratos
(NestJS + React) adaptados para a arquitetura Next.js App Router com patterns profissionais.

**Stack:** Next.js 16 | React 19 | TypeScript | Prisma | PostgreSQL | TailwindCSS 4 | Zustand | SWR

---

## ARQUITETURA DO SISTEMA

```
geotask-pro-v2/
├── prisma/
│   ├── schema.prisma          # Schema unificado (v1 + novos modulos)
│   ├── migrations/
│   └── seeds/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Paginas publicas (login, register)
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/       # Paginas protegidas (layout com sidebar)
│   │   │   ├── layout.tsx     # DashboardLayout com auth check
│   │   │   ├── page.tsx       # Home/Dashboard
│   │   │   ├── tarefas/       # Modulo Tarefas (migrado v1)
│   │   │   ├── consulta-processual/  # Modulo 1: GeoBoard
│   │   │   ├── gestao-lotes/         # Modulo 2: Lotes + Compliance + DB
│   │   │   ├── gestao-contratos/     # Modulo 3: Contratos + Entregas + Clientes
│   │   │   ├── gestao-financeira/    # Modulo 4: Faturamento + BM
│   │   │   ├── configuracoes/        # Settings (migrado + v2)
│   │   │   └── logs/                 # Audit Trail viewer
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   ├── register/route.ts
│   │       │   ├── refresh/route.ts
│   │       │   └── me/route.ts
│   │       ├── users/route.ts
│   │       ├── roles/route.ts
│   │       ├── teams/route.ts
│   │       ├── tasks/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── attachments/route.ts
│   │       ├── clients/route.ts           # Novo
│   │       ├── contracts/
│   │       │   ├── route.ts               # Novo
│   │       │   ├── [id]/
│   │       │   │   ├── route.ts
│   │       │   │   ├── items/route.ts
│   │       │   │   ├── distribution/route.ts
│   │       │   │   └── rules/route.ts
│   │       ├── lots/
│   │       │   ├── route.ts               # Novo
│   │       │   ├── import/route.ts
│   │       │   ├── confirm/[id]/route.ts
│   │       │   ├── compliance/route.ts
│   │       │   ├── search/route.ts
│   │       │   └── export/route.ts
│   │       ├── deliveries/
│   │       │   ├── route.ts               # Novo
│   │       │   └── [id]/substitute/route.ts
│   │       ├── billing/
│   │       │   ├── route.ts               # Novo
│   │       │   ├── rules/route.ts
│   │       │   ├── preview/[contractId]/route.ts
│   │       │   └── bm/route.ts
│   │       ├── geoboard/
│   │       │   ├── stats/[contractId]/route.ts
│   │       │   ├── map/[contractId]/route.ts
│   │       │   └── filters/[contractId]/route.ts
│   │       ├── consultas/
│   │       │   ├── cpf/[cpf]/route.ts
│   │       │   └── cnpj/[cnpj]/route.ts
│   │       ├── logs/route.ts
│   │       └── uploads/route.ts
│   ├── lib/
│   │   ├── prisma.ts              # Singleton Prisma Client
│   │   ├── auth/
│   │   │   ├── jwt.ts             # JWT sign/verify com jose
│   │   │   ├── guards.ts         # withAuth, withRoles middleware
│   │   │   ├── password.ts        # bcrypt hash/compare
│   │   │   └── session.ts         # Cookie-based session helpers
│   │   ├── services/              # Service Layer (business logic)
│   │   │   ├── user.service.ts
│   │   │   ├── task.service.ts
│   │   │   ├── contract.service.ts
│   │   │   ├── lot.service.ts
│   │   │   ├── delivery.service.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── client.service.ts
│   │   │   ├── geoboard.service.ts
│   │   │   ├── compliance.service.ts
│   │   │   ├── consulta.service.ts
│   │   │   ├── file.service.ts
│   │   │   └── log.service.ts
│   │   ├── dto/                   # Zod schemas (DTOs)
│   │   │   ├── auth.dto.ts
│   │   │   ├── user.dto.ts
│   │   │   ├── task.dto.ts
│   │   │   ├── contract.dto.ts
│   │   │   ├── lot.dto.ts
│   │   │   ├── delivery.dto.ts
│   │   │   ├── billing.dto.ts
│   │   │   ├── client.dto.ts
│   │   │   └── common.dto.ts
│   │   ├── permissions.ts         # RBAC system
│   │   ├── constants.ts           # Enums, sectors, static data
│   │   ├── helpers.ts             # Task state, date utils
│   │   ├── geo/
│   │   │   ├── shapefile.ts       # SHP parser + projections
│   │   │   └── projections.ts     # UTM/WGS84 transforms
│   │   └── errors.ts             # Custom error classes
│   ├── hooks/                     # React hooks (SWR wrappers)
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   ├── useContracts.ts
│   │   ├── useLots.ts
│   │   ├── useDeliveries.ts
│   │   ├── useBilling.ts
│   │   └── useClients.ts
│   ├── stores/                    # Zustand stores
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── components/
│   │   ├── ui/                    # Componentes base reutilizaveis
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ConfirmDialog.tsx  # Password-protected deletes
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── shared/
│   │   │   ├── DataTable.tsx      # Tabela com sort/filter/pagination
│   │   │   ├── FileUpload.tsx     # Upload component
│   │   │   ├── ExportMenu.tsx     # XLSX/PDF export
│   │   │   └── AuditTimeline.tsx  # Historico de alteracoes
│   │   ├── tasks/                 # Componentes do modulo Tarefas
│   │   ├── contracts/             # Componentes do modulo Contratos
│   │   ├── lots/                  # Componentes do modulo Lotes
│   │   ├── deliveries/            # Componentes do modulo Entregas
│   │   ├── billing/               # Componentes do modulo Financeiro
│   │   └── geoboard/             # Componentes do modulo GeoBoard
│   ├── types/
│   │   ├── index.ts               # Interfaces/types globais
│   │   ├── auth.ts
│   │   ├── contract.ts
│   │   ├── lot.ts
│   │   ├── delivery.ts
│   │   ├── billing.ts
│   │   └── geoboard.ts
│   └── middleware.ts              # Next.js middleware (JWT validation)
├── public/
│   └── uploads/                   # Local dev storage
├── docker-compose.yml             # PostgreSQL + App
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example
└── tsconfig.json
```

---

## FASES DE IMPLEMENTACAO

### FASE 0 — Setup & Infraestrutura
**Duracao estimada: 1 sessao**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 0.1 | Prisma Schema base | Migrar schema v1 + adicionar modelos novos (Client, Contract, ContractItem, GeographicDistribution, Lot, Import, Delivery, DeliveryHistory, BillingRule, Invoice, Payment, AuditLog) |
| 0.2 | Docker Compose | PostgreSQL 15 local + pgAdmin |
| 0.3 | Dockerfile | Multi-stage build (deps → build → prod) |
| 0.4 | .env.example | Todas as variaveis documentadas |
| 0.5 | .gitignore + .dockerignore | Completo e profissional |
| 0.6 | Git init + push | Criar repo VRA-DEV/geotask-pro-v2 |

### FASE 1 — Fundacao Arquitetural
**Duracao estimada: 2 sessoes**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 1.1 | JWT Auth com jose | sign/verify tokens, refresh token rotation, httpOnly cookies |
| 1.2 | Next.js Middleware | Interceptar requests, validar JWT, injetar user no request |
| 1.3 | withAuth / withRoles | HOFs para proteger API routes por role |
| 1.4 | Service Layer Pattern | Base class com Prisma injection, padrao para todos os services |
| 1.5 | DTOs com Zod | Schemas de validacao para todas as entidades |
| 1.6 | Error Handling | AppError classes, error boundary, API error responses padronizadas |
| 1.7 | Audit Trail (LogService) | Log automatico antes/depois JSON, IP, userAgent, userId |
| 1.8 | File Service | Upload local (dev) com interface para S3 (prod), validacao tipo/tamanho |
| 1.9 | Soft Delete Pattern | deletedAt em entidades criticas, filtro automatico no Prisma middleware |
| 1.10 | Password-Protected Deletes | ConfirmDialog component + API validation |

### FASE 2 — Migracao Modulos v1
**Duracao estimada: 2 sessoes**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 2.1 | Layout Dashboard | Sidebar com navegacao por modulos, header com user info |
| 2.2 | Login/Register pages | Formularios com JWT auth |
| 2.3 | Users CRUD | Migrar + refatorar com service layer |
| 2.4 | Roles & Permissions | 8 roles existentes + novos roles externos |
| 2.5 | Teams/Polos | Migrar CRUD de times |
| 2.6 | Tasks Module | Migrar pagina de tarefas completa (filtros, modais, templates) |
| 2.7 | Settings Page | Migrar configuracoes com permissoes matrix |
| 2.8 | Activity Log Viewer | Pagina de visualizacao do novo AuditLog |
| 2.9 | Dashboard Home | Cards de resumo, graficos com Recharts |
| 2.10 | UI Components base | Button, Input, Modal, Table, Badge, Card, Toast |

### FASE 3 — Modulo Gestao de Contratos
**Duracao estimada: 3 sessoes**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 3.1 | **Clientes** — Prisma model + Service | Client model com CNPJ, dados da API ReceitaWS |
| 3.2 | **Clientes** — API routes | GET/POST/PATCH/DELETE com soft delete |
| 3.3 | **Clientes** — Frontend CRUD | Lista + modal cadastro (CNPJ → busca API → salva) |
| 3.4 | **Clientes** — Vincular usuarios | Relacionar usuarios externos a clientes |
| 3.5 | **Contratos** — Prisma model + Service | Contract, ContractItem, GeographicDistribution, MeasurementRule |
| 3.6 | **Contratos** — API routes | CRUD contratos + sub-recursos (items, distribution, rules) |
| 3.7 | **Contratos** — Frontend cadastro | Formulario com: numero, cliente, vigencia, qtd contratada |
| 3.8 | **Contratos** — Itens do contrato | CRUD de itens com valor unitario e quantidade |
| 3.9 | **Contratos** — Distribuicao geografica | Estado/Cidade/Nucleo com validacao de totais |
| 3.10 | **Contratos** — Regras de medicao | CRUD regras com campo + valores |
| 3.11 | **Entregas** — Prisma model + Service | Delivery, DeliveryHistory (substituicoes) |
| 3.12 | **Entregas** — API routes | Registrar entrega, substituir produto, historico |
| 3.13 | **Entregas** — Frontend | Lista entregas por contrato/lote, modal substituicao |
| 3.14 | **Entregas** — Historico substituicoes | Timeline de quem/quando/por que substituiu |
| 3.15 | **Consultas** — CPF/CNPJ API | Endpoints de lookup externo |

### FASE 4 — Modulo Gestao de Lotes
**Duracao estimada: 3 sessoes**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 4.1 | **Lotes** — Prisma model | Lot com 30+ campos, geometria WKT, lat/long, beneficiario |
| 4.2 | **Lotes** — Import Service | Parse SHP (.zip), reprojecao UTM→WGS84, preview de changes |
| 4.3 | **Lotes** — Import API | POST analisar, GET preview, POST confirmar |
| 4.4 | **Lotes** — Frontend import | Upload SHP → tabela preview (criar/atualizar/deletar) → confirmar |
| 4.5 | **Compliance** — Service | Sync com API Ecoleta, comparar SHP vs API vs DB |
| 4.6 | **Compliance** — API routes | POST analisar-api, GET resultados |
| 4.7 | **Compliance** — Frontend | Dashboard com: encontrados no SHP nao na API, encontrados na API nao no SHP |
| 4.8 | **Banco de Dados** — Search API | POST search com filtros avancados, paginacao |
| 4.9 | **Banco de Dados** — Export | XLSX e PDF com ExcelJS e jsPDF |
| 4.10 | **Banco de Dados** — Frontend | DataTable com filtros, sort, paginacao, export |
| 4.11 | **Historico Lotes** — Frontend | Timeline de importacoes com detalhes |

### FASE 5 — Modulo Consulta Processual (GeoBoard)
**Duracao estimada: 2 sessoes**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 5.1 | **GeoBoard** — Service | Estatisticas por contrato, dados para mapa, filtros |
| 5.2 | **GeoBoard** — API routes | stats, map data, filters |
| 5.3 | **GeoBoard** — Map component | React Leaflet com lotes coloridos por status |
| 5.4 | **GeoBoard** — Dashboard | Cards de estatisticas + mapa + filtros geograficos |
| 5.5 | **GeoBoard** — Abas | Todas as visualizacoes (por status, por entrega, por faturamento) |
| 5.6 | **GeoBoard** — Filtros | Estado, cidade, bairro, contrato, status |

### FASE 6 — Modulo Gestao Financeira
**Duracao estimada: 3 sessoes**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 6.1 | **Faturamento** — Service | Calcular lotes aptos, aplicar regras, preview |
| 6.2 | **Faturamento** — API | GET preview, POST executar, GET historico |
| 6.3 | **Faturamento** — Frontend overview | Dashboard com graficos Recharts |
| 6.4 | **Faturamento** — Selecao de lotes | UI para escolher lotes e itens a faturar |
| 6.5 | **BM** — Service | Gerar planilha Excel com lotes + itens faturados |
| 6.6 | **BM** — API | POST gerar BM, PATCH status (Faturar/Recusar + motivo) |
| 6.7 | **BM** — Historico | Lista de BMs com status, timeline, motivos |
| 6.8 | **BM** — Frontend | Tabela de BMs, botoes Faturar/Recusar, modal motivo |
| 6.9 | **Pagamentos** — Service | Confirmar pagamento com documentos (NF) |
| 6.10 | **Pagamentos** — API + Frontend | Upload NF, confirmar, historico |

### FASE 7 — Permissoes v2 & Usuarios Externos
**Duracao estimada: 2 sessoes**

| # | Tarefa | Detalhes |
|---|--------|----------|
| 7.1 | Definir tipos de usuario | INTERNAL (8 roles existentes) + EXTERNAL (Client User) |
| 7.2 | Permissoes por modulo | Quais modulos cada tipo pode acessar |
| 7.3 | Visibilidade por contrato | Usuarios externos veem apenas contratos vinculados |
| 7.4 | Settings v2 | Nova pagina de configuracoes com matrix de permissoes |
| 7.5 | Middleware de acesso | Filtrar dados por tipo de usuario |

---

## TIPOS DE USUARIO

### Usuarios Internos (empresa)
| Role | Acesso |
|------|--------|
| Admin (Gestor) | Tudo |
| Socio | Tudo (visao gerencial) |
| Diretor | Todos modulos, todos contratos |
| Gerente | Todos modulos, contratos do polo |
| Coordenador de Polo | Modulos operacionais, contratos do polo |
| Coordenador de Setores | Modulos operacionais, setores vinculados |
| Gestor | Tarefas + consulta do setor |
| Liderado | Apenas tarefas atribuidas |

### Usuarios Externos (contratante)
| Role | Acesso |
|------|--------|
| Cliente Admin | Consulta Processual + Financeiro (apenas contratos vinculados) |
| Cliente Viewer | Consulta Processual apenas (contratos vinculados) |

---

## MODELOS PRISMA (NOVOS)

```prisma
// Clients
model Client {
  id            Int       @id @default(autoincrement())
  cnpj          String    @unique
  razao_social  String
  nome_fantasia String?
  endereco      String?
  cidade        String?
  estado        String?
  cep           String?
  telefone      String?
  email         String?
  api_data      Json?     // Dados brutos da ReceitaWS
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  deleted_at    DateTime?

  contracts     Contract[]
  users         User[]     // Usuarios externos vinculados
}

// Contracts
model Contract {
  id                  Int       @id @default(autoincrement())
  number              String    @unique
  client_id           Int
  start_date          DateTime
  end_date            DateTime
  contracted_quantity Int
  status              String    @default("ATIVO") // ATIVO, ENCERRADO, CANCELADO
  created_by_id       Int
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
  deleted_at          DateTime?

  client              Client    @relation(fields: [client_id], references: [id])
  created_by          User      @relation("ContractCreator", fields: [created_by_id], references: [id])
  items               ContractItem[]
  distributions       GeographicDistribution[]
  rules               MeasurementRule[]
  lots                Lot[]
  invoices            Invoice[]
}

model ContractItem {
  id            Int       @id @default(autoincrement())
  contract_id   Int
  description   String
  unit          String    // UN, M2, KM, etc
  unit_value    Decimal   @db.Decimal(12, 2)
  quantity      Int
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  contract      Contract  @relation(fields: [contract_id], references: [id])
  deliveries    Delivery[]
  billing_rules BillingRule[]
}

model GeographicDistribution {
  id            Int       @id @default(autoincrement())
  contract_id   Int
  state         String
  city          String
  nucleus       String?
  quantity      Int
  created_at    DateTime  @default(now())

  contract      Contract  @relation(fields: [contract_id], references: [id])
}

model MeasurementRule {
  id            Int       @id @default(autoincrement())
  contract_id   Int
  field         String    // CATEGORIA, STATUS_PROCESSO, etc
  values        Json      // Array de valores aceitos
  active        Boolean   @default(true)
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  contract      Contract  @relation(fields: [contract_id], references: [id])
}

// Lots
model Lot {
  id              Int       @id @default(autoincrement())
  contract_id     Int
  external_id     String?   // ID do sistema externo
  code            String    // Codigo do lote
  beneficiary     String?
  cpf             String?
  address         String?
  neighborhood    String?
  city            String?
  state           String?
  zip_code        String?
  latitude        Float?
  longitude       Float?
  geometry_wkt    String?   @db.Text
  category        String?
  process_status  String?
  area            Float?
  // ... 20+ campos especificos do dominio
  metadata        Json?     // Campos extras do SHP
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  deleted_at      DateTime?

  contract        Contract  @relation(fields: [contract_id], references: [id])
  deliveries      Delivery[]
  import_details  ImportDetail[]
  lot_executions  LotItemExecution[]
}

model Import {
  id            Int       @id @default(autoincrement())
  type          String    // SHAPEFILE, API_ECOLETA
  filename      String?
  status        String    @default("PENDING") // PENDING, CONFIRMED, CANCELLED, ERROR
  total_records Int       @default(0)
  created_count Int       @default(0)
  updated_count Int       @default(0)
  deleted_count Int       @default(0)
  preview_data  Json?     // Dados do preview antes de confirmar
  created_by_id Int
  created_at    DateTime  @default(now())
  confirmed_at  DateTime?

  created_by    User      @relation(fields: [created_by_id], references: [id])
  details       ImportDetail[]
}

model ImportDetail {
  id            Int       @id @default(autoincrement())
  import_id     Int
  lot_id        Int?
  action        String    // CREATE, UPDATE, DELETE, KEEP
  changes       Json?     // {field: {before, after}}
  created_at    DateTime  @default(now())

  import        Import    @relation(fields: [import_id], references: [id])
  lot           Lot?      @relation(fields: [lot_id], references: [id])
}

// Deliveries
model Delivery {
  id              Int       @id @default(autoincrement())
  lot_id          Int
  contract_item_id Int
  type            String    // PRODUTO, CRF_1, PROTOCOLO, CRF_FINAL, DEVOLUTIVA
  subtype         String?   // CRF, CRF Complementar, etc
  file_url        String?
  link            String?
  protocol_number String?
  protocol_date   DateTime?
  delivered_at    DateTime
  created_by_id   Int
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  lot             Lot       @relation(fields: [lot_id], references: [id])
  contract_item   ContractItem @relation(fields: [contract_item_id], references: [id])
  created_by      User      @relation("DeliveryCreator", fields: [created_by_id], references: [id])
  history         DeliveryHistory[]
}

model DeliveryHistory {
  id              Int       @id @default(autoincrement())
  delivery_id     Int
  previous_url    String?
  previous_link   String?
  new_url         String?
  new_link        String?
  reason          String    // Motivo da substituicao
  retroactive_date DateTime? // Data retroativa se aplicavel
  replaced_by_id  Int
  replaced_at     DateTime  @default(now())

  delivery        Delivery  @relation(fields: [delivery_id], references: [id])
  replaced_by     User      @relation("DeliveryReplacer", fields: [replaced_by_id], references: [id])
}

// Billing
model BillingRule {
  id              Int       @id @default(autoincrement())
  contract_item_id Int
  field           String    // CATEGORIA, STATUS_PROCESSO
  values          Json      // Valores que qualificam o lote
  active          Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  contract_item   ContractItem @relation(fields: [contract_item_id], references: [id])
}

model LotItemExecution {
  id              Int       @id @default(autoincrement())
  lot_id          Int
  contract_item_id Int
  billable        Boolean   @default(false)
  billed          Boolean   @default(false)
  invoice_id      Int?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  lot             Lot       @relation(fields: [lot_id], references: [id])
}

model Invoice {
  id              Int       @id @default(autoincrement())
  contract_id     Int
  number          String?   // Numero do BM
  status          String    @default("AGUARDANDO") // AGUARDANDO, FATURADO, RECUSADO
  total_lots      Int
  total_value     Decimal?  @db.Decimal(12, 2)
  reject_reason   String?
  generated_data  Json?     // Snapshot dos dados no momento da geracao
  generated_by_id Int
  billed_by_id    Int?
  billed_at       DateTime?
  rejected_by_id  Int?
  rejected_at     DateTime?
  created_at      DateTime  @default(now())

  contract        Contract  @relation(fields: [contract_id], references: [id])
  generated_by    User      @relation("InvoiceGenerator", fields: [generated_by_id], references: [id])
  payments        Payment[]
}

model Payment {
  id              Int       @id @default(autoincrement())
  invoice_id      Int
  nf_number       String?
  nf_file_url     String?
  order_file_url  String?
  amount          Decimal   @db.Decimal(12, 2)
  paid_at         DateTime?
  confirmed_by_id Int
  created_at      DateTime  @default(now())

  invoice         Invoice   @relation(fields: [invoice_id], references: [id])
  confirmed_by    User      @relation("PaymentConfirmer", fields: [confirmed_by_id], references: [id])
}

// Audit
model AuditLog {
  id          Int       @id @default(autoincrement())
  user_id     Int?
  action      String    // CREATE, UPDATE, DELETE, LOGIN, EXPORT, etc
  entity      String    // User, Task, Contract, Lot, etc
  entity_id   Int?
  before_data Json?
  after_data  Json?
  description String?
  ip_address  String?
  user_agent  String?
  created_at  DateTime  @default(now())
}
```

---

## ORDEM DE EXECUCAO RECOMENDADA

```
FASE 0 (Setup)
  └→ FASE 1 (Auth + Guards + Services + Audit + Files)
       └→ FASE 2 (Migrar v1: Users, Tasks, Settings, UI base)
            └→ FASE 3 (Gestao Contratos — depende de Users, Files, Audit)
                 ├→ FASE 4 (Gestao Lotes — depende de Contracts)
                 └→ FASE 5 (Consulta Processual — depende de Lots)
                      └→ FASE 6 (Financeiro — depende de Contracts, Lots, Deliveries)
                           └→ FASE 7 (Permissoes v2 — refinar tudo)
```

**Total estimado: 16-18 sessoes de desenvolvimento**
