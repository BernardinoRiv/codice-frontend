import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import apiInterceptor from '../../services/apiInterceptor';

const BLOQUES = [
  { key: 'P1_LABORATORIO', periodo: 1, tipo: 'Laboratorio', numero: 1 },
  { key: 'P1_PARCIAL', periodo: 1, tipo: 'Parcial', numero: 1 },
  { key: 'P2_LABORATORIO', periodo: 2, tipo: 'Laboratorio', numero: 2 },
  { key: 'P2_PARCIAL', periodo: 2, tipo: 'Parcial', numero: 2 },
  { key: 'P3_LABORATORIO', periodo: 3, tipo: 'Laboratorio', numero: 3 },
  { key: 'P3_PARCIAL', periodo: 3, tipo: 'Parcial', numero: 3 },
];

const FILTROS = [
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'APROBADA', etiqueta: 'Aprobadas' },
  { valor: 'RECHAZADA', etiqueta: 'Rechazadas' },
  { valor: 'TODAS', etiqueta: 'Todas' },
];

const FECHAS_VACIAS = Object.fromEntries(
  BLOQUES.map(bloque => [bloque.key, { fechaInicio: '', fechaFin: '' }])
);

const MIN_CARACTERES = 15;
const MAX_CARACTERES = 250;

function opcionesConToken(options = {}) {
  const token = localStorage.getItem('token');
  return {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  };
}

function obtenerDato(objeto, claves) {
  for (const clave of claves) {
    const valor = objeto?.[clave];
    if (valor !== null && valor !== undefined && valor !== '') return valor;
  }
  return null;
}

function comoTexto(valor, vacio = '—') {
  if (valor === null || valor === undefined) return vacio;
  if (typeof valor === 'object') {
    return comoTexto(
      obtenerDato(valor, ['codigo', 'nombre', 'descripcion', 'codigoGrupo', 'codigoCiclo']),
      vacio
    );
  }
  const texto = String(valor).trim();
  return texto || vacio;
}

function normalizarLista(payload, claves = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  for (const clave of ['data', 'resultado', ...claves]) {
    const valor = payload[clave];
    if (Array.isArray(valor)) return valor;
    if (valor && typeof valor === 'object' && Array.isArray(valor.data)) return valor.data;
  }
  return [];
}

function estadoCicloDe(ciclo) {
  const valor = obtenerDato(ciclo, ['estadoCiclo', 'estado', 'estatus']);
  if (valor && typeof valor === 'object') {
    return obtenerDato(valor, ['estadoCiclo', 'estado', 'estatus']) ?? '';
  }
  return valor ?? '';
}

function aInputLocal(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Array.isArray(valor)) {
    const [anio, mes, dia, hora = 0, minuto = 0] = valor;
    if (!anio || !mes || !dia) return '';
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
  }
  const texto = String(valor).trim();
  const coincidencia = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?/.exec(texto);
  return coincidencia ? `${coincidencia[1]}T${coincidencia[2]}` : '';
}

function aPayloadLocal(valor) {
  const texto = String(valor ?? '').trim();
  const coincidencia = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/.exec(texto);
  if (!coincidencia) return '';
  return `${coincidencia[1]}T${coincidencia[2]}:${coincidencia[3] || '00'}`;
}

function formatearFecha(valor) {
  const fecha = aInputLocal(valor);
  return fecha ? fecha.replace('T', ' ') : '—';
}

function validarFechas(fechas) {
  for (const bloque of BLOQUES) {
    const inicio = fechas[bloque.key]?.fechaInicio || '';
    const fin = fechas[bloque.key]?.fechaFin || '';
    const nombre = `${bloque.tipo} ${bloque.numero}`;
    if ((!inicio && fin) || (inicio && !fin)) {
      return `Completa la fecha de inicio y de cierre de ${nombre}.`;
    }
    if (inicio && fin && aPayloadLocal(fin) <= aPayloadLocal(inicio)) {
      return `La fecha de cierre de ${nombre} debe ser posterior a la de inicio.`;
    }
  }
  return null;
}

function docenteDe(solicitud) {
  const nombres = comoTexto(obtenerDato(solicitud, ['nombresDocente', 'nombreDocente']), '');
  const apellidos = comoTexto(obtenerDato(solicitud, ['apellidosDocente']), '');
  if (nombres && apellidos && nombres !== apellidos) return `${nombres} ${apellidos}`;
  return comoTexto(obtenerDato(solicitud, [
    'docenteSolicitante', 'nombreCompletoDocente', 'docente', 'nombreDocente', 'nombresDocente',
  ]));
}

function alumnoDe(registro) {
  const nombres = comoTexto(obtenerDato(registro, ['nombresEstudiante', 'nombreEstudiante', 'nombre']), '');
  const apellidos = comoTexto(obtenerDato(registro, ['apellidosEstudiante', 'apellidoEstudiante']), '');
  if (nombres && apellidos && nombres !== apellidos) return `${nombres} ${apellidos}`;
  return comoTexto(obtenerDato(registro, [
    'nombreCompleto', 'nombreCompletoEstudiante', 'nombreEstudiante', 'estudiante', 'nombre',
  ]));
}

function alumnosDe(solicitud) {
  const lista = obtenerDato(solicitud, [
    'alumnos', 'estudiantes', 'detalles', 'detalleSolicitudes', 'alumnosIncluidos',
  ]);
  if (Array.isArray(lista) && lista.length) return lista;
  if (obtenerDato(solicitud, ['carnet', 'carnetEstudiante'])) return [solicitud];
  return [];
}

function CampoFecha({ etiqueta, valor, onChange }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">
        {etiqueta}
      </span>
      <input
        type="datetime-local"
        value={valor}
        onChange={evento => onChange(evento.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
      />
    </label>
  );
}

function EstadoPill({ estado }) {
  const valor = comoTexto(estado);
  const clases = valor === 'PENDIENTE'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : valor === 'APROBADA'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : valor === 'RECHAZADA'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${clases}`}>
      {valor}
    </span>
  );
}

function EstadoCicloPill({ estado }) {
  const valor = comoTexto(estado);
  const clases = valor === 'ACTIVO'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : valor === 'PLANIFICADO'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : valor === 'EN PLANIFICACIÓN'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${clases}`}>
      {valor}
    </span>
  );
}

const GestionEvaluacionesSolicitudes = () => {
  const [pestana, setPestana] = useState('calendario');
  const [ciclos, setCiclos] = useState([]);
  const [idCiclo, setIdCiclo] = useState('');
  const [fechas, setFechas] = useState(FECHAS_VACIAS);
  const [fechasIniciales, setFechasIniciales] = useState(FECHAS_VACIAS);
  const [cargandoCiclos, setCargandoCiclos] = useState(false);
  const [cargandoFechas, setCargandoFechas] = useState(false);
  const [guardandoFechas, setGuardandoFechas] = useState(false);
  const [errorFechas, setErrorFechas] = useState('');

  const [estadoFiltro, setEstadoFiltro] = useState('PENDIENTE');
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(false);
  const [actualizarSolicitudes, setActualizarSolicitudes] = useState(0);
  const [modal, setModal] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [resolviendo, setResolviendo] = useState(false);

  useEffect(() => {
    let activo = true;
    const cargarCiclos = async () => {
      setCargandoCiclos(true);
      try {
        const response = await apiInterceptor(
          '/api/v1/gestion-evaluaciones/ciclos',
          opcionesConToken()
        );
        if (!response.ok) throw new Error(`Error ${response.status} al cargar los ciclos.`);
        const payload = await response.json().catch(() => []);
        const lista = normalizarLista(payload, ['ciclos']);
        if (!activo) return;
        setCiclos(lista);
        const preferido = lista.find(ciclo => comoTexto(estadoCicloDe(ciclo)) === 'ACTIVO');
        const primero = preferido || lista[0];
        if (primero) setIdCiclo(String(obtenerDato(primero, ['idCiclo', 'id']) ?? ''));
      } catch (error) {
        if (activo) toast.error('No se pudieron cargar los ciclos', { description: error.message });
      } finally {
        if (activo) setCargandoCiclos(false);
      }
    };
    cargarCiclos();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!idCiclo) return;
    let activo = true;
    const cargarFechas = async () => {
      setCargandoFechas(true);
      setErrorFechas('');
      try {
        const response = await apiInterceptor(
          `/api/v1/gestion-evaluaciones/ciclos/${encodeURIComponent(idCiclo)}/fechas`,
          opcionesConToken()
        );
        if (!response.ok) throw new Error(`Error ${response.status} al cargar las fechas.`);
        const payload = await response.json().catch(() => ({}));
        const cuerpo = payload?.data ?? payload ?? {};
        const fechasDto = cuerpo.fechas ?? cuerpo ?? {};
        const siguientes = { ...FECHAS_VACIAS };
        BLOQUES.forEach(bloque => {
          siguientes[bloque.key] = {
            fechaInicio: aInputLocal(fechasDto[bloque.key]?.fechaInicio),
            fechaFin: aInputLocal(fechasDto[bloque.key]?.fechaFin),
          };
        });
        if (!activo) return;
        setFechas(siguientes);
        setFechasIniciales(siguientes);
      } catch (error) {
        if (activo) toast.error('No se pudieron cargar las fechas del ciclo', { description: error.message });
      } finally {
        if (activo) setCargandoFechas(false);
      }
    };
    cargarFechas();
    return () => { activo = false; };
  }, [idCiclo]);

  useEffect(() => {
    if (pestana !== 'solicitudes') return;
    let activo = true;
    const cargarSolicitudes = async () => {
      setCargandoSolicitudes(true);
      try {
        const url = `/api/v1/gestion-evaluaciones/solicitudes?estado=${encodeURIComponent(estadoFiltro)}`;
        const response = await apiInterceptor(url, opcionesConToken());
        if (!response.ok) throw new Error(`Error ${response.status} al cargar las solicitudes.`);
        const payload = await response.json().catch(() => []);
        const lista = normalizarLista(payload, ['solicitudes']);
        if (activo) {
          setSolicitudes(lista);
        }
      } catch (error) {
        if (activo) toast.error('No se pudieron cargar las solicitudes', { description: error.message });
      } finally {
        if (activo) setCargandoSolicitudes(false);
      }
    };
    cargarSolicitudes();
    return () => { activo = false; };
  }, [pestana, estadoFiltro, actualizarSolicitudes]);

  const cicloSeleccionado = ciclos.find(ciclo => String(obtenerDato(ciclo, ['idCiclo', 'id']) ?? '') === String(idCiclo));
  const hayCambiosFechas = BLOQUES.some(bloque =>
    (fechas[bloque.key]?.fechaInicio || '') !== (fechasIniciales[bloque.key]?.fechaInicio || '') ||
    (fechas[bloque.key]?.fechaFin || '') !== (fechasIniciales[bloque.key]?.fechaFin || '')
  );

  const gruposSolicitudes = useMemo(() => {
    const agrupados = new Map();
    solicitudes.forEach(solicitud => {
      const firma = [
        docenteDe(solicitud),
        comoTexto(obtenerDato(solicitud, ['nombreMateria', 'materia', 'asignatura'])),
        comoTexto(obtenerDato(solicitud, ['codigoGrupo', 'grupo', 'nombreGrupo'])),
        comoTexto(obtenerDato(solicitud, ['nombreEvaluacion', 'evaluacion'])),
        comoTexto(obtenerDato(solicitud, ['tipoEvaluacion'])),
        comoTexto(obtenerDato(solicitud, ['numeroEvaluacion'])),
        comoTexto(obtenerDato(solicitud, ['motivo', 'justificante', 'observacion'])),
        comoTexto(obtenerDato(solicitud, ['fechaSolicitud', 'fechaCreacion', 'fecha'])),
      ].join('||');
      if (!agrupados.has(firma)) agrupados.set(firma, []);
      agrupados.get(firma).push(solicitud);
    });
    return [...agrupados.values()].map(lista => {
      const primera = lista[0];
      const ids = lista
        .map(solicitud => Number(obtenerDato(solicitud, ['idSolicitud', 'id'])))
        .filter(id => Number.isFinite(id));
      return {
        ids,
        estado: comoTexto(obtenerDato(primera, ['estado', 'estatus'])),
        docente: docenteDe(primera),
        materia: comoTexto(obtenerDato(primera, ['nombreMateria', 'materia', 'asignatura'])),
        grupo: comoTexto(obtenerDato(primera, ['codigoGrupo', 'grupo', 'nombreGrupo'])),
        ciclo: comoTexto(obtenerDato(primera, ['codigoCiclo', 'ciclo', 'nombreCiclo'])),
        evaluacion: comoTexto(obtenerDato(primera, ['nombreEvaluacion', 'evaluacion'])) !== '—'
          ? comoTexto(obtenerDato(primera, ['nombreEvaluacion', 'evaluacion']))
          : `${comoTexto(obtenerDato(primera, ['tipoEvaluacion', 'nombreEvaluacion', 'evaluacion']), '')} ${comoTexto(obtenerDato(primera, ['numeroEvaluacion']), '')}`.trim() || '—',
        fechaCierre: formatearFecha(obtenerDato(primera, [
          'fechaFinEvaluacion', 'fechaCierreOriginal', 'fechaFinOriginal', 'fechaCierre', 'fechaFin',
        ])),
        fechaSolicitud: formatearFecha(obtenerDato(primera, ['fechaSolicitud', 'fechaCreacion', 'fecha'])),
        motivo: comoTexto(obtenerDato(primera, ['motivo', 'justificante', 'observacion'])),
        alumnos: lista.flatMap(alumnosDe),
      };
    });
  }, [solicitudes]);

  const cambiarFecha = (clave, campo, valor) => {
    setFechas(anterior => ({
      ...anterior,
      [clave]: { ...anterior[clave], [campo]: valor },
    }));
    setErrorFechas('');
  };

  const guardarFechasCiclo = async () => {
    if (!idCiclo) return toast.error('Selecciona un ciclo académico.');
    const error = validarFechas(fechas);
    if (error) {
      setErrorFechas(error);
      return toast.error('Revisa las fechas', { description: error });
    }
    const cuerpo = { fechas: {} };
    BLOQUES.forEach(bloque => {
      const inicio = fechas[bloque.key]?.fechaInicio || '';
      const fin = fechas[bloque.key]?.fechaFin || '';
      if (!inicio && !fin) return;
      cuerpo.fechas[bloque.key] = {
        fechaInicio: aPayloadLocal(inicio),
        fechaFin: aPayloadLocal(fin),
      };
    });
    setGuardandoFechas(true);
    try {
      const response = await apiInterceptor(
        `/api/v1/gestion-evaluaciones/ciclos/${encodeURIComponent(idCiclo)}/fechas`,
        opcionesConToken({ method: 'PUT', body: JSON.stringify(cuerpo) })
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || errorData.message || `Error ${response.status}`);
      }
      setFechasIniciales({ ...fechas });
      toast.success('Fechas del ciclo guardadas');
    } catch (error) {
      toast.error('No se pudieron guardar las fechas', { description: error.message });
    } finally {
      setGuardandoFechas(false);
    }
  };

  const abrirModal = (aprobar, ids) => {
    if (!ids.length) return toast.error('No hay solicitudes válidas en este lote.');
    setModal({ aprobar, ids });
    setRespuesta('');
  };

  const confirmarResolucion = async () => {
    const texto = respuesta.trim();
    if (texto.length < MIN_CARACTERES) {
      return toast.error(`La observación debe tener al menos ${MIN_CARACTERES} caracteres.`);
    }
    if (!modal) return;
    setResolviendo(true);
    try {
      const response = await apiInterceptor(
        '/api/v1/gestion-evaluaciones/solicitudes',
        opcionesConToken({
          method: 'PUT',
          body: JSON.stringify({
            idsSolicitud: modal.ids.map(id => Number(id)),
            aprobar: modal.aprobar,
            respuesta: texto,
          }),
        })
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.mensaje || errorData.message || `Error ${response.status}`);
      }
      toast.success(modal.aprobar ? 'Solicitudes aprobadas por 48 horas' : 'Solicitudes rechazadas');
      setModal(null);
      setActualizarSolicitudes(valor => valor + 1);
    } catch (error) {
      toast.error('No se pudo resolver la solicitud', { description: error.message });
    } finally {
      setResolviendo(false);
    }
  };

  return (
    <div className="w-full pb-16 font-sans text-gray-900">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Evaluaciones y solicitudes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura el calendario de evaluaciones por ciclo y gestiona las solicitudes de modificación de notas.
        </p>
      </div>

      <div className="mb-8 inline-flex w-full flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm sm:w-auto sm:flex-row">
        <button
          type="button"
          onClick={() => setPestana('calendario')}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
            pestana === 'calendario' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Calendario de evaluaciones
        </button>
        <button
          type="button"
          onClick={() => setPestana('solicitudes')}
          className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
            pestana === 'solicitudes' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          Solicitudes de modificación
        </button>
      </div>

      {pestana === 'calendario' ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full max-w-lg">
                <label className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Ciclo académico
                </label>
                <select
                  value={idCiclo}
                  onChange={evento => {
                    const valor = evento.target.value;
                    setIdCiclo(valor);
                    if (!valor) {
                      setFechas(FECHAS_VACIAS);
                      setFechasIniciales(FECHAS_VACIAS);
                    }
                  }}
                  disabled={cargandoCiclos}
                  className="w-full cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:opacity-60"
                >
                  <option value="">-- Selecciona un ciclo --</option>
                  {ciclos.map(ciclo => {
                    const valor = String(obtenerDato(ciclo, ['idCiclo', 'id']) ?? '');
                    return (
                      <option key={valor} value={valor}>
                        {comoTexto(obtenerDato(ciclo, ['codigoCiclo', 'codigo', 'nombre']))} · {comoTexto(estadoCicloDe(ciclo))}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <EstadoCicloPill estado={estadoCicloDe(cicloSeleccionado)} />
              </div>
            </div>
          </section>

          {cargandoFechas ? (
            <section className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white py-16 shadow-sm">
              <div className="animate-spin h-7 w-7 rounded-full border-b-2 border-gray-900" />
            </section>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {[1, 2, 3].map(periodo => (
                <section key={periodo} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-extrabold tracking-tight">Periodo {periodo}</h2>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      P{periodo}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {BLOQUES.filter(bloque => bloque.periodo === periodo).map(bloque => (
                      <div key={bloque.key} className="rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                        <div className="mb-4 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-gray-900">
                            {bloque.tipo} {bloque.numero}
                          </h3>
                          <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] text-gray-400 ring-1 ring-gray-200">
                            {bloque.key}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <CampoFecha
                            etiqueta="Fecha y hora de inicio"
                            valor={fechas[bloque.key]?.fechaInicio || ''}
                            onChange={valor => cambiarFecha(bloque.key, 'fechaInicio', valor)}
                          />
                          <CampoFecha
                            etiqueta="Fecha y hora de cierre"
                            valor={fechas[bloque.key]?.fechaFin || ''}
                            onChange={valor => cambiarFecha(bloque.key, 'fechaFin', valor)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {errorFechas && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorFechas}
            </p>
          )}

          <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-gray-500">
              Los rangos incompletos se omiten. Las fechas se envían como <span className="font-mono text-gray-700">YYYY-MM-DDTHH:mm:ss</span> sin zona horaria.
            </p>
            <button
              type="button"
              onClick={guardarFechasCiclo}
              disabled={!idCiclo || cargandoFechas || guardandoFechas || !hayCambiosFechas}
              className="w-full rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {guardandoFechas ? 'Guardando...' : 'Guardar fechas del ciclo'}
            </button>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            {FILTROS.map(filtro => (
              <button
                key={filtro.valor}
                type="button"
                onClick={() => setEstadoFiltro(filtro.valor)}
                className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${
                  estadoFiltro === filtro.valor
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {filtro.etiqueta}
              </button>
            ))}
            {cargandoSolicitudes && <span className="ml-auto text-xs text-gray-400">Cargando solicitudes...</span>}
          </section>

          {!cargandoSolicitudes && gruposSolicitudes.length === 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
              <p className="text-sm font-semibold text-gray-900">No hay solicitudes en este filtro</p>
              <p className="mt-1 text-sm text-gray-500">Cambia el estado para ver otros envíos realizados por los docentes.</p>
            </section>
          )}

          <div className="space-y-6">
            {gruposSolicitudes.map((grupo, indice) => {
              const pendiente = grupo.estado === 'PENDIENTE';
              return (
                <article key={`${grupo.docente}-${grupo.grupo}-${grupo.evaluacion}-${indice}`} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <header className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50/60 px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-extrabold text-gray-900">{grupo.docente}</h2>
                        <EstadoPill estado={grupo.estado} />
                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600">
                          {grupo.evaluacion}
                        </span>
                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-500">
                          {grupo.ids.length} solicitud(es)
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {grupo.materia} · Grupo {grupo.grupo} · Ciclo {grupo.ciclo}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Cierre original: {grupo.fechaCierre} · Solicitado: {grupo.fechaSolicitud}
                      </p>
                    </div>
                    {pendiente && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => abrirModal(true, grupo.ids)}
                          className="rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-gray-800"
                        >
                          Aprobar (48h)
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModal(false, grupo.ids)}
                          className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-900 shadow-sm transition-colors hover:bg-gray-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </header>

                  <div className="px-6 py-5">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <span className="font-bold">Justificante del docente:</span> {grupo.motivo}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Carnet</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Estudiante</th>
                            <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">Nota actual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {grupo.alumnos.map((alumno, indiceAlumno) => (
                              <tr key={`${grupo.evaluacion}-${indiceAlumno}`} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                  {comoTexto(obtenerDato(alumno, ['carnet', 'carnetEstudiante']))}
                                </td>
                                <td className="px-4 py-3 font-medium text-gray-900">{alumnoDe(alumno)}</td>
                                <td className="px-4 py-3 text-center font-bold text-gray-900">
                                  {comoTexto(obtenerDato(alumno, ['notaActual', 'nota', 'calificacionActual']))}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-lg font-extrabold text-gray-900">
                {modal.aprobar ? 'Aprobar solicitudes (48 h)' : 'Rechazar solicitudes'}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                La respuesta se aplicará a {modal.ids.length} solicitud(es).
              </p>
            </div>
            <div className="px-6 py-5">
              <label className="mb-2 ml-1 block text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Observación / respuesta *
              </label>
              <textarea
                rows={4}
                maxLength={MAX_CARACTERES}
                value={respuesta}
                onChange={evento => setRespuesta(evento.target.value)}
                placeholder="Escribe la justificación de la resolución..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
              <p className="mt-2 text-right text-[11px] text-gray-400">
                {respuesta.trim().length}/{MAX_CARACTERES} caracteres (mínimo {MIN_CARACTERES})
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={resolviendo}
                className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarResolucion}
                disabled={resolviendo || respuesta.trim().length < MIN_CARACTERES}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
                  modal.aprobar ? 'bg-gray-900 hover:bg-gray-800' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {resolviendo ? 'Procesando...' : modal.aprobar ? 'Confirmar aprobación' : 'Confirmar rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionEvaluacionesSolicitudes;
