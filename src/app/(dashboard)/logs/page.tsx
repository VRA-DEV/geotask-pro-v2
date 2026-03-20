"use client";

import { ScrollText } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <ScrollText className="w-7 h-7 text-gray-600" />
          Logs de Auditoria
        </h1>
        <p className="text-gray-500 mt-1">
          Historico completo de acoes do sistema
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Modulo em desenvolvimento</p>
      </div>
    </div>
  );
}
