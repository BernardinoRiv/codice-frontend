import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import apiInterceptor from '../../services/apiInterceptor';

const MisClasesPensum = () => {
  const [activeTab, setActiveTab] = useState('clases');
  const [cargando, setCargando] = useState(true);
  
  const [clases, setClases] = useState([]);
  const [pensumData, setPensumData] = useState({
    materiasAprobadas: 0,
    materiasCursando: 0,
    materiasPendientes: 0,
    materiasPorCiclo: {}
  });

  const [busquedaPensum, setBusquedaPensum] = useState('');

  useEffect(() => {
    const idEstudiante = localStorage.getItem('idEstudiante') || 1; 
    if (activeTab === 'clases') {
      cargarClases(idEstudiante);
    } else {
      cargarPensum(idEstudiante);
    }
  }, [activeTab]);

  const cargarClases = async (idEstudiante) => {
    try {
      setCargando(true);
      const response = await apiInterceptor(`/api/v1/estudiantes/mis-clases?idEstudiante=${idEstudiante}`);
      if (response.ok) {
        const data = await response.json();
        setClases(data);
      } else {
        toast.error('Error al cargar las clases inscritas');
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const cargarPensum = async (idEstudiante) => {
    try {
      setCargando(true);
      const response = await apiInterceptor(`/api/v1/estudiantes/pensum?idEstudiante=${idEstudiante}`);
      if (response.ok) {
        const data = await response.json();
        setPensumData(data);
      } else {
        toast.error('Error al cargar el pensum académico');
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const badgeEstadoStyle = (estado) => {
    switch (estado?.toUpperCase()) {
      case 'APROBADA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CURSANDO':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-400/30';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const filtrarMateriasPorBusqueda = (materias) => {
    if (!busquedaPensum.trim()) return materias;
    const query = busquedaPensum.toLowerCase();
    return materias.filter(m => 
      m.nombre.toLowerCase().includes(query) || m.codigo.toLowerCase().includes(query)
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Portal Académico</h1>
          <p className="text-slate-500 text-sm mt-1">Consulta tus asignaturas del ciclo actual y la progresión de tu pensum.</p>
        </div>

        <div className="flex bg-slate-200/70 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('clases')}
            className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all ${activeTab === 'clases' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Mis Clases
          </button>
          <button 
            onClick={() => setActiveTab('pensum')}
            className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all ${activeTab === 'pensum' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Mi Pensum
          </button>
        </div>
      </div>

      {activeTab === 'clases' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          {cargando ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
              <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando clases del ciclo...</p>
            </div>
          ) : clases.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
              <p className="text-slate-500 text-base font-bold">No tienes clases inscritas en el ciclo activo</p>
              <p className="text-slate-400 text-xs mt-1">Verifica tu estado de matrícula con administración.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clases.map((clase, index) => (
                <div key={index} className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-extrabold rounded-lg tracking-wider mb-2 font-mono">
                          {clase.codigoMateria}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{clase.nombreMateria}</h3>
                      </div>
                      <span className="flex-shrink-0 bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-extrabold">
                        {clase.grupo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-4 pb-4 border-b border-slate-100">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                      <span>Docente: {clase.nombreDocente || 'Por asignar'}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Horarios y Aulas</p>
                      {clase.horarios && clase.horarios.map((h, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between text-xs font-semibold text-slate-700">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                            <span>{h.dia} ({h.horaInicio} - {h.horaFin})</span>
                          </div>
                          <span className="text-slate-500 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                            {h.aula}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-xs font-bold text-slate-500 border-t border-slate-100">
                    <span>Unidades Valorativas (UV):</span>
                    <span className="text-slate-900 font-extrabold">{clase.uvs}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'pensum' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Aprobadas: {pensumData.materiasAprobadas}
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-indigo-800">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Cursando: {pensumData.materiasCursando}
              </div>
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                Pendientes: {pensumData.materiasPendientes}
              </div>
            </div>

            <div className="w-full md:w-72">
              <div className="relative">
                <input 
                  type="text" 
                  value={busquedaPensum}
                  onChange={(e) => setBusquedaPensum(e.target.value)}
                  placeholder="Buscar materia por nombre o código..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
                />
                {busquedaPensum && (
                  <button onClick={() => setBusquedaPensum('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold">
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {cargando ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
              <p className="text-slate-400 text-sm font-medium animate-pulse">Cargando pensum académico...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(pensumData.materiasPorCiclo).sort((a, b) => Number(a) - Number(b)).map(cicloNum => {
                const materiasFiltradas = filtrarMateriasPorBusqueda(pensumData.materiasPorCiclo[cicloNum]);
                if (materiasFiltradas.length === 0) return null;

                return (
                  <div key={cicloNum} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Ciclo Académico {cicloNum}</h3>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        {materiasFiltradas.length} asignaturas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {materiasFiltradas.map((mat, idx) => {
                        const estadoActual = mat.estado?.toUpperCase();
                        // Estilo con borde redondeado especial para las cursando como solicitaste
                        const esCursando = estadoActual === 'CURSANDO';

                        return (
                          <div 
                            key={idx} 
                            className={`p-4 border transition-all flex flex-col justify-between ${
                              esCursando 
                                ? 'bg-indigo-50/40 border-indigo-400/80 rounded-[20px] shadow-md ring-1 ring-indigo-400/20' 
                                : 'bg-slate-50/60 border-slate-200 rounded-2xl hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className="font-mono text-[10px] font-extrabold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                  {mat.codigo}
                                </span>
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeEstadoStyle(mat.estado)}`}>
                                  {mat.estado}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug mb-3">
                                {mat.nombre}
                              </h4>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-200/50 text-[11px] font-bold text-slate-500">
                              <span>UV: <strong className="text-slate-800">{mat.uvs}</strong></span>
                              {mat.notaFinal !== null && mat.notaFinal !== undefined && (
                                <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                                  Nota: <strong>{mat.notaFinal}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default MisClasesPensum;