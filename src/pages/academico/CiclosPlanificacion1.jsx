import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CiclosPlanificacion = () => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(false);
  const [ciclosPlanificacion, setCiclosPlanificacion] = useState([]);
  const [cicloOperativo, setCicloOperativo] = useState(null);

  // Modales
  const [modalNuevoCiclo, setModalNuevoCiclo] = useState({ abierto: false, datos: null });
  const [modalConfirmar, setModalConfirmar] = useState({ abierto: false, idCiclo: null, codigo: '', aranceles: [] });
  const [modalActivar, setModalActivar] = useState({ abierto: false, idCiclo: null, codigo: '', aranceles: null, procesando: false });

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    cargarCicloOperativo();
  }, []);

  const cargarCicloOperativo = async () => {
    setCargando(true);
    try {
      const resOp = await fetch(`${API_URL}/api/v1/ciclos/operativo-oferta`, { headers });
      if (resOp.ok) setCicloOperativo(await resOp.json());

      const resPlan = await fetch(`${API_URL}/api/v1/ciclos/en-planificacion`, { headers });
      if (resPlan.ok) setCiclosPlanificacion(await resPlan.json());
    } catch (error) {
      toast.error('Error al cargar la información de los ciclos');
    } finally {
      setCargando(false);
    }
  };

  const proyectarNuevoCiclo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/ciclos/siguiente-sugerido`, { headers });
      if (res.ok) setModalNuevoCiclo({ abierto: true, datos: await res.json() });
    } catch (error) {
      toast.error('Error al proyectar el siguiente ciclo');
    }
  };

  const confirmarCrearCiclo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/ciclos/planificacion`, { method: 'POST', headers, body: JSON.stringify({}) });
      if (res.ok || res.status === 201) {
        toast.success('Ciclo registrado en planificación exitosamente.');
        setModalNuevoCiclo({ abierto: false, datos: null });
        cargarCicloOperativo();
      } else {
        const err = await res.json();
        toast.error(err.mensaje || 'Error al crear ciclo');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const purgarCiclo = async (idCiclo) => {
    if(!window.confirm('¿Está seguro de eliminar este ciclo y toda su configuración?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/ciclos/${idCiclo}`, { method: 'DELETE', headers });
      if (res.ok || res.status === 204) {
        toast.success('Ciclo purgado del sistema.');
        cargarCicloOperativo();
      } else {
        toast.error('Error al purgar el ciclo');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const abrirConfirmacion = async (ciclo) => {
    setModalConfirmar({ abierto: true, idCiclo: ciclo.idCiclo, codigo: ciclo.codigoCiclo, aranceles: [] });
    try {
      const res = await fetch(`${API_URL}/api/v1/finanzas/ciclos/${ciclo.idCiclo}/aranceles`, { headers });
      if (res.ok) {
        const data = await res.json();
        setModalConfirmar(prev => ({ ...prev, aranceles: data }));
      }
    } catch (e) { console.error(e); }
  };

  const ejecutarConfirmacion = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/ciclos/${modalConfirmar.idCiclo}/confirmar-planificacion`, { method: 'PATCH', headers });
      if (res.ok) {
        toast.success('Oferta académica confirmada.');
        setModalConfirmar({ abierto: false, idCiclo: null, codigo: '', aranceles: [] });
        cargarCicloOperativo();
      } else {
        const err = await res.json();
        toast.error(err.mensaje || 'Error al confirmar la planificación');
      }
    } catch (e) { toast.error('Error de red al confirmar'); }
  };

  const abrirActivacion = async (ciclo) => {
    setModalActivar({ abierto: true, idCiclo: ciclo.idCiclo, codigo: ciclo.codigoCiclo, aranceles: null, procesando: false });
    try {
      const res = await fetch(`${API_URL}/api/v1/ciclos/${ciclo.idCiclo}/aranceles-apertura`, { headers });
      if (res.ok) {
        const data = await res.json();
        setModalActivar(prev => ({ ...prev, aranceles: data }));
      }
    } catch (e) { console.error(e); }
  };

  const ejecutarActivacion = async () => {
    setModalActivar(prev => ({ ...prev, procesando: true }));
    const payload = {
      idCiclo: modalActivar.idCiclo,
      idMatriculaCarrera: modalActivar.aranceles.idMatriculaPregrado,
      idCuotaCarrera: modalActivar.aranceles.idCuotaPregrado,
      idMatriculaMaestria: modalActivar.aranceles.idMatriculaMaestria,
      idCuotaMaestria: modalActivar.aranceles.idCuotaMaestria
    };
    try {
      const res = await fetch(`${API_URL}/api/v1/ciclos/activar`, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.mensaje || 'Ciclo activado exitosamente.');
        setModalActivar({ abierto: false, idCiclo: null, codigo: '', aranceles: null, procesando: false });
        cargarCicloOperativo();
      } else {
        const err = await res.json();
        toast.error(err.mensaje || 'Fallo al activar');
        setModalActivar(prev => ({ ...prev, procesando: false }));
      }
    } catch (e) { 
      toast.error('Error de red'); 
      setModalActivar(prev => ({ ...prev, procesando: false }));
    }
  };

  const irAGestion = (ciclo) => {
    toast.info(`Navegando a la gestión de secciones del ciclo ${ciclo.codigoCiclo}`);
  };

  return (
    <div className="w-full pb-20 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado Principal */}
        <div className="mb-8 flex justify-between items-end border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1 text-[#0f3b6c]">Ciclos en Planificación</h1>
            <p className="text-gray-500 text-sm">Transiciones institucionales y relevo de periodos académicos.</p>
          </div>
          <button onClick={cargarCicloOperativo} className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refrescar
          </button>
        </div>

        {/* Tarjetas KPI Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Tarjeta Ciclo Activo */}
          <div className="bg-white border border-gray-200 rounded-[16px] p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-[#f0fdf4] border border-[#dcfce7] text-[#16a34a] flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ciclo Activo Actual</p>
              <p className="text-lg font-black text-gray-900">{cicloOperativo && !cicloOperativo.esPlanificacion ? cicloOperativo.codigoCiclo : 'Ninguno'}</p>
            </div>
          </div>
          
          {/* Tarjeta En Planificación */}
          <div className="bg-white border border-gray-200 rounded-[16px] p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-[14px] bg-[#fff7ed] border border-[#ffedd5] text-[#ea580c] flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">En Planificación</p>
              <p className="text-lg font-black text-gray-900">{ciclosPlanificacion.length} Periodos</p>
            </div>
          </div>
          
          {/* Botón Nueva Planificación */}
          <div className="flex items-center justify-end">
            <button onClick={proyectarNuevoCiclo} className="h-full px-6 py-4 bg-[#0f3b6c] text-white rounded-[16px] hover:bg-[#0a2749] transition-colors text-sm font-bold shadow-md w-full flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Nueva Planificación
            </button>
          </div>
        </div>

        {/* Tabla Central */}
        <div className="border border-gray-200 rounded-[16px] overflow-hidden bg-white shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="px-6 py-5 border-b border-gray-200 bg-white flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center gap-3">
              Periodos en Planificación
              <span className="bg-gray-100 text-gray-600 text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border border-gray-200">{ciclosPlanificacion.length} registros</span>
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-r border-gray-50">Código Ciclo</th>
                  <th className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-r border-gray-50">Año y Semestre</th>
                  <th className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-r border-gray-50">Vigencia Proyectada</th>
                  <th className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-r border-gray-50 text-center">Estado</th>
                  <th className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-r border-gray-50 text-center">Oferta Académica</th>
                  <th className="px-6 py-4 text-gray-400 font-bold uppercase tracking-wider text-[10px] text-right">Transición Institucional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cargando ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f3b6c] mb-4"></div>
                    <p className="text-gray-400 font-medium">Sincronizando información...</p>
                  </td></tr>
                ) : ciclosPlanificacion.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium">No hay ciclos en planificación actualmente.</td></tr>
                ) : (
                  ciclosPlanificacion.map(c => {
                    const esPlanificado = c.estadoCiclo === 'PLANIFICADO';
                    return (
                      <tr key={c.idCiclo} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5 font-bold text-[#0f3b6c] border-r border-gray-50 text-[15px]">{c.codigoCiclo}</td>
                        <td className="px-6 py-5 border-r border-gray-50">
                          <span className="block font-bold text-gray-900">{c.anio}</span>
                          <span className="block text-xs text-gray-500 mt-0.5">Ciclo {c.numeroCiclo.toString().padStart(2, '0')}</span>
                        </td>
                        <td className="px-6 py-5 border-r border-gray-50">
                          <span className="block font-bold text-gray-700">{c.fechaInicio}</span>
                          <span className="block text-xs text-gray-400 mt-0.5">al {c.fechaFin}</span>
                        </td>
                        <td className="px-6 py-5 text-center border-r border-gray-50">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${esPlanificado ? 'bg-[#eef2ff] text-[#4f46e5]' : 'bg-[#fff7ed] text-[#ea580c]'}`}>
                            {esPlanificado ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4338ca] mr-2"></span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] mr-2"></span>
                            )}
                            {c.estadoCiclo || 'PLANIFICACIÓN'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center border-r border-gray-50">
                           <span className="font-bold text-gray-900">{c.totalSeccionesConfiguradas || 0}</span> <span className="text-gray-500 text-xs">Secciones</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2.5">
                            <button onClick={() => irAGestion(c)} className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[11px] font-bold hover:bg-gray-50 transition-colors shadow-sm">
                              Ver Secciones
                            </button>
                            {!esPlanificado ? (
                              <>
                                <button onClick={() => abrirConfirmacion(c)} className="px-3.5 py-1.5 bg-[#eef2ff] border border-[#c7d2fe] text-[#4338ca] rounded-lg text-[11px] font-bold hover:bg-[#e0e7ff] transition-colors shadow-sm">Confirmar Oferta</button>
                                <button onClick={() => purgarCiclo(c.idCiclo)} className="px-3.5 py-1.5 bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] rounded-lg text-[11px] font-bold hover:bg-[#ffe4e6] transition-colors shadow-sm">Eliminar</button>
                              </>
                            ) : (
                              <button onClick={() => abrirActivacion(c)} className="px-4 py-1.5 bg-[#166534] text-white rounded-lg text-[11px] font-bold hover:bg-[#14532d] transition-colors shadow-sm">
                                Activar Ciclo
                              </button>
                            )}
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

      {/* MODAL: PROYECTAR NUEVO CICLO */}
      {modalNuevoCiclo.abierto && modalNuevoCiclo.datos && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-white">
              <h3 className="text-[17px] font-extrabold text-gray-900">Iniciar Planificación de Nuevo Ciclo</h3>
              <p className="text-[13px] text-gray-500 mt-1">Proyección matemática. Se clonarán los aranceles base del ciclo saliente.</p>
            </div>
            <div className="p-6 bg-white space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Año Proyectado</label>
                  <input type="text" readOnly value={modalNuevoCiclo.datos.anio} className="w-full bg-[#f8fafc] text-[#334155] rounded-xl px-4 py-3 font-bold text-sm border border-gray-200 cursor-not-allowed" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Semestre</label>
                  <input type="text" readOnly value={`Ciclo ${modalNuevoCiclo.datos.numeroCiclo.toString().padStart(2, '0')}`} className="w-full bg-[#f8fafc] text-[#334155] rounded-xl px-4 py-3 font-bold text-sm border border-gray-200 cursor-not-allowed" />
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Código Oficial Sugerido</label>
                <input type="text" readOnly value={modalNuevoCiclo.datos.codigoSugerido} className="w-full bg-white border border-[#bfdbfe] text-[#1d4ed8] rounded-xl px-4 py-3 font-mono font-bold text-2xl text-center shadow-sm" />
              </div>

              {/* Mensaje de Advertencia para Finanzas */}
              <div className="mt-2 p-3.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-[14px] flex items-start gap-3">
                <svg className="w-5 h-5 text-[#2563eb] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-[12px] text-[#1e40af] leading-relaxed font-medium">
                  <strong className="block mb-0.5 text-[#1e3a8a]">Notificación a Finanzas:</strong>
                  Los aranceles serán clonados automáticamente con los valores actuales. Si habrá una modificación de precios para este periodo, deberá notificar a Finanzas para que apliquen el ajuste.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button onClick={() => setModalNuevoCiclo({ abierto: false, datos: null })} className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-[13px] font-bold transition-colors">Cancelar</button>
              <button onClick={confirmarCrearCiclo} className="px-5 py-2.5 bg-[#0f3b6c] text-white rounded-xl hover:bg-[#0a2749] text-[13px] font-bold shadow-md transition-colors">Confirmar y Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR PLANIFICACION */}
      {modalConfirmar.abierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-8 border-b border-gray-100 text-center bg-white">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#eef2ff] text-[#4338ca] flex items-center justify-center mb-5">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Confirmar Oferta {modalConfirmar.codigo}</h3>
              <p className="text-[13px] text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">Al confirmar, la oferta académica quedará <strong className="text-gray-700">oficialmente congelada</strong> para el proceso de prematrícula y matrícula institucional.</p>
            </div>
            
            <div className="p-7 bg-[#f8fafc]">
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
                 <div className="flex justify-between items-center">
                   <span className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">Estado Resultante:</span>
                   <span className="font-black text-[#4338ca] bg-[#eef2ff] px-3 py-1 rounded-lg text-xs">PLANIFICADO</span>
                 </div>
              </div>

              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
                <span>Auditoría de Aranceles Base</span>
                <span className="text-[#2563eb]">{modalConfirmar.aranceles.length} Conceptos</span>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 shadow-sm">
                {modalConfirmar.aranceles.length === 0 ? (
                  <div className="p-4 text-[13px] text-[#b91c1c] font-bold text-center bg-[#fef2f2] rounded-lg">¡Peligro! No hay aranceles configurados. El sistema rechazará la confirmación.</div>
                ) : (
                  modalConfirmar.aranceles.map(a => (
                    <div key={a.idConcepto} className="flex justify-between items-center py-3 px-3 border-b border-gray-50 last:border-0 text-[13px]">
                      <span className="font-semibold text-gray-700 capitalize">{a.concepto.toLowerCase()}</span>
                      <span className="font-black text-[#15803d] bg-[#dcfce7] px-2.5 py-1 rounded-lg">${a.montoBase.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="px-6 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button onClick={() => setModalConfirmar({ abierto: false, idCiclo: null, codigo: '', aranceles: [] })} className="px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-[13px] font-bold transition-colors">Cancelar</button>
              <button onClick={ejecutarConfirmacion} className="px-6 py-2.5 bg-[#4f46e5] text-white rounded-xl hover:bg-[#4338ca] text-[13px] font-bold shadow-md transition-colors">Confirmar Oferta Académica</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ACTIVAR CICLO (TRANSICIÓN ATÓMICA) */}
      {modalActivar.abierto && modalActivar.aranceles && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            
            {/* Header de Peligro/Advertencia */}
            <div className="px-8 py-7 border-b border-gray-100 flex items-center gap-5 bg-gradient-to-r from-[#fffbeb] to-white">
              <div className="w-14 h-14 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center flex-shrink-0 shadow-sm border border-[#fde68a]">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="text-[22px] font-extrabold text-gray-900 tracking-tight">Activar y Relevar Ciclo <span className="text-[#0f3b6c]">{modalActivar.codigo}</span></h3>
                <p className="text-[13px] font-bold text-[#b45309] mt-0.5 tracking-tight uppercase">Transición Institucional Atómica e Irreversible</p>
              </div>
            </div>
            
            <div className="p-8 bg-white space-y-6">
              <p className="text-[13.5px] text-gray-600 leading-relaxed font-medium">
                Al confirmar, el ciclo saliente pasará formalmente a estado <strong>FINALIZADO</strong> y se habilitará el nuevo ciclo activo para inscripciones oficiales.
              </p>

              {/* Cajas de Relevo */}
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ciclo Saliente</span>
                  <span className="text-xl font-black text-[#b91c1c] tracking-tight">{cicloOperativo?.codigoCiclo || 'N/A'}</span>
                  <span className="text-[10px] font-bold bg-white text-[#b91c1c] px-2.5 py-1 rounded-md mt-2.5 border border-[#fecaca]">FINALIZADO</span>
                </div>
                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-5 flex flex-col justify-center items-center text-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ciclo Entrante</span>
                  <span className="text-xl font-black text-[#15803d] tracking-tight">{modalActivar.codigo}</span>
                  <span className="text-[10px] font-bold bg-white text-[#15803d] px-2.5 py-1 rounded-md mt-2.5 border border-[#bbf7d0]">NUEVO ACTIVO</span>
                </div>
              </div>

              {/* Auditoría de Valores para Finanzas */}
              <div className="bg-[#f8fafc] border border-gray-200 rounded-2xl p-5 mt-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Auditoría de Aranceles Configurados</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Matrícula Pregrado</p>
                    <p className="text-xl font-black text-[#0f3b6c] mt-1">${modalActivar.aranceles.montoMatriculaPregrado?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase">Cuota Pregrado</p>
                    <p className="text-xl font-black text-[#0f3b6c] mt-1">${modalActivar.aranceles.montoCuotaPregrado?.toFixed(2) || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="px-8 py-5 border-t border-gray-100 bg-white flex justify-end gap-3">
              <button onClick={() => setModalActivar({ abierto: false, idCiclo: null, codigo: '', aranceles: null, procesando: false })} disabled={modalActivar.procesando} className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-[13px] font-bold transition-colors disabled:opacity-50 shadow-sm">
                Cancelar
              </button>
              
              <button onClick={ejecutarActivacion} disabled={modalActivar.procesando || !modalActivar.aranceles.arancelesPregradoCompletos} className="px-6 py-3 bg-[#166534] text-white rounded-xl hover:bg-[#14532d] text-[13px] font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:bg-gray-400">
                {modalActivar.procesando ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Procesando...</>
                ) : 'Activar Nuevo Ciclo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CiclosPlanificacion;