import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function InicioEstudiante() {
  const [datosDashboard, setDatosDashboard] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarResumen = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setCargando(false);
        return;
      }

      try {
        // 1. Decodificar el JWT para extraer el carnet
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(window.atob(base64));
        const carnet = payload.carnet;

        if (!carnet) {
          throw new Error("No se encontró el carnet en la sesión.");
        }

        // 2. Hacer la petición al backend que acabamos de crear
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/portal-estudiantil/${carnet}/resumen`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setDatosDashboard(data);
        } else {
          throw new Error("No se pudieron cargar los datos del portal.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Hubo un problema al cargar tu resumen académico.");
      } finally {
        setCargando(false);
      }
    };

    cargarResumen();
  }, []);

  if (cargando) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f172a]"></div>
      </div>
    );
  }

  // Estilos dinámicos para la tarjeta de Finanzas
  const tieneMora = datosDashboard?.tieneMora;
  
  const finanzasClases = tieneMora 
    ? "bg-red-50 border-red-100" // SI TIENE DEUDA: Rojo
    : "bg-emerald-50 border-emerald-100"; // SI ESTÁ AL DÍA: Verde Esmeralda

  const finanzasTituloClases = tieneMora ? "text-red-600" : "text-emerald-600";
  const finanzasTextoClases = tieneMora ? "text-red-900" : "text-emerald-900";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Título */}
      <div>
        <h2 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight">Portal Estudiantil</h2>
        <p className="text-gray-500 text-[13px] font-medium mt-0.5">Tu progreso académico.</p>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* TARJETA 1: CUM (Siempre verde/positivo) */}
        <div className="bg-[#f0fdf4] p-6 rounded-[20px] border border-[#dcfce7] shadow-sm transition-transform hover:scale-[1.02]">
          <h3 className="text-[#16a34a] text-[11px] font-black uppercase tracking-widest mb-2">CUM</h3>
          <p className="text-[38px] font-black text-[#15803d] leading-none tracking-tighter">
            {datosDashboard?.cum ? datosDashboard.cum.toFixed(1) : '0.0'}
          </p>
        </div>

        {/* TARJETA 2: MATERIAS (Neutro/Blanco) */}
        <div className="bg-white p-6 rounded-[20px] border border-gray-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-transform hover:scale-[1.02]">
          <h3 className="text-gray-400 text-[11px] font-black uppercase tracking-widest mb-2">Materias</h3>
          <p className="text-[34px] font-black text-[#0f172a] leading-none tracking-tight">
            {datosDashboard?.materiasInscritas || 0} <span className="text-[18px] font-extrabold text-gray-500">Inscritas</span>
          </p>
        </div>

        {/* TARJETA 3: FINANZAS (Dinámica) */}
        <div className={`p-6 rounded-[20px] border shadow-sm transition-transform hover:scale-[1.02] ${finanzasClases}`}>
          <h3 className={`${finanzasTituloClases} text-[11px] font-black uppercase tracking-widest mb-2`}>
            Finanzas
          </h3>
          <p className={`${finanzasTextoClases} text-[24px] mt-2 font-black tracking-tight`}>
            {datosDashboard?.estadoFinanciero || 'Al día'}
          </p>
        </div>

      </div>
    </div>
  );
}