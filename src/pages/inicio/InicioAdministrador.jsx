
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { dashboardService } from '../../services/dashboardService';

const COLORES_FACULTAD = [
  '#1e40af', '#3b82f6', '#10b981', '#f59e0b'
];

const COLORES_CARRERA = [
  '#6366f1', '#8b5cf6', '#ec4899',
  '#f43f5e', '#f97316', '#eab308'
];

export default function InicioAdministrador() {

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [kpiActivo, setKpiActivo] = useState('matricula');

  const [cicloSeleccionado, setCicloSeleccionado] = useState('');
  const [sedeSeleccionada, setSedeSeleccionada] = useState(2);

  const [listaCiclos, setListaCiclos] = useState([]);
  const [listaSedes, setListaSedes] = useState([]);

  const [datosKpi, setDatosKpi] = useState(null);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState(null);

  // Cargar catálogos
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [ciclos, sedes] = await Promise.all([
          dashboardService.obtenerCiclosDisponibles(),
          dashboardService.obtenerSedesDisponibles()
        ]);

        setListaCiclos(ciclos);
        setListaSedes(sedes);   
      
        const activo = ciclos.find(
          ciclo => ciclo.estadoCiclo?.trim().toUpperCase() === 'ACTIVO'
        );

        if (activo) {
          setCicloSeleccionado(activo.codigoCiclo);
        } else {
          console.warn('No se encontró un ciclo ACTIVO:', ciclos);
          setCicloSeleccionado('');
          setError('No existe un ciclo académico activo.');
        }


      } catch (err) {
        console.error('Error al cargar catálogos:', err);
        setError('No fue posible cargar los catálogos del dashboard.');
        setCargando(false);
      }
    };

    cargarCatalogos();
  }, []);

  // Cargar métricas según filtros
  useEffect(() => {
    if (!cicloSeleccionado) return;

    let vigente = true;

    const cargarDatos = async () => {
      setCargando(true);
      setError('');

      try {
        const data = await dashboardService.obtenerMetricasGerenciales(
          cicloSeleccionado,
          sedeSeleccionada
        );

        if (vigente) {
          setDatosKpi(data);
          setCarreraSeleccionada(anterior => {
            const carreras = data.distribucionMatriculaCarrera ?? [];
            return carreras.some(c => c.idCarrera === anterior)
              ? anterior
              : (carreras[0]?.idCarrera ?? null);
          });
        }

      } catch (err) {
        console.error('Error al obtener métricas:', err);

        if (vigente) {
          setDatosKpi(null);
          setError('No fue posible obtener las métricas del dashboard.');
        }

      } finally {
        if (vigente) {
          setCargando(false);
        }
      }
    };

    cargarDatos();

    return () => {
      vigente = false;
    };
  }, [cicloSeleccionado, sedeSeleccionada]);

  const formatoNumero = (valor) =>
    Number(valor ?? 0).toLocaleString('es-SV');

  const totalMatricula = datosKpi?.matriculaActiva ?? 0;

  const distribucionFacultades =
    datosKpi?.distribucionMatriculaFacultad ?? [];

  const distribucionCarreras =
    datosKpi?.distribucionMatriculaCarrera ?? [];

  const historicoMatricula = datosKpi?.historicoMatricula ?? [];
  const carreraActiva = distribucionCarreras.find(
    carrera => carrera.idCarrera === carreraSeleccionada
  );
  const materiasCarrera = carreraActiva?.materias ?? [];

  if (cargando && !datosKpi) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
        <p className="mt-4 text-slate-500 font-medium">
          Consolidando métricas...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">

      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Panel de Administración
          </h2>
          <p className="text-slate-600 text-sm mt-1 font-medium">
            Resumen general y estado operativo del sistema universitario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* SEDE */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500">
              Sede:
            </span>
            <select
              value={sedeSeleccionada}
              onChange={e => setSedeSeleccionada(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer"
            >
              {listaSedes.map(sede => (
                <option key={sede.id} value={sede.id}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* CICLO */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-500">
              Ciclo:
            </span>
            <select
              value={cicloSeleccionado}
              onChange={e => setCicloSeleccionado(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-900 outline-none cursor-pointer"
            >
              {listaCiclos.map(ciclo => (
                <option
                  key={ciclo.idCiclo}
                  value={ciclo.codigoCiclo}
                >
                  {ciclo.codigoCiclo}
                  {ciclo.estadoCiclo?.estadoCiclo === 'ACTIVO'
                    ? ' (ACTIVO)'
                    : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPIs PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* MATRÍCULA */}
        <div
          onClick={() => setKpiActivo('matricula')}
          className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
            kpiActivo === 'matricula'
              ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
              : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Matrícula Activa
          </h3>

          <p className="text-4xl font-black text-slate-900">
            {formatoNumero(totalMatricula)}
          </p>

          <p className="text-xs font-bold text-emerald-700 mt-3 bg-emerald-50 inline-block px-2.5 py-1 rounded-lg">
            Matrículas confirmadas
          </p>
        </div>

        {/* DOCENTES */}
        <div
          onClick={() => setKpiActivo('docentes')}
          className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all ${
            kpiActivo === 'docentes'
              ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
              : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Docentes Activos
          </h3>

          <p className="text-4xl font-black text-slate-900">
            {formatoNumero(datosKpi?.docentesActivos)}
          </p>

          <p className="text-xs font-semibold text-slate-500 mt-3">
            Plantilla asignada
          </p>
        </div>

        {/* SECCIONES */}
        <div
          onClick={() => setKpiActivo('secciones')}
          className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all ${
            kpiActivo === 'secciones'
              ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
              : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Secciones Abiertas
          </h3>

          <p className="text-4xl font-black text-slate-900">
            {formatoNumero(datosKpi?.seccionesAbiertas)}
          </p>

          <p className="text-xs font-semibold text-slate-500 mt-3">
            Capacidad media: {Number(datosKpi?.capacidadPromedio ?? 0).toFixed(1)}%
          </p>
        </div>

        {/* COBROS */}
        <div
          onClick={() => setKpiActivo('cobros')}
          className={`cursor-pointer p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all ${
            kpiActivo === 'cobros'
              ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
              : 'bg-white border-slate-200'
          }`}
        >
          <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">
            Estado de Cobros
          </h3>

          <p className="text-4xl font-black text-slate-900">
            {Number(datosKpi?.porcentajeCobro ?? 0).toFixed(1)}%
          </p>

          <p className="text-xs font-bold text-slate-600 uppercase mt-3">
            Recaudado del total
          </p>
        </div>
      </div>

      {/* DETALLES DE MATRÍCULA */}
      {kpiActivo === 'matricula' && (
        <div className="space-y-6">

          {/* HISTÓRICO DE MATRÍCULA POR CICLO */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Evolución histórica de matrícula
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Estudiantes con matrícula confirmada por ciclo en la sede seleccionada.
            </p>
            {historicoMatricula.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicoMatricula} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="codigoCiclo" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(valor) => [formatoNumero(valor), 'Estudiantes']} />
                    <Line type="monotone" dataKey="cantidad" name="Estudiantes" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">
                No hay información histórica disponible.
              </p>
            )}
          </div>

          {/* GRÁFICOS POR FACULTAD Y CARRERA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* FACULTADES */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Matrícula por Facultad
              </h3>

              <p className="text-sm text-slate-500 mb-6">
                Distribución de estudiantes con matrícula confirmada.
              </p>

              {distribucionFacultades.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="h-[220px] w-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distribucionFacultades}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="cantidad"
                          nameKey="nombre"
                          stroke="none"
                        >
                          {distribucionFacultades.map((item, index) => (
                            <Cell
                              key={index}
                              fill={COLORES_FACULTAD[index % COLORES_FACULTAD.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-slate-900">
                        {formatoNumero(totalMatricula)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Total
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    {distribucionFacultades.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORES_FACULTAD[
                                index % COLORES_FACULTAD.length
                              ]
                            }}
                          />
                          <span className="text-slate-600 font-medium">
                            {item.nombre}
                          </span>
                        </div>

                        <span className="font-bold text-slate-900">
                          {formatoNumero(item.cantidad)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Sin registros de facultades en este ciclo.
                </div>
              )}
            </div>

            {/* CARRERAS */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Matrícula por Carrera
              </h3>

              <p className="text-sm text-slate-500 mb-6">
                Carreras con más estudiantes matriculados.
              </p>

              {distribucionCarreras.length > 0 ? (
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distribucionCarreras}
                      layout="vertical"
                      margin={{
                        top: 0,
                        right: 20,
                        left: 100,
                        bottom: 0
                      }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                      />
                      <YAxis
                        dataKey="nombre"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="cantidad"
                        fill={COLORES_CARRERA[0]}
                        radius={[0, 6, 6, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Sin registros de carreras en este ciclo.
                </div>
              )}
            </div>
          </div>

          {/* DEMANDA POR CARRERA Y MATERIA: SELECCIÓN LOCAL SIN OTRA PETICIÓN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Demanda por Carrera</h3>
              <p className="text-sm text-slate-500 mb-5">
                Selecciona una carrera para consultar sus materias.
              </p>
              {distribucionCarreras.length > 0 ? (
                <div className="space-y-3">
                  {distribucionCarreras.map(carrera => (
                    <button
                      key={carrera.idCarrera}
                      type="button"
                      aria-pressed={carrera.idCarrera === carreraSeleccionada}
                      onClick={() => setCarreraSeleccionada(carrera.idCarrera)}
                      className={`w-full flex justify-between items-center gap-4 p-3 rounded-xl text-left transition-colors border ${
                        carrera.idCarrera === carreraSeleccionada
                          ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200'
                          : 'bg-slate-50 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm font-medium text-slate-700">{carrera.nombre}</span>
                      <span className="text-sm font-bold text-blue-700 shrink-0">
                        {formatoNumero(carrera.cantidad)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-8 text-center">
                  No hay carreras con matrícula confirmada en este ciclo y sede.
                </p>
              )}
            </section>

            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Demanda por Materia</h3>
              <p className="text-sm text-slate-500 mb-5">
                {carreraActiva
                  ? `Estudiantes inscritos por materia en ${carreraActiva.nombre}.`
                  : 'Materias de la carrera seleccionada.'}
              </p>
              {materiasCarrera.length > 0 ? (
                <div className="space-y-3">
                  {materiasCarrera.map(materia => (
                    <div
                      key={materia.idMateria}
                      className="flex justify-between items-center gap-4 p-3 bg-slate-50 rounded-xl"
                    >
                      <span className="text-sm font-medium text-slate-700">{materia.nombre}</span>
                      <span className="text-sm font-bold text-blue-700 shrink-0">
                        {formatoNumero(materia.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 py-8 text-center">
                  {carreraActiva
                    ? 'No hay inscripciones activas en materias de esta carrera.'
                    : 'Selecciona una carrera para ver sus materias.'}
                </p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* MÓDULOS PENDIENTES */}
      {kpiActivo !== 'matricula' && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-slate-500 font-medium">
            Visualización detallada para{' '}
            <strong className="text-slate-800 uppercase">
              {kpiActivo}
            </strong>{' '}
            en desarrollo.
          </p>
        </div>
      )}

      {/* BLOQUE INFORMATIVO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1.5">
          Estado de los servicios institucionales
        </h3>
        <p className="text-sm text-slate-600">
          Información operativa del sistema universitario.
        </p>
      </div>
    </div>
  );
}
