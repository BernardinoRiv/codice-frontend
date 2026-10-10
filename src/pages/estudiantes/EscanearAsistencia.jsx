import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

const EscanearAsistencia = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [tokenManual, setTokenManual] = useState('');
  const [enviando, setEnviando] = useState(false);
  
  const html5QrCodeRef = useRef(null);
  const scannerContainerRef = useRef(null);

  useEffect(() => {
    // Inicializar el escáner cuando el componente se monta
    if (scannerContainerRef.current) {
      html5QrCodeRef.current = new Html5Qrcode("reader");
    }
    
    return () => {
      // Limpiar el escáner al desmontar
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        html5QrCodeRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    setIsScanning(true);
    setScanResult(null);
    
    // Esperar un pequeño momento para que el DOM se actualice
    setTimeout(async () => {
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
        console.error("Error al iniciar la cámara:", err);
        toast.error("No se pudo acceder a la cámara", { 
          description: "Asegúrate de dar permisos de cámara o usa la opción manual." 
        });
        setIsScanning(false);
      }
    }, 100);
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

  const onScanFailure = (error) => {
    // No hacer nada, esto se dispara constantemente mientras busca
  };

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
      } else {
        setScanResult({ success: false, message: data.mensaje || "Error al registrar" });
        toast.error("Error", { description: data.mensaje });
        setTimeout(() => {
          setScanResult(null);
          startScanning();
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
    if (!tokenManual.trim()) {
      toast.error("Ingresa un código válido");
      return;
    }
    registrarAsistencia(tokenManual.trim().toUpperCase());
  };

  return (
    <div className="w-full pb-20 font-sans text-gray-900">
      <div className="max-w-md mx-auto">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-2">Registrar Asistencia</h1>
          <p className="text-gray-500 text-sm">Escanea el código QR que muestra tu docente o ingresa el código manualmente.</p>
        </div>

        {/* Área del Escáner - SIEMPRE visible pero oculta cuando no se usa */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-6">
          {!isScanning && !scanResult && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75M13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              </div>
              <button
                onClick={startScanning}
                className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
                Abrir Cámara
              </button>
            </div>
          )}

          {isScanning && (
            <div className="relative">
              {/* El div con id="reader" SIEMPRE debe existir cuando isScanning es true */}
              <div id="reader" ref={scannerContainerRef} className="w-full"></div>
              <button
                onClick={stopScanning}
                className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-colors z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-full">
                  Apunta al código QR del docente
                </span>
              </div>
            </div>
          )}

          {scanResult && (
            <div className={`p-8 text-center ${scanResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${scanResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {scanResult.success ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className={`text-lg font-bold mb-2 ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {scanResult.success ? '¡Registrado!' : 'No se pudo registrar'}
              </h3>
              <p className="text-sm text-gray-600 mb-6">{scanResult.message}</p>
              
              {!scanResult.success && (
                <button
                  onClick={() => {
                    setScanResult(null);
                    startScanning();
                  }}
                  className="w-full bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                >
                  Intentar de nuevo
                </button>
              )}
            </div>
          )}
        </div>

        {/* Fallback: Ingreso Manual */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            ¿La cámara no funciona? Ingresa el código manualmente
          </h3>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <input
              type="text"
              value={tokenManual}
              onChange={(e) => setTokenManual(e.target.value.toUpperCase())}
              placeholder="Ej: A1B2C3D4"
              maxLength={8}
              className="w-full bg-[#F4F4F5] text-gray-900 rounded-xl px-4 py-3 font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-black/10 transition-all border border-transparent focus:border-gray-300"
              disabled={enviando}
            />
            <button
              type="submit"
              disabled={enviando || tokenManual.length < 8}
              className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {enviando ? 'Registrando...' : 'Registrar Asistencia'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default EscanearAsistencia;