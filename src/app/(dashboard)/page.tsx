"use client";

import { useAuth } from "@/hooks/useAuth";
import { getRoleDisplayName } from "@/lib/permissions";
import {
  CheckSquare,
  FileText,
  Database,
  DollarSign,
  Users,
  TrendingUp,
} from "lucide-react";

const STATS_CARDS = [
  {
    label: "Tarefas Ativas",
    value: "—",
    change: "",
    icon: CheckSquare,
    color: "bg-blue-500",
  },
  {
    label: "Contratos",
    value: "—",
    change: "",
    icon: FileText,
    color: "bg-emerald-500",
  },
  {
    label: "Lotes Cadastrados",
    value: "—",
    change: "",
    icon: Database,
    color: "bg-violet-500",
  },
  {
    label: "Faturamento",
    value: "—",
    change: "",
    icon: DollarSign,
    color: "bg-amber-500",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bem-vindo, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.role ? getRoleDisplayName(user.role.name) : ""} —{" "}
          {user?.sector?.name} {user?.team ? `| ${user.team.name}` : ""}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS_CARDS.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
              </div>
              <div
                className={`${card.color} w-11 h-11 rounded-xl flex items-center justify-center`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Atividade Recente
          </h2>
          <div className="text-center py-8 text-gray-400 text-sm">
            Nenhuma atividade recente
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Equipe Online
          </h2>
          <div className="text-center py-8 text-gray-400 text-sm">
            Dados em tempo real em breve
          </div>
        </div>
      </div>
    </div>
  );
}
