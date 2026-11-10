import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Printer, AlertCircle, CheckCircle2 } from 'lucide-react';
import apiInterceptor from '../../services/apiInterceptor';

const MisClasesPensum = () => {
  const [activeTab, setActiveTab] = useState('clases');
  const [cargando, setCargando] = useState(true);
  const [procesandoRetiro, setProcesandoRetiro] = useState(null);
  
  const [clases, setClases] = useState([]);
  const [pensumData, setPensumData] = useState({
    materiasAprobadas: 0,
    materiasCursando: 0,
    materiasPendientes: 0,
    porcentajeAvance: 0, 
    materiasPorCiclo: {}
  });

  const [busquedaPensum, setBusquedaPensum] = useState('');

  const [showRetiroModal, setShowRetiroModal] = useState(false);
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);

  useEffect(() => {
    if (activeTab === 'clases') {
      cargarClases();
    } else {
      cargarPensum();
    }
  }, [activeTab]);

  const cargarClases = async () => {
    try {
      setCargando(true);
      const response = await apiInterceptor(`/api/v1/estudiantes/mis-clases`);
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

  const cargarPensum = async () => {
    try {
      setCargando(true);
      const response = await apiInterceptor(`/api/v1/estudiantes/pensum`);
      if (response.ok) {
        const data = await response.json();
        setPensumData(data);
      } else {
        toast.error('Error al cargar la información del pensum');
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor');
    } finally {
      setCargando(false);
    }
  };

  const manejarImpresion = async () => {
    const toastId = toast.loading('Generando documento...');
    try {
      const response = await apiInterceptor(`/api/v1/estudiantes/generar-pdf?tipo=${activeTab}`, {
        method: 'GET'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const fileUrl = URL.createObjectURL(blob);
        window.open(fileUrl, '_blank');
        toast.success('Documento generado', { id: toastId });
      } else {
        toast.error('Error al generar el documento', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de conexión al generar pdf', { id: toastId });
    }
  };

  const abrirModalRetiro = (clase) => {
    setMateriaSeleccionada(clase);
    setShowRetiroModal(true);
  };

  const confirmarSolicitarRetiro = async () => {
    if (!materiaSeleccionada) return;
    setShowRetiroModal(false);
    setProcesandoRetiro(materiaSeleccionada.idGrupo);

    try {
      const response = await apiInterceptor(`/api/v1/estudiantes/mis-clases/solicitar-retiro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idGrupo: materiaSeleccionada.idGrupo })
      });

      const data = await response.json();
      if (response.ok) {
          toast.success('Solicitud generada', { description: data.mensaje });
          cargarClases(); 
      } else {
          toast.error('Error', { description: data.error });
      }
    } catch (error) {
       toast.error('Error de conexión');
    } finally {
       setProcesandoRetiro(null);
       setMateriaSeleccionada(null);
    }
  };

  const abrirModalCancelar = (clase) => {
    setMateriaSeleccionada(clase);
    setShowCancelarModal(true);
  };

  const confirmarCancelarRetiro = async () => {
    if (!materiaSeleccionada) return;
    setShowCancelarModal(false);
    setProcesandoRetiro(materiaSeleccionada.idGrupo);

    try {
      const response = await apiInterceptor(`/api/v1/estudiantes/mis-clases/cancelar-retiro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idGrupo: materiaSeleccionada.idGrupo })
      });

      const data = await response.json();
      if (response.ok) {
          toast.success('Retiro cancelado', { description: data.mensaje });
          cargarClases(); 
      } else {
          toast.error('Error', { description: data.error });
      }
    } catch (error) {
       toast.error('Error de conexión');
    } finally {
       setProcesandoRetiro(null);
       setMateriaSeleccionada(null);
    }
  };

  const badgeEstadoStyle = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'aprobada':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cursando':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-2 ring-indigo-400/30';
      case 'reprobada':
        return 'bg-red-100 text-red-800 border-red-300 font-black';
      case 'retiro pendiente':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'retirada':
        return 'bg-slate-200 text-slate-600 border-slate-300'; 
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200'; 
    }
  };

  const filtrarMateriasPorBusqueda = (materias) => {
    if (!busquedaPensum.trim()) return materias;
    const query = busquedaPensum.toLowerCase();
    return materias.filter(m => 
      m.nombre.toLowerCase().includes(query) || m.codigo.toLowerCase().includes(query)
    );
  };

  const clasesVisibles = clases.filter(c => c.estadoMateria?.toLowerCase() !== 'retirada');

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 font-sans px-4 sm:px-6">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Portal académico</h1>
          <p className="text-slate-500 text-base mt-2">Consulta tus asignaturas del ciclo actual y la progresión de tu pensum.</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={manejarImpresion}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer size={18} />
            Imprimir reporte
          </button>

          <div className="flex bg-slate-200/70 p-1.5 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveTab('clases')}
              className={`px-6 py-2.5 text-sm font-extrabold rounded-xl transition-all ${activeTab === 'clases' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mis clases
            </button>
            <button 
              onClick={() => setActiveTab('pensum')}
              className={`px-6 py-2.5 text-sm font-extrabold rounded-xl transition-all ${activeTab === 'pensum' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mi pensum
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'clases' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
          {cargando ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
              <p className="text-slate-400 text-base font-medium animate-pulse">Cargando clases del ciclo...</p>
            </div>
          ) : clasesVisibles.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
              <p className="text-slate-500 text-lg font-bold">No tienes clases inscritas en el ciclo activo</p>
              <p className="text-slate-400 text-sm mt-2">Verifica tu estado de matrícula con administración.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clasesVisibles.map((clase, index) => {
                const esRetiroPendiente = clase.estadoMateria?.toLowerCase() === 'retiro pendiente';
                const esCursando = clase.estadoMateria?.toLowerCase() === 'cursando';

                return (
                  <div 
                    key={index} 
                    className={`bg-white rounded-2xl border shadow-sm p-6 flex flex-col justify-between transition-all ${
                      esRetiroPendiente ? 'border-amber-400 ring-1 ring-amber-400/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-3 mb-4">
                        <div>
                          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-extrabold rounded-lg tracking-wider mb-2 font-mono">
                            {clase.codigoMateria}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">{clase.nombreMateria}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="flex-shrink-0 bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-extrabold">
                            {clase.grupo}
                          </span>
                          {esRetiroPendiente && (
                            <span className="bg-amber-100 text-amber-700 text-xs font-extrabold px-2 py-1 rounded-md border border-amber-200 whitespace-nowrap">
                              Retiro p.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-4 pb-4 border-b border-slate-100">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                        <span className="truncate">{clase.nombreDocente || 'por asignar'}</span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Horarios y aulas</p>
                        {clase.horarios && clase.horarios.map((h, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2 text-xs font-semibold text-slate-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                                <span>{h.dia} ({h.horaInicio} - {h.horaFin})</span>
                              </div>
                              <span className="text-slate-500 font-mono text-xs bg-white px-2 py-1 rounded-md border border-slate-200">
                                {h.aula}
                              </span>
                            </div>
                            <span className="ml-4 text-xs text-slate-400">Modalidad: {h.modalidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 flex justify-between items-center text-sm font-bold text-slate-500 border-t border-slate-100">
                      <div>
                        <span>Uv: <span className="text-slate-900 font-extrabold">{clase.uvs}</span></span>
                      </div>

                      {clase.idGrupo && (
                        <div>
                          {esRetiroPendiente ? (
                            <button 
                              onClick={() => abrirModalCancelar(clase)}
                              disabled={procesandoRetiro === clase.idGrupo}
                              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors border border-slate-200 shadow-sm"
                            >
                              {procesandoRetiro === clase.idGrupo ? 'Cancelando...' : 'Cancelar retiro'}
                            </button>
                          ) : esCursando ? (
                            <button 
                              onClick={() => abrirModalRetiro(clase)}
                              disabled={procesandoRetiro === clase.idGrupo}
                              className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100 shadow-sm"
                            >
                              {procesandoRetiro === clase.idGrupo ? 'Procesando...' : 'Solicitar retiro'}
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'pensum' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col justify-between items-center gap-6">
            
            <div className="w-full flex flex-col items-center mb-2">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Avance de tu carrera</h2>
              <div className="w-full max-w-lg bg-slate-100 rounded-full h-5 overflow-hidden border border-slate-200">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${pensumData.porcentajeAvance}%` }}
                ></div>
              </div>
              <p className="text-base font-bold text-slate-600 mt-3">{pensumData.porcentajeAvance}% completado</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 w-full border-t border-slate-100 pt-6">
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-extrabold text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Aprobadas: {pensumData.materiasAprobadas}
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-extrabold text-indigo-800">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Cursando: {pensumData.materiasCursando}
              </div>
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl text-sm font-extrabold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                Pendientes: {pensumData.materiasPendientes}
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-800 bg-red-50 border border-red-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  Reprobadas
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-200 border border-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                  Retiradas
              </div>
            </div>

            <div className="w-full mt-2">
              <div className="relative">
                <input 
                  type="text" 
                  value={busquedaPensum}
                  onChange={(e) => setBusquedaPensum(e.target.value)}
                  placeholder="Buscar materia por nombre o código..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition"
                />
                {busquedaPensum && (
                  <button onClick={() => setBusquedaPensum('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold">
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {cargando ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
              <p className="text-slate-400 text-base font-medium animate-pulse">Cargando pensum académico...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.keys(pensumData.materiasPorCiclo).sort((a, b) => Number(a) - Number(b)).map(cicloNum => {
                const materiasFiltradas = filtrarMateriasPorBusqueda(pensumData.materiasPorCiclo[cicloNum]);
                if (materiasFiltradas.length === 0) return null;

                return (
                  <div key={cicloNum} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Ciclo académico {cicloNum}</h3>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        {materiasFiltradas.length} asignaturas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {materiasFiltradas.map((mat, idx) => {
                        const estadoActual = mat.estado?.toLowerCase();
                        const esCursando = estadoActual === 'cursando';
                        const esReprobada = estadoActual === 'reprobada';
                        const esRetirada = estadoActual === 'retirada';
                        const esRetiroPendiente = estadoActual === 'retiro pendiente';
                        const esAprobada = estadoActual === 'aprobada';

                        return (
                          <div 
                            key={idx} 
                            className={`p-5 border transition-all flex flex-col justify-between ${
                              esCursando 
                                ? 'bg-indigo-50/40 border-indigo-400/80 rounded-2xl shadow-sm ring-1 ring-indigo-400/20' 
                                : esReprobada
                                ? 'bg-red-50/40 border-red-300 rounded-2xl shadow-sm'
                                : esRetirada
                                ? 'bg-slate-100 border-slate-300 rounded-2xl opacity-75'
                                : esRetiroPendiente
                                ? 'bg-amber-50/40 border-amber-300 rounded-2xl shadow-sm'
                                : esAprobada
                                ? 'bg-emerald-50/40 border-emerald-300 rounded-2xl shadow-sm ring-1 ring-emerald-400/20'
                                : 'bg-white border-slate-200 rounded-2xl hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-3">
                                <span className="font-mono text-xs font-extrabold text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
                                  {mat.codigo}
                                </span>
                                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${badgeEstadoStyle(mat.estado)}`}>
                                  {mat.estado}
                                </span>
                              </div>
                              <h4 className={`text-sm font-bold leading-snug mb-3 ${esRetirada ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                {mat.nombre}
                              </h4>
                              
                              <div className="flex flex-col gap-2 mb-4">
                                <span className="text-xs font-bold text-slate-400">Prerrequisitos:</span>
                                {mat.prerrequisitos && mat.prerrequisitos.length > 0 ? (
                                  mat.prerrequisitos.map((pre, i) => (
                                    <span key={i} className="font-mono text-xs font-semibold bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-200 truncate">
                                      {pre}
                                    </span>
                                  ))
                                ) : (
                                  <span className="font-mono text-xs font-semibold bg-slate-50 text-slate-400 px-2 py-1 rounded-md border border-slate-100 w-fit">
                                    Bachillerato
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 border-t border-slate-200/50 text-xs font-bold text-slate-500">
                              <span>Uv: <strong className="text-slate-800">{mat.uvs}</strong></span>
                              {mat.notaFinal !== null && mat.notaFinal !== undefined && (
                                <span className={`font-mono text-xs px-2 py-1 rounded-md border ${
                                  esReprobada ? 'bg-red-200 border-red-300 text-red-900 font-black' : 
                                  'bg-white border-slate-200'
                                }`}>
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

      <AnimatePresence>
        {showRetiroModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-xl">
              <div className="flex items-center gap-3 mb-5 text-amber-600">
                <AlertCircle size={28} />
                <h3 className="text-xl font-bold text-gray-900">Solicitud de retiro</h3>
              </div>
              
              <p className="text-base text-gray-600 mb-5">
                Estás a punto de solicitar el retiro de la materia <strong className="text-gray-900">{materiaSeleccionada?.nombreMateria}</strong>.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-sm text-amber-800">
                <p className="font-semibold mb-2 text-base">Aviso importante:</p>
                <p>Se generará automáticamente un arancel en tu <strong>estado de cuenta</strong> correspondiente al retiro de esta materia.</p>
                <p className="mt-3 text-sm">Deberás cancelarlo para que el retiro se haga efectivo. También puedes acercarte a la ventanilla de financiera en la universidad.</p>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowRetiroModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition text-sm">Cancelar</button>
                <button onClick={confirmarSolicitarRetiro} className="flex-1 bg-amber-600 text-white py-3.5 rounded-xl font-bold hover:bg-amber-700 transition text-sm">Aceptar y solicitar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showCancelarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-xl">
              <div className="flex items-center gap-3 mb-5 text-slate-800">
                <CheckCircle2 size={28} />
                <h3 className="text-xl font-bold text-gray-900">Cancelar retiro</h3>
              </div>
              
              <p className="text-base text-gray-600 mb-6">
                ¿Deseas cancelar el proceso de retiro para la materia <strong className="text-gray-900">{materiaSeleccionada?.nombreMateria}</strong>?
              </p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-sm text-slate-600">
                Al cancelar, el arancel pendiente generado en tu estado de cuenta será eliminado y volverás a estar activo en la materia.
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowCancelarModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition text-sm">Volver</button>
                <button onClick={confirmarCancelarRetiro} className="flex-1 bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 transition text-sm">Sí, cancelar retiro</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default MisClasesPensum;