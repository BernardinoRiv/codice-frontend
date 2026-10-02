import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function InicioDocente() {
  const [dashboard, setDashboard] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes/panel/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar la carga académica.');

      const data = await response.json();
      setDashboard(data);
    } catch (error) {
      toast.error('Error de conexión', { description: error.message });
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
        <p className="text-gray-400 text-sm font-medium tracking-wide">Cargando tu espacio académico...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mi espacio académico</h2>
        <p className="text-gray-500 text-sm">Resumen de tus clases y evaluaciones del ciclo actual.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta de Clases */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
          <div>
            <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Clases programadas hoy</h3>
            <p className="text-3xl font-black text-gray-900">
              {dashboard?.clasesHoy || 0} <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide ml-1">Grupos</span>
            </p>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200 shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Tarjeta Dinámica de Evaluaciones */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors">
          <div>
            <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              {dashboard?.evaluacionesPendientes > 0 ? "Evaluaciones habilitadas" : "Próxima evaluación"}
            </h3>
            
            {dashboard?.evaluacionesPendientes > 0 ? (
              <p className="text-3xl font-black text-gray-900">
                {dashboard.evaluacionesPendientes} <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide ml-1">Activas</span>
              </p>
            ) : dashboard?.proximaEvaluacionTitulo ? (
              <div className="mt-1">
                <p className="text-xl font-black text-gray-900 leading-tight">
                  {dashboard.proximaEvaluacionTitulo}
                </p>
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">
                  Abre el {dashboard.proximaEvaluacionFecha}
                </p>
              </div>
            ) : (
              <p className="text-3xl font-black text-gray-900">
                0 <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide ml-1">Pendientes</span>
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200 shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Carga académica asignada</h3>
        
        {dashboard?.gruposAsignados?.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {dashboard.gruposAsignados.map((grupo) => (
              <div key={grupo.idGrupo} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{grupo.materia}</h4>
                    <p className="text-sm text-gray-500 font-mono mt-1">{grupo.codigoGrupo}</p>
                  </div>
                  <span className="bg-gray-50 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    {grupo.inscritos} inscritos
                  </span>
                </div>
                
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Horarios asignados</p>
                  {grupo.horarios.length > 0 ? (
                    grupo.horarios.map((horario, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="font-semibold w-20">{horario.dia}</span>
                        <span className="text-gray-500">{horario.horaInicio.substring(0,5)} - {horario.horaFin.substring(0,5)}</span>
                        <span className="ml-auto font-mono text-[10px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded border border-gray-200 shadow-sm">
                          AULA {horario.aula}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No hay horarios registrados.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
            <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900">Sin carga académica</h3>
            <p className="mt-1 text-sm text-gray-500">No tienes grupos asignados para el ciclo actual.</p>
          </div>
        )}
      </div>
    </div>
  );
}