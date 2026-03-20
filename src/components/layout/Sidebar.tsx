"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/helpers";
import { getRoleDisplayName } from "@/lib/permissions";
import {
  LayoutDashboard,
  CheckSquare,
  MapPin,
  Database,
  FileText,
  DollarSign,
  Settings,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
} from "lucide-react";
import { clsx } from "clsx";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  CheckSquare,
  MapPin,
  Database,
  FileText,
  DollarSign,
  Settings,
  ScrollText,
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
  permissionKey?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Tarefas", href: "/tarefas", icon: "CheckSquare", permissionKey: "view_tasks" },
  { label: "Consulta Processual", href: "/consulta-processual", icon: "MapPin", permissionKey: "view_consulta_processual" },
  { label: "Gestao de Lotes", href: "/gestao-lotes", icon: "Database", permissionKey: "view_gestao_lotes" },
  { label: "Gestao de Contratos", href: "/gestao-contratos", icon: "FileText", permissionKey: "view_gestao_contratos" },
  { label: "Gestao Financeira", href: "/gestao-financeira", icon: "DollarSign", permissionKey: "view_gestao_financeira" },
  { label: "Configuracoes", href: "/configuracoes", icon: "Settings", permissionKey: "view_settings" },
  { label: "Logs", href: "/logs", icon: "ScrollText", permissionKey: "view_logs" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleCollapsed, sidebarOpen, toggleSidebar } = useUIStore();
  const { user, permissions, logout } = useAuth();

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    if (!permissions) return false;
    return (permissions.pages as Record<string, boolean>)[item.permissionKey];
  });

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-lg shadow-md p-2"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-[72px]" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">GT</span>
              </div>
              <span className="font-semibold text-gray-900">GeoTask Pro</span>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = ICONS[item.icon] || LayoutDashboard;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
              {user ? getInitials(user.name) : "?"}
            </div>
            {!sidebarCollapsed && user && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.role ? getRoleDisplayName(user.role.name) : ""}
                </p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
