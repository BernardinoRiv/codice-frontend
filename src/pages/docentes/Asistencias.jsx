import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';

const Asistencias = () => {
  const [pestanaActiva, setPestanaActiva] = useState('toma');
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [claseActiva, setClaseActiva] = useState(null);
  const [tokenActual, setTokenActual] = useState('');
  const [presentes, setPresentes] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [filtroFecha, setFiltroFecha] = useState('');
  
  const [modalFaltantesAbierto, setModalFaltantesAbierto] = useState(false);
  const [listaFaltantes, setListaFaltantes] = useState([]);

  const timerIntervalRef = useRef(null);
  const tokenIntervalRef = useRef(null);
  const presentesIntervalRef = useRef(null);

  // Solución al problema de Zona Horaria (UTC vs Local)
  const getFechaHoy = () => {
    const hoy = new Date();
    hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
    return hoy.toISOString().substring(0, 10);
  };
  const fechaHoy = getFechaHoy();

  useEffect(() => {
    cargarGrupos();

    const claseGuardada = localStorage.getItem('claseActivaSRA');
    const grupoGuardado = localStorage.getItem('grupoSeleccionadoSRA');
    const inicioGuardado = localStorage.getItem('inicioClaseSRA');

    if (claseGuardada && grupoGuardado) {
      setClaseActiva(Number(claseGuardada));
      setGrupoSeleccionado(Number(grupoGuardado));

      if (inicioGuardado) {
        const transcurrido = Math.floor((Date.now() - Number(inicioGuardado)) / 1000);
        setTiempoTranscurrido(transcurrido > 0 ? transcurrido : 0);
      }

      cargarInscripciones(Number(grupoGuardado));
    }

    return () => limpiarIntervalos();
  }, []);

  useEffect(() => {
    if (grupoSeleccionado && pestanaActiva === 'historial') {
      cargarHistorial();
    }
  }, [grupoSeleccionado, pestanaActiva]);

  useEffect(() => {
    if (claseActiva && grupoSeleccionado && !modalFaltantesAbierto) {
      iniciarIntervalos();
    }
    return () => limpiarIntervalos();
  }, [claseActiva, grupoSeleccionado, modalFaltantesAbierto]);

  const limpiarIntervalos = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (tokenIntervalRef.current) clearInterval(tokenIntervalRef.current);
    if (presentesIntervalRef.current) clearInterval(presentesIntervalRef.current);
  };

  const iniciarIntervalos = () => {
    limpiarIntervalos();
    
    timerIntervalRef.current = setInterval(() => {
      setTiempoTranscurrido(prev => prev + 1);
    }, 1000);

    const obtenerToken = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/token-qr/${claseActiva}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setTokenActual(data.token);
        }
      } catch (error) {
        console.error('Error al obtener token:', error);
      }
    };

    const consultarPresentes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/presentes/${claseActiva}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPresentes(data.presentes || []);
        }
      } catch (error) {
        console.error('Error al consultar presentes:', error);
      }
    };

    obtenerToken();
    consultarPresentes();
    
    tokenIntervalRef.current = setInterval(obtenerToken, 5000);
    presentesIntervalRef.current = setInterval(consultarPresentes, 3000);
  };

  const cargarGrupos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes/grupos`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) setGrupos(await response.json());
      else toast.error('No se pudieron cargar los grupos');
    } catch (error) {
      toast.error('Error de conexión', { description: error.message });
    }
  };

  const cargarInscripciones = async (idGrupo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/${idGrupo}/inscripciones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) setInscripciones(await response.json());
    } catch (error) {
      console.error('Error al cargar inscripciones:', error);
    }
  };

  const cargarHistorial = async () => {
    if (!grupoSeleccionado) return;
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${import.meta.env.VITE_API_URL}/api/v1/asistencia/historial/${grupoSeleccionado}`;
      if (filtroFecha) url += `?fecha=${filtroFecha}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistorial(data);
      }
    } catch (error) {
      toast.error('Error al cargar historial', { description: error.message });
    } finally {
      setCargando(false);
    }
  };

  const iniciarClase = async () => {
    if (!grupoSeleccionado) {
      toast.error('Selecciona un grupo primero');
      return;
    }
    setIniciando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/iniciar?idGrupo=${grupoSeleccionado}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClaseActiva(data.idClase);
        setTiempoTranscurrido(0);
        setPresentes([]);
        
        localStorage.setItem('claseActivaSRA', data.idClase);
        localStorage.setItem('grupoSeleccionadoSRA', grupoSeleccionado);
        localStorage.setItem('inicioClaseSRA', Date.now());

        await cargarInscripciones(grupoSeleccionado);
        toast.success('Clase iniciada. Muestra el qr a los estudiantes.');
      } else {
        toast.error('No se pudo iniciar la clase');
      }
    } catch (error) {
      toast.error('Error al iniciar clase', { description: error.message });
    } finally {
      setIniciando(false);
    }
  };

  const prepararCierreAsistencia = () => {
    limpiarIntervalos();

    const faltantes = inscripciones
      .filter(insc => {
        const idValido = insc.matricula?.estudiante?.idEstudiante || insc.estudiante?.idEstudiante || insc.idEstudiante;
        return !presentes.find(p => p.idEstudiante === idValido);
      })
      .map(insc => ({
        idInscripcion: insc.idInscripcion, 
        idEstudiante: insc.matricula?.estudiante?.idEstudiante || insc.estudiante?.idEstudiante || insc.idEstudiante,
        nombre: `${insc.nombresEstudiante || ''} ${insc.apellidosEstudiante || ''}`.trim(),
        carnet: insc.carnet,
        estado: 'AUSENTE'
      }));

    if (faltantes.length === 0) {
      finalizarClase([]);
    } else {
      setListaFaltantes(faltantes);
      setModalFaltantesAbierto(true);
    }
  };

  const cancelarCierre = () => {
    setModalFaltantesAbierto(false);
    iniciarIntervalos(); 
  };

  const actualizarEstadoFaltante = (idInscripcion, nuevoEstado) => {
    setListaFaltantes(prev => prev.map(f => f.idInscripcion === idInscripcion ? { ...f, estado: nuevoEstado } : f));
  };

  const finalizarClase = async (manualesData = listaFaltantes) => {
    if (!claseActiva) return;
    setFinalizando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/finalizar/${claseActiva}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ manuales: manualesData })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.mensaje);
        
        localStorage.removeItem('claseActivaSRA');
        localStorage.removeItem('grupoSeleccionadoSRA');
        localStorage.removeItem('inicioClaseSRA');

        setClaseActiva(null);
        setTokenActual('');
        setPresentes([]);
        setTiempoTranscurrido(0);
        setModalFaltantesAbierto(false);
        setPestanaActiva('historial');
        await cargarHistorial();
      } else {
        toast.error('No se pudo finalizar la clase');
      }
    } catch (error) {
      toast.error('Error al finalizar clase', { description: error.message });
    } finally {
      setFinalizando(false);
    }
  };

  const modificarEstadoHistorial = async (idAsistencia, nuevoEstado) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/modificar/${idAsistencia}?nuevoEstado=${nuevoEstado}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Estado actualizado correctamente');
        setHistorial(prev => prev.map(reg => 
          reg.idAsistencia === idAsistencia 
            ? { ...reg, estadoAsistencia: nuevoEstado.toUpperCase() } 
            : reg
        ));
      } else {
        toast.error('Error al actualizar el estado');
      }
    } catch (error) {
      toast.error('Error de conexión', { description: error.message });
    }
  };

  const formatearTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstudiantePresente = (idEstudiante) => {
    return presentes.find(p => p.idEstudiante === idEstudiante);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PRESENTE': return 'bg-green-100 text-green-700 border-green-200';
      case 'AUSENTE': return 'bg-red-100 text-red-700 border-red-200';
      case 'TARDE': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'JUSTIFICADA': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (cargando && grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
        <p className="text-gray-400 text-sm font-medium tracking-wide">Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="w-full pb-20 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto relative">
        
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Asistencias</h1>
          <p className="text-gray-500 text-sm">Gestión de asistencia por qr y historial de registros.</p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setPestanaActiva('toma')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              pestanaActiva === 'toma'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Toma de asistencia
          </button>
          <button
            onClick={() => setPestanaActiva('historial')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              pestanaActiva === 'historial'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial
          </button>
        </div>

        {!claseActiva && pestanaActiva === 'toma' && (
          <div className="mb-8 max-w-md">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Materia y grupo
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
        )}

        {pestanaActiva === 'toma' && !claseActiva && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center max-w-md">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75M13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Iniciar toma de asistencia</h3>
              <p className="text-sm text-gray-500 mb-6">
                Selecciona un grupo e inicia la clase para generar el código qr rotativo.
              </p>
              <button
                onClick={iniciarClase}
                disabled={!grupoSeleccionado || iniciando}
                className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {iniciando ? 'Iniciando...' : 'Iniciar clase'}
              </button>
            </div>
          </div>
        )}

        {pestanaActiva === 'toma' && claseActiva && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tiempo transcurrido</p>
                <p className="text-2xl font-mono font-bold text-black">{formatearTiempo(tiempoTranscurrido)}</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estudiantes presentes</p>
                <p className="text-2xl font-bold text-green-600">
                  {presentes.length} <span className="text-sm text-gray-400 font-normal">/ {inscripciones.length}</span>
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Porcentaje</p>
                <p className="text-2xl font-bold text-blue-600">
                  {inscripciones.length > 0 ? Math.round((presentes.length / inscripciones.length) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Código qr de asistencia</h2>
                <p className="text-sm text-gray-500 mb-6 text-center">
                  Los estudiantes deben escanear este código. Se actualiza automáticamente cada 5 segundos.
                </p>
                
                {tokenActual ? (
                  <div className="bg-white p-6 rounded-2xl border-4 border-black shadow-lg">
                    <QRCodeCanvas 
                      value={tokenActual} 
                      size={280}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                ) : (
                  <div className="animate-pulse bg-gray-200 w-72 h-72 rounded-2xl"></div>
                )}

                {tokenActual && (
                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl px-6 py-3">
                    <p className="text-sm text-blue-800 font-mono font-bold">
                      Token: {tokenActual}
                    </p>
                  </div>
                )}

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={prepararCierreAsistencia}
                    disabled={finalizando}
                    className="bg-red-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Finalizar toma de asistencia
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-900">Lista de estudiantes</h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                {inscripciones.map((inscripcion) => {
                  const idValido = inscripcion.estudiante?.idEstudiante || inscripcion.idEstudiante;
                  const presente = getEstudiantePresente(idValido);
                  
                  return (
                    <div 
                      key={inscripcion.idInscripcion}
                      className={`px-6 py-4 flex items-center justify-between ${
                        presente ? 'bg-green-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          presente ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {inscripcion.nombresEstudiante} {inscripcion.apellidosEstudiante}
                          </p>
                          <p className="text-sm text-gray-500 font-mono">
                            {inscripcion.carnet}
                          </p>
                        </div>
                      </div>
                      
                      {presente ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          ✓ {new Date(presente.fechaRegistro).toLocaleTimeString('es-SV', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pendiente</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {modalFaltantesAbierto && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-1">Confirmación de asistencias</h3>
                <p className="text-sm text-gray-500">
                  Estudiantes que no marcaron registro. Puedes asignarles un estado manual por fallos técnicos o permisos.
                </p>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                <div className="space-y-3">
                  {listaFaltantes.map(estudiante => (
                    <div key={estudiante.idInscripcion} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">{estudiante.nombre}</p>
                        <p className="text-sm text-gray-500 font-mono">{estudiante.carnet}</p>
                      </div>
                      <select
                        value={estudiante.estado}
                        onChange={(e) => actualizarEstadoFaltante(estudiante.idInscripcion, e.target.value)}
                        className="bg-[#F4F4F5] text-gray-900 text-sm rounded-lg px-4 py-2 font-medium focus:outline-none border border-transparent hover:border-gray-200 cursor-pointer"
                      >
                        <option value="AUSENTE">Ausente</option>
                        <option value="TARDE">Tarde</option>
                        <option value="JUSTIFICADA">Justificada</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                <button
                  onClick={cancelarCierre}
                  className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Continuar escaneo
                </button>
                <button
                  onClick={() => finalizarClase()}
                  disabled={finalizando}
                  className="px-6 py-2.5 bg-black text-white font-medium hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  {finalizando ? 'Guardando...' : 'Guardar y finalizar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {pestanaActiva === 'historial' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Materia y grupo
                </label>
                <select
                  className="w-full bg-[#F4F4F5] text-gray-900 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all cursor-pointer font-medium text-sm border border-transparent hover:border-gray-200"
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
              </div>

              <div className="flex-1 max-w-md">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
                  Filtrar por fecha
                </label>
                <input
                  type="date"
                  value={filtroFecha}
                  max={fechaHoy}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full bg-[#F4F4F5] text-gray-900 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium text-sm border border-transparent hover:border-gray-200"
                />
              </div>

              <button
                onClick={cargarHistorial}
                className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Buscar
              </button>
            </div>

            {historial.length > 0 ? (
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-bold text-gray-900">Registro de asistencias</h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider">Fecha</th>
                        <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider">Carnet</th>
                        <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider">Estudiante</th>
                        <th className="px-6 py-4 text-center text-gray-500 font-semibold uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider">Hora registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historial.map((registro) => {
                        // Extracción limpia para prevenir desfase horario UTC
                        const fechaClase = registro.fechaClase.substring(0, 10);
                        const esHoy = fechaClase === fechaHoy;
                        const [anio, mes, dia] = fechaClase.split('-');
                        const fechaMostrar = `${dia}/${mes}/${anio}`;

                        return (
                          <tr key={registro.idAsistencia} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-900">
                                {fechaMostrar}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-xs font-medium text-gray-600">
                                {registro.carnet}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">
                              {registro.nombreEstudiante}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {esHoy ? (
                                <select
                                  value={registro.estadoAsistencia.toUpperCase()}
                                  onChange={(e) => modificarEstadoHistorial(registro.idAsistencia, e.target.value)}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border focus:outline-none cursor-pointer appearance-none ${getEstadoColor(registro.estadoAsistencia.toUpperCase())}`}
                                >
                                  <option value="AUSENTE">Ausente</option>
                                  <option value="TARDE">Tarde</option>
                                  <option value="JUSTIFICADA">Justificada</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getEstadoColor(registro.estadoAsistencia.toUpperCase())}`}>
                                  {registro.estadoAsistencia.charAt(0).toUpperCase() + registro.estadoAsistencia.slice(1).toLowerCase()}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {new Date(registro.fechaRegistro).toLocaleTimeString('es-SV', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : grupoSeleccionado && !cargando ? (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900">No hay registros</h3>
                <p className="mt-1 text-sm text-gray-500">No se encontraron asistencias para este grupo.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Asistencias;