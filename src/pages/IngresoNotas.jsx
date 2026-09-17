import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const EVALUACIONES_ESPERADAS = [
  { tipo: 'LABORATORIO', numero: 1 },
  { tipo: 'LABORATORIO', numero: 2 },
  { tipo: 'LABORATORIO', numero: 3 },
  { tipo: 'PARCIAL', numero: 1 },
  { tipo: 'PARCIAL', numero: 2 },
  { tipo: 'PARCIAL', numero: 3 },
];

const IngresoNotas = () => {
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [calificaciones, setCalificaciones] = useState({});
  const [solvencias, setSolvencias] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(null);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  useEffect(() => {
    cargarGrupos();
  }, []);

  useEffect(() => {
    if (grupoSeleccionado) {
      cargarDatosGrupo();
      setTerminoBusqueda(''); // Limpia el buscador al cambiar de grupo
    }
  }, [grupoSeleccionado]);

  // ==========================================
  // PETICIONES GET
  // ==========================================
  const cargarGrupos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes/grupos`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const mensajeBackend = errorData.message || errorData.error || `Error ${response.status} del servidor`;
        console.error('Detalle del backend:', errorData);
        throw new Error(mensajeBackend);
      }
      
      const data = await response.json();
      setGrupos(data);
    } catch (error) {
      console.error('Error al cargar grupos:', error);
      toast.error('No se pudieron cargar los grupos', { 
        description: error.message 
      });
    }
  };

  const cargarDatosGrupo = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = `${import.meta.env.VITE_API_URL}/api/v1`;
      
      const fetchJson = async (url) => {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Error en: ${url}`);
        return res.json();
      };
      
      const [inscripcionesData, evaluacionesData, calificacionesData, solvenciasData] = await Promise.all([
        fetchJson(`${baseUrl}/grupos/${grupoSeleccionado}/inscripciones`),
        fetchJson(`${baseUrl}/grupos/${grupoSeleccionado}/evaluaciones`),
        fetchJson(`${baseUrl}/grupos/${grupoSeleccionado}/calificaciones`),
        fetchJson(`${baseUrl}/solvencia/grupo/${grupoSeleccionado}`)
      ]);

      setInscripciones(inscripcionesData);
      setEvaluaciones(evaluacionesData);
      
      const califsObj = {};
      calificacionesData.forEach(calif => {
        const key = `${calif.idInscripcion}-${calif.idEvaluacion}`;
        califsObj[key] = calif;
      });
      setCalificaciones(califsObj);

      const solvenciasObj = {};
      solvenciasData.forEach(sol => {
        solvenciasObj[sol.idInscripcion] = sol.esSolvente;
      });
      setSolvencias(solvenciasObj);

    } catch (error) {
      console.error('Error al cargar datos del grupo:', error);
      toast.error('No se pudieron cargar los datos del grupo seleccionado.');
    } finally {
      setCargando(false);
    }
  };

  // ==========================================
  // FUNCIONES LÓGICAS Y PETICIONES POST
  // ==========================================
  const getEstadoEvaluacion = (evalItem) => {
    if (!evalItem) return { estado: 'no_configurada', mensaje: 'No configurada' };
    
    const ahora = new Date();
    const inicio = new Date(evalItem.fechaInicio);
    const fin = new Date(evalItem.fechaFin);
    
    if (ahora < inicio) {
      const diasParaInicio = Math.ceil((inicio - ahora) / (1000 * 60 * 60 * 24));
      return { 
        estado: 'no_iniciado', 
        mensaje: `Inicia en ${diasParaInicio} día${diasParaInicio !== 1 ? 's' : ''}` 
      };
    }
    if (ahora > fin) {
      const diasDesdeFin = Math.ceil((ahora - fin) / (1000 * 60 * 60 * 24));
      return { 
        estado: 'finalizado', 
        mensaje: `Finalizó hace ${diasDesdeFin} día${diasDesdeFin !== 1 ? 's' : ''}` 
      };
    }
    
    const diasRestantes = Math.ceil((fin - ahora) / (1000 * 60 * 60 * 24));
    return { 
      estado: 'activo', 
      mensaje: diasRestantes > 0 
        ? `${diasRestantes} día${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`
        : 'Último día'
    };
  };

  const getEvaluacionesPorPeriodo = (periodo) => {
    return evaluaciones.filter(ev => ev.periodo === periodo);
  };

  const handleNotaChange = (idInscripcion, idEvaluacion, valor) => {
    const key = `${idInscripcion}-${idEvaluacion}`;
    setCalificaciones(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        idInscripcion,
        idEvaluacion,
        nota: valor === '' ? null : parseFloat(valor),
        estadoCalificacion: 'BORRADOR'
      }
    }));
  };

  const guardarCalificaciones = async () => {
    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const calificacionesArray = Object.values(calificaciones).filter(calif => calif.nota !== null && calif.nota !== undefined);

      const promesas = calificacionesArray.map(async (calif) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/calificaciones`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(calif)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || errData.error || 'Error al guardar calificaciones');
        }
        return response.json();
      });

      await Promise.all(promesas);
      toast.success('¡Excelente!', { description: 'Calificaciones guardadas correctamente' });
      cargarDatosGrupo();
    } catch (error) {
      console.error('Error al guardar calificaciones:', error);
      toast.error('No se pudo guardar', { description: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const publicarCalificaciones = async (idEvaluacion) => {
    setPublicando(idEvaluacion);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/evaluaciones/${idEvaluacion}/publicar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });

      if (!response.ok) throw new Error('Error al publicar');

      toast.success('Publicación exitosa', { description: 'Las calificaciones ya son visibles para los estudiantes.' });
      cargarDatosGrupo();
    } catch (error) {
      console.error('Error al publicar:', error);
      toast.error('Error al publicar', { description: 'Hubo un problema al publicar las notas.' });
    } finally {
      setPublicando(null);
    }
  };

  const descargarPlantilla = () => {
    toast.info('Próximamente', { description: 'La función de descarga de plantilla está en desarrollo.' });
  };

  const cargarNotas = () => {
    toast.info('Próximamente', { description: 'La función de carga masiva está en desarrollo.' });
  };

  const periodosUnicos = [...new Set(evaluaciones.map(ev => ev.periodo).filter(p => p !== null && p !== undefined))].sort();

  // Lógica de Filtrado del Buscador
  const inscripcionesFiltradas = inscripciones.filter(inscripcion => {
    const termino = terminoBusqueda.toLowerCase();
    const nombreCompleto = `${inscripcion.nombresEstudiante} ${inscripcion.apellidosEstudiante}`.toLowerCase();
    return inscripcion.carnet.toLowerCase().includes(termino) || nombreCompleto.includes(termino);
  });
  
  // ==========================================
  // DISEÑO VISUAL
  // ==========================================
  if (cargando) return (
    <div className="flex flex-col items-center justify-center pt-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
      <p className="text-gray-400 text-sm font-medium tracking-wide">Cargando información del grupo...</p>
    </div>
  );

  return (
    <div className="w-full pb-20 font-sans text-gray-900">
      <div className="max-w-7xl">
        
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Ingreso de Notas</h1>
          <p className="text-gray-500 text-sm">Selecciona una materia e ingresa las calificaciones de tus alumnos.</p>
        </div>

        {/* Selector de Grupo */}
        <div className="mb-8 max-w-md">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
            Materia y Grupo
          </label>
          <div className="relative">
            <select
              className="w-full bg-[#F4F4F5] text-gray-900 rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all cursor-pointer font-medium text-sm border border-transparent hover:border-gray-200"
              value={grupoSeleccionado || ''}
              onChange={(e) => setGrupoSeleccionado(Number(e.target.value))}
            >
              <option value="">-- Selecciona un grupo --</option>
              {grupos.map(grupo => (
                <option key={grupo.idGrupo} value={grupo.idGrupo}>
                  {grupo.nombreMateria} - {grupo.codigoGrupo}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
              </svg>
            </div>
          </div>
        </div>

        {grupoSeleccionado && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Barra de Herramientas: Buscador (Izquierda) y Botones (Derecha) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              
              {/* Buscador */}
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por carnet o nombre..."
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4F4F5] border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={cargarNotas}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium border border-gray-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Cargar Notas
                </button>
                <button
                  onClick={descargarPlantilla}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium border border-gray-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Descargar Plantilla
                </button>
              </div>
            </div>

            {/* Tabla de Calificaciones */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider w-32 border-r border-gray-200">
                        Carnet
                      </th>
                      <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider border-r border-gray-200">
                        Estudiante
                      </th>
                      {periodosUnicos.map(periodo => {
                        const evaluacionesPeriodo = getEvaluacionesPorPeriodo(periodo);
                        return (
                          <th key={periodo} colSpan={evaluacionesPeriodo.length} className="px-4 py-3 text-center text-black font-bold tracking-wide border-r border-gray-200 last:border-r-0">
                            PERÍODO {periodo}
                          </th>
                        );
                      })}
                    </tr>
                    
                    <tr className="bg-white border-b border-gray-200">
                      <th className="border-r border-gray-200"></th>
                      <th className="border-r border-gray-200"></th>
                      {periodosUnicos.map(periodo => {
                        const evaluacionesPeriodo = getEvaluacionesPorPeriodo(periodo);
                        return evaluacionesPeriodo.map((evalItem, idx) => {
                          const estado = getEstadoEvaluacion(evalItem);
                          return (
                            <th key={idx} className="px-3 py-3 text-center border-r border-gray-200 last:border-r-0">
                              <div className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                {evalItem.tipoEvaluacion} {evalItem.numeroEvaluacion}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1 uppercase font-medium">
                                {estado.mensaje}
                              </div>
                            </th>
                          );
                        });
                      })}
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-100">
                    {inscripcionesFiltradas.map((inscripcion) => {
                      const esSolvente = solvencias[inscripcion.idInscripcion] !== false;
                      
                      return (
                        <tr key={inscripcion.idInscripcion} className={`hover:bg-gray-50/50 transition-colors ${!esSolvente ? 'bg-red-50/30' : ''}`}>
                          <td className="px-6 py-4 border-r border-gray-100">
                            <div className="flex flex-col gap-1.5">
                              <span className="font-mono text-xs font-medium text-gray-600">
                                {inscripcion.carnet}
                              </span>
                              {!esSolvente && (
                                <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">
                                  INSOLVENTE
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100 font-medium text-gray-900">
                            {inscripcion.nombresEstudiante} {inscripcion.apellidosEstudiante}
                          </td>
                          {periodosUnicos.map(periodo => {
                            const evaluacionesPeriodo = getEvaluacionesPorPeriodo(periodo);
                            return evaluacionesPeriodo.map((evalItem, idx) => {
                              const estado = getEstadoEvaluacion(evalItem);
                              const key = `${inscripcion.idInscripcion}-${evalItem.idEvaluacion}`;
                              const calif = calificaciones[key];
                              const estaPublicada = calif?.estadoCalificacion === 'PUBLICADA';
                              const estaBloqueado = !esSolvente || estado.estado !== 'activo' || estaPublicada;
                              
                              return (
                                <td key={idx} className="px-4 py-4 text-center border-r border-gray-100 last:border-r-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.01"
                                    value={calif?.nota ?? ''}
                                    onChange={(e) => handleNotaChange(inscripcion.idInscripcion, evalItem.idEvaluacion, e.target.value)}
                                    disabled={estaBloqueado}
                                    title={
                                      !esSolvente ? 'Estudiante insolvente' :
                                      estado.estado === 'no_iniciado' ? `Período no iniciado. ${estado.mensaje}` :
                                      estado.estado === 'finalizado' ? `Período finalizado. ${estado.mensaje}` :
                                      estaPublicada ? 'Calificación publicada' : 'Ingrese la nota'
                                    }
                                    className={`w-16 text-center rounded-lg px-2 py-1.5 text-sm font-semibold transition-all outline-none border ${
                                      estaBloqueado 
                                        ? estaPublicada 
                                          ? 'bg-transparent text-gray-900 border-transparent cursor-default' 
                                          : 'bg-gray-100/50 text-gray-400 border-gray-200 cursor-not-allowed'
                                        : 'bg-white text-black border-gray-300 hover:border-gray-400 focus:border-black focus:ring-1 focus:ring-black'
                                    }`}
                                  />
                                </td>
                              );
                            });
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {inscripcionesFiltradas.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-sm text-gray-400">
                    {terminoBusqueda ? 'No se encontraron estudiantes con esa búsqueda.' : 'No hay estudiantes inscritos en este grupo.'}
                  </p>
                </div>
              )}
            </div>

            {/* Botones de Acción Final */}
            <div className="flex gap-4 items-center pt-2">
              <button
                onClick={guardarCalificaciones}
                disabled={guardando}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
              >
                {guardando ? 'Guardando...' : 'Guardar Borrador'}
              </button>

              {evaluaciones.map(evalItem => {
                const estado = getEstadoEvaluacion(evalItem);
                const puedePublicar = estado.estado === 'activo' || estado.estado === 'finalizado';
                return (
                  <button
                    key={evalItem.idEvaluacion}
                    onClick={() => publicarCalificaciones(evalItem.idEvaluacion)}
                    disabled={!puedePublicar || publicando === evalItem.idEvaluacion}
                    className="px-6 py-3 bg-white text-black border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
                  >
                    {publicando === evalItem.idEvaluacion ? 'Publicando...' : `Publicar ${evalItem.tipoEvaluacion} ${evalItem.numeroEvaluacion}`}
                  </button>
                );
              })}
            </div>

            {/* Leyenda Minimalista */}
            <div className="pt-4 flex gap-6 text-[11px] text-gray-500 uppercase tracking-wider font-medium">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-black"></div> Editable</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-300"></div> Publicada / Bloqueada</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Insolvente</div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default IngresoNotas;