/**
 * GeoTask Pro v2 — Global TypeScript Interfaces
 */

// ============================================================
// AUTH & USERS
// ============================================================

export interface Role {
  id: number;
  name: string;
  permissions?: Record<string, unknown>;
}

export interface Sector {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
}

export interface UserSector {
  id: number;
  user_id: number;
  sector_id: number;
  sector?: Sector;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  sector_id: number;
  team_id?: number | null;
  client_id?: number | null;
  avatar?: string | null;
  active: boolean;
  must_change_password: boolean;
  user_type: "INTERNAL" | "EXTERNAL";
  last_login_at?: string | null;
  created_at: string;
  role?: Role;
  sector?: Sector;
  team?: Team | null;
  client?: Client | null;
  user_sectors?: UserSector[];
}

// ============================================================
// TASKS
// ============================================================

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  type?: string | null;
  status: string;
  priority?: string | null;
  sector_id?: number | null;
  responsible_id?: number | null;
  contract_id?: number | null;
  city_id?: number | null;
  neighborhood_id?: number | null;
  nucleus?: string | null;
  quadra?: string | null;
  lote?: string | null;
  deadline?: string | null;
  link?: string | null;
  created_by_id?: number | null;
  team_id?: number | null;
  parent_id?: number | null;
  time_spent: number;
  created_at: string;
  updated_at?: string | null;
  started_at?: string | null;
  paused_at?: string | null;
  completed_at?: string | null;
  sector?: Sector | null;
  responsible?: Pick<User, "id" | "name" | "email"> | null;
  created_by?: Pick<User, "id" | "name"> | null;
  team?: Team | null;
  subtasks?: Subtask[];
  coworkers?: TaskCoworker[];
  attachments?: TaskAttachment[];
  children?: Task[];
  _count?: { subtasks?: number; comments?: number };
}

export interface Subtask {
  id: number;
  title: string;
  done: boolean;
  sector_id?: number | null;
  task_id: number;
  responsible_id?: number | null;
  done_at?: string | null;
  responsible?: Pick<User, "id" | "name"> | null;
  sector?: Sector | null;
}

export interface TaskCoworker {
  id: number;
  task_id: number;
  user_id: number;
  user?: Pick<User, "id" | "name" | "email">;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_by_id?: number | null;
  created_at: string;
  uploaded_by?: Pick<User, "id" | "name"> | null;
}

export interface Comment {
  id: number;
  content: string;
  created_at: string;
  task_id: number;
  user_id?: number | null;
  user?: Pick<User, "id" | "name" | "avatar"> | null;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message?: string | null;
  read: boolean;
  created_at: string;
  user_id: number;
  task_id?: number | null;
}

// ============================================================
// CLIENTS
// ============================================================

export interface Client {
  id: number;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  telefone?: string | null;
  email?: string | null;
  api_data?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  _count?: { users?: number; contracts?: number };
}

// ============================================================
// CONTRACTS
// ============================================================

export interface Contract {
  id: number;
  number: string;
  client_id: number;
  start_date: string;
  end_date: string;
  contracted_quantity: number;
  status: string;
  created_by_id: number;
  created_at: string;
  client?: Client;
  created_by?: Pick<User, "id" | "name">;
  items?: ContractItem[];
  distributions?: GeographicDistribution[];
  measurement_rules?: MeasurementRule[];
  _count?: { lots?: number; invoices?: number };
}

export interface ContractItem {
  id: number;
  contract_id: number;
  description: string;
  unit: string;
  unit_value: string; // Decimal comes as string from Prisma
  quantity: number;
}

export interface GeographicDistribution {
  id: number;
  contract_id: number;
  state: string;
  city: string;
  nucleus?: string | null;
  quantity: number;
}

export interface MeasurementRule {
  id: number;
  contract_id: number;
  field: string;
  values: string[];
  active: boolean;
}

// ============================================================
// LOTS
// ============================================================

export interface Lot {
  id: number;
  contract_id: number;
  external_id?: string | null;
  code: string;
  beneficiary?: string | null;
  cpf?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: string | null;
  process_status?: string | null;
  area?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  contract?: Pick<Contract, "id" | "number">;
  _count?: { deliveries?: number };
}

export interface Import {
  id: number;
  type: string;
  filename?: string | null;
  status: string;
  contract_id?: number | null;
  total_records: number;
  created_count: number;
  updated_count: number;
  deleted_count: number;
  preview_data?: Record<string, unknown> | null;
  created_by_id: number;
  created_at: string;
  confirmed_at?: string | null;
  created_by?: Pick<User, "id" | "name">;
}

export interface ImportDetail {
  id: number;
  import_id: number;
  lot_id?: number | null;
  action: string;
  changes?: Record<string, { before: unknown; after: unknown }> | null;
}

// ============================================================
// DELIVERIES
// ============================================================

export interface Delivery {
  id: number;
  lot_id: number;
  contract_item_id: number;
  type: string;
  subtype?: string | null;
  file_url?: string | null;
  link?: string | null;
  protocol_number?: string | null;
  protocol_date?: string | null;
  delivered_at: string;
  created_by_id: number;
  created_at: string;
  lot?: Pick<Lot, "id" | "code" | "beneficiary">;
  contract_item?: Pick<ContractItem, "id" | "description">;
  created_by?: Pick<User, "id" | "name">;
  history?: DeliveryHistory[];
}

export interface DeliveryHistory {
  id: number;
  delivery_id: number;
  previous_url?: string | null;
  previous_link?: string | null;
  new_url?: string | null;
  new_link?: string | null;
  reason: string;
  retroactive_date?: string | null;
  replaced_by_id: number;
  replaced_at: string;
  replaced_by?: Pick<User, "id" | "name">;
}

// ============================================================
// FINANCIAL
// ============================================================

export interface Invoice {
  id: number;
  contract_id: number;
  number?: string | null;
  status: string;
  total_lots: number;
  total_value?: string | null;
  reject_reason?: string | null;
  generated_data?: Record<string, unknown> | null;
  generated_by_id: number;
  billed_by_id?: number | null;
  billed_at?: string | null;
  rejected_by_id?: number | null;
  rejected_at?: string | null;
  created_at: string;
  contract?: Pick<Contract, "id" | "number">;
  generated_by?: Pick<User, "id" | "name">;
  payments?: Payment[];
}

export interface Payment {
  id: number;
  invoice_id: number;
  nf_number?: string | null;
  nf_file_url?: string | null;
  order_file_url?: string | null;
  amount: string;
  paid_at?: string | null;
  confirmed_by_id: number;
  created_at: string;
  confirmed_by?: Pick<User, "id" | "name">;
}

export interface BillingRule {
  id: number;
  contract_item_id: number;
  field: string;
  values: string[];
  active: boolean;
}

// ============================================================
// AUDIT
// ============================================================

export interface AuditLogEntry {
  id: number;
  user_id?: number | null;
  action: string;
  entity: string;
  entity_id?: number | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  user?: Pick<User, "id" | "name" | "email"> | null;
}

// ============================================================
// GEOBOARD
// ============================================================

export interface GeoboardStats {
  totalLots: number;
  lotsByStatus: Record<string, number>;
  lotsByCategory: Record<string, number>;
  deliveryProgress: {
    total: number;
    delivered: number;
    pending: number;
    percentage: number;
  };
}

export interface GeoboardMapData {
  lots: Array<{
    id: number;
    code: string;
    latitude: number;
    longitude: number;
    category?: string;
    process_status?: string;
    beneficiary?: string;
    geometry_wkt?: string;
  }>;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  code?: string;
  errors?: Record<string, string[]>;
}
