import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CiclosPlanificacion = () => {
  const navigate = useNavigate();

  const [cicloOperativo, setCicloOperativo] = useState(null);
  const [ciclos, setCiclos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [modalNuevo, setModalNuevo] = useState({
    open: false,
    anio: '',
    numeroCiclo: '',
    codigoSugerido: '',
    vigenciaInicio: '',
    vigenciaFin: ''
  });

  const [modalConfirmar, setModalConfirmar] = useState({
    open: false,
    idCiclo: null,
    codigoCiclo: '',
    totalSecciones: 0,
    aranceles: [],
    consultando: false,
    errorAranceles: ''
  });

  const [modalActivar, setModalActivar] = useState({
    open: false,
    idCiclo: null,
    codigoCiclo: '',
    consultando: false,
    pregradoCompleto: false,
    montos: {
      matriculaPregrado: null,
      cuotaPregrado: null,
      matriculaMaestria: null,
      cuotaMaestria: null
    },
    idsRelevo: {
      idMatriculaPregrado: null,
      idCuotaPregrado: null,
      idMatriculaMaestria: null,
      idCuotaMaestria: null
    }
  });

  const [modalEliminar, setModalEliminar] = useState({
    open: false,
    idCiclo: null,
    codigoCiclo: ''
  });

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resOp, resPlan] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/operativo-oferta`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/en-planificacion`, { headers })
      ]);

      if (resOp.ok) {
        const dataOp = await resOp.json();
        setCicloOperativo(dataOp);
      }

      if (resPlan.ok) {
        const dataPlan = await resPlan.json();
        setCiclos(Array.isArray(dataPlan) ? dataPlan : []);
      }
    } catch (error) {
      toast.error('Error al consultar los ciclos académicos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const iniciarModalNuevoCiclo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/siguiente-sugerido`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const sugerido = await res.json();
      const esPrimero = Number(sugerido.numeroCiclo) === 1;

      setModalNuevo({
        open: true,
        anio: sugerido.anio,
        numeroCiclo: `Ciclo ${String(sugerido.numeroCiclo).padStart(2, '0')}`,
        codigoSugerido: sugerido.codigoSugerido,
        vigenciaInicio: esPrimero ? `01/01/${sugerido.anio}` : `01/07/${sugerido.anio}`,
        vigenciaFin: esPrimero ? `30/06/${sugerido.anio}` : `31/12/${sugerido.anio}`
      });
    } catch (err) {
      toast.error('Error al proyectar el siguiente ciclo', { description: err.message });
    }
  };

  const enviarCrearCicloPlanificado = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/planificacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.mensaje || `HTTP ${res.status}`);
      }

      setModalNuevo(prev => ({ ...prev, open: false }));
      toast.success(`Ciclo ${data.codigoCiclo} registrado en PLANIFICACIÓN.`);
      await cargarDatos();
    } catch (err) {
      toast.error('Error al registrar ciclo', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const abrirModalConfirmarPlanificacion = async (ciclo) => {
    const totalSec = ciclo.totalSeccionesConfiguradas ?? ciclo.seccionesListas ?? 0;

    setModalConfirmar({
      open: true,
      idCiclo: ciclo.idCiclo,
      codigoCiclo: ciclo.codigoCiclo,
      totalSecciones: totalSec,
      aranceles: [],
      consultando: true,
      errorAranceles: ''
    });

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      let res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/conceptos?idCiclo=${ciclo.idCiclo}`, { headers });
      if (!res.ok) {
        res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/ciclos/${ciclo.idCiclo}/aranceles`, { headers });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const aranceles = await res.json();
      setModalConfirmar(prev => ({
        ...prev,
        aranceles: Array.isArray(aranceles) ? aranceles : [],
        consultando: false
      }));
    } catch (err) {
      setModalConfirmar(prev => ({
        ...prev,
        consultando: false,
        errorAranceles: `Error al consultar aranceles: ${err.message}`
      }));
    }
  };

  const ejecutarConfirmacionPlanificacion = async () => {
    if (!modalConfirmar.idCiclo) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/${modalConfirmar.idCiclo}/confirmar-planificacion`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const codigo = modalConfirmar.codigoCiclo;
        setModalConfirmar(prev => ({ ...prev, open: false }));
        toast.success(`¡Ciclo ${codigo} confirmado exitosamente en estado PLANIFICADO!`);
        await cargarDatos();
      } else {
        toast.error(`Rechazado (HTTP ${res.status})`, {
          description: data.mensaje || data.error || 'No cumple las reglas de oferta.'
        });
      }
    } catch (err) {
      toast.error('Error de red al confirmar planificación', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const abrirModalActivacion = async (ciclo) => {
    setModalActivar({
      open: true,
      idCiclo: ciclo.idCiclo,
      codigoCiclo: ciclo.codigoCiclo,
      consultando: true,
      pregradoCompleto: false,
      montos: {
        matriculaPregrado: null,
        cuotaPregrado: null,
        matriculaMaestria: null,
        cuotaMaestria: null
      },
      idsRelevo: {
        idMatriculaPregrado: null,
        idCuotaPregrado: null,
        idMatriculaMaestria: null,
        idCuotaMaestria: null
      }
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/${ciclo.idCiclo}/aranceles-apertura`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const pregradoOk = Boolean(data.arancelesPregradoCompletos || (data.idMatriculaPregrado && data.idCuotaPregrado));

      setModalActivar(prev => ({
        ...prev,
        consultando: false,
        pregradoCompleto: pregradoOk,
        montos: {
          matriculaPregrado: data.montoMatriculaPregrado,
          cuotaPregrado: data.montoCuotaPregrado,
          matriculaMaestria: data.montoMatriculaMaestria,
          cuotaMaestria: data.montoCuotaMaestria
        },
        idsRelevo: {
          idMatriculaPregrado: data.idMatriculaPregrado,
          idCuotaPregrado: data.idCuotaPregrado,
          idMatriculaMaestria: data.idMatriculaMaestria,
          idCuotaMaestria: data.idCuotaMaestria
        }
      }));

      if (!pregradoOk) {
        toast.warning('Advertencia', {
          description: 'El ciclo no cuenta con los aranceles mínimos obligatorios de pregrado.'
        });
      }
    } catch (err) {
      setModalActivar(prev => ({ ...prev, consultando: false, pregradoCompleto: false }));
      toast.error(`Fallo al recuperar aranceles: ${err.message}`);
    }
  };

  const ejecutarRelevo = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        idCiclo: modalActivar.idCiclo,
        idMatriculaCarrera: modalActivar.idsRelevo.idMatriculaPregrado,
        idCuotaCarrera: modalActivar.idsRelevo.idCuotaPregrado,
        idMatriculaMaestria: modalActivar.idsRelevo.idMatriculaMaestria,
        idCuotaMaestria: modalActivar.idsRelevo.idCuotaMaestria,
        idMatriculaTesis: null,
        idCuotaTesis: null
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/activar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setModalActivar(prev => ({ ...prev, open: false }));
        toast.success(data.mensaje || 'Ciclo activado y relevado exitosamente.');
        await cargarDatos();
      } else {
        toast.error(`Rechazado (HTTP ${res.status})`, {
          description: data.mensaje || data.error || 'Fallo en la activación.'
        });
      }
    } catch (err) {
      toast.error(`Fallo de conexión al activar ciclo: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const ejecutarEliminacionCiclo = async () => {
    if (!modalEliminar.idCiclo) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/${modalEliminar.idCiclo}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 204 || res.ok) {
        const codigo = modalEliminar.codigoCiclo;
        setModalEliminar({ open: false, idCiclo: null, codigoCiclo: '' });
        toast.success(`Ciclo ${codigo} purgado exitosamente.`);
        await cargarDatos();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.mensaje || `Error al eliminar (HTTP ${res.status})`);
      }
    } catch (err) {
      toast.error('Error de comunicación al intentar eliminar ciclo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const irAGestionSecciones = (c) => {
    navigate('/dashboard/gestion-secciones', {
      state: {
        idCiclo: c.idCiclo,
        codigoCiclo: c.codigoCiclo,
        estadoCiclo: c.estadoCiclo || 'PLANIFICACIÓN',
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin
      }
    });
  };

  const readonlyInput = "w-full bg-[#F8FAFC] text-gray-800 font-bold border border-gray-200 rounded-xl px-4 py-3 text-sm cursor-not-allowed";
  const labelClass = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5";

  return (
    <>
      <div className="w-full pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">
            Ciclos en Planificación y Relevo Institucional
          </h1>
          <p className="text-gray-500 text-sm">
            Administración del ciclo lectivo activo, periodos en planificación y transición semestral.
          </p>
        </div>

        <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 text-[#2E7D32] border border-green-100 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Ciclo Activo en Clases
                </div>
                <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                  {cicloOperativo ? `${cicloOperativo.codigoCiclo} (${cicloOperativo.estadoCiclo})` : 'Consultando...'}
                </div>
              </div>
            </div>

            <div className="hidden sm:block w-px h-10 bg-gray-100"></div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                  Periodos en Planificación
                </div>
                <div className="text-lg font-extrabold text-gray-900 mt-0.5">
                  {ciclos.length} Periodo(s)
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={iniciarModalNuevoCiclo}
              className="bg-black text-white px-5 py-3 rounded-xl text-[13px] font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva Planificación
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Periodos Académicos en Planificación / Planificados
              </h2>
              <span className="bg-gray-200/80 text-gray-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {ciclos.length} ciclo(s)
              </span>
            </div>

            <button
              type="button"
              onClick={cargarDatos}
              disabled={isLoading}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refrescar Tabla
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-[13px] whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                <tr>
                  <th className="px-6 py-4">Código Ciclo</th>
                  <th className="px-6 py-4">Año Lectivo</th>
                  <th className="px-6 py-4">Semestre</th>
                  <th className="px-6 py-4">Vigencia de Clases</th>
                  <th className="px-6 py-4">Estado Actual</th>
                  <th className="px-6 py-4">Secciones Listas</th>
                  <th className="px-6 py-4 text-right">Acciones de Transición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      Consultando base de datos...
                    </td>
                  </tr>
                ) : ciclos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                      No hay ciclos lectivos en planificación o planificados.
                    </td>
                  </tr>
                ) : (
                  ciclos.map((c) => {
                    const esPlanificado = (c.estadoCiclo || '').toUpperCase() === 'PLANIFICADO';
                    const totalConfiguradas = c.totalSeccionesConfiguradas ?? 0;
                    const seccionesListasBtn = c.seccionesListas ?? totalConfiguradas;

                    return (
                      <tr key={c.idCiclo} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <strong className="text-gray-900 font-extrabold text-sm">
                            {c.codigoCiclo}
                          </strong>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          {c.anio}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          Ciclo {String(c.numeroCiclo).padStart(2, '0')}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                          {c.fechaInicio} &mdash; {c.fechaFin}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            esPlanificado
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${esPlanificado ? 'bg-indigo-600' : 'bg-amber-500'}`}></span>
                            {c.estadoCiclo || 'PLANIFICACIÓN'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 font-bold text-gray-800 text-xs">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            {totalConfiguradas} Secciones
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => irAGestionSecciones(c)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              Secciones ({seccionesListasBtn})
                            </button>

                            {!esPlanificado ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => abrirModalConfirmarPlanificacion(c)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                >
                                  Confirmar Oferta
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalEliminar({ open: true, idCiclo: c.idCiclo, codigoCiclo: c.codigoCiclo })}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                                >
                                  Eliminar
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => abrirModalActivacion(c)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#15803d] text-white hover:bg-[#166534] transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
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
        </section>
      </div>

      {modalNuevo.open && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !isProcessing && setModalNuevo(prev => ({ ...prev, open: false }))}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-extrabold text-gray-900 mb-1.5">
                Iniciar Planificación de Nuevo Ciclo
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-6">
                Proyección semestral matemática institucional. Se clonarán los aranceles base del ciclo saliente.
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Año Proyectado</label>
                    <input type="text" value={modalNuevo.anio} readOnly className={readonlyInput} />
                  </div>
                  <div>
                    <label className={labelClass}>Número de Ciclo</label>
                    <input type="text" value={modalNuevo.numeroCiclo} readOnly className={readonlyInput} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Código Oficial Sugerido</label>
                  <input type="text" value={modalNuevo.codigoSugerido} readOnly className={readonlyInput} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Vigencia Inicio</label>
                    <input type="text" value={modalNuevo.vigenciaInicio} readOnly className={readonlyInput} />
                  </div>
                  <div>
                    <label className={labelClass}>Vigencia Fin</label>
                    <input type="text" value={modalNuevo.vigenciaFin} readOnly className={readonlyInput} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setModalNuevo(prev => ({ ...prev, open: false }))}
                  disabled={isProcessing}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={enviarCrearCicloPlanificado}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Creando...' : 'Confirmar y Crear Ciclo'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modalConfirmar.open && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !isProcessing && setModalConfirmar(prev => ({ ...prev, open: false }))}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-xl p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4 border border-indigo-100">
                <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-xl font-extrabold text-gray-900 mb-1.5">
                Confirmar Planificación &mdash; Ciclo {modalConfirmar.codigoCiclo}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                Al confirmar, la oferta académica quedará <strong>oficialmente congelada</strong> para el proceso de prematrícula y matrícula institucional.
              </p>

              <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 space-y-2.5 mb-5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Secciones Académicas Listas:</span>
                  <span className="font-extrabold text-gray-900">{modalConfirmar.totalSecciones} Secciones registradas</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Estado Resultante:</span>
                  <span className="font-extrabold text-indigo-700">PLANIFICADO</span>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Aranceles y Conceptos de Cobro Configurados
                  </span>
                  <span className="text-xs font-extrabold text-blue-600">
                    {modalConfirmar.consultando
                      ? 'Cargando...'
                      : modalConfirmar.errorAranceles
                        ? 'Error'
                        : `${modalConfirmar.aranceles.length} aranceles`}
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto bg-[#F8FAFC] border border-gray-200 rounded-xl p-3.5 text-xs space-y-2">
                  {modalConfirmar.consultando ? (
                    <span className="text-gray-400 block text-center py-3">
                      Consultando conceptos financieros asociados...
                    </span>
                  ) : modalConfirmar.errorAranceles ? (
                    <span className="text-red-600 font-semibold block text-center py-3">
                      {modalConfirmar.errorAranceles}
                    </span>
                  ) : modalConfirmar.aranceles.length === 0 ? (
                    <span className="text-red-600 font-bold block py-2">
                      ADVERTENCIA: Este ciclo no tiene ningún arancel configurado. El backend rechazará la confirmación.
                    </span>
                  ) : (
                    modalConfirmar.aranceles.map((a, idx) => (
                      <div key={a.idConceptoCobro || idx} className="flex justify-between items-center py-1.5 border-b border-gray-200/70 last:border-0">
                        <span className="font-bold text-gray-800">{a.tipoCobro || a.concepto}</span>
                        <span className="font-extrabold text-[#15803d]">${Number(a.montoBase ?? 0).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setModalConfirmar(prev => ({ ...prev, open: false }))}
                  disabled={isProcessing}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarConfirmacionPlanificacion}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Validando invariantes...' : 'Confirmar y Pasar a PLANIFICADO'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modalActivar.open && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !isProcessing && setModalActivar(prev => ({ ...prev, open: false }))}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-xl p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    ¿Activar y Relevar Ciclo <span className="text-[#0f3b6c]">{modalActivar.codigoCiclo}</span>?
                  </h3>
                  <span className="text-xs font-bold text-gray-400">
                    Transición Atómica de Periodo Académico
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                Esta acción es <strong>atómica e irreversible</strong>. El ciclo saliente pasará formalmente a estado <strong>FINALIZADO</strong> y se generarán los cargos de matrícula y apertura en finanzas según los aranceles configurados.
              </p>

              <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 space-y-2.5 mb-5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Ciclo Saliente (Pasa a FINALIZADO):</span>
                  <span className="font-bold text-red-700">{cicloOperativo ? cicloOperativo.codigoCiclo : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Ciclo Entrante (Pasa a ACTIVO):</span>
                  <span className="font-extrabold text-[#15803d]">{modalActivar.codigoCiclo}</span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 mb-3.5">
                  Valores Oficiales Configurados a Facturar:
                </div>

                <div className="grid grid-cols-2 gap-4 pb-3.5 mb-3.5 border-b border-dashed border-gray-200">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500 uppercase">Matrícula Pregrado</span>
                    <span className="text-lg font-extrabold text-[#0f3b6c]">
                      {modalActivar.consultando
                        ? 'Consultando...'
                        : modalActivar.montos.matriculaPregrado != null
                          ? `$${Number(modalActivar.montos.matriculaPregrado).toFixed(2)}`
                          : 'No configurado'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500 uppercase">Cuota Mensual Pregrado</span>
                    <span className="text-lg font-extrabold text-[#0f3b6c]">
                      {modalActivar.consultando
                        ? 'Consultando...'
                        : modalActivar.montos.cuotaPregrado != null
                          ? `$${Number(modalActivar.montos.cuotaPregrado).toFixed(2)}`
                          : 'No configurado'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500 uppercase">Matrícula Maestría</span>
                    <span className="text-lg font-extrabold text-blue-600">
                      {modalActivar.consultando
                        ? 'Consultando...'
                        : modalActivar.montos.matriculaMaestria != null
                          ? `$${Number(modalActivar.montos.matriculaMaestria).toFixed(2)}`
                          : '$0.00 (Opcional)'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500 uppercase">Cuota Mensual Maestría</span>
                    <span className="text-lg font-extrabold text-blue-600">
                      {modalActivar.consultando
                        ? 'Consultando...'
                        : modalActivar.montos.cuotaMaestria != null
                          ? `$${Number(modalActivar.montos.cuotaMaestria).toFixed(2)}`
                          : '$0.00 (Opcional)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setModalActivar(prev => ({ ...prev, open: false }))}
                  disabled={isProcessing}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarRelevo}
                  disabled={isProcessing || modalActivar.consultando || !modalActivar.pregradoCompleto}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-[#15803d] hover:bg-[#166534] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Activando y facturando...' : 'Confirmar y Activar Ciclo'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modalEliminar.open && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !isProcessing && setModalEliminar({ open: false, idCiclo: null, codigoCiclo: '' })}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mb-4">
                <svg width="26" height="26" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <h3 className="text-xl font-extrabold text-gray-900 mb-1.5">
                ¿Eliminar el Ciclo {modalEliminar.codigoCiclo}?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                Se purgarán los conceptos clonados, secciones y franjas horarias asociadas. Solo se permite en estado PLANIFICACIÓN.
              </p>

              <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 mb-6 text-xs flex justify-between items-center">
                <span className="font-bold text-red-700">Ciclo a Eliminar:</span>
                <span className="font-extrabold text-red-800">{modalEliminar.codigoCiclo}</span>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setModalEliminar({ open: false, idCiclo: null, codigoCiclo: '' })}
                  disabled={isProcessing}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarEliminacionCiclo}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Eliminando...' : 'Confirmar Eliminación'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CiclosPlanificacion;