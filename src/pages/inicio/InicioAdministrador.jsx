import React from 'react';

export default function InicioAdministrador() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Encabezado en estilo oración */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Panel de administración
        </h2>
        <p className="text-slate-600 text-sm mt-1 font-medium">
          Resumen general y estado operativo del sistema universitario.
        </p>
      </div>

      {/* Tarjetas métricas con acento en línea negra y valores en 0 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {/* Docentes activos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all hover:border-slate-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-black"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
              Docentes activos
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-extrabold text-slate-950 tracking-tight">0</p>
          <p className="text-xs text-slate-600 mt-2 font-medium">Plantilla académica registrada</p>
        </div>

        {/* Estudiantes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all hover:border-slate-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-black"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
              Estudiantes matriculados
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-extrabold text-slate-950 tracking-tight">0</p>
          <p className="text-xs text-slate-600 mt-2 font-medium">Alumnos con ciclo en curso</p>
        </div>

        {/* Empleados */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgb(0,0,0,0.04)] relative overflow-hidden transition-all hover:border-slate-300">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-black"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
              Personal administrativo
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-extrabold text-slate-950 tracking-tight">0</p>
          <p className="text-xs text-slate-600 mt-2 font-medium">Cargos y áreas operativas</p>
        </div>
      </div>

      {/* Bloque informativo inferior con contraste limpio */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1.5">
          Estado de los servicios institucionales
        </h3>
        <p className="text-sm text-slate-600 font-medium">
          Todos los módulos académicos, financieros y de registro se encuentran en funcionamiento normal.
        </p>
      </div>
    </div>
  );
}