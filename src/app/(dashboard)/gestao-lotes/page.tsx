"use client";

import { Database } from "lucide-react";

export default function GestaoLotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="w-7 h-7 text-violet-600" />
          Gestao de Lotes
        </h1>
        <p className="text-gray-500 mt-1">
          Importacao SHP, Compliance, Banco de Dados
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Modulo em desenvolvimento</p>
      </div>
    </div>
  );
}
