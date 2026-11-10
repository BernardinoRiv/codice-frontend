import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

function Facturas() {
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  // Por defecto carga las facturas del día actual
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toLocaleDateString('en-CA'));
  const [textoFiltro, setTextoFiltro] = useState('');

  useEffect(() => {
    cargarFacturasPorFecha();
  }, [fechaFiltro]);

  const cargarFacturasPorFecha = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/historial?fecha=${fechaFiltro}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPagos(data);
      } else {
        toast.error('Error al cargar historial de facturas');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setCargando(false);
    }
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
    return p.referencia?.toLowerCase().includes(term) ||
           p.carnet?.toLowerCase().includes(term) ||
           p.nombreEstudiante?.toLowerCase().includes(term);
  });

  return (
    <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-10">
        <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Facturas emitidas</h1>
        <p className="text-gray-500 text-sm">Consulta, busca y descarga los comprobantes de pago procesados.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        
        {/* FILTROS */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-100 pb-5">
          <div className="w-full md:w-1/3">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              Fecha de Consulta
            </label>
            <input 
              type="date" 
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-black font-semibold text-gray-700"
            />
          </div>
          <div className="w-full md:w-1/2">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
              Buscador de documentos
            </label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Filtrar por carnet, nombre o N° factura..." 
                value={textoFiltro}
                onChange={(e) => setTextoFiltro(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-black font-semibold"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
        </div>

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
                  <th className="px-6 py-4 text-center">Descargar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagosFiltrados.map((pago) => (
                  <tr key={pago.idPago} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">{pago.referencia}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{pago.nombreEstudiante}</p>
                      <p className="text-xs text-gray-500 font-mono">{pago.carnet}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{formatearFecha(pago.fechaPago)}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-[#2E7D32]">
                      {formatCurrency(pago.montoTotal)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => descargarFacturaPDF(pago.idPago)}
                        className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 mx-auto shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Ver PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Facturas;