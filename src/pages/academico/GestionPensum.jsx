import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import NuevoPensum from "./NuevoPensum";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const normalizar = (texto) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const numero = (valor) =>
  Number(valor ?? 0).toLocaleString("es-SV", { maximumFractionDigits: 2 });

async function solicitar(ruta, signal) {
  if (!API_URL) throw new Error("VITE_API_URL no está configurada.");
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Inicia sesión para consultar los pensum.");
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    signal,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    const mensaje = cuerpo?.mensaje || cuerpo?.message;
    throw new Error(
      typeof mensaje === "string"
        ? mensaje
        : {
            401: "Tu sesión ha expirado.",
            403: "No tienes permiso para consultar los pensum.",
            404: "El pensum solicitado no existe.",
          }[respuesta.status] ||
            `No se pudo consultar el servidor (${respuesta.status}).`,
    );
  }
  return respuesta.json();
}

function Icono({ nombre, size = 18, className = "" }) {
  const trazos = {
    libro: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    buscar: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    abajo: <path d="m6 9 6 6 6-6" />,
    izquierda: <path d="m15 18-6-6 6-6" />,
    imprimir: (
      <>
        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v8H6z" />
      </>
    ),
    refrescar: (
      <>
        <path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4" />
      </>
    ),
    capas: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 9v12" />
      </>
    ),
    calendario: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    alerta: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4m0 4h.01" />
      </>
    ),
    archivo: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {trazos[nombre] || trazos.libro}
    </svg>
  );
}

function EtiquetaEstado({ estado }) {
  const nombre = String(estado || "SIN ESTADO");
  const valor = normalizar(nombre);
  const estilo =
    valor.includes("vigente") || valor === "activo" || valor === "activa"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : valor.includes("plan")
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${estilo}`}
    >
      {nombre}
    </span>
  );
}

function TablaCiclo({ ciclo, materias }) {
  const uv = materias.reduce(
    (suma, materia) => suma + Number(materia.unidadesValorativas || 0),
    0,
  );
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white print:border-slate-300 print:rounded-none print:break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 print:bg-white">
        <h3 className="font-bold text-slate-900">Ciclo {ciclo}</h3>
        <span className="text-xs font-semibold text-slate-500">
          {materias.length} {materias.length === 1 ? "materia" : "materias"} ·{" "}
          {numero(uv)} UV
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm print:min-w-0 print:text-[10px]">
          <thead className="bg-white text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-bold print:px-2">Código</th>
              <th className="px-4 py-3 font-bold print:px-2">Asignatura</th>
              <th className="px-4 py-3 text-center font-bold print:px-2">UV</th>
              <th className="px-4 py-3 font-bold print:px-2">Tipo</th>
              <th className="px-5 py-3 font-bold print:px-2">Prerrequisitos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {materias.map((materia) => (
              <tr key={materia.idMateria} className="align-top">
                <td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-semibold text-slate-700 print:px-2">
                  {materia.codigoMateria}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900 print:px-2">
                  {materia.nombreMateria}
                </td>
                <td className="px-4 py-3 text-center font-semibold text-slate-700 print:px-2">
                  {numero(materia.unidadesValorativas)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 print:px-2">
                  {materia.obligatoria ? "Obligatoria" : "Optativa"}
                </td>
                <td className="px-5 py-3 text-xs text-slate-600 print:px-2">
                  {materia.prerrequisitos?.length
                    ? materia.prerrequisitos
                        .map((p) => `${p.codigoMateria} — ${p.nombreMateria}`)
                        .join("; ")
                    : "Ninguno"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MapaCurricularImpresion({ cabecera, materiasPorCiclo, detalle }) {
  const ciclos = Array.from(
    {
      length: Math.max(
        Number(detalle?.totalCiclos || 0),
        ...materiasPorCiclo.map(([c]) => Number(c)),
        0,
      ),
    },
    (_, i) => i + 1,
  );
  const porCiclo = new Map(
    materiasPorCiclo.map(([ciclo, materias]) => [Number(ciclo), materias]),
  );
  // Numeración vertical por ciclo, como en el mapa curricular institucional.
  // El orden por código es estable mientras el backend no exponga un orden oficial dentro de cada ciclo.
  const correlativos = new Map();
  let consecutivo = 0;
  const ordenadas = new Map(
    ciclos.map((ciclo) => {
      const materias = [...(porCiclo.get(ciclo) || [])].sort(
        (a, b) =>
          String(a.codigoMateria || "").localeCompare(
            String(b.codigoMateria || ""),
            "es",
            { numeric: true },
          ) || Number(a.idMateria || 0) - Number(b.idMateria || 0),
      );
      materias.forEach((materia) => {
        consecutivo += 1;
        correlativos.set(String(materia.idMateria), consecutivo);
      });
      return [ciclo, materias];
    }),
  );
  const maxMaterias = Math.max(
    1,
    ...[...ordenadas.values()].map((materias) => materias.length),
  );
  const prerrequisitoNumero = (pr) => {
    const id = pr?.idMateria ?? pr?.idMateriaRequerida;
    if (id != null && correlativos.has(String(id)))
      return String(correlativos.get(String(id)));
    // Si el DTO no proporciona el ID, se busca por código únicamente cuando es inequívoco.
    const coincidencias = [...ordenadas.values()]
      .flat()
      .filter((m) => m.codigoMateria && m.codigoMateria === pr?.codigoMateria);
    return coincidencias.length === 1
      ? String(correlativos.get(String(coincidencias[0].idMateria)))
      : "EXT";
  };
  const referenciasExternas = [...ordenadas.values()]
    .flat()
    .some((m) =>
      (m.prerrequisitos || []).some((pr) => prerrequisitoNumero(pr) === "EXT"),
    );
  return (
    <div
      className="mapa-curricular-pdf"
      aria-hidden="true"
      style={{ "--mapa-filas": maxMaterias }}
    >
      <header className="mapa-encabezado">
        <div className="mapa-institucion">UNIVERSIDAD MODULAR ABIERTA</div>
        <div className="mapa-encabezado-secundario">
          PLAN DE ESTUDIO DE LA CARRERA
        </div>
        <h2 className="mapa-carrera">{cabecera?.nombreCarrera}</h2>
        <div className="mapa-subtitulo">
          VERSIÓN {cabecera?.version} · VIGENCIA {cabecera?.anioInicio} –{" "}
          {cabecera?.anioFin ?? "SIN AÑO DE CIERRE"} · {cabecera?.estadoPensum}
        </div>
      </header>
      <main
        className="mapa-columnas"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, ciclos.length)}, minmax(0, 1fr))`,
        }}
      >
        {ciclos.map((ciclo) => {
          const materias = ordenadas.get(ciclo) || [];
          const uv = materias.reduce(
            (sum, m) => sum + Number(m.unidadesValorativas || 0),
            0,
          );
          return (
            <section className="mapa-columna" key={ciclo}>
              <div className="mapa-ciclo">CICLO {ciclo}</div>
              <div className="mapa-casillas">
                {materias.map((materia, indice) => (
                  <div
                    className="mapa-materia"
                    key={materia.idMateria ?? `${ciclo}-${indice}`}
                  >
                    <div className="mapa-materia-codigo">
                      <span
                        className="mapa-correlativo"
                        title="Número correlativo"
                      >
                        {correlativos.get(String(materia.idMateria))}
                      </span>
                      <span
                        className="mapa-codigo-texto"
                        title="Código de materia"
                      >
                        {materia.codigoMateria || "S/C"}
                      </span>
                    </div>
                    <div
                      className="mapa-materia-nombre"
                      title="Nombre de asignatura"
                    >
                      {materia.nombreMateria}
                    </div>
                    <div className="mapa-materia-pie">
                      <span title="Prerrequisitos por correlativo">
                        {materia.prerrequisitos?.length
                          ? materia.prerrequisitos
                              .map(prerrequisitoNumero)
                              .join(", ")
                          : "—"}
                      </span>
                      <strong title="Unidades valorativas">
                        {numero(materia.unidadesValorativas)} UV
                      </strong>
                    </div>
                  </div>
                ))}
                {Array.from(
                  { length: maxMaterias - materias.length },
                  (_, i) => (
                    <div className="mapa-espacio" key={i} />
                  ),
                )}
              </div>
              <div className="mapa-ciclo-total">
                {materias.length} materias · {numero(uv)} UV
              </div>
            </section>
          );
        })}
      </main>
      <footer className="mapa-pie">
        <div className="mapa-resumen">
          <span>{detalle?.totalMaterias ?? 0} ASIGNATURAS</span>
          <span>
            {numero(detalle?.totalUnidadesValorativas)} UNIDADES VALORATIVAS
          </span>
          <span>{ciclos.length} CICLOS</span>
        </div>
        <div className="mapa-nota">
          PRERREQUISITOS: NÚMEROS CORRELATIVOS DE LAS ASIGNATURAS
          {referenciasExternas
            ? " · EXT = MATERIA NO INCLUIDA EN ESTE PENSUM"
            : ""}
        </div>
      </footer>
    </div>
  );
}

export default function GestionPensum() {
  const [pensum, setPensum] = useState([]);
  const [mostrarNuevoPensum, setMostrarNuevoPensum] = useState(false);
  const [idEditar, setIdEditar] = useState(null);
  const [origenNuevaVersion, setOrigenNuevaVersion] = useState(null);
  const [anioNuevaVersion, setAnioNuevaVersion] = useState(
    new Date().getFullYear() + 1,
  );
  const [creandoVersion, setCreandoVersion] = useState(false);
  const [errorNuevaVersion, setErrorNuevaVersion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [tarjetaActiva, setTarjetaActiva] = useState("TODOS");
  const [expandida, setExpandida] = useState(null);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");
  const solicitudDetalle = useRef(0);
  const [pensumActivar, setPensumActivar] = useState(null);
  const [activandoPensum, setActivandoPensum] = useState(false);
  const [pensumEliminar, setPensumEliminar] = useState(null);
  const [eliminandoPensum, setEliminandoPensum] = useState(false);

  const confirmarNuevaVersion = async () => {
    if (!origenNuevaVersion || creandoVersion) return;
    const inicio = Number(anioNuevaVersion);
    const duracion =
      origenNuevaVersion.anioFin == null
        ? null
        : Number(origenNuevaVersion.anioFin) -
          Number(origenNuevaVersion.anioInicio) +
          1;
    if (
      !Number.isInteger(inicio) ||
      inicio <= new Date().getFullYear() ||
      !duracion ||
      duracion < 1
    ) {
      setErrorNuevaVersion(
        "Indica un año futuro. El pensum original debe tener una duración definida.",
      );
      return;
    }
    setCreandoVersion(true);
    setErrorNuevaVersion("");
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Tu sesión ha expirado.");
      const respuesta = await fetch(
        `${API_URL}/api/v1/pensum/${encodeURIComponent(origenNuevaVersion.idPensum)}/crear-version`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idCarrera: origenNuevaVersion.idCarrera,
            version: inicio,
            anioInicio: inicio,
            anioFin: inicio + duracion - 1,
          }),
        },
      );
      const datos = await respuesta.json().catch(() => null);
      if (!respuesta.ok)
        throw new Error(
          datos?.mensaje ||
            datos?.message ||
            `No se pudo crear la versión (${respuesta.status}).`,
        );
      if (!datos?.idPensum)
        throw new Error("El servidor no devolvió el ID de la nueva versión.");
      setOrigenNuevaVersion(null);
      setIdEditar(datos.idPensum);
      setMostrarNuevoPensum(true);
      toast.success("Nueva versión creada. Puedes comenzar a editarla.");
    } catch (e) {
      setErrorNuevaVersion(e.message);
    } finally {
      setCreandoVersion(false);
    }
  };

  const confirmarActivacion = async () => {
    if (!pensumActivar || activandoPensum) return;
    setActivandoPensum(true);
    try {
      if (!API_URL) throw new Error("VITE_API_URL no está configurada.");
      const token = localStorage.getItem("token");
      if (!token)
        throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");
      const respuesta = await fetch(
        `${API_URL}/api/v1/pensum/${encodeURIComponent(pensumActivar.idPensum)}/activar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        throw new Error(
          cuerpo?.mensaje ||
            cuerpo?.message ||
            `No se pudo activar el pensum (${respuesta.status}).`,
        );
      }
      toast.success("Pensum activado correctamente", {
        description:
          "La nueva versión está VIGENTE. Si existía un pensum vigente anterior, pasó a CERRADO.",
      });
      setPensumActivar(null);
      await cargarListado();
    } catch (e) {
      toast.error("No se pudo activar el pensum", { description: e.message });
    } finally {
      setActivandoPensum(false);
    }
  };

  const eliminarPensum = async () => {
    if (!pensumEliminar || eliminandoPensum) return;

    setEliminandoPensum(true);

    try {
      if (!API_URL) throw new Error("VITE_API_URL no está configurada.");

      const token = localStorage.getItem("token");
      if (!token) throw new Error("Tu sesión ha expirado.");

      const respuesta = await fetch(
        `${API_URL}/api/v1/pensum/${encodeURIComponent(pensumEliminar.idPensum)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        throw new Error(
          datos?.mensaje ||
            datos?.message ||
            `No se pudo eliminar el pensum (${respuesta.status}).`,
        );
      }

      toast.success("Pensum eliminado correctamente");
      setPensumEliminar(null);
      await cargarListado();
    } catch (error) {
      toast.error("No se pudo eliminar el pensum", {
        description: error.message,
      });
    } finally {
      setEliminandoPensum(false);
    }
  };

  const cargarListado = useCallback(async () => {
    const control = new AbortController();
    setCargando(true);
    setError("");
    try {
      const datos = await solicitar("/api/v1/pensum", control.signal);
      if (!Array.isArray(datos))
        throw new Error("El listado de pensum tiene un formato inesperado.");
      setPensum(datos);
    } catch (e) {
      if (!control.signal.aborted) {
        setError(e.message);
        toast.error("No se pudieron cargar los pensum", {
          description: e.message,
        });
      }
    } finally {
      if (!control.signal.aborted) setCargando(false);
    }
    return () => control.abort();
  }, []);

  useEffect(() => {
    const control = new AbortController();
    let vigente = true;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const datos = await solicitar("/api/v1/pensum", control.signal);
        if (!Array.isArray(datos))
          throw new Error("El listado tiene un formato inesperado.");
        if (vigente) setPensum(datos);
      } catch (e) {
        if (vigente && !control.signal.aborted) setError(e.message);
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
      control.abort();
    };
  }, []);

  useEffect(() => {
    if (idSeleccionado == null) {
      setDetalle(null);
      setErrorDetalle("");
      return;
    }
    const control = new AbortController();
    const numeroSolicitud = ++solicitudDetalle.current;
    setCargandoDetalle(true);
    setErrorDetalle("");
    setDetalle(null);
    (async () => {
      try {
        const datos = await solicitar(
          `/api/v1/pensum/${encodeURIComponent(idSeleccionado)}`,
          control.signal,
        );
        if (
          numeroSolicitud === solicitudDetalle.current &&
          !control.signal.aborted
        )
          setDetalle(datos);
      } catch (e) {
        if (
          numeroSolicitud === solicitudDetalle.current &&
          !control.signal.aborted
        ) {
          setErrorDetalle(e.message);
          toast.error("No se pudo abrir el pensum", { description: e.message });
        }
      } finally {
        if (
          numeroSolicitud === solicitudDetalle.current &&
          !control.signal.aborted
        )
          setCargandoDetalle(false);
      }
    })();
    return () => control.abort();
  }, [idSeleccionado]);

  const estados = useMemo(
    () =>
      [...new Set(pensum.map((p) => p.estadoPensum).filter(Boolean))].sort(),
    [pensum],
  );
  // El vencimiento se interpreta por año académico, no por fecha exacta.
  const anioActual = new Date().getFullYear();
  const proximoAVencer = (p) =>
    p.estadoPensum === "VIGENTE" &&
    p.anioFin != null &&
    String(p.anioFin).trim() !== "" &&
    Number(p.anioFin) >= anioActual &&
    Number(p.anioFin) <= anioActual + 1;
  const tarjetas = [
    {
      id: "TODOS",
      titulo: "Pensum registrados",
      valor: pensum.length,
      icono: "libro",
    },
    {
      id: "PROXIMOS",
      titulo: "Próximos a vencer",
      valor: pensum.filter(proximoAVencer).length,
      icono: "calendario",
    },
    {
      id: "PLANIFICANDO",
      titulo: "En planificación",
      valor: pensum.filter((p) => p.estadoPensum === "PLANIFICANDO").length,
      icono: "capas",
    },
    {
      id: "PENDIENTE_APROBACION",
      titulo: "Pendientes de aprobación",
      valor: pensum.filter((p) => p.estadoPensum === "PENDIENTE_APROBACION")
        .length,
      icono: "alerta",
    },
    {
      id: "CERRADO",
      titulo: "Cerrados",
      valor: pensum.filter((p) => p.estadoPensum === "CERRADO").length,
      icono: "archivo",
    },
  ];
  const seleccionarTarjeta = (id) => {
    setTarjetaActiva(id);
    setFiltroEstado(id === "PROXIMOS" ? "TODOS" : id);
    setExpandida(null);
  };
  const carreras = useMemo(() => {
    const agrupadas = new Map();
    pensum.forEach((p) => {
      if (filtroEstado !== "TODOS" && p.estadoPensum !== filtroEstado) return;
      if (tarjetaActiva === "PROXIMOS" && !proximoAVencer(p)) return;
      const texto = normalizar(
        `${p.nombreCarrera} ${p.codigoCarrera} ${p.version} ${p.estadoPensum}`,
      );
      if (busqueda.trim() && !texto.includes(normalizar(busqueda.trim())))
        return;
      const id = String(p.idCarrera);
      if (!agrupadas.has(id))
        agrupadas.set(id, {
          id,
          nombre: p.nombreCarrera,
          codigo: p.codigoCarrera,
          versiones: [],
        });
      agrupadas.get(id).versiones.push(p);
    });
    return [...agrupadas.values()]
      .map((c) => ({
        ...c,
        versiones: c.versiones.sort(
          (a, b) => Number(b.version) - Number(a.version),
        ),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [pensum, busqueda, filtroEstado, tarjetaActiva, anioActual]);
  const materiasPorCiclo = useMemo(() => {
    const grupos = new Map();
    (detalle?.materias || []).forEach((materia) => {
      const ciclo = Number(materia.cicloRecomendado || 0);
      if (!grupos.has(ciclo)) grupos.set(ciclo, []);
      grupos.get(ciclo).push(materia);
    });
    return [...grupos.entries()].sort(([a], [b]) => a - b);
  }, [detalle]);
  const cabecera = detalle?.pensum;
  const totalVersiones = pensum.length;
  const totalCarreras = new Set(pensum.map((p) => p.idCarrera)).size;

  const imprimir = () => {
    if (!detalle || cargandoDetalle) return;
    const nombre = String(cabecera?.nombreCarrera || "Carrera")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const tituloAnterior = document.title;
    document.title = `pensum+${nombre}`;
    const restaurar = () => {
      document.title = tituloAnterior;
      window.removeEventListener("afterprint", restaurar);
    };
    window.addEventListener("afterprint", restaurar);
    window.print();
  };

  if (mostrarNuevoPensum) {
    return (
      <NuevoPensum
        idPensumEditar={idEditar}
        onVolver={() => {
          setMostrarNuevoPensum(false);
          setIdEditar(null);
          cargarListado();
        }}
      />
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <style>{`
      .mapa-curricular-pdf { display: none; }
      @media print {
        @page { size: A4 landscape; margin: 0; }
        html, body { width: 297mm !important; height: 210mm !important; overflow: hidden !important; }
        #root, #root > *, #root > * > * { max-width: none !important; overflow: visible !important; }
        .mx-auto.max-w-7xl { max-width: none !important; width: 100% !important; margin: 0 !important; }
        html, body, #root { background: white !important; margin: 0 !important; padding: 0 !important; }
        body * { visibility: hidden !important; }
        #pensum-area-impresion, #pensum-area-impresion * { visibility: visible !important; }
        #pensum-area-impresion { position: fixed !important; inset: 5mm auto auto 5mm !important; width: 287mm !important; height: 200mm !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
        #pensum-area-impresion > :not(.mapa-curricular-pdf) { display: none !important; }
        #pensum-area-impresion .mapa-curricular-pdf {
          display: flex !important; flex-direction: column; box-sizing: border-box;
          width: 287mm; height: 200mm; max-width: 287mm; max-height: 200mm; padding: 0; margin: 0;
          font-family: Arial, Helvetica, sans-serif; color: #26364a;
          print-color-adjust: exact; -webkit-print-color-adjust: exact;
        }
        .mapa-encabezado { flex: 0 0 auto; text-align: center; padding: 1mm 0 2mm; border-bottom: .3mm solid #d5dee8; margin-bottom: 2mm; }
        .mapa-institucion { color: #314b66; font-size: 10pt; font-weight: 800; letter-spacing: .08em; }
        .mapa-encabezado-secundario { font-size: 7pt; font-weight: 700; color: #60758d; margin-top: 1.5mm; letter-spacing: .1em; }
        .mapa-carrera { font-size: 10pt; font-weight: 800; line-height: 1.2; margin: 1.5mm 0 0; text-transform: uppercase; }
        .mapa-subtitulo { font-size: 6.5pt; color: #65758b; margin-top: 1.5mm; text-transform: uppercase; }
        .mapa-columnas { display: grid; flex: 1 1 auto; min-height: 0; width: 100%; gap: .9mm; align-items: stretch; }
        .mapa-columna { display: flex; flex-direction: column; min-width: 0; min-height: 0; gap: .9mm; }
        .mapa-ciclo { flex: 0 0 auto; background: #edf2f7 !important; border: .25mm solid #dce4ed; color: #3c5874; border-radius: 1mm; padding: 1.4mm .5mm; font-size: 7pt; text-align: center; font-weight: 800; }
        .mapa-casillas { flex: 1 1 auto; min-height: 0; display: grid; grid-template-rows: repeat(var(--mapa-filas), minmax(0, 1fr)); gap: .9mm; }
        .mapa-materia { min-height: 0; min-width: 0; border: .25mm solid #d8e0e9; border-radius: 1mm; display: flex; flex-direction: column; overflow: hidden; break-inside: avoid; }
        .mapa-materia-codigo { flex: 0 0 auto; display: flex; align-items: stretch; background: #f4f7fa !important; border-bottom: .2mm solid #dce5ed; font-size: 7pt; color: #3d5975; font-weight: 800; min-height: 6mm; }
        .mapa-correlativo { display: flex; align-items: center; justify-content: center; flex: 0 0 6mm; border-right: .2mm solid #dce5ed; }
        .mapa-codigo-texto { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; text-align: center; overflow-wrap: anywhere; padding: .5mm; }
        .mapa-materia-nombre { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; text-align: center; padding: 1mm .5mm; font-size: 8pt; line-height: 1.12; font-weight: 700; overflow-wrap: anywhere; }
        .mapa-materia-pie { flex: 0 0 auto; border-top: .2mm solid #dce5ed; display: flex; align-items: stretch; font-size: 7pt; color: #52677e; min-height: 7mm; }
        .mapa-materia-pie span { flex: 1; min-width: 0; display: flex; align-items: center; padding: .5mm .7mm; overflow-wrap: anywhere; line-height: 1.15; }
        .mapa-materia-pie strong { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; white-space: nowrap; border-left: .2mm solid #dce5ed; padding: .5mm .7mm; color: #344b65; }
        .mapa-espacio { min-height: 0; }
        .mapa-ciclo-total { flex: 0 0 auto; border-top: .2mm solid #dce4ed; text-align: center; padding: 1.5mm .5mm; font-size: 6.7pt; font-weight: 700; color: #5b7087; }
        .mapa-pie { flex: 0 0 auto; margin-top: 2mm; border-top: .3mm solid #d5dee8; padding-top: 1.5mm; }
        .mapa-resumen { display: flex; justify-content: center; gap: 8mm; font-size: 7pt; font-weight: 800; color: #3c5874; }
        .mapa-nota { margin-top: 1mm; font-size: 6pt; color: #8492a3; text-align: center; }
      }
    `}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Gestión de Pensum
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Consulta todas las versiones, revisa su distribución académica y
              exporta el plan de estudios.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setIdEditar(null);
                setMostrarNuevoPensum(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800"
            >
              <span className="text-lg leading-none">+</span>
              Nuevo pensum
            </button>
            <button
              type="button"
              onClick={cargarListado}
              disabled={cargando}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Icono
                nombre="refrescar"
                size={16}
                className={cargando ? "animate-spin" : ""}
              />{" "}
              Actualizar listado
            </button>
          </div>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tarjetas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => seleccionarTarjeta(item.id)}
              aria-pressed={tarjetaActiva === item.id}
              title={
                item.id === "PROXIMOS"
                  ? "Pensum vigentes que finalizan este año o el siguiente"
                  : `Filtrar: ${item.titulo}`
              }
              className={`rounded-2xl border p-5 text-left shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${tarjetaActiva === item.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"}`}
            >
              <div className="mb-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span>{item.titulo}</span>
                <Icono nombre={item.icono} size={19} className="shrink-0" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {cargando ? "—" : item.valor}
              </div>
            </button>
          ))}
        </div>
        {idSeleccionado == null ? (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
              <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <Icono nombre="buscar" size={18} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                  placeholder="Buscar carrera, código, versión o estado..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  aria-label="Buscar pensum"
                />
              </label>
              <select
                aria-label="Filtrar por estado"
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value);
                  setTarjetaActiva(e.target.value);
                  setExpandida(null);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
              >
                <option value="TODOS">Todos los estados</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            {error ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
              >
                <div className="flex items-center gap-2 font-bold">
                  <Icono nombre="alerta" /> Error al consultar pensum
                </div>
                <p className="mt-2">{error}</p>
                <button className="mt-3 underline" onClick={cargarListado}>
                  Intentar de nuevo
                </button>
              </div>
            ) : cargando ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Cargando pensum...
              </div>
            ) : carreras.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Icono
                  nombre="libro"
                  size={30}
                  className="mx-auto mb-3 text-slate-400"
                />
                <p className="font-bold text-slate-800">
                  No se encontraron pensum
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Prueba otros filtros o verifica si existen planes de estudio
                  registrados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {carreras.map((carrera) => {
                  const abierta = expandida === carrera.id;
                  return (
                    <div
                      key={carrera.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        aria-expanded={abierta}
                        onClick={() =>
                          setExpandida(abierta ? null : carrera.id)
                        }
                        className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
                            <Icono nombre="libro" size={22} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900">
                              {carrera.nombre}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {carrera.codigo} · {carrera.versiones.length}{" "}
                              {carrera.versiones.length === 1
                                ? "versión"
                                : "versiones"}
                            </div>
                          </div>
                        </div>
                        <Icono
                          nombre="abajo"
                          className={`shrink-0 text-slate-500 transition-transform ${abierta ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {abierta && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="divide-y divide-slate-100 border-t border-slate-100">
                              {carrera.versiones.map((version) => (
                                <div
                                  key={version.idPensum}
                                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 pl-5 sm:pl-20"
                                >
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-bold text-slate-800">
                                        Versión {version.version}
                                      </span>
                                      <EtiquetaEstado
                                        estado={version.estadoPensum}
                                      />
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      Vigencia: {version.anioInicio} –{" "}
                                      {version.anioFin ?? "Sin año de cierre"}
                                    </div>
                                  </div>
                                  {["VIGENTE", "CERRADO"].includes(
                                    version.estadoPensum,
                                  ) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOrigenNuevaVersion(version);
                                        setAnioNuevaVersion(
                                          new Date().getFullYear() + 1,
                                        );
                                        setErrorNuevaVersion("");
                                      }}
                                      className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                                    >
                                      Crear nueva versión
                                    </button>
                                  )}
                                  {[
                                    "PLANIFICANDO",
                                    "PENDIENTE_APROBACION",
                                  ].includes(version.estadoPensum) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIdEditar(version.idPensum);
                                        setMostrarNuevoPensum(true);
                                      }}
                                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
                                    >
                                      {version.estadoPensum === "PLANIFICANDO"
                                        ? "Continuar elaboración"
                                        : "Editar pensum"}
                                    </button>
                                  )}
                                  {version.estadoPensum ===
                                    "PENDIENTE_APROBACION" && (
                                    <button
                                      type="button"
                                      onClick={() => setPensumActivar(version)}
                                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                                    >
                                      Activar pensum
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setIdSeleccionado(version.idPensum)
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800"
                                  >
                                    <Icono nombre="archivo" size={16} /> Ver
                                    pensum
                                  </button>
                                  {version.estadoPensum === "PLANIFICANDO" && (
                                    <button
                                      type="button"
                                      onClick={() => setPensumEliminar(version)}
                                      className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIdSeleccionado(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <Icono nombre="izquierda" size={16} /> Volver al listado
              </button>
              <button
                type="button"
                onClick={imprimir}
                disabled={!detalle || cargandoDetalle}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Icono nombre="imprimir" size={17} /> Exportar mapa curricular
                PDF
              </button>
            </div>
            {cargandoDetalle ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Cargando detalle del pensum...
              </div>
            ) : errorDetalle ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
              >
                {errorDetalle}
                <button
                  className="ml-3 font-bold underline"
                  onClick={() => {
                    const id = idSeleccionado;
                    setIdSeleccionado(null);
                    setTimeout(() => setIdSeleccionado(id), 0);
                  }}
                >
                  Reintentar
                </button>
              </div>
            ) : (
              detalle && (
                <article
                  id="pensum-area-impresion"
                  className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 print:space-y-3"
                >
                  <MapaCurricularImpresion
                    cabecera={cabecera}
                    materiasPorCiclo={materiasPorCiclo}
                    detalle={detalle}
                  />
                  <div className="border-b border-slate-200 pb-5">
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">
                          Plan de estudios
                        </h2>
                        <p className="mt-1 text-lg font-semibold text-slate-700">
                          {cabecera?.nombreCarrera}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Código: {cabecera?.codigoCarrera} · Versión{" "}
                          {cabecera?.version} · Vigencia: {cabecera?.anioInicio}{" "}
                          – {cabecera?.anioFin ?? "Sin año de cierre"}
                        </p>
                      </div>
                      <EtiquetaEstado estado={cabecera?.estadoPensum} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { nombre: "Materias", valor: detalle.totalMaterias },
                      {
                        nombre: "Unidades valorativas",
                        valor: numero(detalle.totalUnidadesValorativas),
                      },
                      { nombre: "Ciclos", valor: detalle.totalCiclos },
                    ].map((item) => (
                      <div
                        key={item.nombre}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 print:bg-white"
                      >
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          {item.nombre}
                        </div>
                        <div className="mt-1 text-2xl font-extrabold text-slate-900">
                          {item.valor}
                        </div>
                      </div>
                    ))}
                  </div>
                  {materiasPorCiclo.length ? (
                    <div className="space-y-4">
                      {materiasPorCiclo.map(([ciclo, materias]) => (
                        <TablaCiclo
                          key={ciclo}
                          ciclo={ciclo}
                          materias={materias}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                      Esta versión no tiene materias asignadas.
                    </div>
                  )}
                  <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
                    Documento de consulta generado a partir de la versión
                    seleccionada del pensum. Los prerrequisitos mostrados
                    corresponden a los registrados actualmente para cada
                    materia.
                  </footer>
                </article>
              )
            )}
          </>
        )}
      </div>
      <AnimatePresence>
        {origenNuevaVersion && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-nueva-version"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <h2
                id="titulo-nueva-version"
                className="text-xl font-extrabold text-slate-900"
              >
                Crear nueva versión
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Se copiarán las materias, los ciclos y la obligatoriedad de la
                versión <strong>{origenNuevaVersion.version}</strong> de{" "}
                <strong>{origenNuevaVersion.nombreCarrera}</strong>. El pensum
                original no se modificará y la nueva versión iniciará en{" "}
                <strong>PLANIFICANDO</strong>.
              </p>
              <label className="mt-5 block text-sm font-semibold text-slate-800">
                Año de inicio / nueva versión
                <input
                  type="number"
                  min={new Date().getFullYear() + 1}
                  value={anioNuevaVersion}
                  onChange={(e) => setAnioNuevaVersion(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-600"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Año final estimado:{" "}
                {origenNuevaVersion.anioFin == null
                  ? "Duración no definida"
                  : Number(anioNuevaVersion) +
                    Number(origenNuevaVersion.anioFin) -
                    Number(origenNuevaVersion.anioInicio)}
              </p>
              {errorNuevaVersion && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {errorNuevaVersion}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={creandoVersion}
                  onClick={() => setOrigenNuevaVersion(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={creandoVersion}
                  onClick={confirmarNuevaVersion}
                  className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {creandoVersion ? "Creando..." : "Crear y editar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {pensumActivar && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !activandoPensum)
                setPensumActivar(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-activar-pensum"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <h2
                id="titulo-activar-pensum"
                className="text-xl font-extrabold text-slate-900"
              >
                ¿Activar este pensum?
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                Se activará la versión <strong>{pensumActivar.version}</strong>{" "}
                de <strong>{pensumActivar.nombreCarrera}</strong>.
              </p>
              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p>
                  • El pensum versión <strong>{pensumActivar.version}</strong>{" "}
                  cambiará de <strong>PENDIENTE_APROBACION</strong> a{" "}
                  <strong>VIGENTE</strong>.
                </p>

                <p>
                  • Si existe un pensum vigente anterior de esta carrera, pasará
                  automáticamente a <strong>CERRADO</strong>.
                </p>

                <p>
                  • Si la carrera ya está <strong>ACTIVA</strong>, conservará su
                  estado actual. Si está en <strong>PLANIFICACION</strong>,
                  pasará a <strong>ACTIVA</strong>.
                </p>

                <p>
                  • El nuevo plan de estudios quedará disponible para los
                  procesos académicos correspondientes.
                </p>
              </div>
              <p className="mt-3 text-xs text-amber-700">
                Esta operación debe validarse en el servidor y no podrá
                revertirse desde este botón.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={activandoPensum}
                  onClick={() => setPensumActivar(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={activandoPensum}
                  onClick={confirmarActivacion}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {activandoPensum ? "Activando..." : "Confirmar activación"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pensumEliminar && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !eliminandoPensum)
                setPensumEliminar(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-eliminar-pensum"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <h2
                id="titulo-eliminar-pensum"
                className="text-xl font-extrabold text-slate-900"
              >
                ¿Eliminar este pensum?
              </h2>

              <p className="mt-3 text-sm text-slate-600">
                Se eliminará la versión{" "}
                <strong>{pensumEliminar.version}</strong> de{" "}
                <strong>{pensumEliminar.nombreCarrera}</strong>.
              </p>

              <div className="mt-4 space-y-2 rounded-xl bg-red-50 p-4 text-sm text-red-800">
                <p>
                  • El pensum en estado <strong>PLANIFICANDO</strong> será
                  eliminado.
                </p>
                <p>
                  • Se eliminarán las asignaciones de materias correspondientes.
                </p>
                <p>
                  • La carrera y las materias del catálogo no se modificarán.
                </p>
              </div>

              <p className="mt-3 text-xs font-semibold text-red-700">
                Esta acción es permanente y no se puede deshacer.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={eliminandoPensum}
                  onClick={() => setPensumEliminar(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={eliminandoPensum}
                  onClick={eliminarPensum}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {eliminandoPensum ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
