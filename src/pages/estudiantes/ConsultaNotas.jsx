import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { generarPDFNotas } from "../../utils/generarPDFNotas";

const ConsultaNotas = () => {
  const [pestanaActiva, setPestanaActiva] = useState('ciclo');
  const [datosCiclo, setDatosCiclo] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay sesión activa.');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      const [responseNotas, responseHistorial] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/estudiantes/notas`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/estudiantes/historial`, { headers })
      ]);

      if (!responseNotas.ok) {
        const errorData = await responseNotas.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar las calificaciones.');
      }

      if (!responseHistorial.ok) {
        const errorData = await responseHistorial.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al cargar el histórico.');
      }

      const dataNotas = await responseNotas.json();
      const dataHistorial = await responseHistorial.json();

      setDatosCiclo(dataNotas);
      setHistorial(dataHistorial);
    } catch (error) {
      toast.error('Error de carga', { description: error.message });
    } finally {
      setCargando(false);
    }
  };

  const handleDescargarPDF = () => {
    if (!datosCiclo) return;

    const estudiante = {
      carnet: localStorage.getItem('carnet') || 'SA00000000',
      nombre: localStorage.getItem('nombreCompleto') || 'Estudiante',
      carrera: historial?.carrera || 'No asignada',
      cum: historial?.cumAcumulado || 0,
      uv: historial?.uvAcumuladas || 0
    };

    const horario = [
      { materia: 'Matemática I', lunes: '08:00-10:00', martes: '-', miercoles: '08:00-10:00', jueves: '-', viernes: '-', sabado: '-' }
    ];

    generarPDFNotas(datosCiclo, estudiante, horario);
    toast.success('Boleta descargada correctamente');
  };

  const formatNota = (nota) => {
    if (nota === null || nota === undefined) return <span className="text-gray-300">-</span>;
    return <span className="font-bold text-gray-900">{Number(nota).toFixed(2)}</span>;
  };

  const getEstadoColor = (estado) => {
    if (estado === 'Aprobada') return 'text-green-700 bg-green-50 border-green-200';
    if (estado === 'Reprobada') return 'text-red-700 bg-red-50 border-red-200';
    if (estado === 'Cursando') return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const nombreCompleto = localStorage.getItem('nombreCompleto') || 'Estudiante';
  const carnet = localStorage.getItem('carnet') || 'SA00000000';

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
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-3xl font-inter font-extrabold tracking-tight">Mis calificaciones</h1>
            
            {pestanaActiva === 'ciclo' && datosCiclo && (
              <button
                onClick={handleDescargarPDF}
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar boleta de notas
              </button>
            )}
          </div>
          
          <p className="text-gray-500 text-sm">
            Resumen de notas para el ciclo actual: <span className="font-bold text-black">{datosCiclo?.ciclo || '...'}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estudiante</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{nombreCompleto}</p>
            <p className="text-[10px] font-mono text-gray-500">{carnet}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Carrera</p>
            <p className="text-sm font-semibold text-gray-900">{historial?.carrera || 'Cargando...'}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CUM Acumulado</p>
            <p className="text-2xl font-bold text-black">{historial?.cumAcumulado?.toFixed(1) || '0.0'}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">UV Acumuladas</p>
            <p className="text-2xl font-bold text-black">{historial?.uvAcumuladas || 0}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setPestanaActiva('ciclo')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              pestanaActiva === 'ciclo'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ciclo Actual
          </button>
          <button
            onClick={() => setPestanaActiva('historico')}
            className={`px-6 py-3 text-sm font-semibold transition-colors border-b-2 ${
              pestanaActiva === 'historico'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Histórico Académico
          </button>
        </div>

        {pestanaActiva === 'ciclo' && (
          <div>
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
                          Promedio real
                        </th>
                        <th rowSpan={2} className="px-6 py-4 text-center text-gray-900 font-bold uppercase tracking-wider align-middle leading-tight">
                          Nota oficial
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
                          
                          <td className="px-6 py-4 text-center border-r border-gray-100">
                            <div className="inline-flex w-14 h-8 items-center justify-center bg-gray-100 rounded-lg font-mono text-gray-600 border border-gray-200 shadow-inner text-xs">
                              {materia.promedioSinRedondear !== null && materia.promedioSinRedondear !== undefined 
                                ? Number(materia.promedioSinRedondear).toFixed(3) 
                                : '-'}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            {materia.promedioOficial !== null && materia.promedioOficial !== undefined ? (
                                <div className={`inline-flex w-14 h-8 items-center justify-center rounded-lg font-bold border shadow-sm text-sm ${
                                  Number(materia.promedioOficial) >= 6.0 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                  {Number(materia.promedioOficial).toFixed(1)}
                                </div>
                            ) : (
                                <div className="inline-flex w-14 h-8 items-center justify-center bg-gray-50 rounded-lg font-bold text-gray-400 border border-gray-200 shadow-sm text-sm">
                                  -
                                </div>
                            )}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900">No hay materias inscritas</h3>
                <p className="mt-1 text-sm text-gray-500">No tienes materias registradas para el ciclo actual.</p>
              </div>
            )}
          </div>
        )}

        {pestanaActiva === 'historico' && (
          <div>
            {historial?.materiasPorCiclo && historial.materiasPorCiclo.length > 0 ? (
              <div className="space-y-6">
                {historial.materiasPorCiclo.map((ciclo) => (
                  <div key={ciclo.codigoCiclo} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{ciclo.codigoCiclo}</h3>
                        <p className="text-[10px] text-gray-500">Año {ciclo.anio} • Ciclo {ciclo.numeroCiclo}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        ciclo.estadoCiclo === 'ACTIVO' 
                          ? 'text-blue-700 bg-blue-50 border-blue-200' 
                          : 'text-gray-700 bg-gray-100 border-gray-200'
                      }`}>
                        {ciclo.estadoCiclo}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                            <th className="px-6 py-3 text-left font-semibold">Código</th>
                            <th className="px-6 py-3 text-left font-semibold">Materia</th>
                            <th className="px-6 py-3 text-center font-semibold">UV</th>
                            <th className="px-6 py-3 text-center font-semibold">Nota Final</th>
                            <th className="px-6 py-3 text-center font-semibold">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ciclo.materias.map((materia) => (
                            <tr key={materia.codigoMateria} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-3 font-mono text-xs text-gray-500">{materia.codigoMateria}</td>
                              <td className="px-6 py-3 font-semibold text-gray-900">{materia.nombreMateria}</td>
                              <td className="px-6 py-3 text-center text-gray-700">{materia.uv}</td>
                              <td className="px-6 py-3 text-center">
                                <span className="font-bold text-gray-900">{Number(materia.notaFinal).toFixed(1)}</span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getEstadoColor(materia.estado)}`}>
                                  {materia.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CUM</p>
                      <p className="text-xl font-bold text-black">{historial.cumAcumulado?.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">UV Totales</p>
                      <p className="text-xl font-bold text-black">{historial.uvAcumuladas}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aprobadas</p>
                      <p className="text-xl font-bold text-green-700">{historial.totalMateriasAprobadas}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reprobadas</p>
                      <p className="text-xl font-bold text-red-700">{historial.totalMateriasReprobadas}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900">Sin histórico académico</h3>
                <p className="mt-1 text-sm text-gray-500">Aún no tienes materias en ciclos anteriores.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default ConsultaNotas;