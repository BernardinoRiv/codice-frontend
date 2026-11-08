
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
import DashboardCobros from './DashboardCobros';

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

  const [datosSecciones, setDatosSecciones] = useState(null);
  const [cargandoSecciones, setCargandoSecciones] = useState(false);
  const [errorSecciones, setErrorSecciones] = useState('');
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState('TODAS');
  const [carreraSeccionSeleccionada, setCarreraSeccionSeleccionada] = useState(null);
  const [materiaSeccionSeleccionada, setMateriaSeccionSeleccionada] = useState(null);
  const [paginaSecciones, setPaginaSecciones] = useState(1);

  const [datosDocentes, setDatosDocentes] = useState(null);
  const [cargandoDocentes, setCargandoDocentes] = useState(false);
  const [errorDocentes, setErrorDocentes] = useState('');
  const [carreraDocenteSeleccionada, setCarreraDocenteSeleccionada] = useState(null);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);

  const [datosCobros, setDatosCobros] = useState(null);
  const [cargandoCobros, setCargandoCobros] = useState(false);
  const [errorCobros, setErrorCobros] = useState('');

  
  useEffect(() => {
    if (kpiActivo !== 'cobros') return;

    let vigente = true;

    const cargarCobros = async () => {
      setCargandoCobros(true);
      setErrorCobros(null);
      setDatosCobros(null);

      try {
        const respuesta =
          await dashboardService.obtenerMetricasCobros(
            cicloSeleccionado,
            sedeSeleccionada
          );

        if (vigente) {
          setDatosCobros(respuesta);
        }
      } catch (error) {
        if (vigente) {
          setErrorCobros(
            error.message || 'Error al cargar los datos financieros.'
          );
        }
      } finally {
        if (vigente) {
          setCargandoCobros(false);
        }
      }
    };

    cargarCobros();

    return () => {
      vigente = false;
    };
  }, [kpiActivo, cicloSeleccionado, sedeSeleccionada]);


  useEffect(() => {
    if (kpiActivo !== 'secciones' || !cicloSeleccionado) return;
    let vigente = true;
    setCargandoSecciones(true);
    setErrorSecciones('');
    setDatosSecciones(null);
    setJornadaSeleccionada('TODAS');
    setMateriaSeccionSeleccionada(null);
    setPaginaSecciones(1);
    dashboardService.obtenerMetricasSecciones(cicloSeleccionado, sedeSeleccionada)
      .then(data => {
        if (!vigente) return;
        setDatosSecciones(data);
        setCarreraSeccionSeleccionada(prev =>
          (data.gruposPorCarrera ?? []).some(c => c.idCarrera === prev)
            ? prev : (data.gruposPorCarrera?.[0]?.idCarrera ?? null)
        );
      })
      .catch(err => {
        if (!vigente) return;
        setErrorSecciones(err.message || 'No fue posible cargar las secciones.');
      })
      .finally(() => { if (vigente) setCargandoSecciones(false); });
    return () => { vigente = false; };
  }, [kpiActivo, cicloSeleccionado, sedeSeleccionada]);

  // Consultar docentes únicamente al abrir la sección o cambiar los filtros.
  useEffect(() => {
    if (kpiActivo !== 'docentes' || !cicloSeleccionado) return;
    let vigente = true;
    setCargandoDocentes(true);
    setErrorDocentes('');
    setDatosDocentes(null);
    dashboardService.obtenerMetricasDocentes(cicloSeleccionado, sedeSeleccionada)
      .then(data => {
        if (!vigente) return;
        setDatosDocentes(data);
        setCarreraDocenteSeleccionada(anterior =>
          (data.docentesPorCarrera ?? []).some(c => c.idCarrera === anterior)
            ? anterior : (data.docentesPorCarrera?.[0]?.idCarrera ?? null)
        );
        setDocenteSeleccionado(anterior =>
          (data.detalleDocentes ?? []).some(d => d.idDocente === anterior)
            ? anterior : (data.detalleDocentes?.[0]?.idDocente ?? null)
        );
      })
      .catch(err => {
        if (!vigente) return;
        console.error('Error al obtener métricas docentes:', err);
        setErrorDocentes(err.message || 'No fue posible cargar las métricas de docentes.');
      })
      .finally(() => { if (vigente) setCargandoDocentes(false); });
    return () => { vigente = false; };
  }, [kpiActivo, cicloSeleccionado, sedeSeleccionada]);

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
      setDatosKpi(null);

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

  const carrerasDocentes = datosDocentes?.docentesPorCarrera ?? [];
  const carreraDocenteActiva = carrerasDocentes.find(c => c.idCarrera === carreraDocenteSeleccionada);
  const docentesCarrera = carreraDocenteActiva?.docentes ?? [];
  const docentesDetalle = datosDocentes?.detalleDocentes ?? [];
  const docenteActivoDetalle = docentesDetalle.find(d => d.idDocente === docenteSeleccionado);
  const contratosDocentes = datosDocentes?.distribucionContratos ?? [];
  const totalDocentes = datosDocentes?.docentesActivos ?? 0;
  // Las materias se cuentan una sola vez aunque las impartan varios docentes.
  const materiasDistintas = new Set(
    docentesDetalle.flatMap(docente => (docente.materias ?? []).map(materia => materia.idMateria))
  ).size;
  // Los grupos sí se suman por asignación docente y materia.
  const gruposAsignados = docentesDetalle.reduce(
    (total, docente) => total + (docente.materias ?? []).reduce(
      (subtotal, materia) => subtotal + Number(materia.cantidadGrupos ?? 0), 0
    ), 0
  );
  const promedioMateriasDocente = docentesDetalle.length > 0
    ? docentesDetalle.reduce((total, docente) => total + Number(docente.cantidadMaterias ?? 0), 0) / docentesDetalle.length
    : 0;

  const detalleSecciones = datosSecciones?.detalleGrupos ?? [];
  const carrerasSecciones = datosSecciones?.gruposPorCarrera ?? [];
  const carreraSeccionActiva = carrerasSecciones.find(c => c.idCarrera === carreraSeccionSeleccionada);
  const materiasSeccion = carreraSeccionActiva?.materias ?? [];
  const jornadasSecciones = datosSecciones?.distribucionJornadas ?? [];
  const cantidadJornada = nombre => Number(jornadasSecciones.find(j => j.nombre === nombre)?.cantidad ?? 0);
  const totalJornadas = jornadasSecciones.reduce((n, j) => n + Number(j.cantidad ?? 0), 0);
  const detalleFiltrado = detalleSecciones.filter(g =>
    (jornadaSeleccionada === 'TODAS' || g.jornada === jornadaSeleccionada) &&
    (materiaSeccionSeleccionada === null || g.idMateria === materiaSeccionSeleccionada)
  );
  const tamanioPagina = 8;
  const totalPaginas = Math.max(1, Math.ceil(detalleFiltrado.length / tamanioPagina));
  const detallePaginado = detalleFiltrado.slice((Math.min(paginaSecciones, totalPaginas) - 1) * tamanioPagina, Math.min(paginaSecciones, totalPaginas) * tamanioPagina);
  const porcentaje = n => totalJornadas ? (Number(n) * 100 / totalJornadas) : 0;

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
            Estudiantes matriculados
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
            Ocupación: {Number(datosSecciones?.ocupacionGlobal ?? datosKpi?.capacidadPromedio ?? 0).toFixed(1)}%
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
            Cobros y recaudación
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

      {/* DETALLES DE DOCENTES */}
      {kpiActivo === 'docentes' && (
        <div className="space-y-6">
          {cargandoDocentes && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              Cargando información de docentes...
            </div>
          )}
          {errorDocentes && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
              {errorDocentes}
            </div>
          )}
          {!cargandoDocentes && !errorDocentes && datosDocentes && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Docentes activos del ciclo</h3>
                  <p className="text-sm text-slate-500 mb-5">Docentes distintos asignados a grupos abiertos.</p>
                  {contratosDocentes.length > 0 ? (
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="h-[220px] w-[220px] relative shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={contratosDocentes} innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="cantidad" nameKey="nombre" stroke="none">
                              {contratosDocentes.map((item, index) => (
                                <Cell key={item.nombre} fill={COLORES_FACULTAD[index % COLORES_FACULTAD.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={valor => formatoNumero(valor)} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-black text-slate-900">{formatoNumero(totalDocentes)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Docentes</span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-3 w-full">
                        {contratosDocentes.map((item, index) => (
                          <div key={item.nombre} className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2 text-slate-600 font-medium">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORES_FACULTAD[index % COLORES_FACULTAD.length] }} />
                              {item.nombre}
                            </span>
                            <span className="font-bold text-slate-900">{formatoNumero(item.cantidad)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="text-sm text-slate-400 py-8 text-center">Sin docentes asignados en este ciclo y sede.</p>}
                </section>
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Carga académica docente</h3>
                  <p className="text-sm text-slate-500 mb-5">Asignaciones de los docentes en el ciclo y sede seleccionados.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-5">
                      <p className="text-sm font-semibold text-slate-600">Materias distintas impartidas</p>
                      <p className="text-3xl font-black text-blue-800 mt-3">{formatoNumero(materiasDistintas)}</p>
                      <p className="text-xs text-slate-500 mt-2">Cada materia se cuenta una sola vez.</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
                      <p className="text-sm font-semibold text-slate-600">Grupos asignados</p>
                      <p className="text-3xl font-black text-emerald-800 mt-3">{formatoNumero(gruposAsignados)}</p>
                      <p className="text-xs text-slate-500 mt-2">Total de grupos impartidos.</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-600">Promedio de materias por docente</span>
                    <span className="text-xl font-black text-slate-900">{promedioMateriasDocente.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-4">La carga incluye grupos abiertos, incluso sin estudiantes inscritos.</p>
                </section>
              </div>

              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Evolución histórica de docentes</h3>
                <p className="text-sm text-slate-500 mb-6">Docentes asignados por ciclo y tipo de contratación en la sede seleccionada.</p>
                {(datosDocentes.historicoDocentes ?? []).length > 0 ? (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={datosDocentes.historicoDocentes} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="codigoCiclo" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={valor => formatoNumero(valor)} />
                        <Line type="monotone" dataKey="porHoras" name="POR HORAS" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="tiempoCompleto" name="TIEMPO COMPLETO" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-sm text-slate-400 py-8 text-center">No hay información histórica disponible.</p>}
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Docentes por Carrera</h3>
                  <p className="text-sm text-slate-500 mb-5">Carreras atendidas según inscripciones activas. Selecciona una carrera.</p>
                  {carrerasDocentes.length > 0 ? <div className="space-y-3">
                    {carrerasDocentes.map(carrera => (
                      <button type="button" key={carrera.idCarrera} aria-pressed={carrera.idCarrera === carreraDocenteSeleccionada}
                        onClick={() => setCarreraDocenteSeleccionada(carrera.idCarrera)}
                        className={`w-full flex justify-between items-center gap-4 p-3 rounded-xl text-left transition-colors border ${carrera.idCarrera === carreraDocenteSeleccionada ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                        <span className="text-sm font-medium text-slate-700">{carrera.nombre}</span>
                        <span className="text-sm font-bold text-blue-700 shrink-0">{formatoNumero(carrera.cantidad)} docentes</span>
                      </button>
                    ))}
                  </div> : <p className="text-sm text-slate-400 py-8 text-center">No hay carreras con docentes vinculados mediante inscripciones activas.</p>}
                </section>
                <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Docentes de la Carrera</h3>
                  <p className="text-sm text-slate-500 mb-5">{carreraDocenteActiva ? `Docentes que atienden ${carreraDocenteActiva.nombre}.` : 'Selecciona una carrera para consultar sus docentes.'}</p>
                  {docentesCarrera.length > 0 ? <div className="space-y-3">
                    {docentesCarrera.map(docente => (
                      <button type="button" key={docente.idDocente} onClick={() => setDocenteSeleccionado(docente.idDocente)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${docente.idDocente === docenteSeleccionado ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-sm font-semibold text-slate-800">{docente.nombre}</span>
                          <span className="text-sm font-bold text-blue-700 shrink-0">{formatoNumero(docente.cantidadMaterias)} materias</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{docente.tipoContratacion}</p>
                        <div className="mt-2 text-xs text-slate-600">{(docente.materias ?? []).map(m => m.nombre).join(' · ')}</div>
                      </button>
                    ))}
                  </div> : <p className="text-sm text-slate-400 py-8 text-center">No hay docentes para la carrera seleccionada.</p>}
                </section>
              </div>

              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Materias asignadas por Docente</h3>
                <p className="text-sm text-slate-500 mb-5">Selecciona un docente para consultar todas sus materias y grupos del ciclo, incluso sin inscripciones.</p>
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {docentesDetalle.map(docente => (
                      <button key={docente.idDocente} type="button" aria-pressed={docente.idDocente === docenteSeleccionado}
                        onClick={() => setDocenteSeleccionado(docente.idDocente)}
                        className={`w-full text-left p-3 rounded-xl border transition-colors ${docente.idDocente === docenteSeleccionado ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                        <div className="text-sm font-semibold text-slate-800">{docente.nombre}</div>
                        <div className="text-xs text-slate-500 mt-1">{docente.tipoContratacion} · {formatoNumero(docente.cantidadMaterias)} materias</div>
                      </button>
                    ))}
                    {docentesDetalle.length === 0 && <p className="text-sm text-slate-400">No hay docentes asignados.</p>}
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                    {docenteActivoDetalle ? <>
                      <h4 className="font-bold text-slate-900">{docenteActivoDetalle.nombre}</h4>
                      <p className="text-xs text-slate-500 mt-1 mb-4">{docenteActivoDetalle.tipoContratacion} · {formatoNumero(docenteActivoDetalle.cantidadMaterias)} materias distintas</p>
                      <div className="space-y-2">
                        {(docenteActivoDetalle.materias ?? []).map(materia => (
                          <div key={materia.idMateria} className="bg-white rounded-lg border border-slate-200 p-3 flex justify-between items-center gap-3">
                            <span className="text-sm font-medium text-slate-700">{materia.nombre}</span>
                            <span className="text-xs font-bold text-blue-700 shrink-0">{formatoNumero(materia.cantidadGrupos)} grupos</span>
                          </div>
                        ))}
                      </div>
                    </> : <p className="text-sm text-slate-400">Selecciona un docente para consultar sus materias.</p>}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* DETALLES DE SECCIONES */}
      {kpiActivo === 'secciones' && (
        <div className="space-y-6">
          {cargandoSecciones && <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">Cargando secciones abiertas...</div>}
          {errorSecciones && <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{errorSecciones}</div>}
          {!cargandoSecciones && !errorSecciones && datosSecciones && <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                ['Secciones abiertas', datosSecciones.seccionesAbiertas, 'Grupos habilitados'],
                ['Ocupación global', `${Number(datosSecciones.ocupacionGlobal ?? 0).toFixed(1)}%`, `${formatoNumero(datosSecciones.inscritos)} de ${formatoNumero(datosSecciones.cuposTotales)} cupos`],
                ['Cupos disponibles', datosSecciones.cuposDisponibles, 'Plazas restantes']
              ].map(([titulo, valor, subtitulo]) => <div key={titulo} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
                <p className="text-4xl font-black text-slate-900 mt-3">{typeof valor === 'number' ? formatoNumero(valor) : valor}</p>
                <p className="text-sm text-slate-500 mt-2">{subtitulo}</p>
              </div>)}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-5">
                <div><h3 className="text-lg font-bold text-slate-900">Secciones por jornada</h3>
                <p className="text-sm text-slate-500">Según hora de inicio. Selecciona una jornada para filtrar el detalle.</p></div>
                {jornadaSeleccionada !== 'TODAS' && <button type="button" className="text-sm text-blue-700 font-semibold hover:underline" onClick={() => {setJornadaSeleccionada('TODAS');setPaginaSecciones(1);}}>Ver todas</button>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {[
                  {nombre:'DIURNA', titulo:'Diurna', icono:'☀', color:'#2563eb', activo:'border-blue-400 bg-blue-50'},
                  {nombre:'NOCTURNA', titulo:'Nocturna', icono:'☾', color:'#7c3aed', activo:'border-violet-400 bg-violet-50'}
                ].map(j => <button key={j.nombre} type="button" aria-pressed={jornadaSeleccionada === j.nombre}
                  onClick={() => {setJornadaSeleccionada(prev => prev === j.nombre ? 'TODAS' : j.nombre);setPaginaSecciones(1);}}
                  className={`text-left border rounded-xl p-4 transition-colors ${jornadaSeleccionada === j.nombre ? j.activo : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                  <div className="text-sm font-bold text-slate-700"><span style={{color:j.color}} className="text-lg mr-2">{j.icono}</span>{j.titulo}</div>
                  <p className="text-3xl font-black text-slate-900 mt-2">{formatoNumero(cantidadJornada(j.nombre))}</p>
                  <p className="text-xs text-slate-500 mt-1">{porcentaje(cantidadJornada(j.nombre)).toFixed(2)}% del total</p>
                </button>)}
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex" aria-label="Distribución proporcional de jornadas">
                {[['DIURNA','#2563eb'],['NOCTURNA','#7c3aed'],['MIXTA','#f59e0b'],['SIN HORARIO','#94a3b8']].map(([nombre,color]) =>
                  <div key={nombre} style={{width:`${porcentaje(cantidadJornada(nombre))}%`,backgroundColor:color}} title={`${nombre}: ${cantidadJornada(nombre)}`} />)}
              </div>
              {(cantidadJornada('MIXTA') > 0 || cantidadJornada('SIN HORARIO') > 0) && <p className="text-xs text-slate-500 mt-3">Mixtas: {cantidadJornada('MIXTA')} · Sin horario: {cantidadJornada('SIN HORARIO')}</p>}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Evolución histórica de secciones</h3>
              <p className="text-sm text-slate-500 mb-5">Grupos actualmente abiertos por ciclo, hasta el ciclo seleccionado.</p>
              {(datosSecciones.historicoSecciones ?? []).length ? <div className="h-72">
                <ResponsiveContainer width="100%" height="100%"><LineChart data={datosSecciones.historicoSecciones} margin={{top:10,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="codigoCiclo" tick={{fontSize:12}}/><YAxis allowDecimals={false} tick={{fontSize:12}}/>
                  <Tooltip/><Line type="monotone" dataKey="cantidad" name="Secciones abiertas" stroke="#2563eb" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                </LineChart></ResponsiveContainer>
              </div> : <p className="text-sm text-slate-500">Sin datos históricos.</p>}
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Estado de ocupación</h3>
              <p className="text-sm text-slate-500 mb-5">Incluye secciones sin estudiantes inscritos.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  ['Llenos', datosSecciones.estadoOcupacion?.llenos, '#dc2626','Sin cupos'],
                  ['Disponibles', datosSecciones.estadoOcupacion?.disponibles, '#059669','Con inscritos y cupos'],
                  ['Vacíos', datosSecciones.estadoOcupacion?.vacios, '#64748b','Sin inscritos']
                ].map(([nombre,cantidad,color,descripcion]) => <div key={nombre} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:color}}/>{nombre}</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{formatoNumero(cantidad ?? 0)}</p><p className="text-xs text-slate-500 mt-1">{descripcion}</p>
                </div>)}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Grupos por carrera</h3>
                <p className="text-sm text-slate-500 mb-5">Carreras identificadas mediante inscripciones confirmadas.</p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {carrerasSecciones.map(c => <button key={c.idCarrera} type="button" onClick={() => {setCarreraSeccionSeleccionada(c.idCarrera);setMateriaSeccionSeleccionada(null);setPaginaSecciones(1);}}
                    className={`w-full text-left flex justify-between items-center gap-3 p-3 rounded-xl border ${carreraSeccionSeleccionada === c.idCarrera ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                    <span className="text-sm font-semibold text-slate-800">{c.nombre}</span><span className="text-xs font-bold text-blue-700 shrink-0">{c.cantidadGrupos} grupos</span>
                  </button>)}
                  {!carrerasSecciones.length && <p className="text-sm text-slate-500">Sin carreras vinculadas por inscripciones.</p>}
                </div>
              </section>
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">Materias y grupos</h3>
                <p className="text-sm text-slate-500 mb-5">{carreraSeccionActiva ? `Materias de ${carreraSeccionActiva.nombre}.` : 'Selecciona una carrera.'}</p>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {materiasSeccion.map(m => <button key={m.idMateria} type="button" onClick={() => {setMateriaSeccionSeleccionada(prev => prev === m.idMateria ? null : m.idMateria);setPaginaSecciones(1);}}
                    className={`w-full text-left flex justify-between items-center gap-3 p-3 rounded-xl border ${materiaSeccionSeleccionada === m.idMateria ? 'bg-blue-50 border-blue-300' : 'bg-slate-50 border-transparent hover:bg-slate-100'}`}>
                    <span className="text-sm font-semibold text-slate-800">{m.nombre}</span><span className="text-xs font-bold text-blue-700 shrink-0">{m.cantidadGrupos} grupos</span>
                  </button>)}
                  {!materiasSeccion.length && <p className="text-sm text-slate-500">Sin materias asociadas.</p>}
                </div>
              </section>
            </div>

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div><h3 className="text-lg font-bold text-slate-900">Detalle de secciones</h3>
                  <p className="text-sm text-slate-500">Todos los grupos abiertos, incluidos los vacíos. {detalleFiltrado.length} resultados.</p></div>
                {(materiaSeccionSeleccionada !== null || jornadaSeleccionada !== 'TODAS') && <button type="button" className="text-sm font-semibold text-blue-700 hover:underline" onClick={() => {setMateriaSeccionSeleccionada(null);setJornadaSeleccionada('TODAS');setPaginaSecciones(1);}}>Limpiar filtros</button>}
              </div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase"><tr>{['Grupo','Materia','Docente','Jornada','Inscritos','Cupo','Ocupación'].map(t => <th key={t} className="px-3 py-3 font-bold">{t}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {detallePaginado.map(g => <tr key={g.idGrupo} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-semibold text-slate-800">{g.codigoGrupo}</td><td className="px-3 py-3 text-slate-700">{g.materia}</td><td className="px-3 py-3 text-slate-600">{g.docente || 'Sin asignar'}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${g.jornada === 'DIURNA' ? 'bg-blue-50 text-blue-700' : g.jornada === 'NOCTURNA' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>{g.jornada}</span></td>
                    <td className="px-3 py-3">{g.inscritos}</td><td className="px-3 py-3">{g.cupoMaximo}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-2 w-16 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${Math.min(100,Math.max(0,Number(g.porcentajeOcupacion ?? 0)))}%`}} /></div><span>{Number(g.porcentajeOcupacion ?? 0).toFixed(1)}%</span></div></td>
                  </tr>)}
                  {!detallePaginado.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No hay grupos para los filtros seleccionados.</td></tr>}
                </tbody>
              </table></div>
              {totalPaginas > 1 && <div className="flex items-center justify-end gap-3 mt-4"><button type="button" disabled={paginaSecciones <= 1} onClick={() => setPaginaSecciones(p => Math.max(1,p-1))} className="text-sm font-semibold text-blue-700 disabled:text-slate-300">Anterior</button><span className="text-xs text-slate-500">{Math.min(paginaSecciones,totalPaginas)} / {totalPaginas}</span><button type="button" disabled={paginaSecciones >= totalPaginas} onClick={() => setPaginaSecciones(p => Math.min(totalPaginas,p+1))} className="text-sm font-semibold text-blue-700 disabled:text-slate-300">Siguiente</button></div>}
            </section>
          </>}
        </div>
      )}

      {kpiActivo === 'cobros' && (
        <DashboardCobros
          key={`cobros-${cicloSeleccionado ?? 'todos'}-${sedeSeleccionada ?? 'todas'}`}
          datos={datosCobros}
          cargando={cargandoCobros}
          error={errorCobros}
        />
      )}

      {/* MÓDULOS PENDIENTES */}
      {kpiActivo !== 'matricula' && kpiActivo !== 'docentes' && kpiActivo !== 'secciones' && kpiActivo !== 'cobros' && (
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
