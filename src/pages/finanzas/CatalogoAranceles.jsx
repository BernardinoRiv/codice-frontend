import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const CatalogoAranceles = () => {
  const [ciclos, setCiclos] = useState([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState('');
  const [aranceles, setAranceles] = useState([]);
  const [terminoBusqueda, setTerminoBusqueda] = useState(''); 
  const [cargandoCiclos, setCargandoCiclos] = useState(false);
  const [cargandoAranceles, setCargandoAranceles] = useState(false);
  
  // Estados para Modales
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  
  const [arancelEditando, setArancelEditando] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState('');
  
  // Estado para nuevo arancel
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
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resActivo, resPlan] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/operativo-oferta`, { headers }).catch(() => null),
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/en-planificacion`, { headers }).catch(() => null)
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/ciclos/${cicloSeleccionado}/aranceles`, {
        headers: { 'Authorization': `Bearer ${token}` }
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

  // CONTROL ESTRICTO DE DECIMALES (Máximo 2)
  const handleMontoChange = (e, isNew = false) => {
    let val = e.target.value;
    // Permite números y opcionalmente un punto con hasta 2 decimales
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/aranceles/${arancelEditando.idConcepto}?nuevoMonto=${parseFloat(nuevoMonto).toFixed(2)}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/ciclos/${cicloSeleccionado}/aranceles`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
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

  return (
    <div className="w-full pb-20 font-sans text-gray-900 animate-in fade-in duration-300">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Encabezado */}
        <div className="mb-10">
          <h1 className="text-[28px] font-extrabold tracking-tight mb-1 text-[#0f172a]">Catálogo de aranceles</h1>
          <p className="text-gray-500 text-[14px]">Gestiona los precios oficiales de la oferta académica por ciclo.</p>
        </div>

        {/* Selector de Ciclo */}
        <div className="mb-8 max-w-sm">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Ciclo lectivo</label>
          <div className="relative shadow-sm rounded-xl">
            <select
              className="w-full bg-white text-gray-900 rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer font-semibold text-[14px] border border-gray-200 disabled:bg-gray-50"
              value={cicloSeleccionado}
              onChange={(e) => setCicloSeleccionado(e.target.value)}
              disabled={cargandoCiclos}
            >
              <option value="">-- Selecciona un ciclo --</option>
              {ciclos.map(ciclo => {
                const estadoCap = ciclo.estadoCiclo ? (ciclo.estadoCiclo.charAt(0).toUpperCase() + ciclo.estadoCiclo.slice(1).toLowerCase()) : 'Planificado';
                return (
                  <option key={ciclo.idCiclo} value={ciclo.idCiclo}>
                    {ciclo.codigoCiclo} - {estadoCap}
                  </option>
                );
              })}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
              {cargandoCiclos ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Aranceles */}
        {cicloSeleccionado && (
          <div className="border border-gray-200 rounded-[16px] overflow-hidden bg-white shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
              
              <div className="flex items-center gap-3">
                <h3 className="font-extrabold text-gray-900 text-[15px] flex items-center gap-2">
                  Conceptos financieros
                  <span className="bg-gray-100 text-gray-600 text-[11px] px-2 py-0.5 rounded-md font-bold">{arancelesFiltrados.length}</span>
                </h3>
                {cicloActualObj && (
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                    esSoloLectura ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#ffedd5] text-[#ea580c]'
                  }`}>
                    {cicloActualObj.estadoCiclo ? (cicloActualObj.estadoCiclo.charAt(0).toUpperCase() + cicloActualObj.estadoCiclo.slice(1).toLowerCase()) : 'Planificado'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Buscador */}
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por concepto o arancel..."
                    value={terminoBusqueda}
                    onChange={(e) => setTerminoBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400"
                  />
                </div>
                
                {/* Botón Agregar (Solo visible si no es solo lectura) */}
                {!esSoloLectura && (
                  <button 
                    onClick={() => setModalAgregarAbierto(true)}
                    className="flex-shrink-0 px-4 py-2 bg-[#0f172a] text-white rounded-xl text-[13px] font-bold hover:bg-[#1e293b] transition-colors shadow-sm"
                  >
                    + Agregar
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-white border-b border-gray-100">
                    <th className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[11px]">Concepto de cobro</th>
                    <th className="px-6 py-4 text-center text-gray-400 font-bold uppercase tracking-wider text-[11px] w-48">Monto base ($)</th>
                    <th className="px-6 py-4 text-center text-gray-400 font-bold uppercase tracking-wider text-[11px] w-32">Acción</th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-gray-50">
                  {cargandoAranceles ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 mb-4"></div>
                        <p className="text-gray-400 font-medium text-[13px]">Consultando catálogo...</p>
                      </td>
                    </tr>
                  ) : arancelesFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-gray-400 font-medium text-[14px]">
                        No se encontraron conceptos financieros.
                      </td>
                    </tr>
                  ) : (
                    arancelesFiltrados.map((arancel) => (
                      <tr key={arancel.idConcepto} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5 font-bold text-gray-700 text-[14px]">
                          {arancel.concepto.charAt(0).toUpperCase() + arancel.concepto.slice(1)}
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-[#16a34a] text-[15px] tracking-tight">
                          ${Number(arancel.montoBase).toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {esSoloLectura ? (
                            <span className="text-[12px] text-gray-400 font-semibold cursor-not-allowed">Solo lectura</span>
                          ) : (
                            <button
                              onClick={() => abrirModalEdicion(arancel)}
                              className="px-4 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[12px] font-bold shadow-sm"
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

      {/* ========================================================================= */}
      {/* MODAL: EDITAR ARANCEL                                                     */}
      {/* ========================================================================= */}
      {modalEditarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-6 border-b border-gray-100 bg-white">
              <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Actualizar precio</h3>
              <p className="text-[13px] text-gray-500 mt-1">Este monto aplicará para la generación de cobros.</p>
            </div>
            
            <div className="p-6 bg-white space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Concepto</label>
                <input 
                  type="text" 
                  value={arancelEditando?.concepto} 
                  readOnly 
                  className="w-full bg-[#f8fafc] text-gray-600 font-semibold text-[14px] rounded-[12px] px-4 py-3 border border-gray-100 cursor-not-allowed outline-none"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Nuevo monto ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={nuevoMonto}
                  onChange={(e) => handleMontoChange(e, false)}
                  className="w-full bg-white text-[#16a34a] font-bold text-[16px] rounded-[12px] px-4 py-3 border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                  autoFocus
                />
              </div>

              {/* Advertencia Financiera */}
              <div className="mt-2 p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-[14px] flex items-start gap-3">
                <svg className="w-5 h-5 text-[#d97706] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-[11.5px] text-[#92400e] leading-relaxed font-medium">
                  <strong className="block mb-0.5 text-[#78350f]">Aviso Institucional:</strong>
                  Si modifica el costo de Matrícula o Cuotas, asegúrese de notificar a la unidad financiera para mantener la integridad en la proyección de ingresos.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setModalEditarAbierto(false)}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-[12px] hover:bg-gray-50 transition-colors text-[13px] font-bold shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicionMonto}
                disabled={guardando}
                className="px-5 py-2.5 bg-black text-white rounded-[12px] hover:bg-gray-800 disabled:opacity-50 transition-colors text-[13px] font-bold shadow-sm flex items-center gap-2"
              >
                {guardando ? 'Guardando...' : 'Confirmar monto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AGREGAR NUEVO ARANCEL                                              */}
      {/* ========================================================================= */}
      {modalAgregarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-6 border-b border-gray-100 bg-white">
              <h3 className="text-[18px] font-extrabold text-gray-900 tracking-tight">Nuevo Concepto de Cobro</h3>
              <p className="text-[13px] text-gray-500 mt-1">Añade un arancel extra para el ciclo {cicloActualObj?.codigoCiclo}.</p>
            </div>
            
            <div className="p-6 bg-white space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Nombre del Concepto</label>
                <input 
                  type="text" 
                  placeholder="Ej: Uso de laboratorios"
                  value={nuevoArancel.concepto}
                  onChange={(e) => setNuevoArancel(p => ({...p, concepto: e.target.value}))}
                  className="w-full bg-white text-gray-900 font-semibold text-[14px] rounded-[12px] px-4 py-3 border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm placeholder-gray-300"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Monto Base ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  value={nuevoArancel.monto}
                  onChange={(e) => handleMontoChange(e, true)}
                  className="w-full bg-white text-[#16a34a] font-bold text-[16px] rounded-[12px] px-4 py-3 border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm placeholder-gray-300"
                />
              </div>

              {/* Advertencia Financiera */}
              <div className="mt-2 p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-[14px] flex items-start gap-3">
                <svg className="w-5 h-5 text-[#2563eb] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-[11.5px] text-[#1e40af] leading-relaxed font-medium">
                  <strong className="block mb-0.5 text-[#1e3a8a]">Aviso Institucional:</strong>
                  La creación de nuevos aranceles debe estar respaldada por el tarifario oficial autorizado por la administración financiera.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setModalAgregarAbierto(false)}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-[12px] hover:bg-gray-50 transition-colors text-[13px] font-bold shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={guardarNuevoArancel}
                disabled={guardando || !nuevoArancel.concepto || !nuevoArancel.monto}
                className="px-5 py-2.5 bg-[#0f172a] text-white rounded-[12px] hover:bg-[#1e293b] disabled:opacity-50 transition-colors text-[13px] font-bold shadow-sm flex items-center gap-2"
              >
                {guardando ? 'Agregando...' : 'Crear Arancel'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CatalogoAranceles;