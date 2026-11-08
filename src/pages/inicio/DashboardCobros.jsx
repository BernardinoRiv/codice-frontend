import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const dinero = valor => valor == null ? '—' : new Intl.NumberFormat('es-SV', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2
}).format(Number(valor));
const numero = valor => valor == null ? '—' : Number(valor).toLocaleString('es-SV');
const porcentaje = valor => valor == null ? '—' : `${Number(valor).toFixed(1)}%`;
const panel = 'bg-white rounded-2xl border border-slate-200 shadow-sm p-6';

function SinDatos({ texto = 'Aún no hay datos disponibles para este apartado y los filtros seleccionados.' }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">{texto}</div>;
}
function Titulo({ titulo, subtitulo }) {
  return <div className="mb-5"><h3 className="text-lg font-bold text-slate-900">{titulo}</h3>{subtitulo && <p className="text-sm text-slate-500 mt-1">{subtitulo}</p>}</div>;
}
function Dato({ titulo, valor, detalle, color = 'text-slate-900' }) {
  return <div className="min-w-0"><p className="text-sm font-medium text-slate-500">{titulo}</p><p className={`mt-3 text-3xl font-black ${color}`}>{valor}</p><p className="mt-2 text-sm text-slate-500">{detalle}</p></div>;
}

/**
 * Contrato de datos ampliado (todas las propiedades son opcionales hasta que
 * sus consultas estén disponibles):
 * datos.proyeccionSemanal: [{semana, recaudacionEsperada, recaudacionReal}]
 * datos.morosidadFacultades: [{idFacultad, nombre, saldoVencido,
 *   carreras:[{idCarrera,nombre,saldoVencido,estudiantesEnMora}]}]
 * datos.pagosSemanales: [{semana, monto}]
 * datos.comportamientoPago: {puntuales,pagoCompleto,retrasosDias,retrasosMeses}
 * datos.becas: {becariosActivos,montoBecado,cobertura}
 * datos.estudiantesMorosos: [{idEstudiante,nombre,carrera,deuda,diasAtraso}]
 */
export default function DashboardCobros({ datos, cargando, error }) {
  const [facultadSeleccionada, setFacultadSeleccionada] = useState(null);
  const [filtroMora, setFiltroMora] = useState('TODOS');
  const [pagina, setPagina] = useState(1);

  const facultades = datos?.morosidadFacultades ?? [];
  const facultadActiva = facultades.find(f => f.idFacultad === facultadSeleccionada) ?? facultades[0];
  const morosos = datos?.estudiantesMorosos ?? [];
  const morososFiltrados = useMemo(() => morosos.filter(e => {
    const dias = Number(e.diasAtraso ?? 0);
    return filtroMora === 'TODOS' || (filtroMora === 'DIAS' && dias >= 1 && dias < 30) || (filtroMora === 'MESES' && dias >= 30);
  }), [morosos, filtroMora]);
  const paginas = Math.max(1, Math.ceil(morososFiltrados.length / 8));
  const paginaVisible = Math.min(pagina, paginas);
  const filas = morososFiltrados.slice((paginaVisible - 1) * 8, paginaVisible * 8);

  if (cargando) return <div className={panel}>Cargando información financiera...</div>;
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div>;
  if (!datos) return <SinDatos texto="No se ha recibido información financiera del ciclo seleccionado." />;

  const kpis = [
    ['Recaudación esperada', dinero(datos.recaudacionEsperada), 'Obligaciones del ciclo'],
    ['Recaudación real', dinero(datos.recaudacionReal), 'Pagos confirmados'],
    ['Saldo pendiente', dinero(datos.saldoPendiente), 'Por recuperar'],
    ['Cumplimiento', porcentaje(datos.porcentajeCumplimiento), 'De la meta financiera']
  ];
  const comportamiento = datos.comportamientoPago;
  const becas = datos.becas;

  return <div className="space-y-6">
    {/* 1. Resumen: una sola tarjeta con cuadrícula interna 2 × 2 */}
    <section className={panel}>
      <Titulo titulo="Resumen financiero general" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
        {kpis.map(([titulo, valor, detalle]) => <Dato key={titulo} titulo={titulo} valor={valor} detalle={detalle} />)}
      </div>
      <p className="mt-8 text-xs text-slate-400">La recaudación esperada corresponde a las obligaciones netas ya generadas del ciclo.</p>
    </section>

    {/* 2. Dos líneas acumuladas */}
    <section className={panel}>
      <Titulo titulo="Proyección vs. recaudación real" subtitulo="Comparación acumulada durante el ciclo académico." />
      {datos.proyeccionSemanal?.length ? <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos.proyeccionSemanal} margin={{top:10,right:20,left:5,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="semana" /><YAxis tickFormatter={v => `$${Number(v).toLocaleString('en-US')}`} />
            <Tooltip formatter={v => dinero(v)} /><Legend />
            <Line type="monotone" dataKey="recaudacionEsperada" name="Recaudación esperada" stroke="#2563eb" strokeWidth={3} dot={{r:4}} />
            <Line type="monotone" dataKey="recaudacionReal" name="Recaudación real" stroke="#16a34a" strokeWidth={3} dot={{r:4}} />
          </LineChart>
        </ResponsiveContainer>
      </div> : <SinDatos texto="Pendiente de obtener la evolución semanal acumulada desde el backend." />}
    </section>

    {/* 3. Selector maestro-detalle por facultad */}
    <section className={panel}>
      <Titulo titulo="Morosidad académica" subtitulo="Selecciona una facultad para consultar sus carreras y saldos vencidos." />
      {facultades.length ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div><h4 className="font-semibold text-slate-800 mb-3">Por facultad</h4><div className="space-y-3">
          {facultades.map(f => <button type="button" key={f.idFacultad} onClick={() => setFacultadSeleccionada(f.idFacultad)}
            className={`w-full text-left rounded-xl border p-4 transition-colors ${facultadActiva?.idFacultad === f.idFacultad ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400' : 'border-slate-200 hover:bg-slate-50'}`}>
            <p className="text-sm font-semibold text-slate-700">{f.nombre}</p><p className="text-2xl font-bold mt-2">{dinero(f.saldoVencido)}</p>
          </button>)}
        </div></div>
        <div><h4 className="font-semibold text-slate-800 mb-3">Carreras de la facultad</h4><div className="space-y-3">
          {(facultadActiva?.carreras ?? []).map(c => <div key={c.idCarrera} className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-700">{c.nombre}</p><p className="text-2xl font-bold mt-2">{dinero(c.saldoVencido)}</p>
            <p className="text-sm text-slate-500 mt-2">{numero(c.estudiantesEnMora)} estudiantes en mora</p>
          </div>)}
          {!facultadActiva?.carreras?.length && <SinDatos texto="Esta facultad no tiene carreras con morosidad registrada." />}
        </div></div>
      </div> : <SinDatos texto="Pendiente de obtener la morosidad por facultad y carrera desde el backend." />}
    </section>

    {/* 4. Barras semanales, no acumuladas */}
    <section className={panel}>
      <Titulo titulo="Tendencia semanal de pagos" subtitulo="Ingresos confirmados por semana, no acumulados." />
      {datos.pagosSemanales?.length ? <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos.pagosSemanales} margin={{top:10,right:20,left:5,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="semana" /><YAxis tickFormatter={v => `$${Number(v).toLocaleString('en-US')}`} />
          <Tooltip formatter={v => dinero(v)} /><Bar dataKey="monto" name="Ingresos confirmados" fill="#2563eb" radius={[8,8,0,0]} />
        </BarChart>
      </ResponsiveContainer></div> : <SinDatos texto="Pendiente de obtener los pagos confirmados por semana desde el backend." />}
    </section>

    {/* 5. Perfil 2 × 2 */}
    <section className={panel}>
      <Titulo titulo="Perfil de comportamiento de pago" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
        <Dato titulo="Puntuales" valor={numero(comportamiento?.puntuales)} detalle="Cumplen sus vencimientos" color="text-emerald-700" />
        <Dato titulo="Pago completo" valor={numero(comportamiento?.pagoCompleto)} detalle="Cancelaron el ciclo anticipadamente" color="text-blue-700" />
        <Dato titulo="Retrasos de días" valor={numero(comportamiento?.retrasosDias)} detalle="Atrasos menores a 30 días" color="text-amber-700" />
        <Dato titulo="Retrasos de meses" valor={numero(comportamiento?.retrasosMeses)} detalle="Atrasos de 30 días o más" color="text-rose-700" />
      </div>
      {!comportamiento && <p className="mt-6 text-sm text-slate-500">Indicadores pendientes de cálculo en el backend.</p>}
      <p className="mt-6 text-xs text-slate-400">Los indicadores pueden superponerse: quien pagó el ciclo completo también puede ser puntual.</p>
    </section>

    {/* 6. Becas en una fila de tres */}
    <section className={panel}>
      <Titulo titulo="Impacto financiero de becas" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <Dato titulo="Becarios activos" valor={numero(becas?.becariosActivos)} detalle="Estudiantes" />
        <Dato titulo="Monto becado" valor={dinero(becas?.montoBecado)} detalle="Beneficios del ciclo" />
        <Dato titulo="Cobertura" valor={porcentaje(becas?.cobertura)} detalle="De la proyección bruta" />
      </div>
      {!becas && <p className="mt-6 text-sm text-slate-500">Pendiente de consultar beneficios y descuentos aplicados.</p>}
      <p className="mt-6 text-xs text-slate-400">Los montos becados no se consideran deuda pendiente del estudiante.</p>
    </section>

    {/* 7. Tabla con filtros de días */}
    <section className={panel}>
      <Titulo titulo="Estudiantes con obligaciones vencidas" />
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 mb-5" role="group" aria-label="Filtrar días de atraso">
        {[['TODOS','Todos'],['DIAS','1–29 días'],['MESES','30+ días']].map(([valor,etiqueta]) =>
          <button type="button" key={valor} onClick={() => {setFiltroMora(valor);setPagina(1);}} aria-pressed={filtroMora === valor}
            className={`rounded-lg px-2 py-2 text-sm font-semibold ${filtroMora === valor ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>{etiqueta}</button>)}
      </div>
      <div className="overflow-x-auto"><table className="min-w-[650px] w-full text-left text-sm">
        <thead><tr className="border-b border-slate-200 text-slate-500">{['Estudiante','Deuda','Atraso','Estado'].map(h => <th key={h} className="py-3 px-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{filas.map(e => <tr key={e.idEstudiante}>
          <td className="px-2 py-3"><p className="font-semibold text-slate-800">{e.nombre}</p><p className="text-xs text-slate-500">{e.carrera}</p></td>
          <td className="px-2 py-3 font-medium">{dinero(e.deuda)}</td><td className="px-2 py-3">{numero(e.diasAtraso)} días</td>
          <td className="px-2 py-3"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${Number(e.diasAtraso) >= 30 ? 'bg-rose-50 text-rose-700' : 'bg-orange-50 text-orange-700'}`}>{Number(e.diasAtraso) >= 30 ? '30+ días' : '1–29 días'}</span></td>
        </tr>)}
        {!filas.length && <tr><td colSpan={4} className="py-8 text-center text-slate-500">{morosos.length ? 'Sin estudiantes para el filtro seleccionado.' : 'Pendiente de obtener el detalle individual de morosidad.'}</td></tr>}
        </tbody></table></div>
      {paginas > 1 && <div className="mt-5 flex justify-end items-center gap-4 text-sm">
        <button type="button" disabled={paginaVisible === 1} onClick={() => setPagina(p => Math.max(1,p-1))} className="text-blue-700 disabled:text-slate-300">Anterior</button>
        <span className="text-slate-500">{paginaVisible} / {paginas}</span>
        <button type="button" disabled={paginaVisible === paginas} onClick={() => setPagina(p => Math.min(paginas,p+1))} className="text-blue-700 disabled:text-slate-300">Siguiente</button>
      </div>}
    </section>
  </div>;
}
