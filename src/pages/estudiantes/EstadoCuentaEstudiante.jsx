import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const EstadoCuentaEstudiante = () => {
  const [ciclos, setCiclos] = useState([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState('');
  
  const [datosCuenta, setDatosCuenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pestañaActiva, setPestañaActiva] = useState('pendientes');
  const [carnetEstudiante, setCarnetEstudiante] = useState(null);

  // 1. Extraer el carnet decodificando el JWT al montar el componente
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Decodificamos el payload (la parte central del JWT)
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
        
        // 👇 FILTRO ESTRICTO: Solo mostrar ciclos ACTIVOS o FINALIZADOS
        const ciclosValidos = data.filter(c => 
          c.estadoCiclo === 'ACTIVO' || c.estadoCiclo === 'FINALIZADO'
        );
        
        setCiclos(ciclosValidos);
        
        if (ciclosValidos.length > 0) {
          const cicloActivo = ciclosValidos.find(c => c.estadoCiclo === 'ACTIVO');
          setCicloSeleccionado(cicloActivo ? cicloActivo.idCiclo : ciclosValidos[0].idCiclo);
        } else {
          setCargando(false); // Quitar loader si no hay ciclos válidos
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
        throw new Error('No se encontraron registros financieros para este ciclo.');
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
    <div className="w-full pb-20 font-sans text-gray-900 bg-[#f8fafc] min-h-screen animate-in fade-in duration-300 pt-8">
      <div className="max-w-[1000px] mx-auto px-4">
        
        {/* ENCABEZADO Y SELECTOR DE CICLO */}
        <div className="bg-[#0f3b6c] rounded-[20px] p-8 shadow-lg text-white mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-[#93c5fd] text-xs font-bold tracking-widest uppercase mb-1">Estado de Cuenta Estudiantil</p>
              <h1 className="text-2xl font-black mb-1">
                {datosCuenta ? datosCuenta.estudiante.nombreCompleto : 'Cargando perfil...'}
              </h1>
              <p className="text-sm font-medium text-blue-100 flex items-center gap-2">
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{carnetEstudiante || '...'}</span>
                {datosCuenta ? datosCuenta.estudiante.carrera : '...'}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-0.5">Ciclo a Consultar</p>
                <select 
                  value={cicloSeleccionado}
                  onChange={(e) => setCicloSeleccionado(e.target.value)}
                  className="bg-transparent text-white font-bold text-lg focus:outline-none cursor-pointer appearance-none text-right"
                >
                  {ciclos.map(c => (
                    <option key={c.idCiclo} value={c.idCiclo} className="text-gray-900">
                      {c.codigoCiclo} ({c.estadoCiclo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0f3b6c]"></div>
          </div>
        ) : !datosCuenta ? (
          <div className="bg-white p-12 text-center rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 font-medium">No se encontraron movimientos financieros para el ciclo seleccionado.</p>
          </div>
        ) : (
          <>
            {/* TARJETAS KPI FINANCIEROS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Facturado</p>
                <p className="text-2xl font-black text-gray-900">${datosCuenta.resumen.deudaTotal.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Pagado</p>
                <p className="text-2xl font-black text-[#16a34a]">${datosCuenta.resumen.totalPagado.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-[#fecaca] shadow-[0_4px_15px_rgb(239,68,68,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ef4444]"></div>
                <p className="text-[11px] font-bold text-[#ef4444] uppercase tracking-widest mb-1">Saldo Pendiente</p>
                <p className="text-3xl font-black text-[#b91c1c]">${datosCuenta.resumen.saldoPendiente.toFixed(2)}</p>
              </div>
            </div>

            {/* TABLAS CON PESTAÑAS */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100">
                <button 
                  onClick={() => setPestañaActiva('pendientes')}
                  className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors relative ${pestañaActiva === 'pendientes' ? 'text-[#0f3b6c]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Cargos Pendientes ({datosCuenta.cargosPendientes.length})
                  {pestañaActiva === 'pendientes' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#0f3b6c] rounded-t-full"></div>}
                </button>
                <button 
                  onClick={() => setPestañaActiva('pagados')}
                  className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors relative ${pestañaActiva === 'pagados' ? 'text-[#16a34a]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Historial de Pagos ({datosCuenta.historialPagos.length})
                  {pestañaActiva === 'pagados' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#16a34a] rounded-t-full"></div>}
                </button>
              </div>

              {/* VISTA 1: CARGOS PENDIENTES */}
              {pestañaActiva === 'pendientes' && (
                <div className="p-0 animate-in fade-in duration-300">
                  {datosCuenta.cargosPendientes.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 font-medium">No tienes cargos pendientes para este ciclo. ¡Excelente!</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                        <tr>
                          <th className="px-6 py-4">Concepto</th>
                          <th className="px-6 py-4 text-center">Mes</th>
                          <th className="px-6 py-4 text-center">Vencimiento</th>
                          <th className="px-6 py-4 text-right">Monto ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {datosCuenta.cargosPendientes.map((cargo) => (
                          <tr key={cargo.idCargo} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-gray-800">{cargo.concepto}</td>
                            <td className="px-6 py-4 text-center text-gray-600">{cargo.mes}</td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                                {cargo.fechaVencimiento}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-gray-900">${cargo.monto.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* VISTA 2: HISTORIAL DE PAGOS */}
              {pestañaActiva === 'pagados' && (
                <div className="p-0 animate-in fade-in duration-300">
                  {datosCuenta.historialPagos.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 font-medium">Aún no se registran pagos en este ciclo.</div>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#f0fdf4] text-[10px] uppercase tracking-wider text-[#16a34a] font-bold border-b border-[#dcfce7]">
                        <tr>
                          <th className="px-6 py-4">N° Recibo</th>
                          <th className="px-6 py-4">Fecha Pago</th>
                          <th className="px-6 py-4">Concepto Cancelado</th>
                          <th className="px-6 py-4 text-center">Método</th>
                          <th className="px-6 py-4 text-right">Valor Pagado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {datosCuenta.historialPagos.map((pago) => (
                          <tr key={pago.idPago} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-gray-500">{pago.numeroRecibo}</td>
                            <td className="px-6 py-4 text-gray-600 font-medium">{pago.fechaPago}</td>
                            <td className="px-6 py-4 font-bold text-gray-800">{pago.concepto}</td>
                            <td className="px-6 py-4 text-center text-gray-500 text-xs">{pago.metodoPago}</td>
                            <td className="px-6 py-4 text-right font-black text-[#15803d]">${pago.montoPagado.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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