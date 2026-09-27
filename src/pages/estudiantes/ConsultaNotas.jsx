import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

const ConsultaNotas = () => {
  const [datosCiclo, setDatosCiclo] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarNotasEstudiante();
  }, []);

  const cargarNotasEstudiante = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay sesión activa.');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/estudiantes/notas`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar las calificaciones.');
      }

      const data = await response.json();
      setDatosCiclo(data);
    } catch (error) {
      toast.error('Error de carga', { description: error.message });
    } finally {
      setCargando(false);
    }
  };

  const formatNota = (nota) => {
    if (nota === null || nota === undefined) return <span className="text-gray-300">-</span>;
    return <span className="font-bold text-gray-900">{Number(nota).toFixed(2)}</span>;
  };

  if (cargando) return (
    <div className="flex flex-col items-center justify-center pt-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
      <p className="text-gray-400 text-sm font-medium tracking-wide">Cargando tu registro académico...</p>
    </div>
  );

  return (
    <div className="w-full pb-20 font-sans text-gray-900">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Mis calificaciones</h1>
          <p className="text-gray-500 text-sm">
            Resumen de notas para el ciclo actual: <span className="font-bold text-black">{datosCiclo?.ciclo || '...'}</span>
          </p>
        </div>

        {datosCiclo?.materias && datosCiclo.materias.length > 0 ? (
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th rowSpan={2} className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider w-64 border-r border-gray-200 align-middle">
                      Materia
                    </th>
                    <th colSpan={2} className="px-4 py-3 text-center text-black font-bold tracking-wide border-r border-gray-200">
                      PERÍODO 1 <span className="text-gray-400 font-normal text-xs ml-1">(30%)</span>
                    </th>
                    <th colSpan={2} className="px-4 py-3 text-center text-black font-bold tracking-wide border-r border-gray-200">
                      PERÍODO 2 <span className="text-gray-400 font-normal text-xs ml-1">(30%)</span>
                    </th>
                    <th colSpan={2} className="px-4 py-3 text-center text-black font-bold tracking-wide border-r border-gray-200">
                      PERÍODO 3 <span className="text-gray-400 font-normal text-xs ml-1">(40%)</span>
                    </th>
                    <th rowSpan={2} className="px-6 py-4 text-center text-gray-500 font-semibold uppercase tracking-wider border-r border-gray-200 align-middle leading-tight">
                      Promedio real <br/><span className="text-[10px] text-gray-400 font-normal lowercase"></span>
                    </th>
                    <th rowSpan={2} className="px-6 py-4 text-center text-gray-900 font-bold uppercase tracking-wider align-middle leading-tight">
                      Nota oficial <br/><span className="text-[10px] text-gray-500 font-normal lowercase"></span>
                    </th>
                  </tr>
                  
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-3 text-center border-r border-gray-200 font-medium">Lab 1 <br/><span className="text-[9px] text-gray-400">40%</span></th>
                    <th className="px-3 py-3 text-center border-r border-gray-200 font-medium">Par 1 <br/><span className="text-[9px] text-gray-400">60%</span></th>
                    <th className="px-3 py-3 text-center border-r border-gray-200 font-medium">Lab 2 <br/><span className="text-[9px] text-gray-400">40%</span></th>
                    <th className="px-3 py-3 text-center border-r border-gray-200 font-medium">Par 2 <br/><span className="text-[9px] text-gray-400">60%</span></th>
                    <th className="px-3 py-3 text-center border-r border-gray-200 font-medium">Lab 3 <br/><span className="text-[9px] text-gray-400">40%</span></th>
                    <th className="px-3 py-3 text-center border-r border-gray-200 font-medium">Par 3 <br/><span className="text-[9px] text-gray-400">60%</span></th>
                  </tr>
                </thead>
                
                <tbody className="divide-y divide-gray-100">
                  {datosCiclo.materias.map((materia) => (
                    <tr key={materia.codigo} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-gray-900 leading-tight">
                            {materia.nombre}
                          </span>
                          <span className="font-mono text-[10px] font-medium text-gray-400 tracking-wider">
                            {materia.codigo}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-sm">
                        {formatNota(materia.notas?.lab1)}
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-sm bg-gray-50/30">
                        {formatNota(materia.notas?.par1)}
                      </td>
                      
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-sm">
                        {formatNota(materia.notas?.lab2)}
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-sm bg-gray-50/30">
                        {formatNota(materia.notas?.par2)}
                      </td>
                      
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-sm">
                        {formatNota(materia.notas?.lab3)}
                      </td>
                      <td className="px-4 py-4 text-center border-r border-gray-100 text-sm bg-gray-50/30">
                        {formatNota(materia.notas?.par3)}
                      </td>
                      
                      {/* Promedio Real (Sin redondear, max 3 decimales) */}
                      <td className="px-6 py-4 text-center border-r border-gray-100">
                        <div className="inline-flex w-14 h-8 items-center justify-center bg-gray-100 rounded-lg font-mono text-gray-600 border border-gray-200 shadow-inner text-xs">
                          {materia.promedioSinRedondear !== null && materia.promedioSinRedondear !== undefined 
                            ? Number(materia.promedioSinRedondear).toFixed(3) 
                            : '-'}
                        </div>
                      </td>

                      {/* Nota Oficial (Redondeada a 1 decimal) */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex w-14 h-8 items-center justify-center bg-blue-50 rounded-lg font-bold text-blue-700 border border-blue-200 shadow-sm text-sm">
                          {materia.promedioOficial !== null && materia.promedioOficial !== undefined 
                            ? Number(materia.promedioOficial).toFixed(1) 
                            : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
            <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-sm font-medium text-gray-900">No hay materias inscritas</h3>
            <p className="mt-1 text-sm text-gray-500">No tienes materias registradas para el ciclo actual.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ConsultaNotas;