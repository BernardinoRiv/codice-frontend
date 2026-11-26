import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiInterceptor from '../../services/apiInterceptor';

const MIN_ASISTENCIA = 80;
const NOTA_APROBACION = 6;

const TONOS = {
  verde: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ambar: 'border-amber-200 bg-amber-50 text-amber-700',
  rojo: 'border-red-200 bg-red-50 text-red-700',
  neutro: 'border-gray-200 bg-gray-50 text-gray-600',
};

function obtenerDato(objeto, claves, valorPorDefecto = '') {
  for (const clave of claves) {
    const valor = objeto?.[clave];
    if (valor !== null && valor !== undefined && valor !== '') return valor;
  }
  return valorPorDefecto;
}

function texto(valor, vacio = '—') {
  if (valor === null || valor === undefined) return vacio;
  const resultado = String(valor).trim();
  return resultado || vacio;
}

function numero(valor, porDefecto = 0) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : porDefecto;
  if (valor === null || valor === undefined || valor === '') return porDefecto;
  const resultado = Number.parseFloat(String(valor).replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(resultado) ? resultado : porDefecto;
}

function formatoNumero(valor, decimales = 2) {
  return numero(valor).toFixed(decimales);
}

function booleano(valor) {
  return valor === true || valor === 'true' || valor === 1 || valor === '1';
}

function formatearFecha(valor) {
  const original = String(valor ?? '').trim();
  if (!original) return '';
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(original);
  if (coincidencia) return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
  const fecha = new Date(original);
  if (!Number.isNaN(fecha.getTime())) return fecha.toLocaleDateString('es-ES');
  return original;
}

function clamp(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, numero(valor)));
}

function normalizarLista(valor, claves = []) {
  if (Array.isArray(valor)) return valor;
  if (!valor || typeof valor !== 'object') return [];
  for (const clave of ['data', 'resultado', ...claves]) {
    const contenido = valor[clave];
    if (Array.isArray(contenido)) return contenido;
    if (contenido && typeof contenido === 'object' && Array.isArray(contenido.data)) return contenido.data;
  }
  return [];
}

function formatearHora(valor) {
  const original = String(valor ?? '').trim();
  if (!original) return '—';
  const coincidencia = /^(\d{1,2}:\d{2})/.exec(original);
  if (coincidencia) return coincidencia[1];
  const fecha = new Date(original);
  if (!Number.isNaN(fecha.getTime())) {
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return original.slice(0, 5);
}

function diasParaVencer(item) {
  const explicito = obtenerDato(item, ['diasParaVencer', 'diasRestantes', 'diasHabilesRestantes'], null);
  if (explicito !== null) return numero(explicito, 0);
  const fecha = obtenerDato(item, ['fechaFin', 'fechaCierre', 'fechaVencimiento'], '');
  if (!fecha) return null;
  const objetivo = new Date(fecha);
  if (Number.isNaN(objetivo.getTime())) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  objetivo.setHours(0, 0, 0, 0);
  return Math.ceil((objetivo.getTime() - hoy.getTime()) / 86400000);
}

function estadoEvaluacion(item) {
  const abiertaHoy = obtenerDato(item, ['abiertaHoy', 'estaAbiertaHoy'], false);
  const estado = texto(obtenerDato(item, ['estado', 'estadoEvaluacion'], ''), '').toUpperCase();
  const dias = diasParaVencer(item);
  if (abiertaHoy === true || estado.includes('ABIERTA') || (dias !== null && dias <= 0)) {
    return { etiqueta: 'Abierta hoy', tono: 'verde' };
  }
  if (dias !== null && dias > 0) {
    return { etiqueta: `Vence en ${dias} día${dias === 1 ? '' : 's'}`, tono: dias <= 2 ? 'rojo' : 'ambar' };
  }
  return { etiqueta: 'Próxima', tono: 'neutro' };
}

function variacionCum(valor) {
  const cantidad = numero(valor);
  const tono = cantidad > 0 ? 'verde' : cantidad < 0 ? 'rojo' : 'neutro';
  const etiqueta = typeof valor === 'string' && /vs/i.test(valor)
    ? valor
    : `${cantidad > 0 ? '+' : ''}${cantidad.toFixed(2)} vs ciclo anterior`;
  return { etiqueta, tono };
}

function estadoAsistencia(estado, porcentaje) {
  const valor = texto(estado, '').toUpperCase();
  if (valor.includes('RIESGO') || valor.includes('BAJO')) return { etiqueta: 'Bajo el 80%', tono: 'rojo' };
  if (valor.includes('PREVENTIVO') || valor.includes('CERCA')) return { etiqueta: 'Cerca del 80%', tono: 'ambar' };
  if (valor.includes('OPTIMO') || valor.includes('ÓPTIMO')) return { etiqueta: 'Óptimo', tono: 'verde' };
  if (porcentaje < MIN_ASISTENCIA) return { etiqueta: 'Bajo el 80%', tono: 'rojo' };
  if (porcentaje < 85) return { etiqueta: 'Cerca del 80%', tono: 'ambar' };
  return { etiqueta: 'Óptimo', tono: 'verde' };
}

function tonoAlerta(nivel) {
  const valor = texto(nivel, '').toUpperCase();
  if (valor.includes('RIESGO')) return 'rojo';
  if (valor.includes('PREVENTIVO')) return 'ambar';
  return 'verde';
}

function calcularPorcentaje(asistidas, inasistencias) {
  const total = asistidas + inasistencias;
  if (total <= 0) return 0;
  return (asistidas / total) * 100;
}

function normalizarEvolucion(valor) {
  return normalizarLista(valor, ['evolucionCum', 'ciclos', 'historial']).map(item => ({
    ciclo: texto(obtenerDato(item, ['codigoCiclo', 'codigo', 'ciclo', 'nombreCiclo', 'periodo']), '—'),
    cumAcumulado: numero(obtenerDato(item, ['cumAcumulado', 'cum', 'cumFinal'], 0)),
    promedioCiclo: numero(obtenerDato(item, ['promedioCiclo', 'promedio', 'promedioPeriodo'], 0)),
    materiasAprobadas: numero(obtenerDato(item, ['materiasAprobadas', 'cantidadMateriasAprobadas', 'aprobadas'], 0)),
  }));
}

function normalizarMateriaAsistencia(materia) {
  const inasistencias = numero(obtenerDato(materia, ['inasistencias', 'totalInasistencias', 'ausencias', 'faltas'], 0));
  const asistidas = numero(obtenerDato(materia, ['asistidas', 'asistencias', 'presentes', 'totalAsistencias'], 0));
  const porcentajeExplicito = obtenerDato(
    materia,
    ['porcentajeAsistencia', 'porcentaje', 'asistenciaPorcentaje'],
    null
  );
  const porcentaje = porcentajeExplicito === null
    ? calcularPorcentaje(asistidas, inasistencias)
    : numero(porcentajeExplicito);
  const nivel = texto(
    obtenerDato(materia, ['nivelAlerta'], ''),
    ''
  ).toUpperCase() || (porcentaje < MIN_ASISTENCIA ? 'EN_RIESGO' : porcentaje < 85 ? 'PREVENTIVO' : 'OPTIMO');

  return {
    nombre: texto(obtenerDato(materia, ['nombreMateria', 'materia', 'asignatura', 'nombre']), 'Materia'),
    codigo: texto(obtenerDato(materia, ['codigoMateria', 'codigo', 'codigoAsignatura']), ''),
    inasistencias,
    asistidas,
    tardanzas: numero(obtenerDato(materia, ['tardanzas', 'totalTardanzas'], 0)),
    justificadas: numero(obtenerDato(materia, ['justificadas', 'totalJustificadas', 'inasistenciasJustificadas'], 0)),
    porcentaje,
    nivelAlerta: nivel,
  };
}

function normalizarCicloAsistencia(item) {
  if (!item || typeof item !== 'object') return null;
  const materias = normalizarLista(
    obtenerDato(item, ['materias', 'asistencias', 'detalle', 'detalles'], item.materias ?? []),
    ['materias', 'asistencias', 'detalle', 'detalles']
  );
  return {
    idCiclo: obtenerDato(item, ['idCiclo', 'id', 'codigoCiclo', 'codigo'], ''),
    codigo: texto(obtenerDato(item, ['codigoCiclo', 'codigo', 'nombreCiclo', 'nombre']), 'Ciclo'),
    materias: materias.map(normalizarMateriaAsistencia).sort((a, b) => b.inasistencias - a.inasistencias),
  };
}

function normalizarCiclosAsistencia(valor) {
  if (!valor) return [];
  if (Array.isArray(valor)) {
    return valor.map(normalizarCicloAsistencia).filter(Boolean);
  }
  if (typeof valor !== 'object') return [];

  const lista = obtenerDato(valor, ['ciclos', 'data', 'resultado'], null);
  if (Array.isArray(lista)) return lista.map(normalizarCicloAsistencia).filter(Boolean);

  const materias = obtenerDato(valor, ['materias', 'asistencias', 'detalle', 'detalles'], null);
  if (Array.isArray(materias)) {
    const ciclo = normalizarCicloAsistencia(valor);
    return ciclo ? [ciclo] : [];
  }

  return Object.entries(valor)
    .map(([clave, contenido]) => normalizarCicloAsistencia({
      idCiclo: clave,
      codigoCiclo: clave,
      materias: contenido,
    }))
    .filter(Boolean);
}

function Pill({ tono = 'neutro', children }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${TONOS[tono] || TONOS.neutro}`}>
      {children}
    </span>
  );
}

function TarjetaKpi({ titulo, valor, badge, valorClase = '', children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">{titulo}</p>
        {badge}
      </div>
      <div className={`mt-3 text-3xl font-extrabold tracking-tight ${valorClase || 'text-gray-900'}`}>{valor}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TarjetaBloque({ titulo, descripcion, acciones, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-6 py-5">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">{titulo}</h2>
          {descripcion && <p className="mt-1 text-xs text-gray-500">{descripcion}</p>}
        </div>
        {acciones}
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function EstadoVacio({ titulo, descripcion }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
      <p className="text-sm font-bold text-gray-700">{titulo}</p>
      <p className="mt-1 text-xs text-gray-500">{descripcion}</p>
    </div>
  );
}

function BarraProgreso({ valor, marca }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full bg-gray-900 transition-all" style={{ width: `${clamp(valor, 0, 100)}%` }} />
      {marca !== undefined && (
        <span className="absolute inset-y-0 w-0.5 bg-amber-500" style={{ left: `${clamp(marca, 0, 100)}%` }} />
      )}
    </div>
  );
}

function TooltipEvolucionCum({ active, payload }) {
  if (!active || !payload?.length) return null;
  const punto = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-xs font-extrabold text-gray-900">{punto.ciclo}</p>
      <div className="mt-2 space-y-1 text-xs text-gray-600">
        <p>CUM acumulado: <span className="font-bold text-gray-900">{formatoNumero(punto.cumAcumulado)}</span></p>
        <p>Promedio del ciclo: <span className="font-bold text-gray-900">{formatoNumero(punto.promedioCiclo)}</span></p>
        <p>Materias aprobadas: <span className="font-bold text-gray-900">{punto.materiasAprobadas}</span></p>
      </div>
    </div>
  );
}

const DashboardEstudiante = () => {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [idCicloAsistencia, setIdCicloAsistencia] = useState('');
  const [puntoSeleccionado, setPuntoSeleccionado] = useState(null);

  useEffect(() => {
    let activo = true;
    const cargarDashboard = async () => {
      setCargando(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setCargando(false);
        toast.error('No se pudo cargar tu dashboard', { description: 'No hay una sesión activa.' });
        return;
      }
      try {
        const response = await apiInterceptor(
          '/api/v1/estudiante/dashboard',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.mensaje || errorData.message || `Error ${response.status}`);
        }
        const payload = await response.json().catch(() => ({}));
        if (activo) setDatos(payload?.data ?? payload ?? {});
      } catch (error) {
        if (activo) toast.error('No se pudo cargar tu dashboard', { description: error.message });
      } finally {
        if (activo) setCargando(false);
      }
    };
    cargarDashboard();
    return () => { activo = false; };
  }, []);

  const cuerpo = datos?.data ?? datos ?? {};
  const kpis = cuerpo.kpis ?? {};
  const clasesHoy = normalizarLista(cuerpo.clasesHoy, ['clases']);
  const evaluacionesProximas = normalizarLista(cuerpo.evaluacionesProximas, ['evaluaciones']);
  const evolucionCum = normalizarEvolucion(cuerpo.evolucionCum);
  const ciclosAsistencia = normalizarCiclosAsistencia(cuerpo.asistenciasPorCiclo);
  const idCicloActivo = obtenerDato(
    cuerpo,
    ['idCicloActivo'],
    obtenerDato(cuerpo.asistenciasPorCiclo, ['idCicloActivo'], '')
  );

  const cicloSeleccionado = ciclosAsistencia.find(ciclo => String(ciclo.idCiclo) === String(idCicloAsistencia))
    || ciclosAsistencia.find(ciclo => String(ciclo.idCiclo) === String(idCicloActivo))
    || ciclosAsistencia[0];
  const materiasAsistencia = cicloSeleccionado?.materias ?? [];

  const cumActual = formatoNumero(obtenerDato(kpis, ['cumActual', 'cum'], 0));
  const variacion = variacionCum(obtenerDato(kpis, ['variacionCum', 'variacionCumActual'], 0));
  const porcentajeAvance = numero(obtenerDato(kpis, ['porcentajeAvance', 'avanceCarrera'], 0));
  const materiasAprobadas = numero(obtenerDato(kpis, ['materiasAprobadas'], 0));
  const totalMateriasPensum = numero(obtenerDato(kpis, ['totalMateriasPensum', 'totalMaterias'], 0));
  const uvAprobadas = numero(obtenerDato(kpis, ['uvAprobadas'], 0));
  const porcentajeAsistencia = numero(
    obtenerDato(kpis, ['porcentajeAsistenciaCicloActual', 'porcentajeAsistencia'], 0)
  );
  const asistencia = estadoAsistencia(
    obtenerDato(kpis, ['estadoAsistenciaGlobal'], ''),
    porcentajeAsistencia
  );

  const cuotasPendientes = numero(obtenerDato(kpis, ['cuotasPendientes'], 0));
  const cuotasEnMora = numero(obtenerDato(kpis, ['cuotasEnMora'], 0));
  const montoMoraTotal = numero(obtenerDato(kpis, ['montoMoraTotal'], 0));
  const saldoPendienteCiclo = numero(obtenerDato(kpis, ['saldoPendienteCiclo'], 0));
  const solvente = booleano(obtenerDato(kpis, ['solvente'], false));
  const enMora = booleano(obtenerDato(kpis, ['enMora'], false)) || cuotasEnMora > 0;
  const proximoPagoConcepto = texto(obtenerDato(kpis, ['proximoPagoConcepto'], ''), '');
  const proximoPagoMonto = numero(obtenerDato(kpis, ['proximoPagoMonto'], 0));
  const proximoPagoFechaVencimiento = obtenerDato(kpis, ['proximoPagoFechaVencimiento'], '');
  const proximoPagoVencido = booleano(obtenerDato(kpis, ['proximoPagoVencido'], false));
  const estadoCuentaBadge = enMora ? (
    <Pill tono="rojo">
      En mora{montoMoraTotal > 0 ? ` · +$${formatoNumero(montoMoraTotal)} mora` : ''}
    </Pill>
  ) : cuotasPendientes > 0 ? (
    <Pill tono="ambar">Pendiente</Pill>
  ) : solvente ? (
    <Pill tono="verde">Solvente</Pill>
  ) : null;

  if (cargando) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 animate-in fade-in duration-500">
        {[0, 1, 2, 3].map(item => (
          <div key={item} className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaKpi titulo="CUM Actual" valor={cumActual}>
          <Pill tono={variacion.tono}>{variacion.etiqueta}</Pill>
        </TarjetaKpi>

        <TarjetaKpi titulo="Avance de Carrera" valor={`${formatoNumero(porcentajeAvance, 1)}%`}>
          <BarraProgreso valor={porcentajeAvance} />
          <p className="mt-2 text-xs text-gray-500">
            {materiasAprobadas} de {totalMateriasPensum} materias · {uvAprobadas} UV
          </p>
        </TarjetaKpi>

        <TarjetaKpi titulo="Asistencia del Ciclo" valor={`${formatoNumero(porcentajeAsistencia, 1)}%`}>
          <Pill tono={asistencia.tono}>{asistencia.etiqueta}</Pill>
          <p className="mt-2 text-xs text-gray-500">Mínimo institucional: 80%</p>
        </TarjetaKpi>

        <TarjetaKpi
          titulo="Estado de Cuenta"
          valor={`$${formatoNumero(saldoPendienteCiclo)}`}
          badge={estadoCuentaBadge}
          valorClase={enMora ? 'text-red-600' : 'text-gray-900'}
        >
          <p className="text-xs text-gray-500">
            {cuotasPendientes > 0 ? `${cuotasPendientes} cuota(s) pendiente(s)` : 'Sin saldos pendientes'}
          </p>
          {proximoPagoConcepto && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                {proximoPagoVencido ? 'Pago vencido por regularizar' : 'Próximo pago'}
              </p>
              <p className="mt-1 text-xs font-bold text-gray-900">
                {proximoPagoConcepto} · ${formatoNumero(proximoPagoMonto)}
              </p>
              {proximoPagoFechaVencimiento && (
                <p className={`mt-1 text-[11px] font-semibold ${proximoPagoVencido ? 'text-red-600' : 'text-gray-500'}`}>
                  {proximoPagoVencido ? 'Venció el' : 'Vence el'} {formatearFecha(proximoPagoFechaVencimiento)}
                </p>
              )}
            </div>
          )}
          <Link
            to="/dashboard/mi-estado-cuenta"
            className="mt-3 inline-block text-xs font-bold text-gray-900 hover:underline"
          >
            Ver estado de cuenta →
          </Link>
        </TarjetaKpi>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TarjetaBloque titulo="Clases de hoy" descripcion="Tu agenda académica de la jornada actual.">
          {clasesHoy.length === 0 ? (
            <EstadoVacio
              titulo="No tienes clases programadas hoy"
              descripcion="Disfruta el tiempo libre o revisa tus próximas evaluaciones."
            />
          ) : (
            <div className="space-y-3">
              {clasesHoy.map((clase, indice) => {
                const enCurso = obtenerDato(clase, ['enCurso'], false) === true;
                return (
                  <article
                    key={`clase-${indice}`}
                    className={`rounded-xl border px-4 py-3 ${enCurso ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-900">
                          {formatearHora(obtenerDato(clase, ['horaInicio']))} - {formatearHora(obtenerDato(clase, ['horaFin']))}
                        </p>
                        <p className="mt-1 text-sm font-bold text-gray-900">
                          {texto(obtenerDato(clase, ['nombreMateria', 'materia', 'asignatura']), 'Materia')}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Grupo {texto(obtenerDato(clase, ['grupo', 'codigoGrupo', 'nombreGrupo']), '—')} · Aula {texto(obtenerDato(clase, ['aula', 'salon']), '—')}
                        </p>
                      </div>
                      {enCurso && <Pill tono="neutro">En curso</Pill>}
                    </div>
                    {enCurso && (
                      <Link
                        to="/dashboard/escanear-asistencia"
                        className="mt-3 inline-flex rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-gray-800"
                      >
                        Escanear asistencia
                      </Link>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </TarjetaBloque>

        <TarjetaBloque titulo="Evaluaciones próximas" descripcion="Laboratorios y parciales abiertos o próximos a vencer.">
          {evaluacionesProximas.length === 0 ? (
            <EstadoVacio
              titulo="No hay evaluaciones activas"
              descripcion="Cuando se abra un laboratorio o parcial, aparecerá aquí."
            />
          ) : (
            <div className="space-y-3">
              {evaluacionesProximas.map((evaluacion, indice) => {
                const estado = estadoEvaluacion(evaluacion);
                const tipo = texto(obtenerDato(evaluacion, ['tipoEvaluacion', 'nombreEvaluacion']), 'Evaluación');
                const numeroEvaluacion = obtenerDato(evaluacion, ['numeroEvaluacion'], '');
                const titulo = texto(
                  obtenerDato(evaluacion, ['titulo', 'nombreEvaluacion']),
                  `${tipo} ${numeroEvaluacion}`.trim()
                );
                return (
                  <article
                    key={`evaluacion-${indice}`}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">{titulo}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {texto(obtenerDato(evaluacion, ['nombreMateria', 'materia', 'asignatura']), 'Materia')}
                      </p>
                    </div>
                    <Pill tono={estado.tono}>{estado.etiqueta}</Pill>
                    <Link
                      to="/dashboard/mis-notas"
                      className="w-full text-xs font-bold text-gray-900 hover:underline"
                    >
                      Ir a mis notas →
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </TarjetaBloque>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Línea de tiempo del CUM</h2>
            <p className="mt-1 text-xs text-gray-500">Evolución por ciclo finalizado y promedio de cada periodo.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-gray-600">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-6 bg-gray-900" /> CUM acumulado
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-slate-500" /> Promedio del ciclo
            </span>
          </div>
        </header>
        <div className="p-6">
          {evolucionCum.length === 0 ? (
            <EstadoVacio
              titulo="Aún no hay ciclos finalizados"
              descripcion="La línea de tiempo aparecerá al cerrar tu primer ciclo."
            />
          ) : (
            <>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={evolucionCum}
                    margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                    onClick={estado => {
                      const punto = estado?.activePayload?.[0]?.payload;
                      if (punto) setPuntoSeleccionado(punto);
                    }}
                  >
                    <CartesianGrid stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="ciclo" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 6, 8, 10]}
                      tick={{ fill: '#6B7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TooltipEvolucionCum />} cursor={{ stroke: '#D1D5DB', strokeDasharray: '4 4' }} />
                    <ReferenceLine
                      y={NOTA_APROBACION}
                      stroke="#F59E0B"
                      strokeDasharray="4 4"
                      label={{ value: 'Mínimo 6.0', position: 'insideTopRight', fill: '#B45309', fontSize: 11 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cumAcumulado"
                      name="CUM acumulado"
                      stroke="#111827"
                      strokeWidth={3}
                      dot={{ r: 3, fill: '#111827' }}
                      activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#111827', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="promedioCiclo"
                      name="Promedio del ciclo"
                      stroke="#64748B"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      dot={{ r: 3, fill: '#64748B' }}
                      activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#64748B', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {puntoSeleccionado && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                  <span className="font-extrabold text-gray-900">{puntoSeleccionado.ciclo}</span>
                  {' · CUM acumulado '}
                  <span className="font-bold text-gray-900">{formatoNumero(puntoSeleccionado.cumAcumulado)}</span>
                  {' · Promedio del ciclo '}
                  <span className="font-bold text-gray-900">{formatoNumero(puntoSeleccionado.promedioCiclo)}</span>
                  {' · Materias aprobadas '}
                  <span className="font-bold text-gray-900">{puntoSeleccionado.materiasAprobadas}</span>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Asistencias e inasistencias por materia</h2>
            <p className="mt-1 text-xs text-gray-500">Ordenado por mayor cantidad de inasistencias.</p>
            <p className="mt-2 text-xs text-gray-500">
              Referencia: mínimo institucional del <span className="font-bold text-gray-900">80% de asistencia</span>.
            </p>
          </div>
          <select
            value={cicloSeleccionado?.idCiclo ?? ''}
            onChange={evento => setIdCicloAsistencia(evento.target.value)}
            disabled={ciclosAsistencia.length === 0}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50"
          >
            {ciclosAsistencia.length === 0 && <option value="">Sin ciclos disponibles</option>}
            {ciclosAsistencia.map(ciclo => (
              <option key={ciclo.idCiclo} value={ciclo.idCiclo}>{ciclo.codigo}</option>
            ))}
          </select>
        </header>
        <div className="p-6">
          {materiasAsistencia.length === 0 ? (
            <EstadoVacio
              titulo="Sin detalle de asistencia"
              descripcion="No hay información de asistencias para el ciclo seleccionado."
            />
          ) : (
            <div className="space-y-3">
              {materiasAsistencia.map((materia, indice) => (
                <article key={`asistencia-${indice}`} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{materia.nombre}</p>
                      <p className="mt-0.5 text-xs text-gray-400">Código {materia.codigo || '—'}</p>
                    </div>
                    <Pill tono={tonoAlerta(materia.nivelAlerta)}>{materia.nivelAlerta}</Pill>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Inasistencias</p>
                      <p className="mt-1 text-base font-extrabold text-gray-900">{materia.inasistencias}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Asistidas</p>
                      <p className="mt-1 text-base font-extrabold text-gray-900">{materia.asistidas}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Tardanzas</p>
                      <p className="mt-1 text-base font-extrabold text-gray-900">{materia.tardanzas}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Justificadas</p>
                      <p className="mt-1 text-base font-extrabold text-gray-900">{materia.justificadas}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1">
                      <BarraProgreso valor={materia.porcentaje} marca={MIN_ASISTENCIA} />
                    </div>
                    <span className="w-16 text-right text-xs font-extrabold text-gray-900">
                      {formatoNumero(materia.porcentaje, 1)}%
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardEstudiante;
