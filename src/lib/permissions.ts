/**
 * GeoTask Pro v2 — Permission System
 *
 * Supports both internal (8 roles) and external (2 roles) users.
 * Permissions stored as JSON in Role.permissions field with fallback logic.
 */

export interface AppPermissions {
  pages: {
    view_dashboard: boolean;
    view_tasks: boolean;
    view_consulta_processual: boolean;
    view_gestao_lotes: boolean;
    view_gestao_contratos: boolean;
    view_gestao_financeira: boolean;
    view_settings: boolean;
    view_logs: boolean;
    view_all_templates: boolean;
  };
  tasks: {
    create: boolean;
    edit_any: boolean;
    edit_own: boolean;
    delete: boolean;
    view_all: boolean;
    view_own_team: boolean;
    view_own_sector: boolean;
    view_created_by_me: boolean;
    assign_any: boolean;
    assign_team: boolean;
    assign_sector: boolean;
    manage_pauses: boolean;
    edit_deadline_all: boolean;
  };
  contracts: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    view_all: boolean;
    view_linked: boolean;
    manage_items: boolean;
    manage_distribution: boolean;
    manage_rules: boolean;
  };
  lots: {
    import_shp: boolean;
    confirm_import: boolean;
    view_all: boolean;
    view_by_contract: boolean;
    export: boolean;
    compliance: boolean;
  };
  deliveries: {
    create: boolean;
    substitute: boolean;
    view_all: boolean;
    view_by_contract: boolean;
  };
  financial: {
    view_overview: boolean;
    generate_bm: boolean;
    approve_bm: boolean;
    reject_bm: boolean;
    confirm_payment: boolean;
    export: boolean;
  };
  settings: {
    manage_users: boolean;
    manage_roles: boolean;
    manage_teams: boolean;
    manage_sectors: boolean;
    manage_task_types: boolean;
    manage_clients: boolean;
    manage_permissions: boolean;
    manage_user_sectors: boolean;
  };
}

/**
 * Display names mapping: internal role name → user-friendly name.
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  Admin: "Gestor",
  Socio: "Socio",
  Diretor: "Diretor",
  Gerente: "Gerente",
  "Coordenador de Polo": "Coordenador de Polo",
  "Coordenador de Setores": "Coordenador de Setores",
  Gestor: "Gestor",
  Liderado: "Liderado",
  "Cliente Admin": "Cliente Admin",
  "Cliente Viewer": "Cliente Viewer",
};

export function getRoleDisplayName(roleName: string): string {
  return ROLE_DISPLAY_NAMES[roleName] || roleName;
}

/**
 * Task visibility mode determines which tasks a user can see.
 */
export type TaskVisibility = "all" | "team" | "sectors" | "sector" | "assigned" | "contract";

export function getTaskVisibilityMode(roleName: string): TaskVisibility {
  switch (roleName) {
    case "Admin":
    case "Socio":
    case "Diretor":
      return "all";
    case "Gerente":
    case "Coordenador de Polo":
      return "team";
    case "Coordenador de Setores":
      return "sectors";
    case "Gestor":
      return "sector";
    case "Liderado":
      return "assigned";
    case "Cliente Admin":
    case "Cliente Viewer":
      return "contract";
    default:
      return "assigned";
  }
}

/**
 * Returns permissions for a role. Checks JSON first, falls back to hardcoded.
 */
export function getPermissions(role: { name: string; permissions?: unknown }): AppPermissions {
  // Try JSON permissions from DB
  const rawPerms = role.permissions as Record<string, unknown> | null;
  if (rawPerms && typeof rawPerms === "object" && rawPerms.pages) {
    return rawPerms as unknown as AppPermissions;
  }

  // Fallback: hardcoded permissions by role name
  return getDefaultPermissions(role.name);
}

function getDefaultPermissions(roleName: string): AppPermissions {
  const isAdmin = ["Admin", "Socio", "Diretor"].includes(roleName);
  const isManager = ["Gerente", "Coordenador de Polo"].includes(roleName);
  const isCoordinator = roleName === "Coordenador de Setores";
  const isGestor = roleName === "Gestor";
  const isExternal = ["Cliente Admin", "Cliente Viewer"].includes(roleName);
  const isClientAdmin = roleName === "Cliente Admin";

  return {
    pages: {
      view_dashboard: true,
      view_tasks: !isExternal,
      view_consulta_processual: true,
      view_gestao_lotes: !isExternal && (isAdmin || isManager || isCoordinator),
      view_gestao_contratos: isAdmin || isManager,
      view_gestao_financeira: isAdmin || isManager || isClientAdmin,
      view_settings: isAdmin,
      view_logs: isAdmin,
      view_all_templates: isAdmin || isManager,
    },
    tasks: {
      create: !isExternal,
      edit_any: isAdmin || isManager,
      edit_own: true,
      delete: isAdmin,
      view_all: isAdmin,
      view_own_team: isManager,
      view_own_sector: isCoordinator || isGestor,
      view_created_by_me: true,
      assign_any: isAdmin,
      assign_team: isManager,
      assign_sector: isCoordinator,
      manage_pauses: isAdmin || isManager,
      edit_deadline_all: isAdmin || isManager,
    },
    contracts: {
      create: isAdmin || isManager,
      edit: isAdmin || isManager,
      delete: isAdmin,
      view_all: isAdmin,
      view_linked: true,
      manage_items: isAdmin || isManager,
      manage_distribution: isAdmin || isManager,
      manage_rules: isAdmin || isManager,
    },
    lots: {
      import_shp: isAdmin || isManager || isCoordinator,
      confirm_import: isAdmin || isManager,
      view_all: isAdmin,
      view_by_contract: true,
      export: isAdmin || isManager || isCoordinator,
      compliance: isAdmin || isManager,
    },
    deliveries: {
      create: !isExternal,
      substitute: isAdmin || isManager || isCoordinator,
      view_all: isAdmin,
      view_by_contract: true,
    },
    financial: {
      view_overview: isAdmin || isManager || isClientAdmin,
      generate_bm: isAdmin || isManager,
      approve_bm: isAdmin,
      reject_bm: isAdmin || isManager,
      confirm_payment: isAdmin,
      export: isAdmin || isManager || isClientAdmin,
    },
    settings: {
      manage_users: isAdmin,
      manage_roles: isAdmin,
      manage_teams: isAdmin,
      manage_sectors: isAdmin,
      manage_task_types: isAdmin || isManager,
      manage_clients: isAdmin || isManager,
      manage_permissions: isAdmin,
      manage_user_sectors: isAdmin || isManager,
    },
  };
}
