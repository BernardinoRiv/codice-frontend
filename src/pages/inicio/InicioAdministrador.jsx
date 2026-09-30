import React from 'react';

export default function InicioAdministrador() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Panel de Administración</h2>
        <p className="text-gray-500 text-sm">Resumen general del sistema universitario.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Docentes Activos</h3>
          <p className="text-3xl font-black text-gray-900">142</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Estudiantes</h3>
          <p className="text-3xl font-black text-gray-900">3,054</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Empleados</h3>
          <p className="text-3xl font-black text-gray-900">85</p>
        </div>
      </div>
    </div>
  );
}