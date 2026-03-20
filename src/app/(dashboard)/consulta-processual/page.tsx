"use client";

import { MapPin } from "lucide-react";

export default function ConsultaProcessualPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <MapPin className="w-7 h-7 text-emerald-600" />
          Consulta Processual
        </h1>
        <p className="text-gray-500 mt-1">
          GeoBoard — Dashboard com mapa, lotes coloridos por status
        </p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400">Modulo GeoBoard em desenvolvimento</p>
      </div>
    </div>
  );
}
