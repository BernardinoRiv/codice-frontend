import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

const EscanearAsistencia = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [tokenManual, setTokenManual] = useState('');
  const [enviando, setEnviando] = useState(false);
  
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode("reader");
    
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.clear();
      }
    };
  }, []);

  const startScanning = async () => {
    setIsScanning(true);
    setScanResult(null);
    
    try {
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        onScanFailure
      );
    } catch (err) {
      toast.error("No se pudo acceder a la cámara", { 
        description: "Verifica los permisos o usa el ingreso manual." 
      });
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      await html5QrCodeRef.current.stop();
      setIsScanning(false);
    }
  };

  const onScanSuccess = async (decodedText) => {
    await stopScanning();
    await registrarAsistencia(decodedText);
  };

  const onScanFailure = () => {};

  const registrarAsistencia = async (token) => {
    setEnviando(true);
    try {
      const authToken = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/asistencia/registrar?token=${token}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.exito) {
        setScanResult({ success: true, message: data.mensaje });
        toast.success("¡Asistencia registrada!", { description: data.mensaje });
        setTokenManual('');
      } else {
        setScanResult({ success: false, message: data.mensaje || "Error al registrar" });
        toast.error("Registro fallido", { description: data.mensaje });
        setTimeout(() => {
          setScanResult(null);
          if (!tokenManual) startScanning(); 
        }, 3000);
      }
    } catch (error) {
      setScanResult({ success: false, message: "Error de conexión con el servidor" });
      toast.error("Error de conexión", { description: error.message });
    } finally {
      setEnviando(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (tokenManual.length !== 4) {
      toast.error("El código debe tener exactamente 4 dígitos");
      return;
    }
    setScanResult(null);
    registrarAsistencia(tokenManual.trim());
  };

  return (
    <div className="w-full pb-20 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-2 text-slate-900">
            Registrar asistencia
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            Selecciona el método de registro para tu clase actual.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* TARJETA 1: CÁMARA QR */}
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-8 flex flex-col justify-center min-h-[340px] relative overflow-hidden">
            {!isScanning && !scanResult && (
              <div className="text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-900">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75M13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-1">Escáner QR</h3>
                <p className="text-sm text-slate-500 mb-8">Apunta al código mostrado por el docente.</p>
                <button
                  onClick={startScanning}
                  disabled={enviando}
                  className="w-full h-[54px] bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
                >
                  Abrir cámara
                </button>
              </div>
            )}

            <div className={`relative w-full ${isScanning ? 'block animate-in zoom-in-95 duration-300' : 'hidden'}`}>
              <div className="rounded-2xl overflow-hidden bg-black">
                <div id="reader" className="w-full min-h-[220px]"></div>
              </div>
              <button
                onClick={stopScanning}
                className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full transition-colors z-10"
                title="Cancelar escaneo"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {scanResult && !tokenManual && (
              <div className="text-center animate-in fade-in zoom-in-95 duration-300">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${scanResult.success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {scanResult.success ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <h3 className={`text-lg font-extrabold mb-2 ${scanResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                  {scanResult.success ? 'Asistencia exitosa' : 'Registro fallido'}
                </h3>
                <p className="text-sm font-medium text-slate-500 mb-6 px-2">{scanResult.message}</p>
                
                {!scanResult.success && (
                  <button onClick={() => { setScanResult(null); startScanning(); }} className="w-full h-[54px] bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-colors shadow-sm">
                    Reintentar escaneo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TARJETA 2: MANUAL */}
          <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm p-8 flex flex-col justify-center min-h-[340px]">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-900">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-1">Ingreso manual</h3>
              <p className="text-sm text-slate-500">Digita el código de 4 dígitos proporcionado.</p>
            </div>
            
            <form onSubmit={handleManualSubmit} className="space-y-5">
              <input
                type="text"
                value={tokenManual}
                onChange={(e) => setTokenManual(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0000"
                maxLength={4}
                className="w-full h-[60px] bg-slate-50 text-slate-900 rounded-2xl px-4 font-mono font-bold text-center text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all border border-transparent focus:border-slate-300 placeholder-slate-300"
                disabled={enviando || isScanning}
              />
              <button
                type="submit"
                disabled={enviando || tokenManual.length !== 4 || isScanning}
                className="w-full h-[54px] bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {enviando ? 'Verificando...' : 'Confirmar código'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EscanearAsistencia;