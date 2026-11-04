import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Settings, Users, Briefcase, ChevronDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { dashboardService } from '../../services/dashboardService';

// --- CONSTANTES DE DISEÑO (Clean Code) ---
const COLORES_FACULTAD = ['#1e40af', '#3b82f6', '#10b981', '#f59e0b'];
const COLORES_CONTRATO = ['#3b82f6', '#94a3b8', '#10b981', '#f59e0b'];

export default function InicioGerencia() {
  const [cargando, setCargando] = useState(true);
  const [kpiActivo, setKpiActivo] = useState('matricula'); // Estado para el drill-down
  const [cicloSeleccionado, setCicloSeleccionado] = useState('2-2026B');
  const [datosKpi, setDatosKpi] = useState(null);

  // Llamada real al backend (BFF / API Gateway)
  const cargarDatos = async () => {
    setCargando(true);
    try {
      const data = await dashboardService.obtenerMetricasGerenciales(cicloSeleccionado);
      
      // Cálculo financiero derivado seguro
      const totalPendiente = (data.totalFacturado || 0) - (data.totalRecaudado || 0);
      
      setDatosKpi({
        ...data,
        totalPendiente: totalPendiente > 0 ? totalPendiente : 0
      });
    } catch (error) {
      toast.error('Error de conexión', { description: error.message });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [cicloSeleccionado]);

  // Datos financieros mapeados del backend real
  const datosFinancierosBackend = [
    { name: 'Cobrado', value: datosKpi?.totalRecaudado || 0, color: '#1e40af' },
    { name: 'Pendiente', value: datosKpi?.totalPendiente || 0, color: '#3b82f6' }
  ];

  // Mock temporal para la estructura de matrícula por facultad (se puede migrar a endpoint si se requiere)
  const datosMatriculaFacultad = [
    { name: 'FCE', value: 4500, color: '#1e40af' },
    { name: 'FCH', value: 3200, color: '#3b82f6' },
    { name: 'FJCS', value: 2800, color: '#10b981' },
    { name: 'EPG', value: 1950, color: '#f59e0b' },
  ];

  // --- DICCIONARIO DE VISTAS DINÁMICAS (Drill-down) ---
  const vistasGraficos = {
    matricula: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* Gráfico 1: Asistencia Promedio Semanal (Indicador Dinámico en Líneas) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Asistencia Promedio Semanal</h3>
            <p className="text-sm text-slate-500 font-medium">Monitoreo activo para prevención de deserción</p>
          </div>
          
          {datosKpi?.asistenciaSemanal?.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={datosKpi.asistenciaSemanal} margin={{ top: 15, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value}%`, 'Asistencia Promedio']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="porcentaje" 
                    stroke="#1e40af" 
                    strokeWidth={4} 
                    dot={{ r: 5, fill: '#1e40af', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }} 
                    animationDuration={1500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[320px] w-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay registros de asistencia en este ciclo.
            </div>
          )}
        </div>

        {/* Gráfico 2: Distribución por Facultad (Dona con etiquetas y lectura central) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-900 mb-6 w-full text-left">Distribución por Facultad</h3>
          
          {datosMatriculaFacultad?.length > 0 ? (
            <>
              <div className="h-[230px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={datosMatriculaFacultad} 
                      innerRadius={55} 
                      outerRadius={80} 
                      paddingAngle={3} 
                      dataKey="value" 
                      stroke="none"
                      labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {datosMatriculaFacultad.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORES_FACULTAD[index % COLORES_FACULTAD.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      formatter={(value) => [value.toLocaleString(), 'Estudiantes']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Donut Hole Central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {datosKpi?.matriculaActiva?.toLocaleString() || 0}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</span>
                </div>
              </div>

              {/* Leyenda Semántica HTML inferior */}
              <div className="mt-2 w-full space-y-2">
                {datosMatriculaFacultad.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm w-full">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color || COLORES_FACULTAD[idx % COLORES_FACULTAD.length] }}></div>
                      <span className="text-slate-600 font-medium truncate max-w-[120px]" title={item.name}>{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] w-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
              Sin registros de facultades.
            </div>
          )}
        </div>
      </div>
    ),
    docentes: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* Gráfico de Barras: Docentes por Facultad */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">Docentes por Facultad</h3>
            <p className="text-sm text-slate-500 font-medium">Distribución académica del cuerpo docente</p>
          </div>
          
          {datosKpi?.distribucionFacultades?.length > 0 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datosKpi.distribucionFacultades} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`${value} docentes`, 'Activos']}
                  />
                  <Bar dataKey="cantidad" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[320px] w-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No hay datos de facultades disponibles.
            </div>
          )}
        </div>

        {/* Gráfico de Dona: Tipos de Contrato */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h3 className="text-lg font-bold text-slate-900 mb-6 w-full text-left">Tipo de Contrato</h3>
          
          {datosKpi?.distribucionContratos?.length > 0 ? (
            <>
              <div className="h-[200px] w-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={datosKpi.distribucionContratos} 
                      innerRadius={65} outerRadius={90} paddingAngle={3} 
                      dataKey="cantidad" nameKey="nombre" stroke="none"
                    >
                      {datosKpi.distribucionContratos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORES_CONTRATO[index % COLORES_CONTRATO.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      formatter={(value) => [`${value} docentes`, 'Total']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Total central (Donut hole) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{datosKpi?.docentesActivos || 0}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</span>
                </div>
              </div>

              {/* Leyenda HTML personalizada */}
              <div className="mt-6 w-full space-y-2.5">
                {datosKpi.distribucionContratos.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm w-full">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORES_CONTRATO[idx % COLORES_CONTRATO.length] }}></div>
                      <span className="text-slate-600 font-medium truncate max-w-[120px]" title={item.nombre}>{item.nombre}</span>
                    </div>
                    <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{item.cantidad}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] w-full flex items-center justify-center text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
              Sin registros de contratos.
            </div>
          )}
        </div>
      </div>
    ),
    secciones: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-center items-center h-[320px]">
             <h3 className="text-lg font-bold text-slate-400">Distribución de horarios en desarrollo...</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Modalidad de Secciones</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#1e293b', fontWeight: 500 }} width={80} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="Secciones" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    ),
    finanzas: (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold text-slate-900 mb-6 w-full text-left">Resumen Financiero</h3>
          <div className="h-[200px] w-[200px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={datosFinancierosBackend} innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                  {datosFinancierosBackend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)' }} 
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Monto']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{datosKpi?.porcentajeCobro?.toFixed(1) || 0}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Recaudado</span>
            </div>
          </div>
          <div className="mt-4 w-full space-y-2">
            {datosFinancierosBackend.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm w-full">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col justify-center items-center h-[320px]">
           <h3 className="text-lg font-bold text-slate-400">Ingresos Mensuales en desarrollo...</h3>
        </div>
      </div>
    )
  };

  // Pantalla de Carga (Spinner)
  if (cargando && !datosKpi) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-500 font-medium tracking-wide">Consolidando métricas del ciclo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Encabezado y Filtro */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Dashboard General de Métricas e Indicadores
              </h1>
              <p className="text-sm text-slate-500 font-medium">Panel de control gerencial</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group">
            <span className="text-sm font-semibold text-slate-500">Ciclo Activo:</span>
            <select 
              value={cicloSeleccionado}
              onChange={(e) => setCicloSeleccionado(e.target.value)}
              className="text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer appearance-none pr-2"
            >
              <option value="2-2026B">2-2026B</option>
              <option value="1-2026A">1-2026A</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          </div>
        </div>

        {/* 4 Tarjetas de KPIs (Grid Interactivo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          <div 
            onClick={() => setKpiActivo('matricula')}
            className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group ${kpiActivo === 'matricula' ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'bg-white border-slate-200'}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full transition-transform origin-bottom ${kpiActivo === 'matricula' ? 'bg-blue-600 scale-y-100' : 'bg-slate-300 scale-y-0 group-hover:scale-y-100'}`}></div>
            <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Matrícula Activa</h3>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{datosKpi?.matriculaActiva?.toLocaleString() || 0}</p>
            <p className="text-xs font-bold text-emerald-700 mt-3 bg-emerald-50/80 border border-emerald-100 inline-block px-2.5 py-1 rounded-lg">
              Estudiantes inscritos
            </p>
          </div>

          <div 
            onClick={() => setKpiActivo('docentes')}
            className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group ${kpiActivo === 'docentes' ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'bg-white border-slate-200'}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full transition-transform origin-bottom ${kpiActivo === 'docentes' ? 'bg-blue-600 scale-y-100' : 'bg-slate-300 scale-y-0 group-hover:scale-y-100'}`}></div>
            <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Docentes Activos</h3>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{datosKpi?.docentesActivos?.toLocaleString() || 0}</p>
            <div className="flex items-center gap-1.5 mt-3 text-slate-500">
              <Users className={`w-4 h-4 ${kpiActivo === 'docentes' ? 'text-blue-600' : ''}`} />
              <p className="text-xs font-semibold">Plantilla asignada</p>
            </div>
          </div>

          <div 
            onClick={() => setKpiActivo('secciones')}
            className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group ${kpiActivo === 'secciones' ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'bg-white border-slate-200'}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full transition-transform origin-bottom ${kpiActivo === 'secciones' ? 'bg-blue-600 scale-y-100' : 'bg-slate-300 scale-y-0 group-hover:scale-y-100'}`}></div>
            <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Secciones Abiertas</h3>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{datosKpi?.seccionesAbiertas?.toLocaleString() || 0}</p>
            <div className="flex items-center gap-1.5 mt-3 text-slate-500">
              <Briefcase className={`w-4 h-4 ${kpiActivo === 'secciones' ? 'text-blue-600' : ''}`} />
              <p className="text-xs font-semibold">Capacidad media: {datosKpi?.capacidadPromedio?.toFixed(1) || 0}%</p>
            </div>
          </div>

          <div 
            onClick={() => setKpiActivo('finanzas')}
            className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden group ${kpiActivo === 'finanzas' ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500' : 'bg-white border-slate-200'}`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full transition-transform origin-bottom ${kpiActivo === 'finanzas' ? 'bg-blue-600 scale-y-100' : 'bg-slate-300 scale-y-0 group-hover:scale-y-100'}`}></div>
            <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Estado de Cobros</h3>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{datosKpi?.porcentajeCobro?.toFixed(1) || 0}%</p>
            <div className="flex items-center gap-1.5 mt-3 text-slate-500">
              <DollarSign className={`w-4 h-4 ${kpiActivo === 'finanzas' ? 'text-blue-600' : ''}`} />
              <p className="text-xs font-bold text-slate-600 uppercase">Recaudado del total</p>
            </div>
          </div>

        </div>

        {/* Sección de Gráficos Dinámica (Drill-down) */}
        <div className="mt-2">
          {vistasGraficos[kpiActivo]}
        </div>

      </div>
    </div>
  );
}