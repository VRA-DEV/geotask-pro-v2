"use client";

import { CheckSquare } from "lucide-react";

export default function TarefasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <CheckSquare className="w-7 h-7 text-blue-600" />
            Tarefas
          </h1>
          <p className="text-gray-500 mt-1">Gerenciamento de tarefas da equipe</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Modulo em desenvolvimento</p>
      </div>
    </div>
  );
}
