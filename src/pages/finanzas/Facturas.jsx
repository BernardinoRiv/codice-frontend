import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function sumarDias(fechaISO, cantidad) {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + cantidad);
  return fecha.toISOString().slice(0, 10);
}

function Facturas() {
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [reenviandoId, setReenviandoId] = useState(null);
  const hoy = fechaLocalISO();
  const [fechaDesde, setFechaDesde] = useState(hoy);
  const [fechaHasta, setFechaHasta] = useState(hoy);
  const [textoFiltro, setTextoFiltro] = useState('');
  const [rangoRapido, setRangoRapido] = useState('hoy');
  const [errorRango, setErrorRango] = useState('');
  const solicitudActual = useRef(0);

  useEffect(() => {
    cargarFacturasRango(hoy, hoy);
  }, []);

  const cargarFacturasRango = async (desde = fechaDesde, hasta = fechaHasta) => {
    setErrorRango('');
    if (!desde || !hasta) {
      setErrorRango('Selecciona las dos fechas del rango.');
      return;
    }
    if (desde > hasta) {
      setErrorRango('La fecha inicial debe ser anterior o igual a la fecha final.');
      return;
    }

    const dias = [];
    const actual = new Date(`${desde}T00:00:00Z`);
    const fin = new Date(`${hasta}T00:00:00Z`);
    while (actual <= fin) {
      dias.push(actual.toISOString().slice(0, 10));
      actual.setUTCDate(actual.getUTCDate() + 1);
    }
    if (dias.length > 31) {
      setErrorRango('El rango máximo es de 31 días. Ajusta las fechas o elige una opción rápida.');
      return;
    }

    const idSolicitud = ++solicitudActual.current;
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const resultados = [];
      for (const fecha of dias) {
        const query = new URLSearchParams({ fecha });
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/historial?${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('No se pudo cargar el historial de facturas.');
        const data = await response.json();
        if (Array.isArray(data)) resultados.push(...data);
        else throw new Error('La respuesta del historial no tiene el formato esperado.');
        if (idSolicitud !== solicitudActual.current) return;
      }
      setPagos(resultados);
    } catch (error) {
      if (idSolicitud === solicitudActual.current) {
        toast.error(error.message || 'Error de conexión');
      }
    } finally {
      if (idSolicitud === solicitudActual.current) setCargando(false);
    }
  };

  const consultarRangoRapido = (cantidadDias) => {
    const hasta = fechaLocalISO();
    const desde = sumarDias(hasta, -(cantidadDias - 1));
    setRangoRapido(cantidadDias === 1 ? 'hoy' : String(cantidadDias));
    setFechaDesde(desde);
    setFechaHasta(hasta);
    setTextoFiltro('');
    cargarFacturasRango(desde, hasta);
  };

  const limpiarFiltros = () => {
    const hoyActual = fechaLocalISO();
    setRangoRapido('hoy');
    setFechaDesde(hoyActual);
    setFechaHasta(hoyActual);
    setTextoFiltro('');
    cargarFacturasRango(hoyActual, hoyActual);
  };

  const descargarFacturaPDF = async (idPago) => {
    const toastId = toast.loading('Generando PDF...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/${idPago}/comprobante`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const fileUrl = URL.createObjectURL(blob);
        window.open(fileUrl, '_blank');
        toast.success('Documento abierto', { id: toastId });
      } else {
        toast.error('Error al generar el documento', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de conexión', { id: toastId });
    }
  };

  const reenviarFacturaCorreo = async (idPago) => {
    setReenviandoId(idPago);
    const toastId = toast.loading('Enviando comprobante por correo...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/${idPago}/reenviar-comprobante`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        toast.success(data.mensaje || 'Comprobante enviado correctamente', { id: toastId });
      } else {
        throw new Error(data.mensaje || data.error || data.message || 'No se pudo enviar el correo');
      }
    } catch (error) {
      toast.error('Error al enviar correo', { id: toastId, description: error.message });
    } finally {
      setReenviandoId(null);
    }
  };

  // Función robusta de fecha (Evita el "Invalid time value")
  const formatearFecha = (fechaValor) => {
    if (!fechaValor) return 'Sin fecha';
    try {
      let date;
      if (Array.isArray(fechaValor)) {
        const [anio, mes, dia, hora = 0, minuto = 0] = fechaValor;
        date = new Date(anio, mes - 1, dia, hora, minuto);
      } else {
        date = new Date(fechaValor);
      }
      
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return new Intl.DateTimeFormat('es-ES', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      }).format(date);
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const pagosFiltrados = pagos.filter(p => {
    const term = textoFiltro.toLowerCase();
    return p.numeroFactura?.toLowerCase().includes(term) ||
           p.referencia?.toLowerCase().includes(term) ||
           p.carnet?.toLowerCase().includes(term) ||
           p.nombreEstudiante?.toLowerCase().includes(term);
  });

  return (
    <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-10">
        <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Facturas emitidas</h1>
        <p className="text-gray-500 text-sm">Consulta, busca, reenvía y descarga los comprobantes de pago procesados.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        
        <form onSubmit={(event) => { event.preventDefault(); setRangoRapido('personalizado'); cargarFacturasRango(); }}
          className="mb-6 grid gap-4 border-b border-gray-100 pb-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <fieldset className="md:col-span-3">
            <legend className="mb-2 ml-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Rangos rápidos</legend>
            <div className="flex flex-wrap gap-2">
              {[['hoy', 'Hoy', 1], ['10', 'Últimos 10 días', 10], ['20', 'Últimos 20 días', 20], ['30', 'Últimos 30 días', 30]].map(([id, etiqueta, dias]) => (
                <button key={id} type="button" disabled={cargando} aria-pressed={rangoRapido === id}
                  onClick={() => consultarRangoRapido(dias)}
                  className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${rangoRapido === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {etiqueta}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="facturas-desde" className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Desde</label>
            <input id="facturas-desde" type="date" value={fechaDesde}
              min={sumarDias(fechaHasta, -30)} max={fechaHasta > hoy ? hoy : fechaHasta}
              onChange={event => {
                const desde = event.target.value;
                setFechaDesde(desde);
                setRangoRapido('personalizado');
                if (fechaHasta < desde) setFechaHasta(desde);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
          <div>
            <label htmlFor="facturas-hasta" className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Hasta</label>
            <input id="facturas-hasta" type="date" value={fechaHasta}
              min={fechaDesde} max={sumarDias(fechaDesde, 30) > hoy ? hoy : sumarDias(fechaDesde, 30)}
              onChange={event => {
                setFechaHasta(event.target.value);
                setRangoRapido('personalizado');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={cargando}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              {cargando ? 'Consultando…' : 'Consultar rango'}
            </button>
            <button type="button" onClick={limpiarFiltros} disabled={cargando}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              Limpiar filtros
            </button>
          </div>
          <div className="md:col-span-3">
            <label htmlFor="buscar-factura" className="mb-1.5 ml-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Buscar factura</label>
            <div className="relative">
              <input id="buscar-factura" type="search"
                placeholder="Carnet, nombre, número de factura o referencia…"
                value={textoFiltro} onChange={event => setTextoFiltro(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
              <svg className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          <p className="text-xs text-slate-400 md:col-span-3">Elige una opción rápida o un rango personalizado de hasta 31 días.</p>
          {errorRango && <p role="alert" className="text-sm font-medium text-rose-700 md:col-span-3">{errorRango}</p>}
        </form>

        {/* TABLA DE RESULTADOS */}
        {cargando ? (
          <div className="flex justify-center items-center py-16">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-500 font-medium">
            No se encontraron facturas emitidas para los criterios de búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Factura / Ref</th>
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4">Fecha y Hora</th>
                  <th className="px-6 py-4 text-right">Total Pagado</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagosFiltrados.map((pago) => {
                  const facturaMostrar = pago.numeroFactura || pago.referencia;
                  const mostrarRefSecundaria = pago.numeroFactura && pago.referencia && pago.numeroFactura !== pago.referencia;

                  return (
                    <tr key={pago.idPago} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-mono font-bold text-gray-900">{facturaMostrar}</p>
                        {mostrarRefSecundaria && (
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">Ref: {pago.referencia}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{pago.nombreEstudiante}</p>
                        <p className="text-xs text-gray-500 font-mono">{pago.carnet}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{formatearFecha(pago.fechaPago)}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-[#2E7D32]">
                        {formatCurrency(pago.montoTotal)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center gap-2">
                          <button 
                            onClick={() => descargarFacturaPDF(pago.idPago)}
                            className="px-3.5 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Ver PDF
                          </button>
                          <button
                            onClick={() => reenviarFacturaCorreo(pago.idPago)}
                            disabled={reenviandoId === pago.idPago}
                            className="px-3.5 py-2 bg-white text-gray-700 border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {reenviandoId === pago.idPago ? 'Enviando...' : 'Reenviar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Facturas;