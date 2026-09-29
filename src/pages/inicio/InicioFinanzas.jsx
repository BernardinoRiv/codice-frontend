import React from 'react';

export default function InicioFinanzas() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Gestión Financiera</h2>
        <p className="text-gray-500 text-sm">Resumen de ingresos y solvencias.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Pagos (Hoy)</h3>
          <p className="text-3xl font-black text-gray-900">$4,250.00</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Solvencias Pendientes</h3>
          <p className="text-3xl font-black text-gray-900">14</p>
        </div>
      </div>
    </div>
  );
}