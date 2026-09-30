import React from 'react';

export default function InicioEstudiante() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Portal Estudiantil</h2>
        <p className="text-gray-500 text-sm">Tu progreso académico.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
          <h3 className="text-green-600 text-xs font-bold uppercase tracking-wider mb-2">CUM</h3>
          <p className="text-3xl font-black text-green-900">8.4</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Materias</h3>
          <p className="text-3xl font-black text-gray-900">5 Inscritas</p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
          <h3 className="text-red-600 text-xs font-bold uppercase tracking-wider mb-2">Finanzas</h3>
          <p className="text-lg font-bold text-red-900">Al día</p>
        </div>
      </div>
    </div>
  );
}