import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';

function SelectBuscador({ label, loading = false, value, onChange, options = [], placeholder = '-- Seleccione --', searchPlaceholder = 'Buscar...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const filtrados = options.filter(item => (item.nombre || '').toLowerCase().includes(search.toLowerCase()));
  const seleccionado = options.find(item => String(item.id) === String(value));

  const handleLimpiar = (e) => {
    e.stopPropagation();
    if (search) {
      setSearch('');
      inputRef.current?.focus();
    } else if (value) {
      onChange('');
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-40' : 'z-10'}`}>
      {label && (
        <div className="h-5 mb-1.5 ml-1 flex items-center">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest">
            {label}
            {loading && <span className="animate-pulse text-blue-600 normal-case ml-1">(...)</span>}
          </label>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) setSearch('');
          }
        }}
        className="w-full min-h-[50px] bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm disabled:bg-slate-100/50 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-between text-left gap-3"
      >
        <span className={`line-clamp-2 ${seleccionado ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium'}`}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        <svg className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50">
            <div className="relative flex items-center">
              <svg className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs focus:outline-none focus:border-slate-400 font-medium placeholder-slate-500"
              />
              {(search || seleccionado) && (
                <button type="button" onClick={handleLimpiar} title="Limpiar" className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {filtrados.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-600 text-center font-medium">No se encontraron resultados</div>
            ) : (
              filtrados.map(item => {
                const activo = String(item.id) === String(value);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => { onChange(String(item.id)); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-3 text-[13px] transition-colors flex items-center justify-between gap-3 ${activo ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 font-medium hover:bg-slate-50'}`}
                  >
                    <span className="leading-relaxed break-words">{item.nombre}</span>
                    {activo && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [porcentajeAsistencia, setPorcentajeAsistencia] = useState(0);
  
  const [cargandoManual, setCargandoManual] = useState(null);
  
  // NUEVO ESTADO PARA EL BUSCADOR DE LA LISTA DE ABAJO
  const [busquedaListaManual, setBusquedaListaManual] = useState('');

  const timerIntervalRef = useRef(null);
  const tokenIntervalRef = useRef(null);
  const presentesIntervalRef = useRef(null);
  const autoCierreRef = useRef(null);

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

  useEffect(() => {
    if (inscripciones.length > 0) {
      const porcentaje = (presentes.length / inscripciones.length) * 100;
      setPorcentajeAsistencia(porcentaje);

      if (porcentaje === 100 && !finalizando && !modalFaltantesAbierto && claseActiva) {
        autoCierreRef.current = setTimeout(() => {
          toast.success('¡Todos los estudiantes están presentes!', { description: 'Cerrando la toma de asistencia automáticamente...' });
          finalizarClase([]);
        }, 3000);
      }
    }
    return () => {
      if (autoCierreRef.current) clearTimeout(autoCierreRef.current);
    };
  }, [presentes, inscripciones, claseActiva, finalizando, modalFaltantesAbierto]);

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
      } catch (error) {}
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
      } catch (error) {}
    };

    obtenerToken();
    consultarPresentes();
    
    tokenIntervalRef.current = setInterval(obtenerToken, 10000);
    presentesIntervalRef.current = setInterval(consultarPresentes, 2000);
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
    } catch (error) {}
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
        setBusquedaListaManual(''); // Limpiamos el buscador al iniciar
        
        localStorage.setItem('claseActivaSRA', data.idClase);
        localStorage.setItem('grupoSeleccionadoSRA', grupoSeleccionado);
        localStorage.setItem('inicioClaseSRA', Date.now());

        await cargarInscripciones(grupoSeleccionado);
        toast.success('Clase iniciada. Muestra el código QR a los estudiantes.');
      } else {
        toast.error('No se pudo iniciar la clase');
      }
    } catch (error) {
      toast.error('Error al iniciar clase', { description: error.message });
    } finally {
      setIniciando(false);
    }
  };

  const marcarPresenteManual = async (inscripcion) => {
    const idEstudiante = inscripcion.idEstudiante;

    if (!idEstudiante) {
      toast.error("Error: El ID del estudiante no está disponible.");
      return;
    }

    setCargandoManual(idEstudiante);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/marcar-presente-manual?idClase=${claseActiva}&idEstudiante=${idEstudiante}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Asistencia manual registrada');
        
        const tokenData = localStorage.getItem('token');
        const resPresentes = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/presentes/${claseActiva}`, {
          headers: { 'Authorization': `Bearer ${tokenData}` }
        });
        if (resPresentes.ok) {
          const data = await resPresentes.json();
          setPresentes(data.presentes || []);
        }
      } else {
        toast.error('No se pudo registrar la asistencia manual.');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setCargandoManual(null);
    }
  };

  const prepararCierreAsistencia = () => {
    limpiarIntervalos();

    const faltantes = inscripciones
      .filter(insc => {
        return !presentes.find(p => String(p.idEstudiante) === String(insc.idEstudiante));
      })
      .map(insc => ({
        idInscripcion: insc.idInscripcion, 
        idEstudiante: insc.idEstudiante,
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
        toast.success(data.mensaje || 'Clase finalizada correctamente');
        
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

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PRESENTE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'AUSENTE': return 'bg-red-50 text-red-700 border-red-200';
      case 'TARDE': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'JUSTIFICADA': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const opcionesGrupos = grupos.map(g => ({
    id: g.idGrupo,
    nombre: `${g.nombreMateria} - ${g.codigoGrupo}`
  }));

  const historialAgrupado = historial.reduce((acc, curr) => {
    const fecha = curr.fechaClase.substring(0, 10);
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(curr);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(historialAgrupado).sort((a, b) => new Date(b) - new Date(a));

  if (cargando && grupos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-slate-500 text-sm font-medium tracking-wide">Cargando información...</p>
      </div>
    );
  }

  const labelClassName = "block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2 ml-1";

  // FILTRADO PARA LA LISTA DE ESTUDIANTES FALTANTES
  const inscripcionesFaltantes = inscripciones
    .filter(insc => !presentes.find(p => String(p.idEstudiante) === String(insc.idEstudiante)))
    .filter(insc => {
      if (!busquedaListaManual.trim()) return true;
      const query = busquedaListaManual.toLowerCase();
      const nombreCompleto = `${insc.nombresEstudiante || ''} ${insc.apellidosEstudiante || ''}`.toLowerCase();
      const carnet = (insc.carnet || '').toLowerCase();
      return nombreCompleto.includes(query) || carnet.includes(query);
    });

  return (
    <div className="w-full pb-20 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-7xl mx-auto relative">
        
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1 text-slate-900">Asistencias</h1>
          <p className="text-slate-600 text-sm font-medium">Gestión de asistencia por QR y registro histórico.</p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setPestanaActiva('toma')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              pestanaActiva === 'toma'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Toma de asistencia
          </button>
          <button
            onClick={() => setPestanaActiva('historial')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              pestanaActiva === 'historial'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Historial
          </button>
        </div>

        {!claseActiva && pestanaActiva === 'toma' && (
          <div className="mb-8 max-w-md">
            <SelectBuscador
              label="Materia y grupo"
              value={grupoSeleccionado}
              onChange={(val) => setGrupoSeleccionado(val ? Number(val) : null)}
              options={opcionesGrupos}
              placeholder="-- Selecciona un grupo --"
              searchPlaceholder="Buscar materia o grupo..."
            />
          </div>
        )}

        {pestanaActiva === 'toma' && !claseActiva && (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75M13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">Iniciar toma de asistencia</h3>
              <p className="text-sm text-slate-600 mb-6 font-medium">
                Selecciona un grupo e inicia la clase para generar el código QR dinámico.
              </p>
              <button
                onClick={iniciarClase}
                disabled={!grupoSeleccionado || iniciando}
                className="w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {iniciando ? 'Iniciando...' : 'Iniciar clase'}
              </button>
            </div>
          </div>
        )}

        {pestanaActiva === 'toma' && claseActiva && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tiempo transcurrido</p>
                <p className="text-3xl font-mono font-extrabold text-slate-900 tracking-tight">{formatearTiempo(tiempoTranscurrido)}</p>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Estudiantes presentes</p>
                <p className="text-3xl font-extrabold text-emerald-600">
                  {presentes.length} <span className="text-lg text-slate-400 font-medium">/ {inscripciones.length}</span>
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Porcentaje</p>
                <p className="text-3xl font-extrabold text-blue-600 relative z-10">
                  {Math.round(porcentajeAsistencia)}%
                </p>
                <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500 ease-out" 
                    style={{ width: `${porcentajeAsistencia}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-extrabold text-slate-900 mb-2">Código QR de asistencia</h2>
                <p className="text-sm text-slate-600 mb-8 text-center font-medium">
                  Los estudiantes deben escanear este código o ingresar el código de 4 dígitos.
                </p>
                
                <div className="flex flex-col md:flex-row items-center gap-10">
                  {tokenActual ? (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                      <QRCodeCanvas value={tokenActual} size={220} level="H" includeMargin={true} />
                    </div>
                  ) : (
                    <div className="animate-pulse bg-slate-100 w-56 h-56 rounded-3xl border border-slate-200"></div>
                  )}

                  <div className="flex flex-col items-center">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Código Manual</p>
                    {tokenActual ? (
                      <div className="bg-slate-900 text-white rounded-2xl px-10 py-6 shadow-lg">
                        <p className="text-6xl font-mono font-black tracking-[0.2em]">{tokenActual}</p>
                      </div>
                    ) : (
                      <div className="animate-pulse bg-slate-200 w-48 h-28 rounded-2xl"></div>
                    )}
                    <p className="text-xs text-slate-500 mt-3 text-center max-w-[200px]">
                      Este código cambia cada 10 segundos. Si el alumno no tiene cámara, puede ingresarlo manualmente.
                    </p>
                  </div>
                </div>

                <div className="mt-10 w-full max-w-sm mx-auto">
                  <button
                    onClick={prepararCierreAsistencia}
                    disabled={finalizando}
                    className="w-full bg-red-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                    </svg>
                    Finalizar toma de asistencia
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">Estudiantes presentes</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Los alumnos aparecerán aquí a medida que escaneen.</p>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  {presentes.length} de {inscripciones.length}
                </span>
              </div>
              
              <div className="divide-y divide-slate-100 min-h-[200px]">
                {presentes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-300 animate-pulse">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Esperando alumnos...</p>
                    <p className="text-xs text-slate-500 mt-1">Los nombres aparecerán automáticamente.</p>
                  </div>
                ) : (
                  presentes.map((presente) => {
                    const inscripcion = inscripciones.find(i => String(i.idEstudiante) === String(presente.idEstudiante));

                    if (!inscripcion) return null;

                    return (
                      <div key={presente.idEstudiante} className="px-6 py-4 flex items-center justify-between bg-emerald-50/30 animate-in slide-in-from-left-4 fade-in duration-300">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <div>
                            <p className="font-extrabold text-sm text-slate-900">
                              {inscripcion.nombresEstudiante} {inscripcion.apellidosEstudiante}
                            </p>
                            <p className="text-xs text-slate-500 font-mono font-medium mt-0.5">
                              {inscripcion.carnet}
                            </p>
                          </div>
                        </div>
                        
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ {new Date(presente.fechaRegistro).toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">¿Alguien no pudo escanear?</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Puedes marcar su asistencia manualmente si tuvo problemas técnicos.</p>
                </div>
                
                {/* NUEVO BUSCADOR EN LA LISTA MANUAL */}
                <div className="relative w-full sm:w-64">
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por nombre o carnet..."
                    value={busquedaListaManual}
                    onChange={(e) => setBusquedaListaManual(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:border-slate-400 font-medium placeholder-slate-400 transition-colors"
                  />
                  {busquedaListaManual && (
                    <button 
                      onClick={() => setBusquedaListaManual('')} 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {inscripcionesFaltantes.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500 font-medium">
                    {busquedaListaManual ? 'No se encontraron estudiantes con ese criterio.' : '¡Todos los estudiantes han sido registrados!'}
                  </div>
                ) : (
                  inscripcionesFaltantes.map((inscripcion) => {
                    const estaCargando = String(cargandoManual) === String(inscripcion.idEstudiante);
                    
                    return (
                      <div key={inscripcion.idInscripcion} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-bold text-sm text-slate-700">
                            {inscripcion.nombresEstudiante} {inscripcion.apellidosEstudiante}
                          </p>
                          <p className="text-xs text-slate-400 font-mono">
                            {inscripcion.carnet}
                          </p>
                        </div>
                        <button
                          onClick={() => marcarPresenteManual(inscripcion)}
                          disabled={estaCargando}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {estaCargando ? 'Cargando...' : 'Marcar Presente'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {modalFaltantesAbierto && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-extrabold text-slate-900 mb-1.5">Confirmación de asistencias</h3>
                <p className="text-sm text-slate-600 font-medium">
                  Estudiantes que no marcaron registro. Puedes asignarles un estado manual por fallos técnicos o permisos.
                </p>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                <div className="space-y-3">
                  {listaFaltantes.map(estudiante => (
                    <div key={estudiante.idInscripcion} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">{estudiante.nombre}</p>
                        <p className="text-xs text-slate-500 font-mono font-medium mt-0.5">{estudiante.carnet}</p>
                      </div>
                      <select
                        value={estudiante.estado}
                        onChange={(e) => actualizarEstadoFaltante(estudiante.idInscripcion, e.target.value)}
                        className="bg-slate-50 text-slate-900 text-xs rounded-lg px-4 py-2 font-bold focus:outline-none border border-slate-200 focus:border-slate-400 cursor-pointer"
                      >
                        <option value="AUSENTE">Ausente</option>
                        <option value="TARDE">Tarde</option>
                        <option value="JUSTIFICADA">Justificada</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                <button
                  onClick={cancelarCierre}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Continuar escaneo
                </button>
                <button
                  onClick={() => finalizarClase()}
                  disabled={finalizando}
                  className="px-6 py-2.5 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                >
                  {finalizando ? 'Guardando...' : 'Guardar y finalizar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {pestanaActiva === 'historial' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex-1">
                <SelectBuscador
                  label="Materia y grupo"
                  value={grupoSeleccionado}
                  onChange={(val) => setGrupoSeleccionado(val ? Number(val) : null)}
                  options={opcionesGrupos}
                  placeholder="-- Selecciona un grupo --"
                  searchPlaceholder="Buscar materia o grupo..."
                />
              </div>

              <div className="flex-1">
                <label className={labelClassName}>
                  Filtrar por fecha
                </label>
                <input
                  type="date"
                  value={filtroFecha}
                  max={fechaHoy}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full h-[50px] bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl px-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm disabled:bg-slate-100/50 disabled:text-slate-500 disabled:cursor-not-allowed placeholder-slate-400"
                />
              </div>

              <button
                onClick={cargarHistorial}
                className="w-full sm:w-auto h-[50px] px-8 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm"
              >
                Buscar
              </button>
            </div>

            {historial.length > 0 ? (
              <div className="space-y-6">
                {fechasOrdenadas.map((fecha) => {
                  const [anio, mes, dia] = fecha.split('-');
                  const fechaMostrar = `${dia}/${mes}/${anio}`;
                  const registros = historialAgrupado[fecha];

                  return (
                    <div key={fecha} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                          </svg>
                          Clase del {fechaMostrar}
                        </h3>
                        <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">
                          {registros.length} estudiantes
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="bg-white border-b border-slate-200">
                              <th className="px-6 py-3.5 text-left text-[10px] text-slate-500 font-bold uppercase tracking-widest">Carnet</th>
                              <th className="px-6 py-3.5 text-left text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estudiante</th>
                              <th className="px-6 py-3.5 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">Estado</th>
                              <th className="px-6 py-3.5 text-left text-[10px] text-slate-500 font-bold uppercase tracking-widest">Hora registro</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {registros.map((registro) => {
                              const esHoy = fecha === fechaHoy;
                              return (
                                <tr key={registro.idAsistencia} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                      {registro.carnet}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-800">
                                    {registro.nombreEstudiante}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {esHoy ? (
                                      <select
                                        value={registro.estadoAsistencia.toUpperCase()}
                                        onChange={(e) => modificarEstadoHistorial(registro.idAsistencia, e.target.value)}
                                        className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer appearance-none ${getEstadoColor(registro.estadoAsistencia.toUpperCase())}`}
                                      >
                                        <option value="PRESENTE">Presente</option>
                                        <option value="AUSENTE">Ausente</option>
                                        <option value="TARDE">Tarde</option>
                                        <option value="JUSTIFICADA">Justificada</option>
                                      </select>
                                    ) : (
                                      <span className={`inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getEstadoColor(registro.estadoAsistencia.toUpperCase())}`}>
                                        {registro.estadoAsistencia}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-xs font-medium text-slate-500">
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
                  );
                })}
              </div>
            ) : grupoSeleccionado && !cargando ? (
              <div className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-sm font-extrabold text-slate-900">No hay registros</h3>
                <p className="mt-1 text-sm text-slate-500 font-medium">No se encontraron asistencias para este grupo.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Asistencias;