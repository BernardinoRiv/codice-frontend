import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function SelectBuscador({ label, value, onChange, options, placeholder = 'Seleccione una opción', searchPlaceholder = 'Buscar...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizarOpcion = (item) => ({
    id: item.id ?? item.idSede ?? item.idDistrito ?? item.idTipoContratacion,
    nombre: item.nombre ?? item.descripcion ?? ''
  });

  const listaNormalizada = options.map(normalizarOpcion);

  const filtrados = listaNormalizada.filter(item =>
    item.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const seleccionado = listaNormalizada.find(
    item => Number(item.id) === Number(value)
  );

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setSearch('');
        }}
        className="w-full bg-[#F8FAFC] text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all flex items-center justify-between text-left"
      >
        <span className={`truncate pr-2 ${seleccionado ? 'text-gray-900' : 'text-gray-400'}`}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <svg
                className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-white text-gray-900 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400 text-center">
                Sin coincidencias
              </div>
            ) : (
              filtrados.map(item => {
                const activo = Number(item.id) === Number(value);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between ${
                      activo ? 'bg-gray-900 text-white font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate pr-2">{item.nombre}</span>
                    {activo && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

function ListaDocentes() {
  const [docentes, setDocentes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const [catalogos, setCatalogos] = useState({
    sedes: [],
    tiposContratacion: [],
    estadosDocente: [],
    distritos: []
  });

  const [modalEditar, setModalEditar] = useState({
    open: false,
    docente: null
  });

  const [formEdit, setFormEdit] = useState({
    telefono: '',
    correoPersonal: '',
    direccion: '',
    idDistrito: '',
    idSede: '',
    idTipoContratacion: ''
  });

  const [modalEstado, setModalEstado] = useState({
    open: false,
    docente: null
  });

  const [formEstado, setFormEstado] = useState({
    idEstadoDocente: '',
    motivo: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const fetchDocentes = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const data = await response.json();
      setDocentes(data);
    } catch (error) {
      toast.error('Error al cargar docentes', { description: 'Revisa tu conexión o asegúrate de que el servidor esté encendido.' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogos = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/catalogos?nombres=sedes,distritos,tipos_contratacion_docente,estados_docente`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setCatalogos({
          sedes: data.sedes || [],
          distritos: data.distritos || [],
          tiposContratacion: data.tipos_contratacion_docente || [],
          estadosDocente: data.estados_docente || []
        });
      }
    } catch (error) {}
  };

  useEffect(() => {
    fetchDocentes();
    fetchCatalogos();
  }, []);

  const formatearTelefono = (valor) => {
    const numeros = valor.replace(/\D/g, '').substring(0, 8);
    if (numeros.length > 4) {
      return `${numeros.substring(0, 4)}-${numeros.substring(4)}`;
    }
    return numeros;
  };

  const extraerDetalleError = (data) => {
    if (data?.detalles && typeof data.detalles === 'object') {
      return Object.entries(data.detalles)
        .map(([campo, msj]) => `${campo}: ${msj}`)
        .join(' | ');
    }
    return undefined;
  };

  const obtenerNombreDistrito = (idDistrito) => {
    if (!idDistrito) return '';
    const encontrado = catalogos.distritos.find(d => Number(d.id) === Number(idDistrito));
    return encontrado ? encontrado.nombre : '';
  };

  const handleAbrirEditar = (docente) => {
    const normalizar = (str) => (str || '').toString().trim().toLowerCase();

    const sedeEncontrada = catalogos.sedes.find(
      s => normalizar(s.nombre || s.descripcion) === normalizar(docente.nombreSede)
    );

    const contratoEncontrado = catalogos.tiposContratacion.find(
      t => normalizar(t.nombre || t.descripcion) === normalizar(docente.tipoContratacion)
    );

    setFormEdit({
      telefono: docente.telefono || '',
      correoPersonal: docente.correoPersonal || '',
      direccion: docente.direccion || '',
      idDistrito: docente.idDistrito || (catalogos.distritos[0]?.id ?? 1),
      idSede: docente.idSede || sedeEncontrada?.id || '',
      idTipoContratacion: docente.idTipoContratacion || contratoEncontrado?.id || ''
    });

    setModalEditar({ open: true, docente });
  };

  const handleActualizarDocente = async (e) => {
    e.preventDefault();

    if (!formEdit.telefono || !formEdit.correoPersonal || !formEdit.direccion || !formEdit.idDistrito || !formEdit.idSede || !formEdit.idTipoContratacion) {
      toast.warning('Campos incompletos', { description: 'Por favor completa todos los campos requeridos.' });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        telefono: formEdit.telefono.trim(),
        correoPersonal: formEdit.correoPersonal.trim(),
        direccion: formEdit.direccion.trim(),
        idDistrito: Number(formEdit.idDistrito),
        idSede: Number(formEdit.idSede),
        idTipoContratacion: Number(formEdit.idTipoContratacion)
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes/${modalEditar.docente.idDocente}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success('Docente actualizado correctamente');
        setModalEditar({ open: false, docente: null });
        fetchDocentes();
      } else {
        toast.error(data.mensaje || data.error || 'No se pudo actualizar el docente', {
          description: extraerDetalleError(data)
        });
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAbrirCambiarEstado = (docente) => {
    const estadoActual = (docente.estadoDocente || '').toUpperCase();
    const estadoDestino = catalogos.estadosDocente.find(
      e => (e.nombre || '').toUpperCase() !== estadoActual
    );

    setFormEstado({
      idEstadoDocente: estadoDestino ? estadoDestino.id : (estadoActual === 'ACTIVO' ? 2 : 1),
      motivo: ''
    });
    setModalEstado({ open: true, docente });
  };

  const handleConfirmarCambioEstado = async (e) => {
    e.preventDefault();

    if (!formEstado.motivo.trim()) {
      toast.warning('Motivo requerido', { description: 'Debes justificar el motivo del cambio de estado para auditoría.' });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        idEstadoDocente: Number(formEstado.idEstadoDocente),
        motivo: formEstado.motivo.trim()
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes/${modalEstado.docente.idDocente}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success(data.mensaje || 'Estado del docente actualizado correctamente');
        setModalEstado({ open: false, docente: null });
        fetchDocentes();
      } else {
        toast.error(data.mensaje || data.error || 'No se pudo cambiar el estado del docente', {
          description: extraerDetalleError(data)
        });
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor');
    } finally {
      setIsSaving(false);
    }
  };

  const docentesFiltrados = docentes.filter(docente => {
    const busqueda = searchTerm.toLowerCase();
    const nombreCompleto = `${docente.nombres} ${docente.apellidos}`.toLowerCase();
    return (
      nombreCompleto.includes(busqueda) ||
      (docente.codigoDocente && docente.codigoDocente.toLowerCase().includes(busqueda)) ||
      (docente.correoInstitucional && docente.correoInstitucional.toLowerCase().includes(busqueda)) ||
      (docente.correoPersonal && docente.correoPersonal.toLowerCase().includes(busqueda)) ||
      (docente.telefono && docente.telefono.toLowerCase().includes(busqueda)) ||
      (docente.direccion && docente.direccion.toLowerCase().includes(busqueda)) ||
      (docente.especialidad && docente.especialidad.toLowerCase().includes(busqueda))
    );
  });

  const inputClass = "w-full bg-[#F8FAFC] text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all";
  const labelClass = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5";

  return (
    <>
      <div className="w-full pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Directorio de Docentes</h1>
            <p className="text-gray-500 text-sm">Gestiona y consulta la plantilla académica de la institución.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={fetchDocentes} disabled={isLoading} className="p-2.5 text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-all">
              <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button 
              onClick={() => navigate('/dashboard/registro-docente')} 
              className="bg-black text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Nuevo Docente
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, código, correo, teléfono o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-[13px] focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all shadow-sm"
              />
            </div>
            <div className="text-[12px] font-bold text-gray-400 tracking-wider">
              {docentesFiltrados.length} REGISTROS
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Docente</th>
                  <th className="px-4 py-3.5 font-bold">Contacto</th>
                  <th className="px-4 py-3.5 font-bold">Especialidad & Ubicación</th>
                  <th className="px-4 py-3.5 font-bold">Contrato</th>
                  <th className="px-4 py-3.5 font-bold text-center">Estado</th>
                  <th className="px-4 py-3.5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/80">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <svg className="w-8 h-8 animate-spin text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span className="text-[11px] font-bold uppercase tracking-widest">Cargando directorio...</span>
                      </div>
                    </td>
                  </tr>
                ) : docentesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <span className="text-[12px] font-bold uppercase tracking-widest text-gray-500">No se encontraron docentes</span>
                        <p className="text-[11px] font-normal mt-1">Intenta con otros términos de búsqueda o registra uno nuevo.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  docentesFiltrados.map((docente) => {
                    const esActivo = (docente.estadoDocente || '').toUpperCase() === 'ACTIVO';
                    const nombreDistrito = obtenerNombreDistrito(docente.idDistrito);

                    return (
                      <tr key={docente.idDocente} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3.5 align-top">
                          <p className="font-bold text-gray-900 group-hover:text-black transition-colors leading-snug">
                            {docente.nombres} {docente.apellidos}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              {docente.codigoDocente || 'SIN CÓDIGO'}
                            </span>
                            {docente.numeroDocumento && (
                              <span className="text-[10px] font-semibold text-gray-500">
                                • DUI: {docente.numeroDocumento}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="space-y-1 max-w-[220px]">
                            <div className="flex items-center gap-1.5 text-gray-800 font-medium text-[12px]">
                              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                              <span className="truncate" title={docente.correoInstitucional}>
                                {docente.correoInstitucional || <span className="text-gray-400 italic">Sin correo inst.</span>}
                              </span>
                            </div>

                            {docente.correoPersonal && (
                              <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                                <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg>
                                <span className="truncate" title={docente.correoPersonal}>
                                  {docente.correoPersonal}
                                </span>
                              </div>
                            )}

                            {docente.telefono && (
                              <div className="flex items-center gap-1.5 text-gray-500 text-[11px] font-medium">
                                <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                <span>{docente.telefono}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="max-w-[210px]">
                            <p className="text-gray-900 font-semibold truncate" title={docente.especialidad}>
                              {docente.especialidad || '---'}
                            </p>
                            <p className="text-gray-500 text-[11px] font-medium mt-0.5 truncate" title={docente.nombreSede}>
                              {docente.nombreSede || '---'}
                            </p>
                            {(docente.direccion || nombreDistrito) && (
                              <p className="text-gray-400 text-[11px] mt-1 truncate" title={`${docente.direccion || ''}${nombreDistrito ? ` (\${nombreDistrito})` : ''}`}>
                                {docente.direccion || 'Sin dirección'}{nombreDistrito ? ` • ${nombreDistrito}` : ''}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <span className="inline-block bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                            {docente.tipoContratacion || 'NO DEFINIDO'}
                          </span>
                          {(docente.fechaInicio || docente.fechaFin) && (
                            <div className="mt-1.5 text-[10px] text-gray-400 space-y-0.5">
                              {docente.fechaInicio && <p>Inicio: <span className="text-gray-600 font-medium">{docente.fechaInicio}</span></p>}
                              <p>Fin: <span className="text-gray-600 font-medium">{docente.fechaFin || 'Indefinido'}</span></p>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center align-top whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                            esActivo ? 'bg-green-50 text-green-700 border-green-200' :
                            docente.estadoDocente === 'INACTIVO' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {docente.estadoDocente || 'DESCONOCIDO'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right align-top whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => handleAbrirEditar(docente)}
                              title="Editar Docente"
                              className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors p-2 rounded-lg border border-transparent hover:border-blue-100"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>

                            <button 
                              onClick={() => handleAbrirCambiarEstado(docente)}
                              title={esActivo ? "Dar de Baja (Desactivar)" : "Reactivar Docente"}
                              className={`transition-colors p-2 rounded-lg border border-transparent ${
                                esActivo
                                  ? 'text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                              }`}
                            >
                              {esActivo ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM17 11h6" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM19 8v6m3-3h-6" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalEditar.open && modalEditar.docente && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => !isSaving && setModalEditar({ open: false, docente: null })}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-2xl p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    Editar Ficha de Docente
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {modalEditar.docente.nombres} {modalEditar.docente.apellidos} &bull; <span className="text-gray-700 font-medium">{modalEditar.docente.especialidad}</span>
                  </p>
                </div>
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest">
                  {modalEditar.docente.codigoDocente}
                </span>
              </div>

              <form onSubmit={handleActualizarDocente} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input
                      type="text"
                      value={formEdit.telefono}
                      onChange={(e) => setFormEdit({ ...formEdit, telefono: formatearTelefono(e.target.value) })}
                      placeholder="7890-1234"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Correo Personal</label>
                    <input
                      type="email"
                      value={formEdit.correoPersonal}
                      onChange={(e) => setFormEdit({ ...formEdit, correoPersonal: e.target.value })}
                      placeholder="contacto.personal@gmail.com"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass}>Dirección de Residencia</label>
                    <input
                      type="text"
                      value={formEdit.direccion}
                      onChange={(e) => setFormEdit({ ...formEdit, direccion: e.target.value })}
                      placeholder="Colonia San José #45, Santa Ana"
                      required
                      className={inputClass}
                    />
                  </div>

                  <SelectBuscador
                    label="Distrito"
                    value={formEdit.idDistrito}
                    onChange={(id) => setFormEdit({ ...formEdit, idDistrito: id })}
                    options={catalogos.distritos}
                    placeholder="Seleccione un distrito"
                    searchPlaceholder="Buscar distrito..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <SelectBuscador
                    label="Sede Asignada"
                    value={formEdit.idSede}
                    onChange={(id) => setFormEdit({ ...formEdit, idSede: id })}
                    options={catalogos.sedes}
                    placeholder="Seleccione sede"
                    searchPlaceholder="Buscar sede..."
                  />

                  <SelectBuscador
                    label="Tipo de Contratación"
                    value={formEdit.idTipoContratacion}
                    onChange={(id) => setFormEdit({ ...formEdit, idTipoContratacion: id })}
                    options={catalogos.tiposContratacion}
                    placeholder="Seleccione contrato"
                    searchPlaceholder="Buscar tipo de contrato..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setModalEditar({ open: false, docente: null })}
                    disabled={isSaving}
                    className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modalEstado.open && modalEstado.docente && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => !isSaving && setModalEstado({ open: false, docente: null })}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  Number(formEstado.idEstadoDocente) === 1 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    Cambiar Estado del Docente
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {modalEstado.docente.nombres} {modalEstado.docente.apellidos} ({modalEstado.docente.codigoDocente})
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfirmarCambioEstado} className="space-y-5">
                <SelectBuscador
                  label="Nuevo Estado"
                  value={formEstado.idEstadoDocente}
                  onChange={(id) => setFormEstado({ ...formEstado, idEstadoDocente: Number(id) })}
                  options={catalogos.estadosDocente}
                  placeholder="Seleccione estado"
                  searchPlaceholder="Buscar estado..."
                />

                <div>
                  <label className={labelClass}>Motivo de Auditoría</label>
                  <textarea
                    rows="3"
                    value={formEstado.motivo}
                    onChange={(e) => setFormEstado({ ...formEstado, motivo: e.target.value })}
                    placeholder="Ej. Suspensión administrativa por finalización de ciclo"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setModalEstado({ open: false, docente: null })}
                    disabled={isSaving}
                    className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${
                      Number(formEstado.idEstadoDocente) === 1
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isSaving ? 'Procesando...' : 'Confirmar Cambio'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default ListaDocentes;