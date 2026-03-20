"use client";

import { DollarSign } from "lucide-react";

export default function GestaoFinanceiraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <DollarSign className="w-7 h-7 text-amber-600" />
          Gestao Financeira
        </h1>
        <p className="text-gray-500 mt-1">
          Faturamento, Boletins de Medida e Pagamentos
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Modulo em desenvolvimento</p>
      </div>
    </div>
  );
}
