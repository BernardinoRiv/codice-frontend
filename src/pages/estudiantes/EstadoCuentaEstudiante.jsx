import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const EstadoCuentaEstudiante = () => {
  const [ciclos, setCiclos] = useState([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState('');
  
  const [datosCuenta, setDatosCuenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pestanaActiva, setPestanaActiva] = useState('pendientes');
  
  // Variables de sesión
  const [carnetEstudiante, setCarnetEstudiante] = useState(null);
  const [idEstudiante, setIdEstudiante] = useState(null);

  // Variables de Pago
  const [selectedCargos, setSelectedCargos] = useState([]);
  const [showModalPago, setShowModalPago] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);

  // Estado de la Tarjeta
  const [tarjeta, setTarjeta] = useState({
    numero: '', mes: '', anio: '', cvv: '', titular: ''
  });

  const aniosDisponibles = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + i);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedId = localStorage.getItem('idEstudiante');
    if (storedId) setIdEstudiante(storedId);

    if (token) {
      try {
        const payload = JSON.parse(window.atob(token.split('.')[1]));
        if (payload.carnet) setCarnetEstudiante(payload.carnet);
      } catch (error) {
        toast.error("Sesión inválida.");
      }
    }
    cargarCiclosDisponibles();
  }, []);

  useEffect(() => {
    if (cicloSeleccionado && carnetEstudiante) {
      cargarEstadoCuenta();
      setSelectedCargos([]);
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
        const ciclosValidos = data.filter(c => c.estadoCiclo === 'ACTIVO' || c.estadoCiclo === 'FINALIZADO');
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

      if (!response.ok) throw new Error('No se encontraron movimientos financieros para este ciclo.');
      
      const data = await response.json();
      if (data.cargosPendientes && data.cargosPendientes.length > 0) {
        data.cargosPendientes.sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
      }
      setDatosCuenta(data);
    } catch (error) {
      setDatosCuenta(null);
    } finally {
      setCargando(false);
    }
  };

  const toggleCargoSelection = (index, isChecked) => {
    const cargos = datosCuenta.cargosPendientes;
    let nuevos = [];
    if (isChecked) {
      nuevos = cargos.slice(0, index + 1).map(c => c.idCargo);
    } else {
      nuevos = cargos.slice(0, index).map(c => c.idCargo);
    }
    setSelectedCargos(nuevos);
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || ''
    let parts = []
    for (let i=0, len=match.length; i<len; i+=4) {
      parts.push(match.substring(i, i+4))
    }
    if (parts.length) { return parts.join(' ') } else { return value }
  };

  const totalAPagar = datosCuenta?.cargosPendientes
    ?.filter(c => selectedCargos.includes(c.idCargo))
    .reduce((sum, current) => sum + current.monto, 0) || 0;

const handleProcesarPagoOnline = async (e) => {
    e.preventDefault();
    if (tarjeta.numero.replace(/\s/g, '').length !== 16) return toast.error('El número de tarjeta debe tener 16 dígitos');
    if (!tarjeta.mes || !tarjeta.anio) return toast.error('Seleccione la fecha de vencimiento');
    if (tarjeta.cvv.length < 3) return toast.error('CVV inválido');
    if (!tarjeta.titular.trim()) return toast.error('Ingrese el nombre del titular');

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      // 1. FORZAMOS EL PARSEO ESTRICTO DEL ID PARA QUE SPRING BOOT NO LO RECHACE
      const idValido = Number(datosCuenta.estudiante.idEstudiante || idEstudiante);
      
      if (!idValido || isNaN(idValido)) {
          throw new Error("No se pudo identificar tu usuario. Por favor, cierra sesión y vuelve a entrar.");
      }

      // 2. CONSTRUIMOS EL PAYLOAD CON TIPOS DE DATOS SEGUROS
      const payload = {
        idEstudiante: idValido,
        idsCargosAPagar: selectedCargos, 
        arancelesAdicionales: [], 
        montoRecibido: Number(totalAPagar.toFixed(2)), // Forzamos a Number (si va como String, Spring da error 400)
        idMetodoPago: 2, 
        numeroReferencia: `ONL-${Date.now().toString().slice(-6)}`
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/pagos/en-linea`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      // 3. MOSTRAMOS EL ERROR EXACTO QUE MANDA EL BACKEND EN EL TOAST
      if (!response.ok) {
          throw new Error(data.error || data.mensaje || data.message || 'El servidor rechazó el pago (Error 400)');
      }

      setPagoExitoso(true);
      toast.success('¡Pago completado!', { description: `Factura generada: ${data.factura}. Revisa tu correo.` });
      
      setTimeout(() => {
        setPagoExitoso(false);
        setShowModalPago(false);
        setSelectedCargos([]);
        setTarjeta({ numero: '', mes: '', anio: '', cvv: '', titular: '' });
        cargarEstadoCuenta();
      }, 3000);

    } catch (error) {
      toast.error('Transacción rechazada', { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all font-mono";

  return (
    <div className="w-full pb-32 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* MODAL DE PAGO EN LÍNEA (TARJETA) */}
      {showModalPago && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pago en Línea Segura</h3>
                <p className="text-xs text-slate-500 mt-1">Total a pagar: <strong className="text-emerald-600 text-sm">${totalAPagar.toFixed(2)}</strong></p>
              </div>
              <button onClick={() => setShowModalPago(false)} disabled={isProcessing} className="p-2 bg-slate-200/50 rounded-full text-slate-500 hover:text-black">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleProcesarPagoOnline} className="p-6 space-y-4">
              <div className="w-full h-40 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="flex justify-between items-start">
                  <svg className="w-10 h-8 opacity-80" viewBox="0 0 36 24" fill="none"><path d="M4 0C1.79086 0 0 1.79086 0 4V20C0 22.2091 1.79086 24 4 24H32C34.2091 24 36 22.2091 36 20V4C36 1.79086 34.2091 0 32 0H4Z" fill="white"/><path d="M4 4H32V8H4V4Z" fill="currentColor"/><path d="M4 12H12V16H4V12Z" fill="currentColor"/><path d="M16 12H24V16H16V12Z" fill="currentColor"/></svg>
                  <span className="font-mono tracking-widest text-xs opacity-70">TARJETA CRÉDITO/DÉBITO</span>
                </div>
                <div>
                  <p className="font-mono text-xl tracking-[0.2em] mb-2">{tarjeta.numero || '•••• •••• •••• ••••'}</p>
                  <div className="flex justify-between items-end">
                    <p className="font-mono text-xs uppercase opacity-80 truncate w-32">{tarjeta.titular || 'TITULAR'}</p>
                    <p className="font-mono text-xs opacity-80">{tarjeta.mes || 'MM'}/{tarjeta.anio?.toString().slice(-2) || 'YY'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Titular de la tarjeta</label>
                <input type="text" required value={tarjeta.titular} onChange={(e) => setTarjeta({...tarjeta, titular: e.target.value.toUpperCase()})} placeholder="Nombre tal como aparece en la tarjeta" className={`${inputClass} font-sans`} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Número de tarjeta</label>
                <input type="text" required maxLength="19" value={tarjeta.numero} onChange={(e) => setTarjeta({...tarjeta, numero: formatCardNumber(e.target.value)})} placeholder="0000 0000 0000 0000" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Vencimiento</label>
                  <div className="flex gap-2">
                    <select required value={tarjeta.mes} onChange={(e) => setTarjeta({...tarjeta, mes: e.target.value})} className={`${inputClass} px-2 appearance-none`}>
                      <option value="" disabled>MM</option>
                      {Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select required value={tarjeta.anio} onChange={(e) => setTarjeta({...tarjeta, anio: e.target.value})} className={`${inputClass} px-2 appearance-none`}>
                      <option value="" disabled>AAAA</option>
                      {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">CVV</label>
                  <input type="password" required maxLength="4" value={tarjeta.cvv} onChange={(e) => setTarjeta({...tarjeta, cvv: e.target.value.replace(/\D/g, '')})} placeholder="•••" className={inputClass} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button type="submit" disabled={isProcessing || pagoExitoso} className="w-full bg-black text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center disabled:opacity-70">
                  {pagoExitoso ? (
                     <><span className="text-emerald-400 mr-2">✓</span> ¡Transacción Aprobada!</>
                  ) : isProcessing ? (
                    <span className="animate-pulse">Procesando pago...</span>
                  ) : (
                    `Pagar $${totalAPagar.toFixed(2)}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER DE LA VISTA GENERAL */}
      <div className="max-w-[1000px] mx-auto">
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
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900"></div>
          </div>
        ) : !datosCuenta ? (
          <div className="bg-slate-50 p-12 text-center rounded-2xl border border-slate-200 border-dashed">
            <p className="text-slate-500 font-medium">No se encontraron movimientos financieros para el ciclo seleccionado.</p>
          </div>
        ) : (
          <>
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

            <div className="flex gap-2 mb-6 border-b border-slate-200">
              <button onClick={() => setPestanaActiva('pendientes')} className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${pestanaActiva === 'pendientes' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>
                Cargos pendientes <span className="ml-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{datosCuenta.cargosPendientes.length}</span>
              </button>
              <button onClick={() => setPestanaActiva('pagados')} className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${pestanaActiva === 'pagados' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'}`}>
                Historial de pagos <span className="ml-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{datosCuenta.historialPagos.length}</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-24">
              {pestanaActiva === 'pendientes' && (
                <div className="animate-in fade-in duration-300">
                  {datosCuenta.cargosPendientes.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-medium">No tienes cargos pendientes para este ciclo. ¡Excelente!</div>
                  ) : (
                    <div className="overflow-x-auto p-2">
                      {datosCuenta.cargosPendientes.map((cargo, index) => {
                        const isSelected = selectedCargos.includes(cargo.idCargo);
                        
                        return (
                          // LLAVE ÚNICA CORREGIDA PARA REACT AQUÍ
                          <label key={`${cargo.idCargo}-${index}`} className={`flex items-center p-4 border rounded-xl mb-2 transition-all duration-200 cursor-pointer ${isSelected ? 'border-black bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                            <div className="mr-4">
                              <input 
                                type="checkbox" 
                                checked={isSelected}
                                onChange={(e) => toggleCargoSelection(index, e.target.checked)}
                                className="w-5 h-5 text-black border-slate-300 rounded focus:ring-black cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 flex justify-between items-center">
                              <div>
                                <h4 className="font-bold text-slate-900">{cargo.concepto}</h4>
                                <p className="text-xs text-slate-500 mt-0.5">{cargo.mes} - Vence: {cargo.fechaVencimiento}</p>
                              </div>
                              
                              {/* DESGLOSE DE MORA MOSTRADO AL USUARIO */}
                              <div className="text-right">
                                <span className="font-extrabold text-lg text-slate-900">${cargo.monto.toFixed(2)}</span>
                                {cargo.montoRecargo > 0 && (
                                  <span className="block text-[10px] text-red-500 font-bold uppercase mt-1 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                                    Base: ${cargo.montoBase.toFixed(2)} + Mora: ${cargo.montoRecargo.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {pestanaActiva === 'pagados' && (
                <div className="animate-in fade-in duration-300">
                  {datosCuenta.historialPagos.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-medium">Aún no se registran pagos en este ciclo.</div>
                  ) : (
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-emerald-50 text-[10px] uppercase tracking-widest text-emerald-700 font-bold border-b border-emerald-100">
                        <tr>
                          <th className="px-6 py-4">N° Recibo</th>
                          <th className="px-6 py-4">Fecha pago</th>
                          <th className="px-6 py-4">Concepto cancelado</th>
                          <th className="px-6 py-4 text-right">Monto pagado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {datosCuenta.historialPagos.map((pago) => (
                          <tr key={pago.idPago} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-500">{pago.numeroRecibo}</td>
                            <td className="px-6 py-4 text-slate-600 font-medium">{pago.fechaPago}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{pago.concepto}</td>
                            <td className="px-6 py-4 text-right font-extrabold text-emerald-700">${pago.montoPagado.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* BOTÓN FLOTANTE PARA PAGAR EN LÍNEA */}
            {selectedCargos.length > 0 && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-[600px] z-40 px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="bg-black text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-gray-800">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen de pago</p>
                    <p className="text-lg font-bold">{selectedCargos.length} {selectedCargos.length === 1 ? 'cargo' : 'cargos'} seleccionados</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right mr-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                      <p className="text-2xl font-extrabold text-emerald-400">${totalAPagar.toFixed(2)}</p>
                    </div>
                    <button onClick={() => setShowModalPago(true)} className="bg-white text-black px-6 py-3 rounded-xl font-extrabold hover:bg-gray-100 transition-colors">
                      Pagar en línea
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EstadoCuentaEstudiante;