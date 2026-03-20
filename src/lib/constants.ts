/**
 * GeoTask Pro v2 — Constants & Enums
 */

// ============================================================
// SECTORS
// ============================================================

export const SECTORS = [
  "Engenharia",
  "Ambiental",
  "Topografia",
  "Assistencia Social",
  "Juridico",
  "Administrativo",
  "TI",
  "Financeiro",
  "Comercial",
  "RH",
  "Diretoria",
  "Gerencia",
  "Operacional",
] as const;

export const SECTOR_ENUM_TO_DISPLAY: Record<string, string> = {
  Engenharia: "Engenharia",
  Ambiental: "Ambiental",
  Topografia: "Topografia",
  AssistenciaSocial: "Assistencia Social",
  "Assistencia Social": "Assistencia Social",
  Juridico: "Juridico",
  Administrativo: "Administrativo",
  TI: "TI",
  Financeiro: "Financeiro",
  Comercial: "Comercial",
  RH: "RH",
  Diretoria: "Diretoria",
  Gerencia: "Gerencia",
  Operacional: "Operacional",
};

// ============================================================
// TASK ENUMS
// ============================================================

export const TASK_TYPES = [
  "Cadastro",
  "Vistoria",
  "Levantamento",
  "Relatorio",
  "Projeto",
  "Analise",
  "Protocolo",
  "Atendimento",
  "Reuniao",
  "Administrativo",
  "Outro",
] as const;

export const PRIORITIES = ["Alta", "Media", "Baixa"] as const;

export const TASK_STATUSES = ["A Fazer", "Em Andamento", "Pausado", "Concluido"] as const;

export const STATUS_COLORS: Record<string, string> = {
  "A Fazer": "#6B7280",
  "Em Andamento": "#3B82F6",
  Pausado: "#F59E0B",
  Concluido: "#10B981",
};

export const PRIORITY_COLORS: Record<string, string> = {
  Alta: "#EF4444",
  Media: "#F59E0B",
  Baixa: "#10B981",
};

// ============================================================
// CONTRACT ENUMS
// ============================================================

export const CONTRACT_STATUSES = ["ATIVO", "ENCERRADO", "CANCELADO"] as const;

export const CONTRACT_ITEM_UNITS = [
  "UN",
  "M2",
  "M3",
  "KM",
  "HA",
  "GL",
  "VB",
  "HR",
] as const;

export const MEASUREMENT_RULE_FIELDS = [
  "CATEGORIA",
  "STATUS_PROCESSO",
] as const;

// ============================================================
// LOT / IMPORT ENUMS
// ============================================================

export const IMPORT_TYPES = ["SHAPEFILE", "API_ECOLETA"] as const;
export const IMPORT_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "ERROR"] as const;
export const IMPORT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "KEEP"] as const;

// ============================================================
// DELIVERY ENUMS
// ============================================================

export const DELIVERY_TYPES = [
  "PRODUTO",
  "CRF_1",
  "PROTOCOLO",
  "CRF_FINAL",
  "DEVOLUTIVA",
] as const;

export const DELIVERY_SUBTYPES = [
  "CRF",
  "CRF Complementar",
  "CRF Final",
  "Nota Devolutiva",
] as const;

// ============================================================
// FINANCIAL ENUMS
// ============================================================

export const INVOICE_STATUSES = ["AGUARDANDO", "FATURADO", "RECUSADO"] as const;

export const BILLING_RULE_FIELDS = ["CATEGORIA", "STATUS_PROCESSO"] as const;

// ============================================================
// USER ENUMS
// ============================================================

export const USER_TYPES = ["INTERNAL", "EXTERNAL"] as const;

export const INTERNAL_ROLES = [
  "Admin",
  "Socio",
  "Diretor",
  "Gerente",
  "Coordenador de Polo",
  "Coordenador de Setores",
  "Gestor",
  "Liderado",
] as const;

export const EXTERNAL_ROLES = [
  "Cliente Admin",
  "Cliente Viewer",
] as const;

// ============================================================
// NAVIGATION
// ============================================================

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Tarefas", href: "/tarefas", icon: "CheckSquare", module: "tasks" },
  { label: "Consulta Processual", href: "/consulta-processual", icon: "MapPin", module: "consulta_processual" },
  { label: "Gestao de Lotes", href: "/gestao-lotes", icon: "Database", module: "gestao_lotes" },
  { label: "Gestao de Contratos", href: "/gestao-contratos", icon: "FileText", module: "gestao_contratos" },
  { label: "Gestao Financeira", href: "/gestao-financeira", icon: "DollarSign", module: "gestao_financeira" },
  { label: "Configuracoes", href: "/configuracoes", icon: "Settings", module: "settings" },
  { label: "Logs", href: "/logs", icon: "ScrollText", module: "logs" },
] as const;

// ============================================================
// AUDIT LOG
// ============================================================

export const AUDIT_ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
] as const;

export const AUDIT_ENTITIES = [
  "User",
  "Task",
  "Contract",
  "ContractItem",
  "Client",
  "Lot",
  "Import",
  "Delivery",
  "Invoice",
  "Payment",
  "BillingRule",
  "MeasurementRule",
  "Role",
  "Sector",
  "Team",
] as const;
