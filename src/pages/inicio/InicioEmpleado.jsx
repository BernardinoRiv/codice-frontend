import React from 'react';

export default function InicioEmpleado() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Portal Administrativo</h2>
        <p className="text-gray-500 text-sm">Avisos y tareas institucionales.</p>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Avisos Recientes</h3>
        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
          No hay nuevos avisos por el momento.
        </div>
      </div>
    </div>
  );
}