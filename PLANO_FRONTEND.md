# Plano de Implementacao Frontend — GeoTask Pro v2

## Visao Geral

O backend esta 100% completo (34 API routes, 15 services, 10 roles com permissoes granulares).
As paginas frontend sao atualmente placeholders. Este plano detalha a implementacao completa.

**Stack:** Next.js 16 + React 19 + TypeScript + TailwindCSS 4 + Zustand + SWR + Lucide Icons
**Libs ja instaladas:** recharts, react-day-picker, date-fns, exceljs, jspdf, leaflet, react-leaflet

---

## Arquitetura Frontend

```
src/
├── app/
│   ├── (auth)/login/page.tsx          ✅ Pronto
│   ├── (dashboard)/
│   │   ├── layout.tsx                 ✅ Pronto (sidebar + header)
│   │   ├── page.tsx                   🔧 Dashboard (stats reais das APIs)
│   │   ├── tarefas/page.tsx           🆕 Hub de Tarefas (Kanban/Lista/Cronograma)
│   │   ├── consulta-processual/       🆕 Mapa Leaflet + Filtros
│   │   ├── gestao-lotes/              🆕 Import SHP + Banco de Dados
│   │   ├── gestao-contratos/          🆕 Contratos + Clientes + Entregas
│   │   ├── gestao-financeira/         🆕 Faturamento + BM + Pagamentos
│   │   ├── configuracoes/             🆕 Settings 2.0 (Users, Roles, Teams, Permissoes)
│   │   └── logs/                      🆕 Audit Trail Viewer
│   └── globals.css                    ✅ Pronto (cores, dark mode, animacoes)
├── components/
│   ├── layout/                        ✅ Sidebar.tsx, Header.tsx
│   ├── shared/                        🆕 Componentes reutilizaveis
│   ├── dashboard/                     🆕 Cards, Charts
│   ├── tasks/                         🆕 Kanban, Lista, Modal, Filtros
│   ├── contracts/                     🆕 ContractTable, ContractForm, ClientForm
│   ├── lots/                          🆕 LotTable, ImportWizard, CompliancePanel
│   ├── financial/                     🆕 InvoiceTable, BMGenerator, PaymentForm
│   ├── geoboard/                      🆕 MapView, LotPopup, StatsPanel
│   ├── settings/                      🆕 PermissionMatrix, UserForm, TeamManager
│   └── ui/                            🆕 Button, Input, Modal, Table, Badge, etc.
├── hooks/
│   ├── useAuth.ts                     ✅ Pronto
│   ├── useTasks.ts                    ✅ Pronto (atualizar com novos filtros)
│   ├── useContracts.ts                🆕
│   ├── useClients.ts                  🆕
│   ├── useLots.ts                     🆕
│   ├── useDeliveries.ts               🆕
│   ├── useFinancial.ts                🆕
│   ├── usePermissions.ts              🆕
│   ├── useVisibility.ts               🆕
│   └── useGeoboard.ts                 🆕
└── stores/
    ├── authStore.ts                   ✅ Pronto
    └── uiStore.ts                     ✅ Pronto (expandir com modais novos)
```

---

## FASE F1 — Componentes Base (UI Kit)

**Objetivo:** Criar um design system reutilizavel antes de construir paginas.

### F1.1 Componentes UI primitivos (`src/components/ui/`)

| Componente | Arquivo | Descricao |
|-----------|---------|-----------|
| Button | `Button.tsx` | Variantes: primary, secondary, outline, danger, ghost. Tamanhos: sm, md, lg. Loading state. |
| Input | `Input.tsx` | Label, error, helper text, icons left/right, disabled |
| Select | `Select.tsx` | Nativo com styling. Options, placeholder, error |
| TextArea | `TextArea.tsx` | Resizable, character count |
| Badge | `Badge.tsx` | Variantes por cor + status mapping |
| Modal | `Modal.tsx` | Overlay + animacao, header/body/footer slots, tamanhos (sm/md/lg/xl/full) |
| Table | `Table.tsx` | Sortable headers, pagination integrada, loading skeleton, empty state |
| Card | `Card.tsx` | Header, body, footer. Variantes: default, outlined, elevated |
| Tabs | `Tabs.tsx` | Horizontal tabs com contador (badge) |
| DropdownMenu | `DropdownMenu.tsx` | Menu contextual com icones |
| Toast | `Toast.tsx` | Notificacoes toast (success, error, warning, info) + provider |
| ConfirmDialog | `ConfirmDialog.tsx` | Dialog de confirmacao com senha opcional (para deletes) |
| Skeleton | `Skeleton.tsx` | Loading placeholders |
| EmptyState | `EmptyState.tsx` | Icone + titulo + descricao + CTA |
| SearchInput | `SearchInput.tsx` | Input com debounce (300ms) |
| DatePicker | `DatePicker.tsx` | Wrapper do react-day-picker com formatacao PT-BR |
| FileUpload | `FileUpload.tsx` | Drag & drop + preview + validacao de tipo/tamanho |
| Pagination | `Pagination.tsx` | Navegacao de paginas com info total |
| StatusBadge | `StatusBadge.tsx` | Badges coloridos para status de tarefas/contratos/BMs |
| Avatar | `Avatar.tsx` | Iniciais ou imagem, tamanhos variados |
| Toggle | `Toggle.tsx` | Switch on/off para permissoes |

### F1.2 Componentes Shared (`src/components/shared/`)

| Componente | Arquivo | Descricao |
|-----------|---------|-----------|
| PageHeader | `PageHeader.tsx` | Titulo + descricao + acoes (botoes) |
| FilterBar | `FilterBar.tsx` | Barra de filtros expansivel com chips ativos |
| DataTable | `DataTable.tsx` | Table avancada: sort, filter, select rows, export, bulk actions |
| FormSection | `FormSection.tsx` | Agrupamento de campos com titulo |
| StatCard | `StatCard.tsx` | KPI card com icone, valor, variacao, link |
| PermissionGate | `PermissionGate.tsx` | Wrapper que renderiza children somente se user tem permissao |

### F1.3 Hook Utilitario (`src/hooks/`)

| Hook | Arquivo | Descricao |
|------|---------|-----------|
| useVisibility | `useVisibility.ts` | Chama GET /api/visibility e retorna permissions, assignable_users, sectors. Cached via SWR. |
| useDebounce | `useDebounce.ts` | Debounce de valores (search inputs) |
| useToast | `useToast.ts` | Contexto global para toasts |

**Estimativa:** ~2 sessoes de desenvolvimento

---

## FASE F2 — Dashboard Real (`/`)

**API usada:** GET /api/tasks, GET /api/contracts, GET /api/lots/stats, GET /api/financial/dashboard

### Componentes:
```
src/components/dashboard/
├── DashboardStats.tsx          — 4 KPI cards com dados reais
├── RecentActivity.tsx          — Ultimas atividades do audit log
├── TaskOverview.tsx            — Grafico pizza status tarefas (recharts)
├── ContractsSummary.tsx        — Mini-tabela dos contratos ativos
├── FinancialChart.tsx          — Grafico barras faturamento (recharts)
└── QuickActions.tsx            — Botoes rapidos: Nova Tarefa, Novo Contrato, Import SHP
```

### Hook:
```typescript
// src/hooks/useDashboard.ts
// Fetches em paralelo: tasks count, contracts count, lot stats, financial summary
// Retorna: stats, recentActivity, isLoading
```

### Pagina atualizada:
```
src/app/(dashboard)/page.tsx
— Substituir cards estaticos por DashboardStats com dados reais
— Adicionar graficos de TaskOverview e FinancialChart
— Adicionar RecentActivity e QuickActions
— Respeitar permissoes: esconder financial se !permissions.pages.view_gestao_financeira
```

**Estimativa:** ~1 sessao

---

## FASE F3 — Modulo Tarefas (`/tarefas`)

**APIs:** GET/POST/PATCH/DELETE /api/tasks, GET /api/tasks/[id], GET/POST/DELETE /api/tasks/[id]/attachments

### Estrutura:
```
src/app/(dashboard)/tarefas/page.tsx    — Hub com tabs: Kanban | Lista | Cronograma
src/components/tasks/
├── TasksHub.tsx                — Container com filtros + tabs
├── TaskFilters.tsx             — Filtros: status, setor, responsavel, time, tipo, prioridade, "Criadas por mim"
├── KanbanBoard.tsx             — Colunas por status com drag & drop
├── KanbanColumn.tsx            — Coluna individual
├── KanbanCard.tsx              — Card de tarefa (avatar, prioridade, deadline, subtasks count)
├── TaskListView.tsx            — DataTable com sort, pagination
├── TaskTimelineView.tsx        — Cronograma horizontal (Gantt simplificado)
├── NewTaskModal.tsx            — Modal criar tarefa com form completo
├── TaskDetailModal.tsx         — Modal detalhes: info, subtasks, comentarios, historico, anexos, pausas
├── TaskDetailTabs.tsx          — Tabs dentro do modal: Detalhes | Subtarefas | Comentarios | Anexos | Historico
├── SubtaskList.tsx             — Lista de subtarefas com toggle done
├── CommentSection.tsx          — Comentarios com @mentions
├── AttachmentPanel.tsx         — Upload/preview/download de anexos
├── PauseManager.tsx            — Gerenciar pausas retroativas (Admin/Gerente)
└── TaskStatusBadge.tsx         — Badge colorido: A Fazer, Em Andamento, Pausado, Concluido, Em Atraso
```

### Hooks:
```typescript
// src/hooks/useTasks.ts — JA EXISTE, expandir com filtros de time/created_by_me
// src/hooks/useTaskActions.ts — CRUD actions: create, updateStatus, updateFields, delete, toggleSubtask
```

### Comportamento por cargo:
- **Admin/Gerente:** Ve tudo, pode criar/editar/deletar, gerenciar pausas
- **Coord. Polo:** Ve tarefas do time + proprias, pode criar
- **Coord. Setores:** Ve tarefas dos setores vinculados + proprias
- **Gestor:** Ve tarefas do setor + proprias, pode criar
- **Liderado:** Ve apenas onde e responsavel/coworker
- **Socio/Diretor:** Ve tudo, so pode criar (Diretor) ou nao (Socio)

**Estimativa:** ~3 sessoes (maior modulo)

---

## FASE F4 — Modulo Gestao de Contratos (`/gestao-contratos`)

**APIs:** /api/clients, /api/contracts, /api/contracts/[id]/items, /api/contracts/[id]/distribution, /api/contracts/[id]/rules, /api/deliveries, /api/consultas/cnpj/[cnpj]

### Estrutura:
```
src/app/(dashboard)/gestao-contratos/page.tsx   — Hub com tabs: Contratos | Clientes | Entregas
src/components/contracts/
├── ContractsHub.tsx            — Container com 3 abas
├── ContractTable.tsx           — Lista de contratos com status badge
├── ContractForm.tsx            — Modal criar/editar contrato (wizard multi-step)
├── ContractDetail.tsx          — Detalhe completo: items, distribuicao, regras, lotes vinculados
├── ContractItemsEditor.tsx     — CRUD inline de items do contrato
├── DistributionEditor.tsx      — CRUD de distribuicao geografica (estado/cidade/qtd)
├── RulesEditor.tsx             — Editor de regras de medicao
├── ClientTable.tsx             — Lista de clientes com search
├── ClientForm.tsx              — Modal criar/editar cliente
├── CnpjLookup.tsx              — Componente de busca CNPJ (ReceitaWS) com auto-fill
├── DeliveryTable.tsx           — Lista de entregas com filtros
├── DeliveryForm.tsx            — Modal registrar entrega
├── BulkDeliveryForm.tsx        — Upload em lote de entregas
├── SubstituteDeliveryModal.tsx — Modal para substituir entrega com motivo
└── DeliveryHistory.tsx         — Historico de substituicoes
```

### Hooks:
```typescript
// src/hooks/useContracts.ts — list, getById, create, update, delete
// src/hooks/useClients.ts — list, getById, create, update, cnpjLookup
// src/hooks/useDeliveries.ts — list, create, createBulk, substitute
```

### Fluxos principais:
1. **Criar Contrato:** Wizard (Dados basicos → Items → Distribuicao → Regras)
2. **Buscar CNPJ:** Input CNPJ → Consulta API → Auto-preenche form de cliente
3. **Registrar Entrega:** Selecionar lote + item + tipo → Upload arquivo/link
4. **Substituir Entrega:** Selecionar entrega → Motivo → Nova data retroativa → Salvar

**Estimativa:** ~2 sessoes

---

## FASE F5 — Modulo Gestao de Lotes (`/gestao-lotes`)

**APIs:** /api/lots, /api/lots/[id], /api/lots/import, /api/lots/filters, /api/lots/stats, /api/lots/[id]/compliance

### Estrutura:
```
src/app/(dashboard)/gestao-lotes/page.tsx   — Hub com tabs: Banco de Dados | Importacao | Compliance
src/components/lots/
├── LotsHub.tsx                 — Container com 3 abas
├── LotDatabase.tsx             — Tabela avancada: filtros, paginacao, export CSV/JSON
├── LotFilters.tsx              — Filtros dinamicos (contrato, cidade, bairro, status, categoria, com geometria)
├── LotDetail.tsx               — Modal detalhe: dados, mapa mini, entregas vinculadas
├── LotForm.tsx                 — Modal criar/editar lote manualmente
├── BulkUpdateModal.tsx         — Update em massa de lotes selecionados
├── ImportWizard.tsx            — Wizard 3 steps: Upload ZIP → Preview Diff → Confirmar
│   ├── Step1Upload.tsx         — Drag & drop ZIP + selecionar contrato + bairro
│   ├── Step2Preview.tsx        — Tabela diff: novos (verde), alterados (azul), removidos (vermelho)
│   └── Step3Confirm.tsx        — Resumo + botao confirmar/cancelar
├── ImportHistory.tsx           — Lista de importacoes com status e detalhes
├── CompliancePanel.tsx         — Status sync Ecoleta + botao sincronizar
├── ComplianceHistory.tsx       — Historico de syncs
└── LotStats.tsx                — Cards estatisticos: total, com geometria, por status, por categoria (recharts)
```

### Hooks:
```typescript
// src/hooks/useLots.ts — list, getById, create, update, delete, bulkUpdate, exportCsv
// src/hooks/useLotFilters.ts — GET /api/lots/filters (opcoes de filtro dinamicas)
// src/hooks/useLotStats.ts — GET /api/lots/stats
// src/hooks/useImports.ts — analyze (upload SHP), confirm, cancel, list history
```

### Fluxos principais:
1. **Import SHP:** Upload ZIP → API analisa e gera diff → Preview → Confirmar
2. **Banco de Dados:** Filtrar lotes → Ver detalhes → Editar → Export CSV
3. **Compliance:** Selecionar contrato → Sync com Ecoleta → Ver resultado
4. **Bulk Update:** Selecionar multiplos lotes → Alterar campo em massa

**Estimativa:** ~2 sessoes

---

## FASE F6 — Modulo Consulta Processual (`/consulta-processual`)

**APIs:** GET /api/geoboard?type=map|stats|filters|detail

### Estrutura:
```
src/app/(dashboard)/consulta-processual/page.tsx — Pagina com mapa + painel lateral
src/components/geoboard/
├── GeoboardPage.tsx            — Layout: mapa (70%) + painel lateral (30%)
├── MapView.tsx                 — Leaflet map com markers coloridos por status
├── MapControls.tsx             — Filtros overlay no mapa: contrato, cidade, status
├── LotMarker.tsx               — Marker customizado com cor por status
├── LotPopup.tsx                — Popup ao clicar: codigo, beneficiario, status, link detalhe
├── StatsPanel.tsx              — Painel lateral: total lotes, por status, por categoria
├── StatsCharts.tsx             — Graficos donut/barra (recharts) dentro do painel
├── SearchOverlay.tsx           — Busca por codigo/CPF/beneficiario no mapa
└── LotDetailDrawer.tsx         — Drawer lateral com detalhes completos do lote
```

### Hooks:
```typescript
// src/hooks/useGeoboard.ts — getMapData, getStats, getFilters, getLotDetail
```

### Notas tecnicas:
- **Leaflet:** Usar `react-leaflet` com `dynamic(() => import(...), { ssr: false })` para evitar SSR issues
- **Markers:** Colorir por `process_status` (verde = concluido, amarelo = em andamento, vermelho = pendente)
- **Cluster:** Implementar clustering para performance com muitos markers (leaflet.markercluster)
- **Filtros:** Atualizam markers sem recarregar pagina toda

**Estimativa:** ~2 sessoes

---

## FASE F7 — Modulo Gestao Financeira (`/gestao-financeira`)

**APIs:** /api/financial/billing-rules, /api/financial/invoices, /api/financial/invoices/[id], /api/financial/payments, /api/financial/dashboard

### Estrutura:
```
src/app/(dashboard)/gestao-financeira/page.tsx — Hub com tabs: Overview | BMs | Pagamentos | Regras
src/components/financial/
├── FinancialHub.tsx            — Container com 4 abas
├── FinancialOverview.tsx       — Dashboard: KPIs, graficos faturamento, timeline
├── InvoiceTable.tsx            — Lista de BMs com status badges
├── InvoiceDetail.tsx           — Detalhe da BM: lotes inclusos, valor, acoes
├── BMGenerator.tsx             — Wizard: Selecionar contrato → Items → Filtros → Preview → Gerar
│   ├── Step1Contract.tsx       — Selecionar contrato
│   ├── Step2Items.tsx          — Selecionar items do contrato (checkboxes)
│   ├── Step3Filters.tsx        — Filtros opcionais: categoria, bairro, cidade
│   └── Step4Preview.tsx        — Resumo: X lotes, valor total → Botao "Gerar BM"
├── InvoiceActions.tsx          — Botoes: Faturar (NF number) / Recusar (motivo)
├── PaymentTable.tsx            — Lista de pagamentos
├── PaymentForm.tsx             — Modal registrar pagamento (NF, valor, data)
├── BillingRulesEditor.tsx      — CRUD de regras de faturamento por item
├── FinancialCharts.tsx         — Graficos: faturamento mensal, por contrato, por status (recharts)
└── ExportReport.tsx            — Exportar relatorio financeiro (Excel/PDF)
```

### Hooks:
```typescript
// src/hooks/useFinancial.ts — listInvoices, generateBM, invoiceAction, listPayments, createPayment, dashboard
// src/hooks/useBillingRules.ts — listRules, createRule, updateRule, deleteRule
```

### Fluxo BM:
```
Selecionar Contrato → Escolher Items → Aplicar Filtros → Preview (qtd lotes + valor)
→ Gerar BM (status AGUARDANDO) → Admin Fatura ou Recusa → Se Faturado → Registrar Pagamento
```

### Status Flow:
```
AGUARDANDO → FATURADO → Pagamento confirmado
           → RECUSADO (com motivo)
```

**Estimativa:** ~2 sessoes

---

## FASE F8 — Configuracoes (`/configuracoes`)

**APIs:** /api/users, /api/roles, /api/teams, /api/permissions, /api/user-sectors, /api/visibility

### Estrutura:
```
src/app/(dashboard)/configuracoes/page.tsx — Hub com tabs
src/components/settings/
├── SettingsHub.tsx              — Container com tabs laterais
├── UsersTab.tsx                 — CRUD de usuarios com filtros
├── UserForm.tsx                 — Modal criar/editar usuario (campos por tipo: INTERNAL/EXTERNAL)
├── UserSectorManager.tsx        — Multi-select de setores adicionais (para Coord. Setores)
├── RolesTab.tsx                 — Lista de cargos com contagem de usuarios
├── TeamsTab.tsx                 — CRUD de times com lista de membros
├── TeamForm.tsx                 — Modal criar/editar time
├── TeamMembersManager.tsx       — Vincular/desvincular usuarios do time
├── SectorsTab.tsx               — Lista de setores
├── TaskTypesTab.tsx             — CRUD tipos de tarefa
├── ClientsTab.tsx               — CRUD clientes (link para gestao-contratos)
├── PermissionsTab.tsx           — Matriz visual de permissoes
├── PermissionMatrix.tsx         — Grid: linhas = cargos, colunas = permissoes. Toggles por celula
├── PermissionCategoryRow.tsx    — Agrupamento por categoria (pages, tasks, contracts, etc.)
└── ConfirmSaveDialog.tsx        — Dialogo "Tem certeza?" ao salvar permissoes
```

### Hooks:
```typescript
// src/hooks/usePermissions.ts — getMatrix, savePermissions, resetPermissions
// src/hooks/useUserSectors.ts — listByUser, linkSector, unlinkSector, syncSectors
```

### Matriz de Permissoes (UI):
```
                         | view_dashboard | view_tasks | create_task | edit_any | manage_pauses | ...
Admin (Gestor)           |      ✅        |     ✅     |     ✅      |    ✅    |      ✅       |
Socio                    |      ✅        |     ❌     |     ❌      |    ❌    |      ❌       |
Diretor                  |      ✅        |     ✅     |     ✅      |    ❌    |      ❌       |
Gerente                  |      ✅        |     ✅     |     ✅      |    ✅    |      ✅       |
Coord. Polo              |      ✅        |     ✅     |     ✅      |    ❌    |      ❌       |
Coord. Setores           |      ✅        |     ✅     |     ✅      |    ✅    |      ❌       |
Gestor                   |      ✅        |     ✅     |     ✅      |    ❌    |      ❌       |
Liderado                 |      ✅        |     ✅     |     ❌      |    ❌    |      ❌       |
Cliente Admin            |      ✅        |     ❌     |     ❌      |    ❌    |      ❌       |
Cliente Viewer           |      ✅        |     ❌     |     ❌      |    ❌    |      ❌       |
```

**Estimativa:** ~2 sessoes

---

## FASE F9 — Logs (`/logs`)

**APIs:** GET /api/logs

### Estrutura:
```
src/app/(dashboard)/logs/page.tsx
src/components/logs/
├── AuditLogViewer.tsx          — Tabela com filtros: usuario, acao, entidade, data
├── LogFilters.tsx              — Filtros por: periodo, usuario, acao, entidade
├── LogDetailModal.tsx          — Modal com before/after JSON diff
└── LogExport.tsx               — Exportar logs para CSV/Excel
```

**Estimativa:** ~0.5 sessao

---

## FASE F10 — Refinamentos & Polish

### F10.1 Layout e Navegacao
- Atualizar `Sidebar.tsx`: filtrar itens por `permissions.pages.*`
- Adicionar indicadores de notificacao no sidebar
- Breadcrumbs nas paginas internas
- Mobile responsive (sidebar colapsavel no mobile)

### F10.2 Dark Mode
- Verificar todas as paginas novas respeitam dark mode (usar `dark:` variants)
- Toggle no header ja existe

### F10.3 Loading & Error States
- Skeleton loading em todas as tabelas
- Error boundaries por modulo
- Empty states com ilustracoes

### F10.4 PermissionGate Component
```tsx
// Uso:
<PermissionGate category="financial" permission="generate_bm">
  <Button onClick={handleGenerateBM}>Gerar BM</Button>
</PermissionGate>

// Se user nao tem permissao, nao renderiza nada
```

### F10.5 Admin exibido como "Gestor" na UI
- Usar `getRoleDisplayName("Admin")` → "Gestor" em toda a UI

**Estimativa:** ~1 sessao

---

## Ordem de Execucao Recomendada

```
F1 (UI Kit)              ████████░░  ~2 sessoes   — Base para tudo
F2 (Dashboard)           ██░░░░░░░░  ~1 sessao    — Vitrine rapida
F3 (Tarefas)             ██████░░░░  ~3 sessoes   — Modulo mais complexo (migrar v1)
F4 (Contratos)           ████░░░░░░  ~2 sessoes   — Depende de UI Kit
F5 (Lotes)               ████░░░░░░  ~2 sessoes   — Import SHP e crucial
F6 (Consulta Processual) ████░░░░░░  ~2 sessoes   — Leaflet map
F7 (Financeiro)          ████░░░░░░  ~2 sessoes   — BM generator
F8 (Configuracoes)       ████░░░░░░  ~2 sessoes   — Permissoes matrix
F9 (Logs)                █░░░░░░░░░  ~0.5 sessao  — Simples
F10 (Polish)             ██░░░░░░░░  ~1 sessao    — Refinamentos
```

**Total estimado: ~17.5 sessoes de desenvolvimento**

---

## APIs Disponiveis (Referencia Rapida)

### Auth
| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | /api/auth/login | Login (email + password) |
| POST | /api/auth/refresh | Refresh token |
| GET | /api/auth/me | Dados do usuario logado |

### Users & Roles
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET/POST | /api/users | Listar/Criar usuarios |
| GET | /api/roles | Listar cargos |
| GET/POST | /api/teams | Listar/Criar times |
| GET | /api/logs | Audit trail |

### Tasks
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET/POST/PATCH/DELETE | /api/tasks | CRUD tarefas |
| GET | /api/tasks/[id] | Detalhe tarefa |
| GET/POST/DELETE | /api/tasks/[id]/attachments | Anexos |

### Clients & Contracts
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET/POST | /api/clients | CRUD clientes |
| GET | /api/consultas/cnpj/[cnpj] | Lookup CNPJ |
| GET/POST/PATCH/DELETE | /api/contracts | CRUD contratos |
| POST/PATCH/DELETE | /api/contracts/[id]/items | Items do contrato |
| POST/DELETE | /api/contracts/[id]/distribution | Distribuicao geografica |
| GET/POST | /api/contracts/[id]/rules | Regras de medicao |

### Deliveries
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET/POST | /api/deliveries | Listar/Criar entregas (single + bulk) |
| POST | /api/deliveries/[id]/substitute | Substituir entrega |

### Lots & Import
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET/POST/PATCH | /api/lots | CRUD lotes (PATCH = bulk update) |
| GET/PATCH/DELETE | /api/lots/[id] | Lote individual |
| GET/POST/PUT/DELETE | /api/lots/import | SHP import: list/analyze/confirm/cancel |
| GET | /api/lots/filters | Opcoes de filtro dinamicas |
| GET | /api/lots/stats | Estatisticas por contrato |
| GET/POST | /api/lots/[id]/compliance | Status/Sync Ecoleta |

### Financial
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET/POST/PATCH/DELETE | /api/financial/billing-rules | Regras faturamento |
| GET/POST | /api/financial/invoices | Listar/Gerar BM |
| GET/PATCH | /api/financial/invoices/[id] | Detalhe/Acao (Faturar/Recusar) |
| GET/POST | /api/financial/payments | Listar/Registrar pagamento |
| GET | /api/financial/dashboard | Dashboard financeiro |

### Permissions & Visibility
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET/PUT/DELETE | /api/permissions | Matriz/Salvar/Resetar permissoes |
| GET/POST/PUT/DELETE | /api/user-sectors | Multi-setor |
| GET | /api/visibility | Contexto do usuario (permissions + assignable users) |

### GeoBoard
| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/geoboard?type=map | Lotes com coordenadas para mapa |
| GET | /api/geoboard?type=stats | Estatisticas agregadas |
| GET | /api/geoboard?type=filters | Opcoes de filtro |
| GET | /api/geoboard?type=detail&lot_id=X | Detalhe do lote |

---

## Decisoes Tecnicas

1. **Sem shadcn/ui** — componentes proprios para controle total do design
2. **SWR para data fetching** — cache, revalidacao, optimistic updates
3. **Zustand para UI state** — sidebar, modais, tema, pagina ativa
4. **Leaflet via dynamic import** — evitar SSR issues com mapas
5. **Exceljs para export** — gerar Excel formatado client-side
6. **recharts para graficos** — graficos interativos no dashboard e financeiro
7. **PermissionGate pattern** — esconder botoes/secoes baseado em permissoes
8. **Todas as paginas "use client"** — SPA pattern dentro do Next.js dashboard
9. **Migrar padroes do v1** — Kanban board, filtros, modais do v1 como referencia
10. **Responsivo mobile-first** — Todas as paginas devem funcionar em tablet/mobile
