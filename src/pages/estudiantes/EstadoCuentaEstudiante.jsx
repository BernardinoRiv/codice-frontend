import { normalizarCuenta, abrirPdfNuevaPestana } from '../../utils/vistasSeguras';
import { leerSesion } from '../../utils/sesion';
import usePagoSeguro from '../../hooks/usePagoSeguro';
import AvisoPagoPendiente from '../../components/AvisoPagoPendiente';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const EstadoCuentaEstudiante = () => {
  const { pendiente, enviar, verificar } = usePagoSeguro();
  const cargaRef = useRef(0);
  const pagoRef = useRef(false);
  const [errorCuenta, setErrorCuenta] = useState('');
  const [ciclos, setCiclos] = useState([]);
  const [cicloSeleccionado, setCicloSeleccionado] = useState('');

  const [datosCuenta, setDatosCuenta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [pestanaActiva, setPestanaActiva] = useState('pendientes');

  // Variables de sesión
  const [carnetEstudiante, setCarnetEstudiante] = useState(null);
  const [idEstudiante, setIdEstudiante] = useState(null);

  // Variables de pago
  const [selectedCargos, setSelectedCargos] = useState([]);
  const [showModalPago, setShowModalPago] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);
  const [tarjeta, setTarjeta] = useState({ numero: '', mes: '', anio: '', cvv: '', titular: '' });
  const aniosDisponibles = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() + i);
  const formatCardNumber = valor => valor.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const cerrarModalPago = () => {
    if (pagoRef.current) return;
    setShowModalPago(false);
    setTarjeta({ numero: '', mes: '', anio: '', cvv: '', titular: '' });
  };
  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all font-mono';

  useEffect(() => {
    const sesion = leerSesion();
    const carnet = sesion.payload?.carnet || localStorage.getItem('carnet');
    if (sesion.valida && carnet) {
      setCarnetEstudiante(String(carnet));
      setIdEstudiante(localStorage.getItem('idEstudiante'));
    } else { setErrorCuenta('No se pudo identificar tu carnet. Vuelve a iniciar sesión.'); setCargando(false); }
    return () => { cargaRef.current++; };
  }, []);

  // Cargar ciclos solo cuando ya tenemos el carnet del estudiante
  useEffect(() => {
    if (carnetEstudiante) {
      cargarCiclosDisponibles();
    }
  }, [carnetEstudiante]);

  useEffect(() => {
    if (cicloSeleccionado && carnetEstudiante) {
      cargarEstadoCuenta();
      setSelectedCargos([]);
    }
  }, [cicloSeleccionado, carnetEstudiante]);

  async function cargarCiclosDisponibles() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${encodeURIComponent(carnetEstudiante)}/ciclos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const ciclosEstudiante = await res.json();
        if (!Array.isArray(ciclosEstudiante)) throw new Error('La lista de ciclos no es válida.');
        setCiclos(ciclosEstudiante);

        if (ciclosEstudiante.length > 0) {
          setCicloSeleccionado(ciclosEstudiante[0].idCiclo);
        } else {
          setCargando(false);
        }
      } else { throw new Error(`No se pudieron cargar los ciclos (${res.status}).`); }
    } catch (error) {
      setErrorCuenta(error.message);
      toast.error('Error al cargar los ciclos');
      setCargando(false);
    }
  };

  async function cargarEstadoCuenta() {
    const carga = ++cargaRef.current;
    setErrorCuenta('');
    setDatosCuenta(null);
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${encodeURIComponent(carnetEstudiante)}/estado-cuenta/ciclos/${cicloSeleccionado}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`No se pudo consultar el estado de cuenta (${response.status}). Intenta nuevamente.`);

      const data = normalizarCuenta(await response.json());
      if (!data.resumen || ![data.resumen.deudaTotal, data.resumen.totalPagado, data.resumen.saldoPendiente].every(Number.isFinite)) throw new Error('El resumen financiero no está completo.');
      if (carga !== cargaRef.current) return;
      if (data.cargosPendientes && data.cargosPendientes.length > 0) {
        data.cargosPendientes.sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
      }
      setDatosCuenta(data);
    } catch (error) {
      if (carga !== cargaRef.current) return;
      setErrorCuenta(error.message);
      setDatosCuenta(null);
    } finally {
      if (carga === cargaRef.current) setCargando(false);
    }
  };

  // Función para abrir la factura en otra pestaña (similar a manejarImpresion en MisClases)
  const verFacturaEnOtraPestana = async (idPago) => {
    const toastId = toast.loading('Generando documento...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/${idPago}/comprobante`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await abrirPdfNuevaPestana(response, `comprobante-${idPago}.pdf`);
      toast.success('Documento generado', { id: toastId });
    } catch (e) {
      toast.error(e.message || 'Error al generar el documento', { id: toastId });
    }
  };

  const toggleCargoSelection = (index, isChecked) => {
    const cargos = datosCuenta.cargosPendientes;
    let nuevos;
    if (isChecked) {
      nuevos = cargos.slice(0, index + 1).map(c => c.idCargo);
    } else {
      nuevos = cargos.slice(0, index).map(c => c.idCargo);
    }
    setSelectedCargos(nuevos);
  };

  const totalAPagar = datosCuenta?.cargosPendientes
    ?.filter(c => selectedCargos.includes(c.idCargo))
    .reduce((sum, current) => sum + current.monto, 0) || 0;

  const handleProcesarPagoOnline = async e => {
    e.preventDefault();
    if (pagoRef.current || pendiente || pagoExitoso) return;
    if (!/^\d{16}$/.test(tarjeta.numero.replace(/\s/g, ''))) return toast.error('El número de tarjeta debe tener 16 dígitos.');
    if (!tarjeta.titular.trim() || tarjeta.titular.trim().length > 150) return toast.error('Ingresa el nombre del titular, con un máximo de 150 caracteres.');
    const mes = Number(tarjeta.mes);
    const anio = Number(tarjeta.anio);
    const ahora = new Date();
    if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !aniosDisponibles.includes(anio)) return toast.error('Selecciona una fecha de vencimiento válida.');
    if (anio === ahora.getFullYear() && mes < ahora.getMonth() + 1) return toast.error('La tarjeta está vencida.');
    if (!/^\d{3,4}$/.test(tarjeta.cvv)) return toast.error('El CVV debe tener 3 o 4 dígitos.');
    const idValido = Number(datosCuenta?.estudiante?.idEstudiante || idEstudiante);
    if (!Number.isInteger(idValido) || idValido <= 0 || !selectedCargos.length || !Number.isFinite(totalAPagar) || totalAPagar <= 0) return toast.error('Selecciona cargos válidos antes de continuar.');
    pagoRef.current = true; setIsProcessing(true);
    try {
      const data = await enviar(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/pagos/en-linea`, {
        idEstudiante: idValido, idsCargosAPagar: selectedCargos, arancelesAdicionales: [],
        montoRecibido: Number(totalAPagar.toFixed(2)), idMetodoPago: 2,
        numeroReferencia: `ONL-${crypto.randomUUID()}`
      });
      setPagoExitoso(true);
      toast.success('¡Pago completado!', { description: `Comprobante generado: ${data.factura || data.idPago}.` });
      setSelectedCargos([]); setShowModalPago(false);
      setTarjeta({ numero: '', mes: '', anio: '', cvv: '', titular: '' });
      await cargarEstadoCuenta();
    } catch (error) { toast.error('Revisa el resultado del pago', { description: error.message, duration: 12000 }); }
    finally { pagoRef.current = false; setIsProcessing(false); }
  };

  return (
    <div className="w-full pb-32 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <AvisoPagoPendiente pendiente={pendiente} verificar={verificar} />
      {/* MODAL DE PAGO EN LÍNEA */}
      {showModalPago && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-pago" className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 id="titulo-pago" className="text-lg font-bold text-slate-900">Pago en línea</h3>
                <p className="mt-1 text-xs text-slate-500">Simulación académica · Usa datos de prueba</p>
                <p className="text-xs text-slate-500 mt-1">Total a pagar: <strong className="text-emerald-600 text-sm">${totalAPagar.toFixed(2)}</strong></p>
              </div>
              <button onClick={cerrarModalPago} aria-label="Cerrar pago" disabled={isProcessing} className="p-2 bg-slate-200/50 rounded-full text-slate-500 hover:text-black">
                ✕
              </button>
            </div>

            <form onSubmit={handleProcesarPagoOnline} autoComplete="off" className="p-6">
              <fieldset disabled={isProcessing || !!pendiente} className="space-y-4">
              {pendiente && <p role="alert" className="text-sm text-amber-800">Hay un pago pendiente de verificación. Cierra esta ventana y revisa el aviso antes de continuar.</p>}
              <div className="w-full h-40 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-2xl p-5 text-white flex flex-col justify-between shadow-lg relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="flex justify-between items-start">
                  <svg className="w-10 h-8 opacity-80" viewBox="0 0 36 24" fill="none"><path d="M4 0C1.79086 0 0 1.79086 0 4V20C0 22.2091 1.79086 24 4 24H32C34.2091 24 36 22.2091 36 20V4C36 1.79086 34.2091 0 32 0H4Z" fill="white" /><path d="M4 4H32V8H4V4Z" fill="currentColor" /><path d="M4 12H12V16H4V12Z" fill="currentColor" /><path d="M16 12H24V16H16V12Z" fill="currentColor" /></svg>
                  <span className="font-mono tracking-widest text-xs opacity-70">Tarjeta crédito/débito</span>
                </div>
                <div>
                  <p className="font-mono text-xl tracking-[0.2em] mb-2">{tarjeta.numero || '•••• •••• •••• ••••'}</p>
                  <div className="flex justify-between items-end">
                    <p className="font-mono text-xs uppercase opacity-80 truncate w-32">{tarjeta.titular || 'Titular'}</p>
                    <p className="font-mono text-xs opacity-80">{tarjeta.mes || 'Mes'}/{tarjeta.anio?.toString().slice(-2) || 'Año'}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Titular de la tarjeta</label>
                <input type="text" required maxLength={150} value={tarjeta.titular} onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value.toUpperCase() })} placeholder="Nombre tal como aparece en la tarjeta" className={`${inputClass} font-sans`} />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Número de tarjeta</label>
                <input type="text" inputMode="numeric" required maxLength="19" value={tarjeta.numero} onChange={(e) => setTarjeta({ ...tarjeta, numero: formatCardNumber(e.target.value) })} placeholder="0000 0000 0000 0000" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Vencimiento</label>
                  <div className="flex gap-2">
                    <select required value={tarjeta.mes} onChange={(e) => setTarjeta({ ...tarjeta, mes: e.target.value })} className={`${inputClass} px-2 appearance-none`}>
                      <option value="" disabled>Mes</option>
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select required value={tarjeta.anio} onChange={(e) => setTarjeta({ ...tarjeta, anio: e.target.value })} className={`${inputClass} px-2 appearance-none`}>
                      <option value="" disabled>Año</option>
                      {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Cvv</label>
                  <input type="password" inputMode="numeric" required maxLength="4" value={tarjeta.cvv} onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value.replace(/\D/g, '') })} placeholder="•••" className={inputClass} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button type="submit" disabled={isProcessing || !!pendiente || pagoExitoso} className="w-full bg-black text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center disabled:opacity-70">
                  {pagoExitoso ? (
                    <><span className="text-emerald-400 mr-2">✓</span> ¡Transacción aprobada!</>
                  ) : isProcessing ? (
                    <span className="animate-pulse">Procesando pago...</span>
                  ) : (
                    `Pagar $${totalAPagar.toFixed(2)}`
                  )}
                </button>
              </div>
              </fieldset>
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
                disabled={isProcessing}
                onChange={(e) => { cargaRef.current++; setSelectedCargos([]); setPagoExitoso(false); setShowModalPago(false); setCicloSeleccionado(e.target.value); }}
                className="w-full h-[50px] bg-white text-slate-900 border border-slate-200 rounded-xl px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm appearance-none cursor-pointer"
              >
                {ciclos.map(c => (
                  <option key={c.idCiclo} value={c.idCiclo}>
                    {c.codigoCiclo}
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
            <p className="text-slate-500 font-medium">{errorCuenta || 'No hay movimientos disponibles para el ciclo seleccionado.'}</p>
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
                                <p className="text-xs text-slate-500 mt-0.5">{cargo.mes} Vence: {cargo.fechaVencimiento}</p>
                              </div>

                              <div className="text-right">
                                <span className="font-extrabold text-lg text-slate-900">${cargo.monto.toFixed(2)}</span>
                                {cargo.montoRecargo > 0 && Number.isFinite(cargo.montoBase) && (
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
                    // AÑADIR ESTE DIV CONTENEDOR
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[13px] min-w-[600px]"> {/* Añadido min-w-[600px] para asegurar un ancho mínimo */}
                        <thead className="bg-emerald-50 text-[10px] uppercase tracking-widest text-emerald-700 font-bold border-b border-emerald-100">
                          <tr>
                            <th className="px-6 py-4">N° recibo</th>
                            <th className="px-6 py-4">Fecha pago</th>
                            <th className="px-6 py-4">Concepto cancelado</th>
                            <th className="px-6 py-4 text-right">Monto pagado</th>
                            <th className="px-6 py-4 text-center">Factura</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {datosCuenta.historialPagos.map((pago) => (
                            <tr key={pago.idPago} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-slate-500 whitespace-nowrap">{pago.numeroRecibo}</td>
                              <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">{pago.fechaPago}</td>
                              <td className="px-6 py-4 font-bold text-slate-900 min-w-[200px]">{pago.concepto}</td>
                              <td className="px-6 py-4 text-right font-extrabold text-emerald-700 whitespace-nowrap">${pago.montoPagado.toFixed(2)}</td>
                              <td className="px-6 py-4 text-center whitespace-nowrap">
                                <button
                                  onClick={() => verFacturaEnOtraPestana(pago.idPago)}
                                  className="px-3 py-1.5 bg-white text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm"
                                >
                                  Ver factura
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div> // CERRAR EL DIV CONTENEDOR
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
                    <button onClick={() => { setPagoExitoso(false); setShowModalPago(true); }} className="bg-white text-black px-6 py-3 rounded-xl font-extrabold hover:bg-gray-100 transition-colors">
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
