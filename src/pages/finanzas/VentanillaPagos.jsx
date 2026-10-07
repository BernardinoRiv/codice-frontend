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
  const [arancelesAgregados, setArancelesAgregados] = useState([]); 
  
  const [metodoPago, setMetodoPago] = useState('1');
  const [referencia, setReferencia] = useState('');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
        const dataOrdenada = data.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setCatalogoAranceles(dataOrdenada);
      } else {
        throw new Error('No se pudo cargar el catálogo de aranceles');
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
    setArancelesAgregados([]); 
    setPagoExitoso(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${carnetBuscar}/estado-cuenta`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEstadoCuenta(data);
        if (data.cargosPendientes.length === 0) {
          toast.success('Solvente', { description: 'El estudiante no posee deudas pendientes.' });
        } else {
          toast.info('Deudas encontradas', { description: `El estudiante tiene ${data.cargosPendientes.length} cuotas pendientes.` });
        }
      } else if (response.status === 404) {
        toast.error('No encontrado', { description: 'No existe ningún estudiante con ese carnet.' });
      } else {
        throw new Error('Error al consultar el estado de cuenta.');
      }
    } catch (error) {
      toast.error('Error de conexión', { description: error.message });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleCargoSelection = (index, isChecked) => {
    const cargos = estadoCuenta.cargosPendientes;
    let nuevosSeleccionados = [];

    if (isChecked) {
      const idsAMarcar = cargos.slice(0, index + 1).map(c => c.idCargo);
      nuevosSeleccionados = idsAMarcar;
    } else {
      const idsAMarcar = cargos.slice(0, index).map(c => c.idCargo);
      nuevosSeleccionados = idsAMarcar;
    }
    setSelectedCargos(nuevosSeleccionados);
  };

  // ========================================================
  // SOLUCIÓN: Bloqueo de Aranceles Duplicados
  // ========================================================
  const handleAgregarArancel = (arancel) => {
    const yaExiste = arancelesAgregados.some(a => a.idConcepto === arancel.idConcepto);
    
    if (yaExiste) {
      toast.error('Arancel duplicado', { description: `El arancel "${arancel.nombre}" ya está en la lista de facturación.` });
      return;
    }

    const nuevoArancel = {
      ...arancel,
      idTemporal: Date.now()
    };
    
    setArancelesAgregados(prev => [...prev, nuevoArancel]);
    toast.success('Arancel agregado', { description: `Se añadió: ${arancel.nombre}` });
    setShowModalArancel(false);
    setSearchArancel(''); 
  };

  const eliminarArancelExtra = (idTemporal) => {
    setArancelesAgregados(prev => prev.filter(a => a.idTemporal !== idTemporal));
  };

  const totalCargosFijos = estadoCuenta?.cargosPendientes
    ?.filter(c => selectedCargos.includes(c.idCargo))
    .reduce((sum, current) => sum + current.montoTotal, 0) || 0;

  const totalArancelesExtras = arancelesAgregados.reduce((sum, current) => sum + current.monto, 0);
  const totalAPagar = totalCargosFijos + totalArancelesExtras;
  const totalItemsCobrar = selectedCargos.length + arancelesAgregados.length;

  const formatearNombreCuota = (cargo) => {
    const conceptoLower = cargo.concepto.toLowerCase();
    if (conceptoLower.includes('matrícula') || conceptoLower.includes('matricula') || cargo.numeroCuota === 0) {
      return cargo.concepto;
    }
    if (!conceptoLower.includes('cuota')) {
      return cargo.concepto;
    }
    if (cargo.fechaVencimiento) {
      const parts = cargo.fechaVencimiento.split('-');
      if (parts.length >= 2) {
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const mesNombre = meses[parseInt(parts[1], 10) - 1];
        return `${cargo.concepto} - cuota ${mesNombre}`;
      }
    }
    return `${cargo.concepto} - cuota ${cargo.numeroCuota}`;
  };

  const handleProcesarPago = async () => {
    if (totalItemsCobrar === 0) {
      toast.warning('Sin selección', { description: 'Seleccione o agregue al menos un arancel para cobrar.' });
      return;
    }
    if ((metodoPago === '2' || metodoPago === '3') && !referencia.trim()) {
      toast.warning('Falta referencia', { description: 'Ingrese el n° de voucher o transferencia.' });
      return;
    }

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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || data.mensaje || 'Error al procesar el cobro');

      toast.success('Cobro exitoso', { description: `Factura generada: ${data.factura}` });
      setPagoExitoso(true);
      
      setTimeout(() => {
        setEstadoCuenta(null);
        setSelectedCargos([]);
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
      
      {showModalArancel && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Agregar Arancel Extra</h3>
                <p className="text-xs text-gray-500 mt-1">Seleccione el servicio solicitado por el alumno</p>
              </div>
              <button 
                onClick={() => setShowModalArancel(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200/50 text-gray-500 hover:bg-gray-200 hover:text-black transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="px-6 py-3 border-b border-gray-100 bg-white">
              <input 
                type="text" 
                placeholder="Buscar arancel (Ej. Constancia, Tesis...)" 
                value={searchArancel}
                onChange={(e) => setSearchArancel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-black focus:border-black outline-none"
              />
            </div>
            
            <div className="p-4 max-h-[50vh] overflow-y-auto bg-gray-50/30">
              {cargandoCatalogo ? (
                <div className="flex flex-col items-center justify-center py-10">
                   <svg className="animate-spin h-8 w-8 text-black mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   <p className="text-sm font-bold text-gray-500">Cargando aranceles...</p>
                </div>
              ) : arancelesFiltrados.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">No se encontraron aranceles.</p>
              ) : (
                arancelesFiltrados.map((arancel) => (
                  <button
                    key={arancel.idConcepto}
                    onClick={() => handleAgregarArancel(arancel)}
                    className="w-full flex items-center justify-between p-4 mb-2 bg-white border border-gray-200 hover:border-black rounded-2xl transition-all hover:shadow-md text-left group"
                  >
                    <span className="font-semibold text-[13px] text-gray-700 group-hover:text-black pr-4 leading-tight">{arancel.nombre}</span>
                    <span className="font-bold text-[#2E7D32] bg-green-50 px-3 py-1.5 rounded-lg text-sm shrink-0">{formatCurrency(arancel.monto)}</span>
                  </button>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-white">
              <button 
                onClick={() => setShowModalArancel(false)} 
                className="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10">
        <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Ventanilla de pagos</h1>
        <p className="text-gray-500 text-sm">Cobro de aranceles, colegiaturas y emisión de comprobantes.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          
          <form onSubmit={buscarEstudiante} className="bg-gray-50/50 border border-gray-200/60 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-black"></div>
            <label className={labelClassName}>Carnet del estudiante</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={carnetBuscar} 
                onChange={(e) => setCarnetBuscar(e.target.value.toUpperCase())}
                placeholder="Ej. SA26000008" 
                className={inputClassName}
                disabled={isSearching || isProcessing}
                autoFocus
              />
              <button 
                type="submit" 
                disabled={isSearching || !carnetBuscar || isProcessing}
                className="bg-black text-white px-8 py-3.5 rounded-[14px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </form>

          {estadoCuenta && (
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
              <div className="flex justify-between items-end mb-4 pb-3 border-b border-gray-100">
                <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                  <span>Cargos pendientes</span>
                  <span className="text-black bg-gray-100 px-2 py-1 rounded-md ml-3">
                    {estadoCuenta.cargosPendientes.length} registros
                  </span>
                </h3>
                
                <button
                  type="button"
                  onClick={abrirModalYObtenerAranceles}
                  className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Agregar Arancel
                </button>
              </div>

              {estadoCuenta.cargosPendientes.length > 0 && (
                <div className="space-y-3 mb-6">
                  {estadoCuenta.cargosPendientes.map((cargo, index) => {
                    const isSelected = selectedCargos.includes(cargo.idCargo);
                    return (
                      <label 
                        key={cargo.idCargo} 
                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                          isSelected ? 'border-black bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="mr-4">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => toggleCargoSelection(index, e.target.checked)}
                            disabled={isProcessing}
                            className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-900">{formatearNombreCuota(cargo)}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">Vence: {cargo.fechaVencimiento || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-lg text-gray-900">{formatCurrency(cargo.montoTotal)}</span>
                              {cargo.aplicaMora && (
                                <span className="block text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded uppercase mt-1">
                                  Incluye mora
                                </span>
                              )}
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
                  <h3 className="text-[12px] font-bold text-[#2E7D32] uppercase tracking-widest mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Aranceles a facturar
                  </h3>
                  <div className="space-y-3">
                    {arancelesAgregados.map((arancel) => (
                      <div key={arancel.idTemporal} className="flex items-center p-4 border border-green-200 bg-green-50/30 rounded-xl transition-all">
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-900 text-sm">{arancel.nombre}</h4>
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-lg text-[#2E7D32]">{formatCurrency(arancel.monto)}</span>
                              
                              <button 
                                type="button"
                                onClick={() => eliminarArancelExtra(arancel.idTemporal)}
                                disabled={isProcessing}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                                title="Quitar arancel"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {estadoCuenta.cargosPendientes.length === 0 && arancelesAgregados.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900">Solvente</h4>
                  <p className="text-gray-500 text-sm">El estudiante no tiene pagos pendientes.</p>
                </div>
              )}

            </div>
          )}
        </div>

        <div className="lg:col-span-5 xl:col-span-4 relative">
          <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-8 transition-all duration-300">
            
            {estadoCuenta ? (
              <>
                <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-2xl font-bold mb-3 shadow-sm">
                    {estadoCuenta.estudiante.nombreCompleto.charAt(0)}
                  </div>
                  <h4 className="text-base font-bold text-center leading-tight text-gray-900">
                    {estadoCuenta.estudiante.nombreCompleto}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">{estadoCuenta.estudiante.carnet}</p>
                  
                  {estadoCuenta.estudiante.esBecado && (
                    <span className="mt-2 text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                      Estudiante becado
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <label className={labelClassName}>Método de pago</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setMetodoPago('1')} disabled={isProcessing} className={`py-2 text-xs font-bold rounded-lg border transition-colors ${metodoPago === '1' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Efectivo</button>
                    <button type="button" onClick={() => setMetodoPago('2')} disabled={isProcessing} className={`py-2 text-xs font-bold rounded-lg border transition-colors ${metodoPago === '2' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Tarjeta</button>
                    <button type="button" onClick={() => setMetodoPago('3')} disabled={isProcessing} className={`py-2 text-xs font-bold rounded-lg border transition-colors ${metodoPago === '3' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>Transf.</button>
                  </div>
                  
                  {(metodoPago === '2' || metodoPago === '3') && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1">
                      <input 
                        type="text" 
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        placeholder="N° de voucher o referencia" 
                        className={`${inputClassName} py-2.5 text-xs`}
                        disabled={isProcessing}
                      />
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Items a cobrar:</span>
                    <span className="font-bold text-gray-900">{totalItemsCobrar}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200 pt-2 mt-2">
                    <span className="text-base font-bold text-gray-900">Total a cobrar:</span>
                    <span className="text-2xl font-black text-[#2E7D32]">{formatCurrency(totalAPagar)}</span>
                  </div>
                </div>

                <button 
                  onClick={handleProcesarPago}
                  disabled={isProcessing || totalItemsCobrar === 0 || pagoExitoso}
                  className="w-full relative overflow-hidden bg-black text-white py-4 rounded-[14px] font-semibold transition-all disabled:cursor-not-allowed group"
                >
                  <div className={`flex items-center justify-center gap-2 transition-all duration-300 ${isProcessing || pagoExitoso ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    Procesar cobro
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>

                  {isProcessing && !pagoExitoso && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                      <div className="relative w-8 h-8 overflow-hidden flex flex-col items-center justify-start mt-[-10px]">
                        <div className="w-6 h-1 bg-gray-600 rounded-full z-10"></div>
                        <div className="w-4 h-6 bg-white animate-[slideDown_1.5s_ease-in-out_infinite] shadow-sm flex flex-col gap-0.5 p-0.5">
                          <div className="w-full h-[2px] bg-gray-300"></div>
                          <div className="w-full h-[2px] bg-gray-300"></div>
                          <div className="w-2/3 h-[2px] bg-gray-300"></div>
                        </div>
                      </div>
                      <span className="text-xs mt-1 animate-pulse font-bold tracking-widest text-gray-300">PROCESANDO...</span>
                    </div>
                  )}

                  {pagoExitoso && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#2E7D32] text-white">
                      <svg className="w-6 h-6 mr-2 animate-[bounce_0.5s_ease-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      <span className="font-bold tracking-widest">¡Pago registrado!</span>
                    </div>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-16 opacity-50 flex flex-col items-center">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Ingrese un carnet<br/>para iniciar</p>
              </div>
            )}
            
          </div>
        </div>

      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideDown {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { transform: translateY(10%); opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}} />
    </div>
  );
}

export default VentanillaPagos;