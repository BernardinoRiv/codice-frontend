import React from 'react';

export default function InicioDocente() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mi Espacio Académico</h2>
        <p className="text-gray-500 text-sm">Resumen de tus clases y evaluaciones.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <h3 className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Clases de Hoy</h3>
          <p className="text-2xl font-bold text-blue-900">3 Grupos</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <h3 className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">Notas Pendientes</h3>
          <p className="text-2xl font-bold text-amber-900">2 Evaluaciones</p>
        </div>
      </div>
    </div>
  );
}