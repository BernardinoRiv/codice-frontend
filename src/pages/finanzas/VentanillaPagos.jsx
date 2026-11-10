import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

function VentanillaPagos() {
  const [carnetBuscar, setCarnetBuscar] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagoExitoso, setPagoExitoso] = useState(false);

  const [showModalArancel, setShowModalArancel] = useState(false);
  const [searchArancel, setSearchArancel] = useState(''); 
  const [catalogoAranceles, setCatalogoAranceles] = useState([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);

  const [estadoCuenta, setEstadoCuenta] = useState(null);
  const [selectedCargos, setSelectedCargos] = useState([]); 
  const [cargosObligatorios, setCargosObligatorios] = useState([]);
  const [arancelesAgregados, setArancelesAgregados] = useState([]); 
  
  const [metodoPago, setMetodoPago] = useState('1');
  const [referencia, setReferencia] = useState('');

  // ESTADOS PARA LA ZONA ROJA (Historial de hoy)
  const [pagosHoy, setPagosHoy] = useState([]);
  const [cargandoHoy, setCargandoHoy] = useState(false);

  // Cargar pagos de hoy al iniciar el componente
  useEffect(() => {
    cargarPagosDeHoy();
  }, []);

  const cargarPagosDeHoy = async () => {
    setCargandoHoy(true);
    try {
      const token = localStorage.getItem('token');
      // Obtenemos la fecha actual en formato YYYY-MM-DD
      const fechaHoy = new Date().toLocaleDateString('en-CA'); 
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/historial?fecha=${fechaHoy}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPagosHoy(data);
      }
    } catch (error) {
      console.error("Error al cargar pagos de hoy:", error);
    } finally {
      setCargandoHoy(false);
    }
  };

  // Función corregida para evitar el "Invalid time value"
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

  const reenviarComprobanteEmail = async (idPago) => {
    const toastId = toast.loading('Enviando correo...');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/${idPago}/reenviar-comprobante`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(data.mensaje || 'Correo enviado exitosamente', { id: toastId });
      } else {
        toast.error(data.error || 'Error al enviar correo', { id: toastId });
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor', { id: toastId });
    }
  };

  const abrirModalYObtenerAranceles = async () => {
    setShowModalArancel(true);
    if (catalogoAranceles.length > 0) return;

    setCargandoCatalogo(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/aranceles-extras`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCatalogoAranceles(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
    } catch (error) {
      toast.error('Error del catálogo', { description: error.message });
    } finally {
      setCargandoCatalogo(false);
    }
  };

  const arancelesFiltrados = catalogoAranceles.filter(a => 
    a.nombre.toLowerCase().includes(searchArancel.toLowerCase())
  );

  const buscarEstudiante = async (e) => {
    if (e) e.preventDefault();
    if (!carnetBuscar.trim()) return;

    setIsSearching(true);
    setEstadoCuenta(null);
    setSelectedCargos([]);
    setCargosObligatorios([]); 
    setArancelesAgregados([]); 
    setPagoExitoso(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${carnetBuscar}/estado-cuenta`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.cargosPendientes && data.cargosPendientes.length > 0) {
          data.cargosPendientes.sort((a, b) => {
            const isMatA = a.concepto.toLowerCase().includes('matrícul') || a.concepto.toLowerCase().includes('matricul');
            const isMatB = b.concepto.toLowerCase().includes('matrícul') || b.concepto.toLowerCase().includes('matricul');
            if (isMatA && !isMatB) return -1;
            if (!isMatA && isMatB) return 1;
            if (a.fechaVencimiento && b.fechaVencimiento) return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento);
            return 0;
          });
        }
        setEstadoCuenta(data);
        
        if (data.cargosPendientes.length > 0) {
          let obligatorios = [];
          const idxMatricula = data.cargosPendientes.findIndex(c => c.concepto.toLowerCase().includes('matrícul') || c.concepto.toLowerCase().includes('matricul'));
          
          if (idxMatricula !== -1) {
            obligatorios.push(data.cargosPendientes[idxMatricula].idCargo);
            const idxPrimeraCuota = data.cargosPendientes.findIndex(c => c.concepto.toLowerCase().includes('cuota'));
            if (idxPrimeraCuota !== -1) obligatorios.push(data.cargosPendientes[idxPrimeraCuota].idCargo);
            setSelectedCargos([...obligatorios]);
            toast.info('Inicio de ciclo', { description: 'Matrícula y 1.ª Cuota marcadas requeridas.' });
          } else {
            setSelectedCargos([data.cargosPendientes[0].idCargo]);
          }
          setCargosObligatorios(obligatorios);
        } else {
          toast.success('Solvente', { description: 'El estudiante no posee deudas pendientes.' });
        }
      } else {
        toast.error('No encontrado', { description: 'No existe el estudiante.' });
      }
    } catch (error) {
      toast.error('Error de conexión', { description: error.message });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleCargoSelection = (index, isChecked) => {
    const cargos = estadoCuenta.cargosPendientes;
    let nuevosSeleccionados = isChecked 
      ? cargos.slice(0, index + 1).map(c => c.idCargo)
      : cargos.slice(0, index).map(c => c.idCargo);
    
    cargosObligatorios.forEach(idObligatorio => {
      if (!nuevosSeleccionados.includes(idObligatorio)) nuevosSeleccionados.push(idObligatorio);
    });
    setSelectedCargos(nuevosSeleccionados);
  };

  const handleAgregarArancel = (arancel) => {
    if (arancelesAgregados.some(a => a.idConcepto === arancel.idConcepto)) {
      return toast.error('Arancel duplicado', { description: `El arancel ya está en la lista.` });
    }
    setArancelesAgregados(prev => [...prev, { ...arancel, idTemporal: Date.now() }]);
    toast.success('Arancel agregado', { description: `Se añadió: ${arancel.nombre}` });
    setShowModalArancel(false);
    setSearchArancel(''); 
  };

  const totalCargosFijos = estadoCuenta?.cargosPendientes?.filter(c => selectedCargos.includes(c.idCargo) || cargosObligatorios.includes(c.idCargo)).reduce((sum, current) => sum + current.montoTotal, 0) || 0;
  const totalArancelesExtras = arancelesAgregados.reduce((sum, current) => sum + current.monto, 0);
  const totalAPagar = totalCargosFijos + totalArancelesExtras;
  const totalItemsCobrar = selectedCargos.length + arancelesAgregados.length;

  const formatearNombreCuota = (cargo) => {
    const conceptoLower = cargo.concepto.toLowerCase();
    if (conceptoLower.includes('matrícula') || conceptoLower.includes('matricula') || cargo.numeroCuota === 0) return cargo.concepto;
    if (!conceptoLower.includes('cuota')) return cargo.concepto;
    if (cargo.fechaVencimiento) {
      const parts = cargo.fechaVencimiento.split('-');
      if (parts.length >= 2) {
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${cargo.concepto} - Mes de ${meses[parseInt(parts[1], 10) - 1]}`;
      }
    }
    return `${cargo.concepto} - Cuota ${cargo.numeroCuota}`;
  };

  const handleProcesarPago = async () => {
    if (totalItemsCobrar === 0) return toast.warning('Sin selección', { description: 'Seleccione o agregue al menos un arancel.' });
    if ((metodoPago === '2' || metodoPago === '3') && !referencia.trim()) return toast.warning('Falta referencia', { description: 'Ingrese el voucher.' });

    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        idEstudiante: estadoCuenta.estudiante.idEstudiante,
        idsCargosAPagar: selectedCargos, 
        arancelesAdicionales: arancelesAgregados.map(a => a.idConcepto), 
        montoRecibido: totalAPagar,
        idMetodoPago: parseInt(metodoPago),
        numeroReferencia: referencia || 'PAGO-EFECTIVO'
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/procesar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al procesar el cobro');

      toast.success('Cobro exitoso', { description: `Factura generada: ${data.factura}` });
      setPagoExitoso(true);
      
      // Recargar pagos del día para que aparezca abajo instantáneamente
      cargarPagosDeHoy();
      
      setTimeout(() => {
        setEstadoCuenta(null);
        setSelectedCargos([]);
        setCargosObligatorios([]);
        setArancelesAgregados([]);
        setCarnetBuscar('');
        setMetodoPago('1');
        setReferencia('');
        setPagoExitoso(false);
      }, 4000);

    } catch (error) {
      toast.error('Error en el cobro', { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const inputClassName = "w-full bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 py-3.5 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400 disabled:bg-gray-50/50 disabled:text-gray-500";
  const labelClassName = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      <div className="mb-10">
        <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Ventanilla de pagos</h1>
        <p className="text-gray-500 text-sm">Cobro de aranceles, colegiaturas y emisión de comprobantes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
        {/* COLUMNA IZQUIERDA: BUSCADOR Y CARGOS */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          <form onSubmit={buscarEstudiante} className="bg-gray-50/50 border border-gray-200/60 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-black"></div>
            <label className={labelClassName}>Identificador (Carnet o Documento)</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={carnetBuscar} 
                onChange={(e) => setCarnetBuscar(e.target.value.toUpperCase())}
                placeholder="Ej. VM260016 o 01234567-8" 
                className={inputClassName}
                disabled={isSearching || isProcessing}
                autoFocus
              />
              <button type="submit" disabled={isSearching || !carnetBuscar || isProcessing} className="bg-black text-white px-8 py-3.5 rounded-[14px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {estadoCuenta && (
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
              <div className="flex justify-between items-end mb-4 pb-3 border-b border-gray-100">
                <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <span>Cargos pendientes</span>
                  <span className="text-black bg-gray-100 px-2 py-1 rounded-md ml-3">{estadoCuenta.cargosPendientes.length} registros</span>
                </h3>
                <button type="button" onClick={abrirModalYObtenerAranceles} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg> Agregar Arancel
                </button>
              </div>

              {estadoCuenta.cargosPendientes.length > 0 && (
                <div className="space-y-3 mb-6">
                  {estadoCuenta.cargosPendientes.map((cargo, index) => {
                    const isObligatorio = cargosObligatorios.includes(cargo.idCargo);
                    const isSelected = selectedCargos.includes(cargo.idCargo) || isObligatorio;
                    
                    return (
                      <label key={cargo.idCargo} className={`flex items-center p-4 border rounded-xl transition-all duration-200 ${isSelected ? 'border-black bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'} ${isObligatorio ? 'cursor-not-allowed opacity-95' : 'cursor-pointer'}`}>
                        <div className="mr-4">
                          <input type="checkbox" checked={isSelected} onChange={(e) => { if (!isObligatorio) toggleCargoSelection(index, e.target.checked); }} disabled={isProcessing || isObligatorio} className={`w-5 h-5 text-black border-gray-300 rounded focus:ring-black ${isObligatorio ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}/>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-gray-900">{formatearNombreCuota(cargo)}</h4>
                                {isObligatorio && <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold uppercase">Requerido</span>}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">Vence: {cargo.fechaVencimiento || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-lg text-gray-900">{formatCurrency(cargo.montoTotal)}</span>
                              {cargo.aplicaMora && <span className="block text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded uppercase mt-1">Incluye mora</span>}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {arancelesAgregados.length > 0 && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <h3 className="text-[12px] font-bold text-[#2E7D32] uppercase tracking-widest mb-3 flex items-center">Aranceles a facturar</h3>
                  <div className="space-y-3">
                    {arancelesAgregados.map((arancel) => (
                      <div key={arancel.idTemporal} className="flex items-center p-4 border border-green-200 bg-green-50/30 rounded-xl transition-all">
                        <div className="flex-1 flex justify-between items-center">
                          <h4 className="font-bold text-gray-900 text-sm">{arancel.nombre}</h4>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-lg text-[#2E7D32]">{formatCurrency(arancel.monto)}</span>
                            <button type="button" onClick={() => setArancelesAgregados(prev => prev.filter(a => a.idTemporal !== arancel.idTemporal))} disabled={isProcessing} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: TOTAL Y BOTÓN DE PAGO */}
        <div className="lg:col-span-5 xl:col-span-4 relative">
          <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-8 transition-all duration-300">
            {estadoCuenta ? (
              <>
                <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-2xl font-bold mb-3 shadow-sm">{estadoCuenta.estudiante.nombreCompleto.charAt(0)}</div>
                  <h4 className="text-base font-bold text-center leading-tight text-gray-900">{estadoCuenta.estudiante.nombreCompleto}</h4>
                  <p className="text-sm text-gray-500 mt-1">{estadoCuenta.estudiante.carnet}</p>
                </div>

                <div className="mb-6">
                  <label className={labelClassName}>Método de pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setMetodoPago('1')} disabled={isProcessing} className={`py-2 text-xs font-bold rounded-lg border transition-colors ${metodoPago === '1' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Efectivo</button>
                    <button type="button" onClick={() => setMetodoPago('2')} disabled={isProcessing} className={`py-2 text-xs font-bold rounded-lg border transition-colors ${metodoPago === '2' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Tarjeta</button>
                    <button type="button" onClick={() => setMetodoPago('3')} disabled={isProcessing} className={`py-2 text-xs font-bold rounded-lg border transition-colors ${metodoPago === '3' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Transf.</button>
                  </div>
                  {(metodoPago === '2' || metodoPago === '3') && (
                    <div className="mt-3"><input type="text" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="N° de voucher o referencia" className={`${inputClassName} py-2.5 text-xs`} disabled={isProcessing}/></div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2"><span className="text-sm text-gray-500">Items a cobrar:</span><span className="font-bold text-gray-900">{totalItemsCobrar}</span></div>
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2"><span className="text-base font-bold text-gray-900">Total a cobrar:</span><span className="text-2xl font-black text-[#2E7D32]">{formatCurrency(totalAPagar)}</span></div>
                </div>

                <button onClick={handleProcesarPago} disabled={isProcessing || totalItemsCobrar === 0 || pagoExitoso} className="w-full relative overflow-hidden bg-black text-white py-4 rounded-[14px] font-semibold transition-all disabled:cursor-not-allowed group">
                  <div className={`flex items-center justify-center gap-2 transition-all duration-300 ${isProcessing || pagoExitoso ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    Procesar cobro
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                  {isProcessing && !pagoExitoso && <span className="absolute inset-0 flex items-center justify-center bg-black text-xs animate-pulse font-bold tracking-widest text-gray-300">PROCESANDO...</span>}
                  {pagoExitoso && <span className="absolute inset-0 flex items-center justify-center bg-[#2E7D32] text-white font-bold tracking-widest">¡Pago registrado!</span>}
                </button>
              </>
            ) : (
              <div className="text-center py-16 opacity-50 flex flex-col items-center">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Ingrese un documento<br/>para iniciar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ZONA ROJA: HISTORIAL DE PAGOS DEL DÍA ACTUAL (Sin Pestañas) */}
      {/* ========================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Cobros realizados hoy</h3>
            <p className="text-xs text-gray-500 mt-1">Historial automático de la jornada actual</p>
          </div>
          <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold font-mono">
            {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {cargandoHoy ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          </div>
        ) : pagosHoy.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-medium bg-gray-50 rounded-xl border border-gray-100 border-dashed">
            Aún no se han registrado cobros el día de hoy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-bold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Factura / Ref</th>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Reenviar PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagosHoy.map((pago) => (
                  <tr key={pago.idPago} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{pago.referencia}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{pago.nombreEstudiante}</p>
                      <p className="text-xs text-gray-500 font-mono">{pago.carnet}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatearFecha(pago.fechaPago)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-[#2E7D32]">
                      {formatCurrency(pago.montoTotal)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => reenviarComprobanteEmail(pago.idPago)}
                        title="Reenviar comprobante por correo"
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1 mx-auto shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Reenviar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModalArancel && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           {/* ... Modal del Catálogo (exactamente igual que antes) ... */}
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Agregar Arancel Extra</h3>
              </div>
              <button onClick={() => setShowModalArancel(false)} className="w-8 h-8 rounded-full bg-gray-200/50 text-gray-500 hover:bg-gray-200 hover:text-black transition-colors">✕</button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100 bg-white">
              <input type="text" placeholder="Buscar arancel..." value={searchArancel} onChange={(e) => setSearchArancel(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-black focus:border-black outline-none"/>
            </div>
            <div className="p-4 max-h-[50vh] overflow-y-auto bg-gray-50/30">
              {arancelesFiltrados.map((arancel) => (
                <button key={arancel.idConcepto} onClick={() => handleAgregarArancel(arancel)} className="w-full flex items-center justify-between p-4 mb-2 bg-white border border-gray-200 hover:border-black rounded-2xl transition-all">
                  <span className="font-semibold text-[13px] text-gray-700">{arancel.nombre}</span>
                  <span className="font-bold text-[#2E7D32]">{formatCurrency(arancel.monto)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VentanillaPagos;