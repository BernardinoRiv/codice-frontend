import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const MONEDA = String.fromCharCode(36);

function SelectBuscador({
  label,
  loading = false,
  value,
  onChange,
  options = [],
  placeholder = '-- Selecciona un ciclo --',
  searchPlaceholder = 'Buscar ciclo...',
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const filtrados = options.filter(item =>
    (item.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const seleccionado = options.find(
    item => String(item.id) === String(value)
  );

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
    <div ref={containerRef} className={'relative ' + (open ? 'z-40' : 'z-10')}>
      {label && (
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">
          {label}
          {loading && <span className="animate-pulse text-blue-500 normal-case ml-1">(Cargando...)</span>}
        </label>
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
        className="w-full bg-white text-gray-800 border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-between text-left gap-3"
      >
        <span className={'truncate ' + (seleccionado ? 'text-gray-800 font-normal' : 'text-gray-400 font-normal')}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-700 flex-shrink-0"></div>
        ) : (
          <svg
            className={'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ' + (open ? 'rotate-180' : '')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex items-center">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-white text-gray-800 font-normal border border-gray-200 rounded-xl pl-9 pr-9 py-2 text-xs focus:outline-none focus:border-gray-400"
              />
              {(search || seleccionado) && (
                <button
                  type="button"
                  onClick={handleLimpiar}
                  title={search ? 'Limpiar búsqueda' : 'Limpiar selección'}
                  className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <div className="px-4 py-4 text-xs text-gray-400 text-center font-normal">
                No se encontraron ciclos
              </div>
            ) : (
              filtrados.map(item => {
                const activo = String(item.id) === String(value);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      onChange(String(item.id));
                      setOpen(false);
                      setSearch('');
                    }}
                    className={'w-full text-left px-4 py-2.5 text-[13px] transition-colors flex items-center justify-between gap-3 ' + (
                      activo ? 'bg-gray-900 text-white font-medium' : 'text-gray-700 font-normal hover:bg-gray-50'
                    )}
                  >
                    <span className="leading-snug break-words">{item.nombre}</span>
                    {activo && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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

const CatalogoAranceles = () => {
  const [ciclos, setCiclos] = useState([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState('');
  const [aranceles, setAranceles] = useState([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState(''); 
  const [cargandoCiclos, setCargandoCiclos] = useState(false);
  const [cargandoAranceles, setCargandoAranceles] = useState(false);
  
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  
  const [arancelEditando, setArancelEditando] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState('');
  
  const [nuevoArancel, setNuevoArancel] = useState({ concepto: '', monto: '' });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarCiclos();
  }, []);

  useEffect(() => {
    if (cicloSeleccionado) {
      cargarAranceles();
      setTerminoBusqueda(''); 
    } else {
      setAranceles([]);
    }
  }, [cicloSeleccionado]);

  const cargarCiclos = async () => {
    setCargandoCiclos(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': 'Bearer ' + token };

      const [resActivo, resPlan] = await Promise.all([
        fetch(import.meta.env.VITE_API_URL + '/api/v1/ciclos/operativo-oferta', { headers }).catch(() => null),
        fetch(import.meta.env.VITE_API_URL + '/api/v1/ciclos/en-planificacion', { headers }).catch(() => null)
      ]);

      const ciclosDisponibles = [];
      if (resPlan && resPlan.ok) ciclosDisponibles.push(...await resPlan.json());
      
      if (resActivo && resActivo.ok) {
        const activo = await resActivo.json();
        if (!ciclosDisponibles.some(c => c.idCiclo === activo.idCiclo)) {
          ciclosDisponibles.unshift(activo);
        }
      }

      setCiclos(ciclosDisponibles);
    } catch (error) {
      toast.error('Error al cargar', { description: 'No se pudieron obtener los ciclos lectivos.' });
    } finally {
      setCargandoCiclos(false);
    }
  };

  const cargarAranceles = async () => {
    setCargandoAranceles(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/finanzas/ciclos/' + cicloSeleccionado + '/aranceles', {
        headers: { 'Authorization': 'Bearer ' + token }
      });

      if (!response.ok) throw new Error('Error al obtener aranceles');
      setAranceles(await response.json());
    } catch (error) {
      toast.error('Error al cargar', { description: 'No se encontraron aranceles para este ciclo.' });
      setAranceles([]);
    } finally {
      setCargandoAranceles(false);
    }
  };

  const handleMontoChange = (e, isNew = false) => {
    let val = e.target.value;
    if (val === '' || /^\d+(\.\d{0,2})?$/.test(val)) {
      if (isNew) {
        setNuevoArancel(prev => ({ ...prev, monto: val }));
      } else {
        setNuevoMonto(val);
      }
    }
  };

  const abrirModalEdicion = (arancel) => {
    setArancelEditando(arancel);
    setNuevoMonto(arancel.montoBase);
    setModalEditarAbierto(true);
  };

  const guardarEdicionMonto = async () => {
    if (!nuevoMonto || isNaN(nuevoMonto) || parseFloat(nuevoMonto) < 0) {
      toast.error('Monto inválido', { description: 'Ingrese un valor numérico válido.' });
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const montoFormateado = parseFloat(nuevoMonto).toFixed(2);
      const response = await fetch(
        import.meta.env.VITE_API_URL + '/api/v1/finanzas/aranceles/' + arancelEditando.idConcepto + '?nuevoMonto=' + montoFormateado,
        {
          method: 'PUT',
          headers: { 'Authorization': 'Bearer ' + token }
        }
      );

      if (response.ok) {
        toast.success('Precio actualizado exitosamente.');
        setModalEditarAbierto(false);
        cargarAranceles();
      } else {
        const err = await response.json();
        throw new Error(err.mensaje || 'Error en el servidor');
      }
    } catch (error) {
      toast.error('Error al actualizar', { description: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const guardarNuevoArancel = async () => {
    if (!nuevoArancel.concepto.trim() || !nuevoArancel.monto || isNaN(nuevoArancel.monto)) {
      toast.error('Campos incompletos', { description: 'Llene el concepto y un monto válido.' });
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/finanzas/ciclos/' + cicloSeleccionado + '/aranceles', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concepto: nuevoArancel.concepto,
          montoBase: parseFloat(nuevoArancel.monto).toFixed(2)
        })
      });

      if (response.ok || response.status === 201) {
        toast.success('Arancel agregado exitosamente.');
        setModalAgregarAbierto(false);
        setNuevoArancel({ concepto: '', monto: '' });
        cargarAranceles();
      } else {
        const err = await response.json();
        throw new Error(err.mensaje || 'Error en el servidor');
      }
    } catch (error) {
      toast.error('Error al agregar', { description: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const cicloActualObj = ciclos.find(c => c.idCiclo === Number(cicloSeleccionado));
  const esSoloLectura = cicloActualObj && (cicloActualObj.estadoCiclo === 'ACTIVO' || cicloActualObj.estadoCiclo === 'FINALIZADO');

  const arancelesFiltrados = aranceles.filter(arancel => 
    arancel.concepto.toLowerCase().includes(terminoBusqueda.toLowerCase())
  );

  const opcionesCiclos = ciclos.map(ciclo => {
    const estadoCap = ciclo.estadoCiclo
      ? (ciclo.estadoCiclo.charAt(0).toUpperCase() + ciclo.estadoCiclo.slice(1).toLowerCase())
      : 'Planificado';
    return {
      id: ciclo.idCiclo,
      nombre: ciclo.codigoCiclo + ' - ' + estadoCap
    };
  });

  return (
    <>
      <div className="w-full pb-20 font-sans text-gray-900 animate-in fade-in duration-300">
        <div className="max-w-[1200px] mx-auto">
          
          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-[28px] font-bold tracking-tight mb-1 text-gray-900">
              Catálogo de aranceles
            </h1>
            <p className="text-gray-500 text-[14px] font-normal">
              Gestiona los precios oficiales de la oferta académica por ciclo.
            </p>
          </div>

          {/* Selector de Ciclo compacto */}
          <div className="mb-8 max-w-sm">
            <SelectBuscador
              label="Ciclo lectivo"
              loading={cargandoCiclos}
              value={cicloSeleccionado}
              onChange={(val) => setCicloSeleccionado(val)}
              options={opcionesCiclos}
              placeholder="-- Selecciona un ciclo --"
              searchPlaceholder="Buscar ciclo..."
              disabled={cargandoCiclos}
            />
          </div>

          {/* Tabla de Aranceles */}
          {cicloSeleccionado && (
            <div className="border border-gray-200/90 rounded-2xl overflow-hidden bg-white shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
              <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-gray-900 text-[16px] flex items-center gap-2">
                    Conceptos financieros
                    <span className="bg-gray-100 text-gray-600 text-[12px] px-2.5 py-0.5 rounded-md font-medium">
                      {arancelesFiltrados.length}
                    </span>
                  </h3>
                  {cicloActualObj && (
                    <span className={'px-2.5 py-0.5 rounded-md text-[12px] font-medium ' + (
                      esSoloLectura ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-[#ffedd5] text-[#c2410c]'
                    )}>
                      {cicloActualObj.estadoCiclo
                        ? (cicloActualObj.estadoCiclo.charAt(0).toUpperCase() + cicloActualObj.estadoCiclo.slice(1).toLowerCase())
                        : 'Planificado'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Buscador */}
                  <div className="relative w-full sm:w-72 flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por concepto o arancel..."
                      value={terminoBusqueda}
                      onChange={(e) => setTerminoBusqueda(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400"
                    />
                    {terminoBusqueda && (
                      <button
                        type="button"
                        onClick={() => setTerminoBusqueda('')}
                        className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Botón Agregar */}
                  {!esSoloLectura && (
                    <button 
                      type="button"
                      onClick={() => setModalAgregarAbierto(true)}
                      className="flex-shrink-0 px-4 py-2 bg-gray-900 text-white rounded-xl text-[13px] font-semibold hover:bg-black transition-colors shadow-sm"
                    >
                      + Agregar
                    </button>
                  )}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50/40 border-b border-gray-100">
                      <th className="px-6 py-3.5 text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                        Concepto de cobro
                      </th>
                      <th className="px-6 py-3.5 text-center text-gray-400 font-semibold uppercase tracking-wider text-[11px] w-48">
                        {'Monto base (' + MONEDA + ')'}
                      </th>
                      <th className="px-6 py-3.5 text-center text-gray-400 font-semibold uppercase tracking-wider text-[11px] w-32">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-100/70">
                    {cargandoAranceles ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-gray-300 border-t-gray-800 mb-3"></div>
                          <p className="text-gray-400 font-normal text-[13px]">Consultando catálogo...</p>
                        </td>
                      </tr>
                    ) : arancelesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center text-gray-400 font-normal text-[14px]">
                          No se encontraron conceptos financieros.
                        </td>
                      </tr>
                    ) : (
                      arancelesFiltrados.map((arancel) => (
                        <tr key={arancel.idConcepto} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-4 font-normal text-gray-700 text-[14px]">
                            {arancel.concepto.charAt(0).toUpperCase() + arancel.concepto.slice(1)}
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-[#16a34a] text-[14px]">
                            {MONEDA + Number(arancel.montoBase).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {esSoloLectura ? (
                              <span className="text-[12px] text-gray-400 font-normal cursor-not-allowed">
                                Solo lectura
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => abrirModalEdicion(arancel)}
                                className="px-4 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors text-[12px] font-medium shadow-sm"
                              >
                                Modificar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDITAR ARANCEL */}
      {modalEditarAbierto && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-bold text-gray-900 tracking-tight">
                  Actualizar precio
                </h3>
                <p className="text-[13px] text-gray-500 font-normal mt-0.5">
                  Este monto aplicará para la generación de cobros.
                </p>
              </div>
              {cicloActualObj && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap">
                  {cicloActualObj.codigoCiclo}
                </span>
              )}
            </div>
            
            <div className="p-6 bg-white space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Concepto
                </label>
                <input 
                  type="text" 
                  value={arancelEditando?.concepto || ''} 
                  readOnly 
                  className="w-full bg-[#f8fafc] text-gray-600 font-normal text-[14px] rounded-xl px-4 py-3 border border-gray-200/80 cursor-not-allowed outline-none"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  {'Nuevo monto (' + MONEDA + ')'}
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={nuevoMonto}
                  onChange={(e) => handleMontoChange(e, false)}
                  className="w-full bg-white text-gray-900 font-normal text-[15px] rounded-xl px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-black/5 transition-all shadow-sm"
                  autoFocus
                />
              </div>

              <div className="p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-[#d97706] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-[12px] text-[#92400e] leading-relaxed font-normal">
                  <strong className="block mb-0.5 font-semibold text-[#78350f]">Aviso institucional:</strong>
                  Si modifica el costo de Matrícula o Cuotas, asegúrese de notificar a la unidad financiera para mantener la integridad en la proyección de ingresos.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalEditarAbierto(false)}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-[13px] font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicionMonto}
                disabled={guardando}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 transition-colors text-[13px] font-semibold shadow-sm"
              >
                {guardando ? 'Guardando...' : 'Confirmar monto'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: AGREGAR NUEVO ARANCEL */}
      {modalAgregarAbierto && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-bold text-gray-900 tracking-tight">
                  Nuevo concepto de cobro
                </h3>
                <p className="text-[13px] text-gray-500 font-normal mt-0.5">
                  {'Añade un arancel extra para el ciclo ' + (cicloActualObj?.codigoCiclo || '') + '.'}
                </p>
              </div>
              {cicloActualObj && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap">
                  {cicloActualObj.codigoCiclo}
                </span>
              )}
            </div>
            
            <div className="p-6 bg-white space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  Nombre del concepto
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: Uso de laboratorios"
                  value={nuevoArancel.concepto}
                  onChange={(e) => setNuevoArancel(p => ({ ...p, concepto: e.target.value }))}
                  className="w-full bg-white text-gray-800 font-normal text-[14px] rounded-xl px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-black/5 transition-all shadow-sm placeholder-gray-400"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                  {'Monto base (' + MONEDA + ')'}
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  value={nuevoArancel.monto}
                  onChange={(e) => handleMontoChange(e, true)}
                  className="w-full bg-white text-gray-900 font-normal text-[15px] rounded-xl px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-black/5 transition-all shadow-sm placeholder-gray-400"
                />
              </div>

              <div className="p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-[#2563eb] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[12px] text-[#1e40af] leading-relaxed font-normal">
                  <strong className="block mb-0.5 font-semibold text-[#1e3a8a]">Aviso institucional:</strong>
                  La creación de nuevos aranceles debe estar respaldada por el tarifario oficial autorizado por la administración financiera.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalAgregarAbierto(false)}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-[13px] font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarNuevoArancel}
                disabled={guardando || !nuevoArancel.concepto || !nuevoArancel.monto}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 transition-colors text-[13px] font-semibold shadow-sm"
              >
                {guardando ? 'Agregando...' : 'Crear arancel'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CatalogoAranceles;