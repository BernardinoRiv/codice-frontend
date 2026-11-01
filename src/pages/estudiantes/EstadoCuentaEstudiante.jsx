import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const EstadoCuentaEstudiante = () => {
  const [ciclos, setCiclos] = useState([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState('');
  
  const [datosCuenta, setDatosCuenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pestanaActiva, setPestanaActiva] = useState('pendientes');
  const [carnetEstudiante, setCarnetEstudiante] = useState(null);

  // 1. Extraer el carnet decodificando el JWT al montar el componente
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        
        if (payload.carnet) {
          setCarnetEstudiante(payload.carnet);
        } else {
          toast.error("Carnet no encontrado en la sesión. Por favor, vuelva a iniciar sesión.");
          setCargando(false);
        }
      } catch (error) {
        console.error("Error al decodificar el token:", error);
        setCargando(false);
      }
    }
    
    cargarCiclosDisponibles();
  }, []);

  // 2. Disparar la búsqueda financiera solo cuando tengamos Carnet y Ciclo seleccionados
  useEffect(() => {
    if (cicloSeleccionado && carnetEstudiante) {
      cargarEstadoCuenta();
    }
  }, [cicloSeleccionado, carnetEstudiante]);

  const cargarCiclosDisponibles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // FILTRO ESTRICTO: Solo mostrar ciclos ACTIVOS o FINALIZADOS
        const ciclosValidos = data.filter(c => 
          c.estadoCiclo === 'ACTIVO' || c.estadoCiclo === 'FINALIZADO'
        );
        
        setCiclos(ciclosValidos);
        
        if (ciclosValidos.length > 0) {
          const cicloActivo = ciclosValidos.find(c => c.estadoCiclo === 'ACTIVO');
          setCicloSeleccionado(cicloActivo ? cicloActivo.idCiclo : ciclosValidos[0].idCiclo);
        } else {
          setCargando(false);
        }
      }
    } catch (error) {
      toast.error('Error al cargar los ciclos');
      setCargando(false);
    }
  };

  const cargarEstadoCuenta = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${carnetEstudiante}/estado-cuenta/ciclos/${cicloSeleccionado}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('No se encontraron movimientos financieros para este ciclo.');
      }

      const data = await response.json();
      setDatosCuenta(data);
    } catch (error) {
      setDatosCuenta(null);
      toast.info(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="w-full pb-20 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-[1000px] mx-auto">
        
        {/* ENCABEZADO Y SELECTOR DE CICLO */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-2 text-slate-900">
              Mi estado de cuenta
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-widest border border-slate-200">
                {carnetEstudiante || '...'}
              </span>
              <p className="text-sm font-medium text-slate-600">
                {datosCuenta ? datosCuenta.estudiante.carrera : 'Cargando perfil...'}
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-64">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
              Ciclo a consultar
            </label>
            <div className="relative">
              <select 
                value={cicloSeleccionado}
                onChange={(e) => setCicloSeleccionado(e.target.value)}
                className="w-full h-[50px] bg-white text-slate-900 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm appearance-none cursor-pointer"
              >
                {ciclos.map(c => (
                  <option key={c.idCiclo} value={c.idCiclo}>
                    {c.codigoCiclo} ({c.estadoCiclo})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
          </div>
        ) : !datosCuenta ? (
          <div className="bg-slate-50 p-12 text-center rounded-2xl border border-slate-200 border-dashed">
            <svg className="mx-auto h-12 w-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500 font-medium">No se encontraron movimientos financieros para el ciclo seleccionado.</p>
          </div>
        ) : (
          <>
            {/* TARJETAS KPI FINANCIEROS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total facturado</p>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">${datosCuenta.resumen.deudaTotal.toFixed(2)}</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Total pagado</p>
                <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">${datosCuenta.resumen.totalPagado.toFixed(2)}</p>
              </div>
              
              <div className="bg-red-50 rounded-2xl p-6 border border-red-200 shadow-sm">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mb-1.5">Saldo pendiente</p>
                <p className="text-3xl font-extrabold text-red-700 tracking-tight">${datosCuenta.resumen.saldoPendiente.toFixed(2)}</p>
              </div>
            </div>

            {/* PESTAÑAS */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
              <button 
                onClick={() => setPestanaActiva('pendientes')}
                className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  pestanaActiva === 'pendientes' 
                    ? 'border-slate-900 text-slate-900' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Cargos pendientes <span className="ml-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{datosCuenta.cargosPendientes.length}</span>
              </button>
              <button 
                onClick={() => setPestanaActiva('pagados')}
                className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  pestanaActiva === 'pagados' 
                    ? 'border-emerald-600 text-emerald-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Historial de pagos <span className="ml-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{datosCuenta.historialPagos.length}</span>
              </button>
            </div>

            {/* TABLAS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* VISTA 1: CARGOS PENDIENTES */}
              {pestanaActiva === 'pendientes' && (
                <div className="animate-in fade-in duration-300">
                  {datosCuenta.cargosPendientes.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-medium">No tienes cargos pendientes para este ciclo. ¡Excelente!</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px]">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Concepto</th>
                            <th className="px-6 py-4 text-center">Mes</th>
                            <th className="px-6 py-4 text-center">Vencimiento</th>
                            <th className="px-6 py-4 text-right">Monto ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {datosCuenta.cargosPendientes.map((cargo) => (
                            <tr key={cargo.idCargo} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">{cargo.concepto}</td>
                              <td className="px-6 py-4 text-center font-medium text-slate-600">{cargo.mes}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-red-50 text-red-700 px-3 py-1 rounded-md text-xs font-bold border border-red-200">
                                  {cargo.fechaVencimiento}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-extrabold text-slate-900">${cargo.monto.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA 2: HISTORIAL DE PAGOS */}
              {pestanaActiva === 'pagados' && (
                <div className="animate-in fade-in duration-300">
                  {datosCuenta.historialPagos.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-medium">Aún no se registran pagos en este ciclo.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px]">
                        <thead className="bg-emerald-50 text-[10px] uppercase tracking-widest text-emerald-700 font-bold border-b border-emerald-100">
                          <tr>
                            <th className="px-6 py-4">N° Recibo</th>
                            <th className="px-6 py-4">Fecha pago</th>
                            <th className="px-6 py-4">Concepto cancelado</th>
                            <th className="px-6 py-4 text-center">Método</th>
                            <th className="px-6 py-4 text-right">Monto pagado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {datosCuenta.historialPagos.map((pago) => (
                            <tr key={pago.idPago} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-slate-500">{pago.numeroRecibo}</td>
                              <td className="px-6 py-4 text-slate-600 font-medium">{pago.fechaPago}</td>
                              <td className="px-6 py-4 font-bold text-slate-900">{pago.concepto}</td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                                  {pago.metodoPago}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-extrabold text-emerald-700">${pago.montoPagado.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EstadoCuentaEstudiante;