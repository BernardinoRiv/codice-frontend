import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, CreditCard, ExternalLink, Search, X } from 'lucide-react';
import apiInterceptor from '../../services/apiInterceptor';
import { abrirPdfNuevaPestana } from '../../utils/vistasSeguras';
import { validarTarjeta } from '../../utils/admisionValidaciones';

function horaAMinutos(hora) {
  if (typeof hora !== 'string') return null;
  const partes = hora.split(':').map(Number);
  if (partes.length < 2 || !Number.isFinite(partes[0]) || !Number.isFinite(partes[1])) return null;
  return partes[0] * 60 + partes[1];
}

function diaHorario(h) {
  return h?.dia || h?.diaSemana || '';
}

function seTraslapan(a, b) {
  if (!a || !b) return false;
  if (String(diaHorario(a)).toLowerCase() !== String(diaHorario(b)).toLowerCase()) return false;
  const ia = horaAMinutos(a.horaInicio), fa = horaAMinutos(a.horaFin);
  const ib = horaAMinutos(b.horaInicio), fb = horaAMinutos(b.horaFin);
  if ([ia, fa, ib, fb].some(v => v === null)) return false;
  return ia < fb && ib < fa;
}

function detectarChoques(selecciones, materias) {
  const entradas = [];
  Object.entries(selecciones).forEach(([idMateria, idGrupo]) => {
    const materia = materias.find(m => String(m.idMateria ?? m.codigoMateria) === String(idMateria));
    const grupo = materia?.gruposDisponibles?.find(g => String(g.idGrupo) === String(idGrupo));
    if (!materia || !grupo) return;
    (grupo.horarios || []).forEach(h => entradas.push({ materia, grupo, horario: h }));
  });
  const conflictos = [];
  for (let i = 0; i < entradas.length; i++) {
    for (let j = i + 1; j < entradas.length; j++) {
      const a = entradas[i], b = entradas[j];
      if (String(a.materia.idMateria ?? a.materia.codigoMateria) === String(b.materia.idMateria ?? b.materia.codigoMateria)) continue;
      if (seTraslapan(a.horario, b.horario)) {
        conflictos.push({
          a: a.materia.nombreMateria || a.materia.codigoMateria,
          b: b.materia.nombreMateria || b.materia.codigoMateria,
          dia: diaHorario(a.horario),
          rango: `${a.horario.horaInicio}-${a.horario.horaFin} / ${b.horario.horaInicio}-${b.horario.horaFin}`,
        });
      }
    }
  }
  return conflictos;
}

function generarIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function formatearHora(hora) {
  if (typeof hora !== 'string') return '';
  return hora.slice(0, 5);
}

export default function MatriculaContinua() {
  const [cargando, setCargando] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [abriendoComprobante, setAbriendoComprobante] = useState(false);
  const [oferta, setOferta] = useState(null);
  const [errorOferta, setErrorOferta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [selecciones, setSelecciones] = useState({});
  const [expandidas, setExpandidas] = useState({});
  const [confirmar, setConfirmar] = useState(false);
  const [tarjeta, setTarjeta] = useState({ numeroTarjeta: '', titularTarjeta: '', fechaExpiracion: '', cvv: '' });
  const [erroresTarjeta, setErroresTarjeta] = useState({});
  const [ultimoComprobante, setUltimoComprobante] = useState(null);
  const idempotencyKeyRef = useRef(null);

  const montoMatricula = Number(oferta?.montoMatricula || 0);
  const montoPrimeraCuota = Number(oferta?.montoPrimeraCuota || 0);
  const montoTotalInicial = Number.isFinite(Number(oferta?.montoTotalInicial))
    ? Number(oferta.montoTotalInicial)
    : (montoMatricula + montoPrimeraCuota);

  const pagoRequerido = useMemo(() => {
    if (!oferta) return false;
    return !oferta.matriculaYaPagada && montoTotalInicial > 0;
  }, [oferta, montoTotalInicial]);

  const verComprobante = async (idPago, nombre = 'comprobante-matricula.pdf') => {
    if (!idPago) return;
    setAbriendoComprobante(true);
    const toastId = toast.loading('Generando comprobante...');
    try {
      const res = await apiInterceptor(`/api/v1/finanzas/pagos/${encodeURIComponent(idPago)}/comprobante`);
      await abrirPdfNuevaPestana(res, nombre);
      toast.success('Comprobante listo', { id: toastId });
    } catch (e) {
      toast.error(e.message || 'No se pudo abrir el comprobante.', { id: toastId });
    } finally {
      setAbriendoComprobante(false);
    }
  };

  const cargarOferta = async () => {
    setCargando(true);
    setErrorOferta('');
    try {
      const res = await apiInterceptor('/api/v1/estudiante/matricula/oferta');
      const data = await res.json().catch(() => ({}));
      if (res.status === 422) {
        setOferta(null);
        setErrorOferta(data.mensaje || 'No hay un período de matrícula abierto en este momento.');
        return;
      }
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo cargar la oferta de matrícula.');
      setOferta(data);
      setSelecciones({});
      idempotencyKeyRef.current = null;
    } catch (e) {
      setOferta(null);
      setErrorOferta(e.message || 'Error al cargar la oferta de matrícula.');
      toast.error(e.message || 'Error al cargar la oferta de matrícula.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarOferta(); }, []);

  const materias = oferta?.materias || [];
  const materiasDisponiblesBase = useMemo(() => (
    materias.filter(m => m.habilitada === true && (m.gruposDisponibles || []).some(g => (g.cuposDisponibles ?? 1) > 0))
  ), [materias]);

  const materiasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return materiasDisponiblesBase.filter(m => (
      !q || (m.nombreMateria || '').toLowerCase().includes(q) || (m.codigoMateria || '').toLowerCase().includes(q)
    ));
  }, [materiasDisponiblesBase, busqueda]);

  const gruposCiclo = useMemo(() => {
    const map = new Map();
    materiasFiltradas.forEach(m => {
      const key = m.cicloRecomendado == null ? 'null' : String(m.cicloRecomendado);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    });
    const keys = [...map.keys()].sort((a, b) => {
      if (a === 'null') return 1;
      if (b === 'null') return -1;
      return Number(a) - Number(b);
    });
    return keys.map(k => ({ cicloNum: k === 'null' ? null : k, materias: map.get(k) }));
  }, [materiasFiltradas]);

  const seleccionadasCount = Object.keys(selecciones).length;
  const choques = useMemo(() => detectarChoques(selecciones, materiasDisponiblesBase), [selecciones, materiasDisponiblesBase]);

  const toggleExpandir = (key) => setExpandidas(prev => ({ ...prev, [key]: !prev[key] }));

  const seleccionarGrupo = (materiaKey, idGrupo) => {
    setSelecciones(prev => {
      if (String(prev[materiaKey]) === String(idGrupo)) {
        const copia = { ...prev };
        delete copia[materiaKey];
        return copia;
      }
      return { ...prev, [materiaKey]: idGrupo };
    });
  };

  const resumenSeleccion = Object.entries(selecciones).map(([materiaKey, idGrupo]) => {
    const materia = materiasDisponiblesBase.find(m => String(m.idMateria ?? m.codigoMateria) === String(materiaKey));
    const grupo = materia?.gruposDisponibles?.find(g => String(g.idGrupo) === String(idGrupo));
    return { materiaKey, materia, grupo };
  }).filter(x => x.materia && x.grupo);

  const cerrarConfirmacion = () => {
    if (inscribiendo) return;
    setConfirmar(false);
    setErroresTarjeta({});
  };

  const actualizarTarjeta = (campo, valor) => {
    setTarjeta(prev => ({ ...prev, [campo]: valor }));
    setErroresTarjeta(prev => ({ ...prev, [campo]: undefined }));
  };

  const validarPago = () => {
    const errs = validarTarjeta({
      numero: tarjeta.numeroTarjeta,
      titular: tarjeta.titularTarjeta,
      expiracion: tarjeta.fechaExpiracion,
      cvv: tarjeta.cvv,
    });
    const mapeados = {
      numeroTarjeta: errs.numero,
      titularTarjeta: errs.titular,
      fechaExpiracion: errs.expiracion,
      cvv: errs.cvv,
    };
    const filtrados = Object.fromEntries(Object.entries(mapeados).filter(([, v]) => v));
    setErroresTarjeta(filtrados);
    return Object.keys(filtrados).length === 0;
  };

  const confirmarInscripcion = async () => {
    const idsGrupos = resumenSeleccion.map(s => s.grupo.idGrupo);
    if (!idsGrupos.length || choques.length > 0) return;
    if (pagoRequerido && !validarPago()) {
      toast.warning('Revisa los datos de la tarjeta.');
      return;
    }
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = generarIdempotencyKey();

    setInscribiendo(true);
    try {
      const payload = { idsGrupos };
      if (pagoRequerido) {
        payload.numeroTarjeta = tarjeta.numeroTarjeta.replace(/\s/g, '');
        payload.titularTarjeta = tarjeta.titularTarjeta.trim().toUpperCase();
        payload.fechaExpiracion = tarjeta.fechaExpiracion.trim();
        payload.cvv = tarjeta.cvv.trim();
      }
      const res = await apiInterceptor('/api/v1/estudiante/matricula/inscribir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKeyRef.current,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        idempotencyKeyRef.current = null;
        setConfirmar(false);
        setSelecciones({});
        setTarjeta({ numeroTarjeta: '', titularTarjeta: '', fechaExpiracion: '', cvv: '' });
        setErroresTarjeta({});
        const facturaMsg = data.numeroFactura ? ` Comprobante/factura: ${data.numeroFactura}.` : '';
        toast.success((data.mensaje || 'Inscripción realizada correctamente.') + facturaMsg);
        const idPago = data.idPago ?? data.idPagoExistente;
        if (idPago) {
          setUltimoComprobante({
            idPago,
            numeroFactura: data.numeroFactura,
            montoPagado: data.montoPagado ?? montoTotalInicial,
          });
        }
        await cargarOferta();
      } else {
        if ([400, 422].includes(res.status)) idempotencyKeyRef.current = null;
        toast.error(data.mensaje || 'No se pudo completar la inscripción.');
      }
    } catch (e) {
      toast.error(e.message || 'No se pudo completar la inscripción. Verifica el resultado antes de reintentar.');
    } finally {
      setInscribiendo(false);
    }
  };

  if (cargando) {
    return (
      <div className="max-w-7xl mx-auto pb-24 font-inter">
        <div className="flex flex-col items-center justify-center pt-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4" />
          <p className="text-gray-400 text-sm font-medium tracking-wide">Cargando oferta de matrícula...</p>
        </div>
      </div>
    );
  }

  if (errorOferta && !oferta) {
    return (
      <div className="max-w-7xl mx-auto pb-24 font-inter">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Inscripción de materias</h1>
          <p className="text-slate-500 text-sm mt-1">Proceso de matrícula para ingreso continuo.</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-slate-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No hay período de matrícula abierto</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">{errorOferta}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 font-inter text-slate-900">
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Inscripción de materias</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ciclo destino: <span className="font-bold text-slate-900">{oferta?.codigoCiclo || '—'}</span>
          </p>
        </div>
      </div>

      {ultimoComprobante?.idPago && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-900">Inscripción confirmada</p>
              <p className="text-sm text-emerald-800 mt-1">
                {ultimoComprobante.numeroFactura ? `Comprobante/factura: ${ultimoComprobante.numeroFactura}` : 'Comprobante emitido correctamente.'}
                {ultimoComprobante.montoPagado != null ? ` · Monto: $${Number(ultimoComprobante.montoPagado).toFixed(2)}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => verComprobante(ultimoComprobante.idPago, `comprobante-matricula-${ultimoComprobante.idPago}.pdf`)}
            disabled={abriendoComprobante}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-sm font-bold hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            <ExternalLink className="w-4 h-4" />
            Ver comprobante
          </button>
        </div>
      )}

      {oferta && (
        <div className={`mb-6 rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${oferta.matriculaYaPagada ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pago de matrícula</p>
            <div className="text-sm text-slate-900 space-y-1">
              <p>{oferta.conceptoMatricula || 'Matrícula'}: <span className="font-semibold">${montoMatricula.toFixed(2)}</span></p>
              <p>{oferta.conceptoPrimeraCuota || 'Primera cuota (Mes 1)'}: <span className="font-semibold">${montoPrimeraCuota.toFixed(2)}</span></p>
              <p className="pt-1"><strong>Total a pagar para inscribir:</strong> <span className="text-lg font-extrabold">${montoTotalInicial.toFixed(2)}</span></p>
            </div>
            {oferta.matriculaYaPagada ? (
              <p className="text-sm text-emerald-700 mt-2 font-medium">
                Matrícula pagada{oferta.numeroFacturaExistente ? ` · Factura/comprobante: ${oferta.numeroFacturaExistente}` : ''}.
              </p>
            ) : (
              <p className="text-sm text-slate-600 mt-2">Debes completar el pago simulado para confirmar tu inscripción.</p>
            )}
          </div>
          {oferta.matriculaYaPagada && oferta.idPagoExistente && (
            <button
              type="button"
              onClick={() => verComprobante(oferta.idPagoExistente, `comprobante-matricula-${oferta.idPagoExistente}.pdf`)}
              disabled={abriendoComprobante}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-sm font-bold hover:bg-emerald-100 transition-colors disabled:opacity-60"
            >
              <ExternalLink className="w-4 h-4" />
              Ver comprobante
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Materias disponibles</p>
          <p className="text-2xl font-bold text-emerald-700">{materiasDisponiblesBase.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Materias seleccionadas</p>
          <p className="text-2xl font-bold text-slate-900">{seleccionadasCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o nombre de materia..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </div>
      </div>

      {choques.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">Conflicto de horarios detectado</p>
              <p className="text-sm text-red-700 mt-1">Resuelve los choques para poder confirmar la inscripción:</p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {choques.map((c, i) => (
                  <li key={i}>• <strong>{c.a}</strong> y <strong>{c.b}</strong> se traslapan ({c.dia}, {c.rango}).</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {materiasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center text-slate-500">
          No hay asignaturas habilitadas con grupos disponibles en este ciclo.
        </div>
      ) : (
        <div className="space-y-6">
          {gruposCiclo.map(({ cicloNum, materias: materiasCiclo }) => (
            <div key={cicloNum ?? 'disp'} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {cicloNum != null ? `Ciclo académico ${cicloNum}` : 'Asignaturas disponibles'}
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {materiasCiclo.length} asignaturas
                </span>
              </div>

              <div className="space-y-4">
                {materiasCiclo.map((materia) => {
                  const materiaKey = String(materia.idMateria ?? materia.codigoMateria);
                  const expandida = !!expandidas[materiaKey];
                  const seleccionada = selecciones[materiaKey];
                  const gruposConCupo = (materia.gruposDisponibles || []).filter(g => (g.cuposDisponibles ?? 1) > 0);
                  return (
                    <div key={materiaKey} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-xs font-extrabold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              {materia.codigoMateria}
                            </span>
                            {seleccionada && (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-900 text-white">Grupo seleccionado</span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-slate-900">{materia.nombreMateria}</h4>
                          <p className="text-xs font-semibold text-slate-500 mt-1">UV: {materia.uvs}</p>
                        </div>

                        <button
                          onClick={() => toggleExpandir(materiaKey)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {expandida ? 'Ocultar grupos' : 'Ver grupos disponibles'}
                          {expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {expandida && (
                        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
                          {gruposConCupo.length === 0 ? (
                            <p className="text-sm text-slate-500">No hay grupos disponibles.</p>
                          ) : (
                            gruposConCupo.map((grupo) => {
                              const activo = String(seleccionada) === String(grupo.idGrupo);
                              return (
                                <label key={grupo.idGrupo} className={`block border rounded-xl p-4 cursor-pointer transition-colors ${activo ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="radio"
                                      name={`grupo-${materiaKey}`}
                                      checked={activo}
                                      onChange={() => seleccionarGrupo(materiaKey, grupo.idGrupo)}
                                      className="mt-1"
                                    />
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                                        <span className="text-sm font-bold text-slate-900">Grupo {grupo.codigoGrupo}</span>
                                        <span className="text-sm text-slate-600">Docente: <strong>{grupo.docente || 'Por asignar'}</strong></span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                          Cupos: {grupo.cuposDisponibles}{grupo.capacidadMaxima != null ? ` / ${grupo.capacidadMaxima}` : ''}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        {(grupo.horarios || []).map((h, idx) => (
                                          <div key={idx} className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 inline-flex flex-wrap gap-x-3 mr-2 mb-1">
                                            <span className="font-semibold">{diaHorario(h)}</span>
                                            <span>{formatearHora(h.horaInicio)} - {formatearHora(h.horaFin)}</span>
                                            {h.aula && <span>Aula: {h.aula}</span>}
                                          </div>
                                        ))}
                                        {(!grupo.horarios || grupo.horarios.length === 0) && (
                                          <p className="text-xs text-slate-500">Sin horarios registrados.</p>
                                        )}
                                      </div>
                                    </div>
                                    {activo && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); seleccionarGrupo(materiaKey, grupo.idGrupo); }}
                                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                                      >
                                        Quitar
                                      </button>
                                    )}
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {resumenSeleccion.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl z-40 px-4">
          <div className="bg-black text-white p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-800">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen de inscripción</p>
              <p className="text-sm font-semibold">{resumenSeleccion.length} materia(s) seleccionada(s)</p>
              {pagoRequerido && <p className="text-xs text-gray-300 mt-1">Total inicial a cancelar: ${montoTotalInicial.toFixed(2)}</p>}
              {choques.length > 0 && <p className="text-xs text-red-300 mt-1">Hay choques de horario. Corrígelos para continuar.</p>}
            </div>
            <button
              onClick={() => setConfirmar(true)}
              disabled={choques.length > 0 || inscribiendo}
              className="bg-white text-black px-6 py-3 rounded-xl font-extrabold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar inscripción
            </button>
          </div>
        </div>
      )}

      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-slate-900" />
                <h3 className="text-xl font-bold text-slate-900">Confirmar inscripción</h3>
              </div>
              <button onClick={cerrarConfirmacion} className="p-2 rounded-full hover:bg-slate-100 text-slate-500" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-4">Vas a inscribir las siguientes materias en el ciclo <strong>{oferta?.codigoCiclo}</strong>:</p>
            <div className="space-y-3 max-h-[28vh] overflow-y-auto mb-5">
              {resumenSeleccion.map(({ materia, grupo, materiaKey }) => (
                <div key={materiaKey} className="border border-slate-200 rounded-xl p-3">
                  <p className="text-sm font-bold text-slate-900">{materia.codigoMateria} — {materia.nombreMateria}</p>
                  <p className="text-xs text-slate-600 mt-1">Grupo {grupo.codigoGrupo} · {grupo.docente || 'Por asignar'}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(grupo.horarios || []).map((h, i) => (
                      <span key={i} className="text-[11px] bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600">
                        {diaHorario(h)} {formatearHora(h.horaInicio)}-{formatearHora(h.horaFin)}{h.aula ? ` (${h.aula})` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {pagoRequerido ? (
              <div className="mb-6 border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-5 h-5 text-slate-700" />
                  <h4 className="text-sm font-bold text-slate-900">Pago simulado de matrícula</h4>
                </div>
                <div className="text-sm text-slate-900 space-y-1 mb-4">
                  <p>{oferta?.conceptoMatricula || 'Matrícula'}: ${montoMatricula.toFixed(2)}</p>
                  <p>{oferta?.conceptoPrimeraCuota || 'Primera cuota (Mes 1)'}: ${montoPrimeraCuota.toFixed(2)}</p>
                  <p className="pt-1"><strong>Total a pagar para inscribir:</strong> ${montoTotalInicial.toFixed(2)}</p>
                </div>
                <p className="text-sm text-slate-600 mb-4">Ingresa los datos de la tarjeta para completar la inscripción.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 ml-1">Número de tarjeta</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={19}
                      value={tarjeta.numeroTarjeta}
                      onChange={(e) => actualizarTarjeta('numeroTarjeta', e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim())}
                      placeholder="0000 0000 0000 0000"
                      className={`w-full h-[50px] bg-white text-slate-900 border rounded-xl px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all ${erroresTarjeta.numeroTarjeta ? 'border-red-500 bg-red-50/30' : 'border-slate-200'}`}
                    />
                    {erroresTarjeta.numeroTarjeta && <p className="mt-1.5 ml-1 text-xs font-medium text-red-600">{erroresTarjeta.numeroTarjeta}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 ml-1">Titular de la tarjeta</label>
                    <input
                      type="text"
                      maxLength={150}
                      value={tarjeta.titularTarjeta}
                      onChange={(e) => actualizarTarjeta('titularTarjeta', e.target.value.toUpperCase())}
                      placeholder="Nombre tal como aparece en la tarjeta"
                      className={`w-full h-[50px] bg-white text-slate-900 border rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all ${erroresTarjeta.titularTarjeta ? 'border-red-500 bg-red-50/30' : 'border-slate-200'}`}
                    />
                    {erroresTarjeta.titularTarjeta && <p className="mt-1.5 ml-1 text-xs font-medium text-red-600">{erroresTarjeta.titularTarjeta}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 ml-1">Fecha de expiración (MM/AA)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={tarjeta.fechaExpiracion}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 4);
                        actualizarTarjeta('fechaExpiracion', d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                      }}
                      placeholder="MM/AA"
                      className={`w-full h-[50px] bg-white text-slate-900 border rounded-xl px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all ${erroresTarjeta.fechaExpiracion ? 'border-red-500 bg-red-50/30' : 'border-slate-200'}`}
                    />
                    {erroresTarjeta.fechaExpiracion && <p className="mt-1.5 ml-1 text-xs font-medium text-red-600">{erroresTarjeta.fechaExpiracion}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 ml-1">CVV</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={tarjeta.cvv}
                      onChange={(e) => actualizarTarjeta('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      className={`w-full h-[50px] bg-white text-slate-900 border rounded-xl px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all ${erroresTarjeta.cvv ? 'border-red-500 bg-red-50/30' : 'border-slate-200'}`}
                    />
                    {erroresTarjeta.cvv && <p className="mt-1.5 ml-1 text-xs font-medium text-red-600">{erroresTarjeta.cvv}</p>}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">Simulación académica. Usa datos de prueba.</p>
              </div>
            ) : (
              oferta?.matriculaYaPagada && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
                  La matrícula ya se encuentra pagada. Se procederá con la inscripción de las materias seleccionadas.
                </div>
              )
            )}

            <div className="flex gap-3">
              <button onClick={cerrarConfirmacion} disabled={inscribiendo} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={confirmarInscripcion} disabled={inscribiendo || choques.length > 0} className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50">
                {inscribiendo ? 'Procesando...' : (pagoRequerido ? `Pagar e inscribir ($${montoTotalInicial.toFixed(2)})` : 'Confirmar inscripción')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
