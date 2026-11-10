
import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const dinero = valor =>
  valor == null
    ? '—'
    : new Intl.NumberFormat('es-SV', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      }).format(Number(valor));

const numero = valor =>
  valor == null
    ? '—'
    : Number(valor).toLocaleString('es-SV');

const porcentaje = valor =>
  valor == null
    ? '—'
    : `${Number(valor).toFixed(1)}%`;

const formatoMes = valor => {
  if (!valor) return '';

  const [anio, mes] = valor.split('-').map(Number);

  return new Intl.DateTimeFormat('es-SV', {
    month: 'short',
    year: 'numeric'
  }).format(new Date(anio, mes - 1, 1));
};

const panel =
  'bg-white rounded-2xl border border-slate-200 shadow-sm p-6';

function SinDatos({
  texto = 'Aún no hay datos disponibles para este apartado y los filtros seleccionados.'
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
      {texto}
    </div>
  );
}

function Titulo({ titulo, subtitulo }) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-bold text-slate-900">
        {titulo}
      </h3>
      {subtitulo && (
        <p className="text-sm text-slate-500 mt-1">
          {subtitulo}
        </p>
      )}
    </div>
  );
}

function Dato({
  titulo,
  valor,
  detalle,
  color = 'text-slate-900'
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-slate-500">
        {titulo}
      </p>
      <p className={`mt-3 text-3xl font-black ${color}`}>
        {valor}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {detalle}
      </p>
    </div>
  );
}

export default function DashboardCobros({
  datos,
  cargando,
  error
}) {
  // TODOS LOS HOOKS DEBEN ESTAR ANTES DE LOS RETURN
  const [
    facultadSeleccionada,
    setFacultadSeleccionada
  ] = useState(null);

  const [filtroMora, setFiltroMora] =
    useState('TODOS');

  const [pagina, setPagina] =
    useState(1);

  const [
    agrupacionProyeccion,
    setAgrupacionProyeccion
  ] = useState('mensual');

  const facultades =
    datos?.morosidadFacultades ?? [];

  const facultadActiva =
    facultades.find(
      f => f.idFacultad === facultadSeleccionada
    ) ?? facultades[0];

  const morosos =
    datos?.estudiantesMorosos ?? [];

  const morososFiltrados = useMemo(
    () =>
      morosos.filter(e => {
        const dias = Number(e.diasAtraso ?? 0);

        return (
          filtroMora === 'TODOS' ||
          (filtroMora === 'DIAS' &&
            dias >= 1 &&
            dias < 30) ||
          (filtroMora === 'MESES' &&
            dias >= 30)
        );
      }),
    [morosos, filtroMora]
  );

  const paginas = Math.max(
    1,
    Math.ceil(morososFiltrados.length / 8)
  );

  const paginaVisible = Math.min(
    pagina,
    paginas
  );

  const filas = morososFiltrados.slice(
    (paginaVisible - 1) * 8,
    paginaVisible * 8
  );

  // PROYECCIÓN MENSUAL O SEMANAL
  const datosProyeccion =
    agrupacionProyeccion === 'mensual'
      ? datos?.proyeccionMensual ?? []
      : datos?.proyeccionSemanal ?? [];

  const datosGraficoProyeccion =
    datosProyeccion.map(item => ({
      ...item,
      recaudacionEsperada: Number(
        item.recaudacionEsperada ?? 0
      ),
      recaudacionReal: Number(
        item.recaudacionReal ?? 0
      )
    }));

  const comportamiento =
    datos?.comportamientoPago;

  const becas =
    datos?.becas;

  // RETORNOS CONDICIONALES DESPUÉS DE LOS HOOKS
  if (cargando) {
    return (
      <div className={panel}>
        Cargando información financiera...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
      >
        {error}
      </div>
    );
  }

  if (!datos) {
    return (
      <SinDatos texto="No se ha recibido información financiera del ciclo seleccionado." />
    );
  }

  const kpis = [
    [
      'Recaudación esperada',
      dinero(datos.recaudacionEsperada),
      'Obligaciones del ciclo'
    ],
    [
      'Recaudación real',
      dinero(datos.recaudacionReal),
      'Pagos confirmados'
    ],
    [
      'Saldo pendiente',
      dinero(datos.saldoPendiente),
      'Por recuperar'
    ],
    [
      'Cumplimiento',
      porcentaje(datos.porcentajeCumplimiento),
      'De la meta financiera'
    ]
  ];

  return (
    <div className="space-y-6">

      {/* 1. RESUMEN FINANCIERO */}
      <section className={panel}>
        <Titulo titulo="Resumen financiero general" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
          {kpis.map(([titulo, valor, detalle]) => (
            <Dato
              key={titulo}
              titulo={titulo}
              valor={valor}
              detalle={detalle}
            />
          ))}
        </div>

        <p className="mt-8 text-xs text-slate-400">
          La recaudación esperada corresponde a las
          obligaciones netas generadas del ciclo.
        </p>
      </section>

      {/* 2. PROYECCIÓN VS RECAUDACIÓN */}
      <section className={panel}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Proyección vs. recaudación real
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Comparación acumulada durante el ciclo académico.
            </p>
          </div>

          <div className="inline-flex self-start rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() =>
                setAgrupacionProyeccion('mensual')
              }
              aria-pressed={
                agrupacionProyeccion === 'mensual'
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                agrupacionProyeccion === 'mensual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Mensual
            </button>

            <button
              type="button"
              onClick={() =>
                setAgrupacionProyeccion('semanal')
              }
              aria-pressed={
                agrupacionProyeccion === 'semanal'
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                agrupacionProyeccion === 'semanal'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semanal
            </button>
          </div>
        </div>

        {datosGraficoProyeccion.length > 0 ? (
          <div className="h-[340px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={datosGraficoProyeccion}
                margin={{
                  top: 12,
                  right: 20,
                  left: 5,
                  bottom: 10
                }}
              >
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey={
                    agrupacionProyeccion === 'mensual'
                      ? 'mes'
                      : 'semana'
                  }
                  tickFormatter={valor =>
                    agrupacionProyeccion === 'mensual'
                      ? formatoMes(valor)
                      : valor
                  }
                  tick={{
                    fill: '#64748b',
                    fontSize: 12
                  }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={15}
                  interval="preserveStartEnd"
                />

                <YAxis
                  tick={{
                    fill: '#64748b',
                    fontSize: 12
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  tickFormatter={valor =>
                    `$${Number(valor).toLocaleString('en-US', {
                      maximumFractionDigits: 0
                    })}`
                  }
                />

                <Tooltip
                  labelFormatter={valor =>
                    agrupacionProyeccion === 'mensual'
                      ? formatoMes(valor)
                      : valor
                  }
                  formatter={(valor, nombre) => [
                    dinero(valor),
                    nombre
                  ]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow:
                      '0 8px 24px rgba(15,23,42,0.08)'
                  }}
                />

                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="line"
                />

                <Line
                  type="monotone"
                  dataKey="recaudacionEsperada"
                  name="Recaudación esperada"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: '#ffffff',
                    strokeWidth: 2
                  }}
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="recaudacionReal"
                  name="Recaudación real"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={{
                    r: 4,
                    fill: '#ffffff',
                    strokeWidth: 2
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <SinDatos texto="No hay datos financieros para la agrupación seleccionada." />
        )}

        <p className="mt-3 text-xs text-slate-400">
          Valores acumulados al cierre de cada período.
          La agrupación no modifica los filtros de ciclo y sede.
        </p>
      </section>

      {/* 3. MOROSIDAD ACADÉMICA */}
      <section className={panel}>
        <Titulo
          titulo="Morosidad académica"
          subtitulo="Selecciona una facultad para consultar sus carreras y saldos vencidos."
        />

        {facultades.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">
                Por facultad
              </h4>

              <div className="space-y-3">
                {facultades.map(f => (
                  <button
                    type="button"
                    key={f.idFacultad}
                    onClick={() =>
                      setFacultadSeleccionada(
                        f.idFacultad
                      )
                    }
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      facultadActiva?.idFacultad ===
                      f.idFacultad
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-700">
                      {f.nombre}
                    </p>

                    <p className="text-2xl font-bold mt-2">
                      {dinero(f.saldoVencido)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-3">
                Carreras de la facultad
              </h4>

              <div className="space-y-3">
                {(facultadActiva?.carreras ?? []).map(c => (
                  <div
                    key={c.idCarrera}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-semibold text-slate-700">
                      {c.nombre}
                    </p>

                    <p className="text-2xl font-bold mt-2">
                      {dinero(c.saldoVencido)}
                    </p>

                    <p className="text-sm text-slate-500 mt-2">
                      {numero(c.estudiantesEnMora)}
                      {' '}estudiantes en mora
                    </p>
                  </div>
                ))}

                {!facultadActiva?.carreras?.length && (
                  <SinDatos texto="Esta facultad no tiene carreras con morosidad registrada." />
                )}
              </div>
            </div>
          </div>
        ) : (
          <SinDatos texto="No hay morosidad por facultad y carrera para los filtros seleccionados." />
        )}
      </section>

      {/* 4. TENDENCIA MENSUAL Y TOP 5 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <section className={panel}>
          <Titulo
            titulo="Tendencia mensual de pagos"
            subtitulo="Comparación de importes pagados puntualmente y con retraso."
          />

          {datos.tendenciaMensualPagos?.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={datos.tendenciaMensualPagos}
                  margin={{
                    top: 10,
                    right: 15,
                    left: 0,
                    bottom: 5
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="mes"
                    tickFormatter={formatoMes}
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tickFormatter={valor =>
                      `$${Number(valor).toLocaleString('en-US')}`
                    }
                    tick={{ fontSize: 12 }}
                    width={65}
                  />

                  <Tooltip
                    labelFormatter={formatoMes}
                    formatter={valor => dinero(valor)}
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="puntuales"
                    name="Pagos puntuales"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="tardios"
                    name="Pagos tardíos"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <SinDatos texto="No hay información mensual de pagos." />
          )}

          <p className="text-xs text-slate-400 mt-4">
            Los importes se clasifican según la fecha de
            pago y el vencimiento de cada obligación.
          </p>
        </section>

        <section className={panel}>
          <Titulo
            titulo="Top 5 carreras con mayor morosidad"
            subtitulo="Carreras con el mayor saldo vencido del ciclo."
          />

          {(datos.topCarrerasMorosas ?? []).length > 0 ? (
            <div className="space-y-5">
              {datos.topCarrerasMorosas.map(
                (carrera, index) => {
                  const maximo = Math.max(
                    ...datos.topCarrerasMorosas.map(
                      c => Number(c.saldoVencido ?? 0)
                    ),
                    1
                  );

                  const porcentajeBarra =
                    Number(carrera.saldoVencido ?? 0) /
                    maximo *
                    100;

                  return (
                    <div key={carrera.idCarrera}>
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-blue-50 text-blue-700 text-sm font-bold">
                            {index + 1}
                          </span>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {carrera.nombre}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              {numero(
                                carrera.estudiantesEnMora
                              )}{' '}
                              estudiantes morosos
                            </p>
                          </div>
                        </div>

                        <span className="font-bold text-rose-700 text-sm whitespace-nowrap">
                          {dinero(carrera.saldoVencido)}
                        </span>
                      </div>

                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{
                            width: `${porcentajeBarra}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <SinDatos texto="No existen carreras con obligaciones vencidas." />
          )}

          <p className="text-xs text-slate-400 mt-6">
            Clasificación por monto vencido, no por
            cantidad de estudiantes.
          </p>
        </section>
      </div>

      {/* 5. COMPORTAMIENTO DE PAGO */}
      <section className={panel}>
        <Titulo titulo="Perfil de comportamiento de pago" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
          <Dato
            titulo="Puntuales"
            valor={numero(comportamiento?.puntuales)}
            detalle="Cumplen sus vencimientos"
            color="text-emerald-700"
          />

          <Dato
            titulo="Pago completo"
            valor={numero(comportamiento?.pagoCompleto)}
            detalle="Cancelaron el ciclo anticipadamente"
            color="text-blue-700"
          />

          <Dato
            titulo="Retrasos de días"
            valor={numero(comportamiento?.retrasosDias)}
            detalle="Atrasos menores a 30 días"
            color="text-amber-700"
          />

          <Dato
            titulo="Retrasos de meses"
            valor={numero(comportamiento?.retrasosMeses)}
            detalle="Atrasos de 30 días o más"
            color="text-rose-700"
          />
        </div>

        {!comportamiento && (
          <p className="mt-6 text-sm text-slate-500">
            Indicadores pendientes de cálculo en el backend.
          </p>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Los indicadores pueden superponerse: quien pagó
          el ciclo completo también puede ser puntual.
        </p>
      </section>

      {/* 6. IMPACTO FINANCIERO DE BECAS */}
      <section className={panel}>
        <Titulo titulo="Impacto financiero de becas" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <Dato
            titulo="Becarios activos"
            valor={numero(becas?.becariosActivos)}
            detalle="Estudiantes"
          />

          <Dato
            titulo="Monto becado"
            valor={dinero(becas?.montoBecado)}
            detalle="Beneficios del ciclo"
          />

          <Dato
            titulo="Cobertura"
            valor={porcentaje(becas?.cobertura)}
            detalle="De la proyección bruta"
          />
        </div>

        {!becas && (
          <p className="mt-6 text-sm text-slate-500">
            Pendiente de consultar beneficios y descuentos aplicados.
          </p>
        )}

        <p className="mt-6 text-xs text-slate-400">
          Los montos becados no se consideran deuda
          pendiente del estudiante.
        </p>
      </section>

      {/* 7. ESTUDIANTES MOROSOS */}
      <section className={panel}>
        <Titulo titulo="Estudiantes con obligaciones vencidas" />

        <div
          className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 mb-5"
          role="group"
          aria-label="Filtrar días de atraso"
        >
          {[
            ['TODOS', 'Todos'],
            ['DIAS', '1–29 días'],
            ['MESES', '30+ días']
          ].map(([valor, etiqueta]) => (
            <button
              type="button"
              key={valor}
              onClick={() => {
                setFiltroMora(valor);
                setPagina(1);
              }}
              aria-pressed={filtroMora === valor}
              className={`rounded-lg px-2 py-2 text-sm font-semibold ${
                filtroMora === valor
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[650px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                {[
                  'Estudiante',
                  'Deuda',
                  'Atraso',
                  'Estado'
                ].map(h => (
                  <th
                    key={h}
                    className="py-3 px-2 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filas.map(e => (
                <tr key={e.idEstudiante}>
                  <td className="px-2 py-3">
                    <p className="font-semibold text-slate-800">
                      {e.nombre}
                    </p>
                    <p className="text-xs text-slate-500">
                      {e.carrera}
                    </p>
                  </td>

                  <td className="px-2 py-3 font-medium">
                    {dinero(e.deuda)}
                  </td>

                  <td className="px-2 py-3">
                    {numero(e.diasAtraso)} días
                  </td>

                  <td className="px-2 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        Number(e.diasAtraso) >= 30
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      {Number(e.diasAtraso) >= 30
                        ? '30+ días'
                        : '1–29 días'}
                    </span>
                  </td>
                </tr>
              ))}

              {!filas.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-slate-500"
                  >
                    {morosos.length
                      ? 'Sin estudiantes para el filtro seleccionado.'
                      : 'No hay estudiantes con morosidad registrada.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginas > 1 && (
          <div className="mt-5 flex justify-end items-center gap-4 text-sm">
            <button
              type="button"
              disabled={paginaVisible === 1}
              onClick={() =>
                setPagina(p => Math.max(1, p - 1))
              }
              className="text-blue-700 disabled:text-slate-300"
            >
              Anterior
            </button>

            <span className="text-slate-500">
              {paginaVisible} / {paginas}
            </span>

            <button
              type="button"
              disabled={paginaVisible === paginas}
              onClick={() =>
                setPagina(p => Math.min(paginas, p + 1))
              }
              className="text-blue-700 disabled:text-slate-300"
            >
              Siguiente
            </button>
          </div>
        )}
      </section>

    </div>
  );
}
