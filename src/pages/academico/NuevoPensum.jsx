import React, { useEffect, useMemo, useState } from "react";
import CrearPensumPdf from "./CrearPensumPdf";
import { toast } from "sonner";

const pasos = [
  "Datos generales",
  "Seleccionar y organizar materias",
  "Revisar y enviar a aprobación",
];

const texto = (valor) => String(valor ?? "").trim();
const ANIO_ACTUAL = new Date().getFullYear();
const ANIO_MINIMO = ANIO_ACTUAL + 1;
const ANIOS = Array.from({ length: 20 }, (_, i) => ANIO_MINIMO + i);
const duracionPorNombre = (nombre = "") => {
  const normalizado = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalizado.includes("licenciatura")) return 5;
  if (normalizado.includes("tecnico") || normalizado.includes("maestria"))
    return 2;
  return null;
};
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

async function consultarCatalogo(ruta, signal) {
  if (!API_URL) throw new Error("VITE_API_URL no está configurada.");
  // El interceptor global de tu aplicación agrega el JWT desde leerSesion().
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(
      cuerpo?.mensaje ||
        cuerpo?.message ||
        `Error al consultar materias (${respuesta.status}).`,
    );
  }
  return respuesta.json();
}

async function solicitarPensum(ruta, opciones = {}) {
  if (!API_URL) throw new Error("VITE_API_URL no está configurada.");
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      Accept: "application/json",
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...opciones.headers,
    },
  });
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok)
    throw new Error(
      datos?.mensaje ||
        datos?.message ||
        `Error del servidor (${respuesta.status}).`,
    );
  return datos;
}

export default function NuevoPensum({
  onVolver,
  idPensumEditar = null,
  onGuardado,
}) {
  const [paso, setPaso] = useState(0);
  const [idBorrador, setIdBorrador] = useState(idPensumEditar);
  const [estadoPensum, setEstadoPensum] = useState("PLANIFICANDO");
  const [mostrarPdf, setMostrarPdf] = useState(false);
  const [cargandoBorrador, setCargandoBorrador] = useState(
    Boolean(idPensumEditar),
  );
  const [mensajeGuardado, setMensajeGuardado] = useState("");
  const [idCarrera, setIdCarrera] = useState("");
  const [anioInicio, setAnioInicio] = useState(ANIO_MINIMO);
  const [duracion, setDuracion] = useState("");
  const [cambioPendiente, setCambioPendiente] = useState(null);
  const [carrerasApi, setCarrerasApi] = useState([]);
  const [cargandoCarreras, setCargandoCarreras] = useState(true);
  const [errorCarreras, setErrorCarreras] = useState("");
  const version = String(anioInicio);
  const anioFin = duracion ? Number(anioInicio) + Number(duracion) - 1 : "";
  const ciclos = Array.from(
    { length: Math.max(0, Number(duracion) * 2) },
    (_, i) => i + 1,
  );
  const carrerasPlanificacion = carrerasApi.filter((c) => {
    const estado = String(
      c.estadoCarrera ?? c.nombreEstadoCarrera ?? c.nombreEstado ?? "",
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();
    return (
      estado === "PLANIFICACION" ||
      (idPensumEditar && String(c.idCarrera) === String(idCarrera))
    );
  });
  const carreraSeleccionada = carrerasPlanificacion.find(
    (c) => String(c.idCarrera) === String(idCarrera),
  );
  const duracionPredeterminada = duracionPorNombre(
    carreraSeleccionada?.nombreCarrera,
  );

  const [busqueda, setBusqueda] = useState("");
  const [cicloAgregar, setCicloAgregar] = useState(1);
  const [asignaciones, setAsignaciones] = useState([]);
  const [seleccion, setSeleccion] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [materiasApi, setMateriasApi] = useState([]);
  const [cargandoMaterias, setCargandoMaterias] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState("");
  const [prerrequisitosPorMateria, setPrerrequisitosPorMateria] = useState({});
  const [consultandoPrerrequisitos, setConsultandoPrerrequisitos] =
    useState(false);
  const [errorPrerrequisitos, setErrorPrerrequisitos] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setCargandoCarreras(true);
    consultarCatalogo("/api/v1/carreras/administracion", controller.signal)
      .then((datos) => {
        if (!Array.isArray(datos))
          throw new Error(
            "El catálogo de carreras tiene un formato inesperado.",
          );
        setCarrerasApi(datos);
        setErrorCarreras("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setErrorCarreras(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoCarreras(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!idPensumEditar) return;
    const controller = new AbortController();
    setCargandoBorrador(true);
    consultarCatalogo(
      `/api/v1/pensum/${encodeURIComponent(idPensumEditar)}`,
      controller.signal,
    )
      .then((datos) => {
        const p = datos?.pensum;
        if (
          !p ||
          !["PLANIFICANDO", "PENDIENTE_APROBACION"].includes(p.estadoPensum)
        )
          throw new Error("Este pensum no permite edición.");
        setIdCarrera(String(p.idCarrera));
        setAnioInicio(Number(p.anioInicio));
        setDuracion(Number(p.anioFin) - Number(p.anioInicio) + 1);
        setEstadoPensum(p.estadoPensum);
        setAsignaciones(
          (datos.materias || []).map((m) => ({
            idMateria: m.idMateria,
            cicloRecomendado: m.cicloRecomendado,
            obligatoria: m.obligatoria,
          })),
        );
        setCicloAgregar(
          Math.max(
            1,
            Math.min(
              Number(p.anioFin - p.anioInicio + 1) * 2,
              (datos.materias || []).reduce(
                (max, m) => Math.max(max, Number(m.cicloRecomendado)),
                1,
              ),
            ),
          ),
        );
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoBorrador(false);
      });
    return () => controller.abort();
  }, [idPensumEditar]);

  const cambiarCarrera = (valor) => {
    setIdCarrera(valor);
    const carrera = carrerasPlanificacion.find(
      (c) => String(c.idCarrera) === String(valor),
    );
    setDuracion(duracionPorNombre(carrera?.nombreCarrera) ?? "");
    setCambioPendiente(null);
  };

  useEffect(() => {
    const controller = new AbortController();
    setCargandoMaterias(true);
    consultarCatalogo("/api/v1/pensum/catalogos/materias", controller.signal)
      .then((datos) => {
        if (!Array.isArray(datos))
          throw new Error(
            "El catálogo de materias tiene un formato inesperado.",
          );
        setMateriasApi(datos);
        setErrorCatalogo("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setErrorCatalogo(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoMaterias(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!materiasApi.length) return;
    const controller = new AbortController();
    setConsultandoPrerrequisitos(true);
    setErrorPrerrequisitos("");
    const cargar = async () => {
      const resultados = {};
      const lotes = 8;
      for (let i = 0; i < materiasApi.length; i += lotes) {
        const grupo = materiasApi.slice(i, i + lotes);
        const pares = await Promise.all(
          grupo.map(async (m) => {
            const datos = await consultarCatalogo(
              `/api/v1/pensum/catalogos/materias/${encodeURIComponent(m.idMateria)}/prerrequisitos`,
              controller.signal,
            );
            if (!Array.isArray(datos))
              throw new Error(`Prerrequisitos inválidos: ${m.nombreMateria}`);
            return [String(m.idMateria), datos];
          }),
        );
        Object.assign(resultados, Object.fromEntries(pares));
      }
      if (!controller.signal.aborted) setPrerrequisitosPorMateria(resultados);
    };
    cargar()
      .catch((e) => {
        if (e.name !== "AbortError") setErrorPrerrequisitos(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setConsultandoPrerrequisitos(false);
      });
    return () => controller.abort();
  }, [materiasApi]);

  const materiasDisponibles = materiasApi;
  const materiasConPrerrequisitos = useMemo(
    () =>
      materiasDisponibles.map((m) => ({
        ...m,
        prerrequisitos: prerrequisitosPorMateria[String(m.idMateria)] || [],
      })),
    [materiasDisponibles, prerrequisitosPorMateria],
  );

  const catalogo = useMemo(
    () =>
      new Map(materiasConPrerrequisitos.map((m) => [String(m.idMateria), m])),
    [materiasConPrerrequisitos],
  );
  const asignadas = useMemo(
    () => new Map(asignaciones.map((a) => [String(a.idMateria), a])),
    [asignaciones],
  );
  const materiasFiltradas = materiasConPrerrequisitos.filter((m) =>
    `${m.codigoMateria} ${m.nombreMateria}`
      .toLowerCase()
      .includes(busqueda.toLowerCase()),
  );
  const totalUv = asignaciones.reduce(
    (total, a) =>
      total +
      Number(catalogo.get(String(a.idMateria))?.unidadesValorativas || 0),
    0,
  );
  const alertas = asignaciones.flatMap((a) => {
    const materia = catalogo.get(String(a.idMateria));
    return (materia?.prerrequisitos || []).flatMap((pr) => {
      const id = String(pr.idMateriaRequerida ?? pr.idMateria);
      const requerida = asignadas.get(id);
      if (!requerida)
        return [
          {
            materia: materia.nombreMateria,
            requisito: pr.nombreMateria || pr.codigoMateria || id,
            tipo: "externo",
          },
        ];
      if (requerida.cicloRecomendado >= a.cicloRecomendado)
        return [
          {
            materia: materia.nombreMateria,
            requisito: pr.nombreMateria || pr.codigoMateria || id,
            tipo: "orden",
          },
        ];
      return [];
    });
  });
  const prerrequisitosListos =
    !consultandoPrerrequisitos &&
    !errorPrerrequisitos &&
    asignaciones.every((a) =>
      Object.prototype.hasOwnProperty.call(
        prerrequisitosPorMateria,
        String(a.idMateria),
      ),
    );
  const puedeContinuar =
    paso !== 0 ||
    (idCarrera &&
      Number(anioInicio) >= ANIO_MINIMO &&
      Number(duracion) >= 1 &&
      Number(duracion) <= 15 &&
      cambioPendiente === null);
  const cantidadCiclo = (c) =>
    asignaciones.filter((a) => Number(a.cicloRecomendado) === Number(c)).length;
  const ciclosCompletos = ciclos.filter((c) => cantidadCiclo(c) >= 4).length;
  const validarAsignacion = (idMateria, ciclo, lista = asignaciones) => {
    if (
      !prerrequisitosListos ||
      !Object.prototype.hasOwnProperty.call(
        prerrequisitosPorMateria,
        String(idMateria),
      )
    )
      return "Espera a que terminen de cargarse los prerrequisitos.";
    const otras = lista.filter(
      (a) => String(a.idMateria) !== String(idMateria),
    );
    if (
      otras.filter((a) => Number(a.cicloRecomendado) === Number(ciclo))
        .length >= 5
    )
      return `El ciclo ${ciclo} ya tiene cinco materias.`;
    const requisitos = prerrequisitosPorMateria[String(idMateria)] || [];
    for (const otra of otras) {
      const requisitosOtra =
        prerrequisitosPorMateria[String(otra.idMateria)] || [];
      if (
        requisitos.some(
          (r) =>
            String(r.idMateriaRequerida ?? r.idMateria) ===
            String(otra.idMateria),
        ) &&
        Number(otra.cicloRecomendado) >= Number(ciclo)
      )
        return `El prerrequisito ${catalogo.get(String(otra.idMateria))?.nombreMateria} debe estar en un ciclo anterior.`;
      if (
        requisitosOtra.some(
          (r) =>
            String(r.idMateriaRequerida ?? r.idMateria) === String(idMateria),
        ) &&
        Number(ciclo) >= Number(otra.cicloRecomendado)
      )
        return `Esta materia debe estar antes de ${catalogo.get(String(otra.idMateria))?.nombreMateria}.`;
    }
    return "";
  };
  const agregar = (idMateria) => {
    setError("");
    if (asignadas.has(String(idMateria))) return;
    const problema = validarAsignacion(idMateria, cicloAgregar);
    if (problema) return setError(problema);
    setAsignaciones((prev) => [
      ...prev,
      { idMateria, cicloRecomendado: cicloAgregar, obligatoria: true },
    ]);
    setMensajeGuardado("");
  };
  const actualizar = (idMateria, cambios) => {
    const ciclo = Number(cambios.cicloRecomendado);
    const problema = validarAsignacion(idMateria, ciclo);
    if (problema) return setError(problema);
    setAsignaciones((prev) =>
      prev.map((a) =>
        String(a.idMateria) === String(idMateria) ? { ...a, ...cambios } : a,
      ),
    );
    setMensajeGuardado("");
    setError("");
  };
  const quitar = (idMateria) => {
    setAsignaciones((prev) =>
      prev.filter((a) => String(a.idMateria) !== String(idMateria)),
    );
    setMensajeGuardado("");
  };
  const guardarProgreso = async () => {
    if (guardando || cargandoBorrador) return null;
    if (
      !idCarrera ||
      !duracion ||
      Number(anioInicio) < ANIO_MINIMO ||
      cambioPendiente !== null
    ) {
      setError("Completa los datos generales antes de guardar.");
      return null;
    }
    if (!prerrequisitosListos && asignaciones.length) {
      setError("Espera a que termine la consulta de prerrequisitos.");
      return null;
    }
    setGuardando(true);
    setError("");
    setMensajeGuardado("");
    try {
      let id = idBorrador;
      if (!id) {
        const creado = await solicitarPensum("/api/v1/pensum", {
          method: "POST",
          body: JSON.stringify({
            idCarrera: Number(idCarrera),
            version: Number(anioInicio),
            anioInicio: Number(anioInicio),
            anioFin: Number(anioFin),
          }),
        });
        id = creado.idPensum;
        if (!id)
          throw new Error(
            "La API no devolvió el identificador del nuevo pensum.",
          );
        setIdBorrador(id);
      }
      await solicitarPensum(
        `/api/v1/pensum/${encodeURIComponent(id)}/borrador`,
        {
          method: "PUT",
          body: JSON.stringify({
            materias: asignaciones.map((a) => ({
              idMateria: Number(a.idMateria),
              cicloRecomendado: Number(a.cicloRecomendado),
              obligatoria: Boolean(a.obligatoria),
            })),
          }),
        },
      );
      setMensajeGuardado("Progreso guardado correctamente.");
      onGuardado?.();
      return id;
    } catch (e) {
      setError(e.message || "No se pudo guardar el progreso.");
      return null;
    } finally {
      setGuardando(false);
    }
  };
  const enviarAprobacion = async () => {
    if (
      ciclosCompletos !== ciclos.length ||
      !prerrequisitosListos
    ) {
      setError("Completa todos los ciclos antes de enviar a aprobación.");
      return;
    }
    /*if (
      ciclosCompletos !== ciclos.length ||
      alertas.length ||
      !prerrequisitosListos
    ) {
      setError(
        "Completa todos los ciclos y resuelve los prerrequisitos antes de enviar a aprobación.",
      );
      return;
    }*/
    const id = await guardarProgreso();
    if (!id) return;
    setGuardando(true);
    try {
      await solicitarPensum(
        `/api/v1/pensum/${encodeURIComponent(id)}/enviar-aprobacion`,
        { method: "PATCH" },
      );
      setEstadoPensum("PENDIENTE_APROBACION");
      toast.success("Se la operacion se completó correctamente.");
      onVolver?.();
    } catch (e) {
      setError(e.message || "No se pudo enviar a aprobación.");
    } finally {
      setGuardando(false);
    }
  };
  const campo =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-900";
  const boton =
    "rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50";

  if (mostrarPdf && idBorrador) {
    return (
      <CrearPensumPdf
        idPensum={idBorrador}
        onVolver={() => setMostrarPdf(false)}
      />
    );
  }

  return (
    <div className="min-h-full bg-white px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Crear nuevo pensum
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Selecciona una carrera, incorpora materias del catálogo y
              organízalas por ciclo.
            </p>
          </div>
          <button
            type="button"
            onClick={onVolver}
            className={`${boton} border border-slate-200 bg-white text-slate-700 hover:bg-white`}
          >
            ← Volver al listado
          </button>
        </header>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {pasos.map((nombre, i) => (
            <button
              key={nombre}
              type="button"
              onClick={() => {
                if (
                  i <= paso ||
                  (i === 1 && puedeContinuar) ||
                  (i === 2 &&
                    puedeContinuar &&
                    ciclos.length > 0 &&
                    ciclosCompletos === ciclos.length &&
                    prerrequisitosListos)
                ) {
                  setError("");
                  setPaso(i);
                }
              }}
              className={`rounded-xl border p-3 text-left text-sm ${paso === i ? "border-slate-900 bg-white font-bold text-slate-900" : "border-slate-200 bg-white text-slate-600"}`}
            >
              <span className="mr-2 font-bold">{i + 1}.</span>
              {nombre}
            </button>
          ))}
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {paso === 0 && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h2 className="text-xl font-bold">1. Datos generales</h2>
                <p className="mt-1 text-sm text-slate-500">
                  La carrera debe existir previamente en Gestión de Carreras.
                </p>
              </div>
              <label className="block space-y-1">
                <span className="text-sm font-semibold">Carrera *</span>
                <select
                  className={campo}
                  value={idCarrera}
                  onChange={(e) => cambiarCarrera(e.target.value)}
                  disabled={cargandoCarreras || Boolean(idBorrador)}
                >
                  <option value="">
                    {cargandoCarreras
                      ? "Cargando carreras..."
                      : "Seleccionar carrera en planificación"}
                  </option>
                  {carrerasPlanificacion.map((c) => (
                    <option key={c.idCarrera} value={c.idCarrera}>
                      {c.nombreCarrera}
                    </option>
                  ))}
                </select>
              </label>
              {errorCarreras && (
                <p
                  role="alert"
                  className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-red-700"
                >
                  {errorCarreras}
                </p>
              )}
              {!cargandoCarreras &&
                !errorCarreras &&
                carrerasPlanificacion.length === 0 && (
                  <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                    No hay carreras en estado PLANIFICACION disponibles para
                    crear un pensum.
                  </p>
                )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Año de inicio *</span>
                  <select
                    className={campo}
                    value={anioInicio}
                    onChange={(e) => setAnioInicio(Number(e.target.value))}
                    disabled={Boolean(idBorrador)}
                  >
                    {ANIOS.map((anio) => (
                      <option key={anio} value={anio}>
                        {anio}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">
                    Duración (años) *
                  </span>
                  <select
                    className={campo}
                    value={duracion}
                    disabled={!idCarrera || Boolean(idBorrador)}
                    onChange={(e) => {
                      const nueva = Number(e.target.value);
                      if (
                        duracionPredeterminada &&
                        nueva !== duracionPredeterminada
                      )
                        setCambioPendiente(nueva);
                      else {
                        setDuracion(nueva);
                        setCambioPendiente(null);
                      }
                    }}
                  >
                    <option value="">Seleccionar duración</option>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "año" : "años"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">Versión</span>
                  <input
                    className={`${campo} bg-white`}
                    value={version}
                    readOnly
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold">
                    Año de finalización
                  </span>
                  <input
                    className={`${campo} bg-white`}
                    value={anioFin}
                    readOnly
                    placeholder="Según duración"
                  />
                </label>
              </div>
              {idCarrera && duracionPredeterminada && (
                <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  Duración institucional predeterminada:{" "}
                  <strong>{duracionPredeterminada} años</strong>. Si cambias
                  esta duración, se solicitará confirmación.
                </p>
              )}
              {idCarrera && !duracionPredeterminada && (
                <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  No se identificó el nivel académico a partir del nombre de la
                  carrera. Selecciona la duración manualmente; falta vincular el
                  catálogo de niveles para automatizar este caso.
                </p>
              )}
              {cambioPendiente !== null && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirmar-duracion"
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                >
                  <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                    <h3 id="confirmar-duracion" className="text-lg font-bold">
                      Confirmar cambio de duración
                    </h3>
                    <p className="text-sm text-slate-700">
                      La duración predeterminada de esta carrera es de{" "}
                      <strong>{duracionPredeterminada} años</strong>, conforme a
                      las políticas de la universidad. ¿Deseas cambiarla a{" "}
                      <strong>{cambioPendiente} años</strong>? El año de
                      finalización se recalculará automáticamente.
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className={`${boton} border border-slate-200 bg-white text-slate-800`}
                        onClick={() => setCambioPendiente(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className={`${boton} bg-slate-950 text-white hover:bg-slate-800`}
                        onClick={() => {
                          setDuracion(cambioPendiente);
                          setCambioPendiente(null);
                        }}
                      >
                        Confirmar cambio
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {paso === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">
                  2. Seleccionar y organizar materias
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Selecciona el ciclo y agrega materias directamente desde el
                  catálogo. Puedes cambiar de ciclo y guardar avances
                  incompletos.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                  <span>
                    Ciclos completos: {ciclosCompletos} de {ciclos.length}
                  </span>
                  <span>
                    {Math.round(
                      (ciclosCompletos / Math.max(1, ciclos.length)) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full bg-black transition-all"
                    style={{
                      width: `${(ciclosCompletos / Math.max(1, ciclos.length)) * 100}%`,
                    }}
                  />
                </div>
                {ciclosCompletos === ciclos.length && ciclos.length > 0 ? (
                  <p className="mt-2 text-sm font-semibold text-green-700">
                    Todos los ciclos tienen entre 4 y 5 materias. Ya puedes
                    continuar a revisión.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    Completa los {ciclos.length} ciclos con 4 o 5 materias cada
                    uno para acceder a la revisión. Guardar progreso sigue
                    disponible.
                  </p>
                )}
              </div>
              <div className="grid items-start gap-4 lg:grid-cols-2">
                <div className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-bold">Catálogo de materias</h3>
                  <input
                    className={campo}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o código..."
                  />
                  <p className="text-xs text-slate-600">
                    Las materias se agregarán al ciclo {cicloAgregar}. Los
                    prerrequisitos son de solo lectura.
                  </p>
                  {cargandoMaterias && (
                    <p className="text-sm text-slate-600">
                      Cargando materias...
                    </p>
                  )}
                  {errorCatalogo && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-300 bg-white p-3 text-sm text-red-700"
                    >
                      {errorCatalogo}
                    </p>
                  )}
                  {errorPrerrequisitos && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-300 bg-white p-3 text-sm text-red-700"
                    >
                      No se pudieron consultar los prerrequisitos:{" "}
                      {errorPrerrequisitos}
                    </p>
                  )}
                  {consultandoPrerrequisitos && (
                    <p className="text-sm text-slate-600">
                      Consultando prerrequisitos...
                    </p>
                  )}
                  <div className="max-h-[520px] divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200">
                    {materiasFiltradas.map((m) => (
                      <div
                        key={m.idMateria}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-black">
                            {m.nombreMateria}
                          </p>
                          <p className="text-xs text-slate-600">
                            {m.codigoMateria} · {m.unidadesValorativas} UV ·{" "}
                            {Object.prototype.hasOwnProperty.call(
                              prerrequisitosPorMateria,
                              String(m.idMateria),
                            )
                              ? `${(m.prerrequisitos || []).length} prerrequisitos`
                              : "Prerrequisitos por consultar"}
                          </p>
                        </div>

                        <button
                          type="button"
                          title="Agregar materia"
                          aria-label={`Agregar ${m.nombreMateria}`}
                          disabled={
                            asignadas.has(String(m.idMateria)) ||
                            cantidadCiclo(cicloAgregar) >= 5 ||
                            !prerrequisitosListos
                          }
                          onClick={() => agregar(m.idMateria)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-lg font-semibold text-green-700 transition hover:border-green-400 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>
                    ))}
                    {!cargandoMaterias && materiasFiltradas.length === 0 && (
                      <p className="p-5 text-center text-sm text-slate-600">
                        No se encontraron materias.
                      </p>
                    )}
                  </div>
                </div>
                <div className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">Organización por ciclo</h3>
                    <select
                      className={`${campo} w-auto`}
                      value={cicloAgregar}
                      onChange={(e) => {
                        setCicloAgregar(Number(e.target.value));
                        setSeleccion(null);
                      }}
                    >
                      {ciclos.map((c) => (
                        <option key={c} value={c}>
                          Ciclo {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      Ciclo {cicloAgregar}: {cantidadCiclo(cicloAgregar)} de 5
                      materias
                    </p>
                    {cantidadCiclo(cicloAgregar) >= 4 ? (
                      <span className="text-sm font-semibold text-green-700">
                        Ciclo completo
                      </span>
                    ) : (
                      <span className="text-sm text-red-700">
                        Faltan {4 - cantidadCiclo(cicloAgregar)} para el mínimo
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
                    {asignaciones
                      .filter(
                        (a) =>
                          Number(a.cicloRecomendado) === Number(cicloAgregar),
                      )
                      .map((a) => {
                        const m = catalogo.get(String(a.idMateria));
                        return (
                          <div key={a.idMateria} className="space-y-2 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                onClick={() =>
                                  setSeleccion(
                                    seleccion === a.idMateria
                                      ? null
                                      : a.idMateria,
                                  )
                                }
                              >
                                <span className="block text-sm font-semibold text-black">
                                  {m?.nombreMateria || a.idMateria}
                                </span>
                                <span className="text-xs text-slate-600">
                                  {m?.codigoMateria} · {m?.unidadesValorativas}{" "}
                                  UV · Ver prerrequisitos
                                </span>
                              </button>

                              <div className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  title="Quitar materia"
                                  aria-label={`Quitar ${m?.nombreMateria || a.idMateria}`}
                                  onClick={() => quitar(a.idMateria)}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-lg font-semibold text-red-600 transition hover:border-red-400 hover:bg-red-100"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                            {seleccion === a.idMateria && (
                              <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
                                <strong>
                                  Prerrequisitos registrados (solo lectura):
                                </strong>{" "}
                                {(m?.prerrequisitos || []).length
                                  ? m.prerrequisitos
                                      .map(
                                        (pr) =>
                                          `${pr.codigoMateria ? `${pr.codigoMateria} - ` : ""}${pr.nombreMateria || pr.idMateriaRequerida || pr.idMateria}`,
                                      )
                                      .join(", ")
                                  : "Ninguno"}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {cantidadCiclo(cicloAgregar) === 0 && (
                      <p className="p-5 text-sm text-slate-600">
                        Este ciclo aún no tiene materias. Selecciónalas en el
                        catálogo.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={cicloAgregar <= 1}
                      className={`${boton} border border-black bg-white text-black hover:bg-slate-100`}
                      onClick={() => {
                        setCicloAgregar((c) => c - 1);
                        setSeleccion(null);
                      }}
                    >
                      ← Ciclo anterior
                    </button>
                    <button
                      type="button"
                      disabled={cicloAgregar >= ciclos.length}
                      className={`${boton} bg-black text-white hover:bg-slate-800`}
                      onClick={() => {
                        setCicloAgregar((c) => c + 1);
                        setSeleccion(null);
                      }}
                    >
                      Siguiente ciclo →
                    </button>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <p className="mb-2 text-sm font-semibold">
                      Resumen de ciclos
                    </p>
                    <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5 xl:grid-cols-10">
                      {ciclos.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCicloAgregar(c);
                            setSeleccion(null);
                          }}
                          title={`Ciclo ${c}: ${cantidadCiclo(c)} materias`}
                          className={`rounded-lg border px-2 py-2 text-xs font-semibold ${c === cicloAgregar ? "border-black bg-black text-white" : "border-slate-300 bg-white text-black hover:bg-slate-100"}`}
                        >
                          {c}
                          <span
                            className={`block text-[10px] ${c === cicloAgregar ? "text-white" : cantidadCiclo(c) >= 4 ? "text-green-700" : "text-slate-600"}`}
                          >
                            {cantidadCiclo(c)}/5
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {asignaciones.length} materias seleccionadas en total
              </p>
            </div>
          )}
          {paso === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">
                3. Revisar y enviar a aprobación
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { titulo: "Materias", valor: asignaciones.length },
                  { titulo: "Unidades valorativas", valor: totalUv },
                  {
                    titulo: "Ciclos utilizados",
                    valor: new Set(asignaciones.map((a) => a.cicloRecomendado))
                      .size,
                  },
                ].map((d) => (
                  <div
                    key={d.titulo}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-bold uppercase text-slate-500">
                      {d.titulo}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold">{d.valor}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-600">
                Versión <strong>{version || "—"}</strong> · Vigencia{" "}
                <strong>
                  {anioInicio || "—"} – {anioFin || "Sin cierre"}
                </strong>
              </p>
              {!prerrequisitosListos && (
                <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  Es necesario completar la consulta de prerrequisitos antes de
                  validar el pensum.
                </p>
              )}
              {prerrequisitosListos &&
                (alertas.length > 0 ? (
                  <div className="rounded-xl border border-red-300 bg-white p-4">
                    <h3 className="font-bold text-red-700">
                      Advertencias de prerrequisitos ({alertas.length})
                    </h3>
                    {alertas.map((a, i) => (
                      <p key={i} className="mt-2 text-sm text-red-700">
                        {a.materia}: {a.requisito}{" "}
                        {a.tipo === "externo"
                          ? "no está incluido en este pensum"
                          : "debe ubicarse en un ciclo anterior"}
                        .
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-white p-3 text-sm text-green-700">
                    No se detectaron inconsistencias con los prerrequisitos
                    disponibles en el catálogo.
                  </p>
                ))}
            </div>
          )}
        </section>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-white p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {mensajeGuardado && (
          <p
            role="status"
            className="rounded-xl border border-green-300 bg-white p-3 text-sm text-green-700"
          >
            {mensajeGuardado}
          </p>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (paso === 0 ? onVolver?.() : setPaso((p) => p - 1))}
            className={`${boton} border border-slate-200 bg-white text-slate-700`}
          >
            {paso === 0 ? "Volver" : "Anterior"}
          </button>
          <div className="flex flex-wrap gap-2">
            {idBorrador && (
              <button
                type="button"
                onClick={() => setMostrarPdf(true)}
                className={`${boton} border border-black bg-white text-black`}
              >
                Ver PDF
              </button>
            )}
            <button
              type="button"
              disabled={guardando || cargandoBorrador || !puedeContinuar}
              onClick={guardarProgreso}
              className={`${boton} border border-slate-900 bg-white text-slate-900`}
            >
              {guardando ? "Guardando..." : "Guardar progreso"}
            </button>
            {paso < 2 ? (
              <button
                type="button"
                disabled={
                  !puedeContinuar ||
                  (paso === 1 &&
                    (!prerrequisitosListos ||
                      ciclos.length === 0 ||
                      ciclosCompletos !== ciclos.length))
                }
                onClick={() => {
                  setError("");
                  setPaso((p) => p + 1);
                }}
                className={`${boton} bg-slate-950 text-white hover:bg-slate-800`}
              >
                Continuar →
              </button>
            ) : estadoPensum === "PLANIFICANDO" ? (
              <button
                type="button"
                /*disabled={
                  guardando ||
                  ciclosCompletos !== ciclos.length ||
                  alertas.length > 0 ||
                  !prerrequisitosListos
                }*/
                disabled={
                  guardando ||
                  ciclosCompletos !== ciclos.length ||
                  !prerrequisitosListos
                }
                onClick={enviarAprobacion}
                className={`${boton} bg-slate-950 text-white hover:bg-slate-800`}
              >
                Enviar a aprobación
              </button>
            ) : (
              <span className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                Pendiente de aprobación · editable
              </span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
