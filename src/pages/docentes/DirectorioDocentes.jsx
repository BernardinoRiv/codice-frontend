import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";


import { Link } from "react-router-dom";
import {
  Ban, BriefcaseBusiness, CheckCircle2, ChevronLeft, ChevronRight, Eye,
  GraduationCap, KeyRound, Lock, Unlock, RefreshCw, Search, Users,
} from "lucide-react";
import useSesion from "../../hooks/useSesion";
import { PERMISOS_RUTAS } from "../../config/permisos";

const contratoPorVencer = (e) => {
  if (!e.fechaFin) return false;
  const fecha = new Date(`${String(e.fechaFin).slice(0, 10)}T00:00:00`);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy); limite.setDate(limite.getDate() + 30);
  return fecha >= hoy && fecha <= limite && String(e.estadoDocente || "").toUpperCase() === "ACTIVO";
};

const textoBusqueda = (valor) =>
  String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const normalizarCatalogo = (items, campoId) => {
  if (!Array.isArray(items)) throw new Error("Catálogo no disponible");
  return items
    .map((item) => ({
      ...item,
      id: item.id ?? item[campoId],
      nombre: String(item.nombre ?? item.descripcion ?? ""),
    }))
    .filter((item) => item.id != null && item.nombre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
};

// El menú se superpone sin cambiar la altura del formulario y se abre
// hacia arriba cuando falta espacio. Dentro de un diálogo conserva su foco.
function SelectBuscador({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Seleccione una opción",
  searchPlaceholder = "Buscar...",
  disabled = false,
  loading = false,
  opcionTodos,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activo, setActivo] = useState(0);
  const [posicion, setPosicion] = useState(null);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const buscadorRef = useRef(null);
  const listaId = useId();
  const lista = opcionTodos
    ? [{ id: "", nombre: opcionTodos }, ...options]
    : options;
  const filtrados = lista.filter((item) =>
    textoBusqueda(item.nombre).includes(textoBusqueda(search)),
  );
  const seleccionado = lista.find((item) => String(item.id) === String(value));
  const destino = ref.current?.closest('[role="dialog"]') || document.body;
  const cerrar = (devolverFoco = false) => {
    setOpen(false);
    if (devolverFoco) ref.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    const posicionar = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const margen = 12;
      const abajo = window.innerHeight - rect.bottom - margen - 6;
      const arriba = rect.top - margen - 6;
      const haciaArriba = abajo < 280 && arriba > abajo;
      const altura = Math.max(0, Math.min(320, haciaArriba ? arriba : abajo));
      const ancho = Math.min(
        Math.max(rect.width, 240),
        window.innerWidth - margen * 2,
      );
      setPosicion({
        position: "fixed",
        width: ancho,
        left: Math.max(
          margen,
          Math.min(rect.left, window.innerWidth - ancho - margen),
        ),
        maxHeight: altura,
        ...(haciaArriba
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    };
    posicionar();
    window.addEventListener("resize", posicionar);
    window.addEventListener("scroll", posicionar, true);
    return () => {
      window.removeEventListener("resize", posicionar);
      window.removeEventListener("scroll", posicionar, true);
    };
  }, [open]);
  useEffect(() => {
    if (open && posicion) buscadorRef.current?.focus();
  }, [open, Boolean(posicion)]);
  useEffect(() => {
    if (!open) return;
    const fuera = (event) => {
      if (
        !ref.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [open]);
  useEffect(() => {
    setActivo(0);
  }, [search]);
  useEffect(() => {
    if (disabled || loading) setOpen(false);
  }, [disabled, loading]);
  useEffect(() => {
    panelRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [activo]);
  const elegir = (item) => {
    onChange(item.id);
    cerrar(true);
    setSearch("");
  };
  const teclado = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cerrar(true);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActivo((i) =>
        Math.max(
          0,
          Math.min(
            filtrados.length - 1,
            i + (event.key === "ArrowDown" ? 1 : -1),
          ),
        ),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtrados[activo]) elegir(filtrados[activo]);
    } else if (event.key === "Tab") {
      event.preventDefault();
      cerrar(true);
    }
  };
  return (
    <div className="min-w-0">
      <label
        htmlFor={`${listaId}-trigger`}
        className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2"
      >
        {label}
      </label>
      <button
        ref={ref}
        id={`${listaId}-trigger`}
        type="button"
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listaId : undefined}
        onClick={() => {
          setOpen(!open);
          setSearch("");
          setActivo(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setSearch("");
          }
        }}
        className="enabled:cursor-pointer disabled:cursor-not-allowed w-full min-h-11 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 shadow-sm flex items-center justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span
          className={`min-w-0 truncate ${value === "" || !seleccionado ? "text-slate-500" : ""}`}
          title={seleccionado?.nombre}
        >
          {loading ? "Cargando catálogo…" : seleccionado?.nombre || placeholder}
        </span>
        <svg
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open &&
        posicion &&
        createPortal(
          <div
            ref={panelRef}
            style={posicion}
            onKeyDown={teclado}
            className="z-[10020] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="p-3 border-b border-slate-100 shrink-0">
              <input
                ref={buscadorRef}
                role="combobox"
                aria-label={searchPlaceholder}
                aria-expanded="true"
                aria-controls={listaId}
                aria-autocomplete="list"
                aria-activedescendant={
                  filtrados[activo] ? `${listaId}-${activo}` : undefined
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div
              id={listaId}
              role="listbox"
              aria-label={label}
              className="min-h-0 overflow-y-auto overscroll-contain p-1.5"
            >
              {filtrados.map((item, index) => (
                <div
                  key={item.id}
                  id={`${listaId}-${index}`}
                  role="option"
                  aria-selected={String(item.id) === String(value)}
                  data-active={index === activo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(item)}
                  onMouseMove={() => setActivo(index)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm leading-relaxed ${String(item.id) === String(value) ? "bg-slate-900 text-white font-semibold" : index === activo ? "bg-slate-100 text-slate-900" : "text-slate-700"}`}
                >
                  <span className="min-w-0 break-words">{item.nombre}</span>
                  {String(item.id) === String(value) && (
                    <span aria-hidden="true" className="shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              ))}
              {!filtrados.length && (
                <p
                  role="status"
                  className="p-4 text-center text-sm text-slate-500"
                >
                  {options.length
                    ? "Sin coincidencias."
                    : "No hay opciones disponibles en el catálogo."}
                </p>
              )}
            </div>
          </div>,
          destino,
        )}
    </div>
  );
}

// Mantiene el foco dentro del diálogo y lo devuelve al botón que lo abrió.
function DialogoDocente({ children, titulo, ocupado, onClose }) {
  const ref = useRef(null);
  const cierreRef = useRef(onClose);
  const ocupadoRef = useRef(ocupado);
  cierreRef.current = onClose;
  ocupadoRef.current = ocupado;
  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (anterior instanceof HTMLElement && anterior.isConnected)
        anterior.focus();
    };
  }, []);
  const manejarTecla = (event) => {
    if (event.key === "Escape" && !ocupadoRef.current) {
      event.stopPropagation();
      cierreRef.current();
    }
    if (event.key !== "Tab") return;
    const controles = [
      ...ref.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    ].filter((el) => !el.hidden);
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (!primero) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === primero ||
        document.activeElement === ref.current)
    ) {
      event.preventDefault();
      ultimo.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === ultimo ||
        document.activeElement === ref.current)
    ) {
      event.preventDefault();
      primero.focus();
    }
  };
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      aria-busy={ocupado}
      tabIndex={-1}
      onKeyDown={manejarTecla}
      className="fixed inset-0 z-[9999] overflow-y-auto font-sans outline-none"
    >
      {children}
    </div>
  );
}

function GestionDirectorioDocente({ children }) {
  const [docentes, setDocentes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [sedeFiltro, setSedeFiltro] = useState("");
  const [contratoFiltro, setContratoFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [errorCarga, setErrorCarga] = useState(false);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState(false);
  const [orden, setOrden] = useState("nombre-asc");
  const porPagina = 10;
  const normalizarTexto = (valor) =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const limpiarFiltros = () => {
    setSearchTerm("");
    setEstadoFiltro("");
    setSedeFiltro("");
    setContratoFiltro("");
    setPagina(1);
  };
  useEffect(() => {
    setPagina(1);
  }, [searchTerm, estadoFiltro, sedeFiltro, contratoFiltro]);

  const [catalogos, setCatalogos] = useState({
    sedes: [],
    tiposContratacion: [],
    estadosDocente: [],
    distritos: [],
  });

  const [reseteandoUsuario, setReseteandoUsuario] = useState(null);
  const [modalReset, setModalReset] = useState(null);

  const fetchDocentes = async () => {
    setIsLoading(true);
    setErrorCarga(false);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/docentes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Respuesta inesperada");
      setDocentes(data);
    } catch (error) {
      setErrorCarga(true);
      toast.error("Error al cargar docentes", {
        description:
          "Revisa tu conexión o asegúrate de que el servidor esté encendido.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogos = async () => {
    setCargandoCatalogos(true);
    setErrorCatalogos(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/catalogos?nombres=sedes,distritos,tipos_contratacion_docente,estados_docente`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();
      setCatalogos({
        sedes: normalizarCatalogo(data.sedes, "idSede"),
        distritos: normalizarCatalogo(data.distritos, "idDistrito"),
        tiposContratacion: normalizarCatalogo(
          data.tipos_contratacion_docente,
          "idTipoContratacion",
        ),
        estadosDocente: normalizarCatalogo(
          data.estados_docente,
          "idEstadoDocente",
        ),
      });
    } catch {
      setErrorCatalogos(true);
    } finally {
      setCargandoCatalogos(false);
    }
  };

  useEffect(() => {
    fetchDocentes();
    fetchCatalogos();
  }, []);

  const handleResetPassword = async () => {
    const docente = docentes.find(item => item.idDocente === modalReset?.idDocente);

    if (!docente || estadoCuenta(docente) !== "ACTIVO" || reseteandoUsuario !== null) return;

    const nombre = `${docente.nombres} ${docente.apellidos}`;

    setReseteandoUsuario(docente.idUsuario);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/auth/admin/usuarios/${docente.idUsuario}/reset-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.mensaje || data.error || "No se pudo restablecer la contraseña.",
        );
      }

      setModalReset(null);

      toast.success("Contraseña restablecida correctamente", {
        description: `Se ha iniciado el envío de las nuevas credenciales al correo personal de ${nombre}.`,
      });
    } catch (error) {
      toast.error("No se pudo restablecer la contraseña", {
        description: error.message,
      });
    } finally {
      setReseteandoUsuario(null);
    }
  };

  const coincideCatalogo = (idFiltro, idRegistro, nombreRegistro, opciones) => {
    if (!idFiltro) return true;
    if (idRegistro != null && idRegistro !== "")
      return String(idRegistro) === String(idFiltro);
    const opcion = opciones.find(
      (item) => String(item.id) === String(idFiltro),
    );
    return Boolean(
      opcion && textoBusqueda(opcion.nombre) === textoBusqueda(nombreRegistro),
    );
  };
  const docentesFiltrados = docentes.filter((docente) => {
    const coincideBusqueda = [
      docente.nombres,
      docente.apellidos,
      `${docente.nombres || ""} ${docente.apellidos || ""}`,
      docente.codigoDocente,
      docente.correoInstitucional,
      docente.correoPersonal,
      docente.telefono,
      docente.direccion,
      docente.especialidad,
      docente.nombreSede,
      docente.numeroDocumento,
    ].some((valor) =>
      normalizarTexto(valor).includes(normalizarTexto(searchTerm)),
    );
    return (
      coincideBusqueda &&
      (!estadoFiltro ||
        (estadoFiltro === "CUENTA_BLOQUEADA" ? estadoCuenta(docente) === "BLOQUEADO" : estadoFiltro === "POR_VENCER" ? contratoPorVencer(docente) : (docente.estadoDocente || "").toUpperCase() === estadoFiltro)) &&
      coincideCatalogo(
        sedeFiltro,
        docente.idSede,
        docente.nombreSede,
        catalogos.sedes,
      ) &&
      coincideCatalogo(
        contratoFiltro,
        docente.idTipoContratacion,
        docente.tipoContratacion,
        catalogos.tiposContratacion,
      )
    );
  });
  const docentesOrdenados = [...docentesFiltrados].sort((a, b) => {
    const izquierda =
      orden === "codigo"
        ? a.codigoDocente
        : `${a.nombres || ""} ${a.apellidos || ""}`;
    const derecha =
      orden === "codigo"
        ? b.codigoDocente
        : `${b.nombres || ""} ${b.apellidos || ""}`;
    return (
      String(izquierda || "").localeCompare(String(derecha || ""), "es", {
        numeric: true,
        sensitivity: "base",
      }) * (orden === "nombre-desc" ? -1 : 1)
    );
  });
  const totalPaginas = Math.max(
    1,
    Math.ceil(docentesFiltrados.length / porPagina),
  );
  const paginaActual = Math.min(pagina, totalPaginas);
  const docentesVisibles = docentesOrdenados.slice(
    (paginaActual - 1) * porPagina,
    paginaActual * porPagina,
  );
  const hayFiltros = Boolean(
    searchTerm || estadoFiltro || sedeFiltro || contratoFiltro,
  );

  return (
    <>
      {children({
        docentes, docentesFiltrados, docentesVisibles, searchTerm, setSearchTerm,
        estadoFiltro, setEstadoFiltro, paginaActual, totalPaginas, setPagina, porPagina,
        catalogos, sedeFiltro, setSedeFiltro, contratoFiltro, setContratoFiltro, orden,
        setOrden, hayFiltros, limpiarFiltros, isLoading, errorCarga, fetchDocentes,
        cargandoCatalogos, errorCatalogos, fetchCatalogos,
        setModalReset, reseteandoUsuario,
      })}

      {modalReset &&
        createPortal(
          <DialogoDocente
            titulo="Restablecer contraseña"
            ocupado={reseteandoUsuario !== null}
            onClose={() => setModalReset(null)}
          >
            <div
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
              onClick={() => {
                if (reseteandoUsuario === null) setModalReset(null);
              }}
            />

            <div className="relative flex min-h-screen items-center justify-center p-4 pointer-events-none">
              <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      <path d="M12 15v2" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-900">
                      Restablecer contraseña
                    </h3>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {modalReset.nombres} {modalReset.apellidos}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 break-all">
                    <strong>Correo personal: </strong>
                    {modalReset.correoPersonal}
                  </p>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-600">
                  Se cerrarán sus sesiones activas y se enviará una contraseña
                  temporal a su correo personal.
                </p>

                <div className="mt-7 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalReset(null)}
                    disabled={reseteandoUsuario !== null}
                    className="enabled:cursor-pointer disabled:cursor-not-allowed rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={reseteandoUsuario !== null || !docentes.some(item => item.idDocente === modalReset.idDocente && estadoCuenta(item) === "ACTIVO")}
                    className="enabled:cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {reseteandoUsuario !== null && (
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 3a9 9 0 1 0 9 9" />
                      </svg>
                    )}

                    {reseteandoUsuario !== null
                      ? "Restableciendo..."
                      : "Restablecer"}
                  </button>
                </div>
              </div>
            </div>
          </DialogoDocente>,
          document.body,
        )}
    </>
  );
}



function EstadoBadge({ value }) {
  const estilo = value === "ACTIVO"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : value === "BLOQUEADO"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estilo}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}
    </span>
  );
}

function Stat({ icon: Icon, title, value, detail, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`enabled:cursor-pointer disabled:cursor-not-allowed w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition
        hover:border-slate-300 hover:shadow-md focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-slate-500
        ${active ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
          <Icon size={20} />
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </button>
  );
}


const boton = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50";
const icono = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40";
const selector = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-700 sm:text-sm";

function estadoCuenta(docente) {
  if (!docente.idUsuario) return "SIN USUARIO";
  return docente.estadoUsuario?.trim().toUpperCase() || "SIN ESTADO";
}

function Lista({ datos: d }) {
  const [accionCuenta, setAccionCuenta] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  async function confirmarCuenta(evento) {
    evento.preventDefault();
    if (!accionCuenta || enviando.current || motivo.trim().length < 5) return;
    enviando.current = true;
    setGuardando(true);
    try {
      const { docente, accion } = accionCuenta;
      const respuesta = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/docentes/${docente.idDocente}/usuario/${accion}`,
        { method: "PATCH", headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json",
        }, body: JSON.stringify({ motivo: motivo.trim() }) },
      );
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        throw new Error(datos?.mensaje || datos?.message || datos?.error || `Error HTTP ${respuesta.status}`);
      }
      setAccionCuenta(null);
      toast.success(accion === "bloquear" ? "Cuenta bloqueada." : "Cuenta desbloqueada.");
      await d.fetchDocentes();
    } catch (error) {
      toast.error("No se pudo cambiar el estado de la cuenta", { description: error.message });
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  const sesion = useSesion();
  const puedeRegistrar = PERMISOS_RUTAS["/dashboard/registro-docente"].some(r => sesion.roles.includes(r));
  const ocupado = d.isLoading || d.errorCarga;
  const sinCatalogos = d.cargandoCatalogos || d.errorCatalogos;
  const estados = [...new Set(["ACTIVO", "INACTIVO", ...d.catalogos.estadosDocente.map(e => e.nombre.toUpperCase())])];
  const tarjetas = [
    ["", Users, "Total de docentes", "Registros en el directorio", d.docentes.length],
    ["ACTIVO", CheckCircle2, "Docentes activos", "Estado laboral activo"],
    ["CUENTA_BLOQUEADA", Ban, "Cuentas bloqueadas", "Acceso institucional bloqueado", d.docentes.filter(e => estadoCuenta(e) === "BLOQUEADO").length],
    ["POR_VENCER", BriefcaseBusiness, "Contratos por vencer", "Finalizan en los próximos 30 días", d.docentes.filter(contratoPorVencer).length],
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <GraduationCap size={16} /> Gestión académica
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Directorio de docentes</h1>
          <p className="mt-1 text-sm text-slate-500">Consulta de personal docente, especialidades y contratación.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeRegistrar && <Link to="/dashboard/registro-docente" className={"cursor-pointer " + (boton)}>Nuevo docente</Link>}
          <button type="button" onClick={d.fetchDocentes} disabled={d.isLoading} className={"enabled:cursor-pointer disabled:cursor-not-allowed " + (boton)}>
            <RefreshCw size={16} className={d.isLoading ? "animate-spin" : ""} /> Actualizar
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map(([id, Icono, titulo, detalle, total]) => (
          <Stat key={id} icon={Icono} title={titulo} detail={detalle}
            value={ocupado ? "—" : total ?? d.docentes.filter(e => e.estadoDocente?.toUpperCase() === id).length}
            active={d.estadoFiltro === id} onClick={() => d.setEstadoFiltro(id)} />
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Listado de docentes</h2>
            <p role="status" className="mt-1 text-xs text-slate-500">
              {ocupado ? "—" : d.docentesFiltrados.length} resultados encontrados
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Buscar docente" type="search" value={d.searchTerm}
                onChange={e => d.setSearchTerm(e.target.value)} placeholder="Nombre, código, correo o especialidad"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-base outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:text-sm" />
            </div>
            <select aria-label="Filtrar docentes" className={"enabled:cursor-pointer disabled:cursor-not-allowed " + (selector)} value={d.estadoFiltro} onChange={e => d.setEstadoFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              {estados.map(estado => <option key={estado} value={estado}>{estado} (laboral)</option>)}
              <option value="CUENTA_BLOQUEADA">Cuentas bloqueadas</option>
              <option value="POR_VENCER">Contratos por vencer</option>
            </select>
          </div>
        </div>

        <details className="border-b border-slate-100 px-5 py-2">
          <summary className="cursor-pointer w-fit cursor-pointer text-xs font-semibold text-slate-600">Más filtros y orden</summary>
          <div className="grid items-end gap-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectBuscador label="Sede" value={d.sedeFiltro} onChange={v => d.setSedeFiltro(String(v))}
              options={d.catalogos.sedes} opcionTodos="Todas las sedes" disabled={sinCatalogos} />
            <SelectBuscador label="Contratación" value={d.contratoFiltro} onChange={v => d.setContratoFiltro(String(v))}
              options={d.catalogos.tiposContratacion} opcionTodos="Todos los contratos" disabled={sinCatalogos} />
            <select aria-label="Ordenar docentes" className={"enabled:cursor-pointer disabled:cursor-not-allowed " + (selector)} value={d.orden}
              onChange={e => { d.setOrden(e.target.value); d.setPagina(1); }}>
              <option value="nombre-asc">Nombre A–Z</option><option value="nombre-desc">Nombre Z–A</option><option value="codigo">Código</option>
            </select>
            {d.hayFiltros && <button type="button" className={"enabled:cursor-pointer disabled:cursor-not-allowed " + (boton)} onClick={d.limpiarFiltros}>Limpiar filtros</button>}
          </div>
        </details>
        {d.errorCatalogos && <p role="alert" className="bg-amber-50 px-5 py-2 text-sm">Catálogos no disponibles. <button className="enabled:cursor-pointer disabled:cursor-not-allowed underline" onClick={d.fetchCatalogos}>Reintentar</button></p>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>{["Docente", "Especialidad / Sede", "Correo institucional", "Estado laboral", "Estado de cuenta", "Acciones"].map(t => (
                <th scope="col" key={t} className={t === "Acciones" ? "px-5 py-4 text-right" : "px-5 py-4"}>{t}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!ocupado && d.docentesVisibles.map(e => {
                const nombre = [e.nombres, e.apellidos].filter(Boolean).join(" ");
                const estado = estadoCuenta(e);
                const bloquear = estado === "ACTIVO";
                const etiqueta = bloquear ? "Bloquear cuenta" : "Desbloquear cuenta";
                return (
                  <tr key={e.idDocente} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{nombre}</p><p className="mt-1 text-xs text-slate-500">{e.codigoDocente || "Sin código"}</p></td>
                    <td className="max-w-xs px-5 py-4 text-slate-600">{[e.especialidad, e.nombreSede].filter(Boolean).join(" / ") || "Sin asignación"}</td>
                    <td className="px-5 py-4 text-slate-600">{e.correoInstitucional || "No registrado"}</td>
                    <td className="px-5 py-4"><EstadoBadge value={e.estadoDocente || "SIN ESTADO"} /></td>
                    <td className="px-5 py-4"><EstadoBadge value={estado} /></td>
                    <td className="px-5 py-4"><div className="flex items-center justify-end gap-2">
                      <button title={estado === "BLOQUEADO" ? "Desbloquea la cuenta para restablecer la contraseña" : "Restablecer contraseña"} aria-label={`Restablecer contraseña de ${nombre}`} className={"enabled:cursor-pointer disabled:cursor-not-allowed " + (icono)}
                        disabled={!puedeRegistrar || estado !== "ACTIVO" || guardando || d.reseteandoUsuario !== null} onClick={() => d.setModalReset(e)}><KeyRound size={17} /></button>
                      {puedeRegistrar && (bloquear || estado === "BLOQUEADO") && (
                        <button type="button" title={etiqueta} aria-label={`${etiqueta} de ${nombre}`}
                          disabled={guardando || d.reseteandoUsuario !== null}
                          className={`enabled:cursor-pointer disabled:cursor-not-allowed inline-flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-40 ${bloquear ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
                          onClick={() => {
                            setMotivo("");
                            setAccionCuenta({ docente: e, accion: bloquear ? "bloquear" : "desbloquear" });
                          }}>
                          {bloquear ? <Lock size={17} /> : <Unlock size={17} />}
                        </button>
                      )}
                      <Link title="Ver expediente" aria-label={`Ver expediente de ${nombre}`} to={`/dashboard/directorio-docentes/${e.idDocente}`}
                        className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800"><Eye size={17} /></Link>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {d.isLoading ? <p className="p-12 text-center text-sm text-slate-500">Cargando docentes…</p>
          : d.errorCarga ? <div role="alert" className="p-8 text-center">No se pudo cargar el directorio. <button onClick={d.fetchDocentes} className="enabled:cursor-pointer disabled:cursor-not-allowed underline">Reintentar</button></div>
          : !d.docentesFiltrados.length ? <div className="p-12 text-center"><Search size={26} className="mx-auto mb-3 text-slate-300" /><p className="font-medium text-slate-700">No se encontraron docentes</p><p className="mt-1 text-sm text-slate-400">Prueba con otro término o estado.</p></div>
          : <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
              <p className="text-xs text-slate-500">Mostrando {(d.paginaActual - 1) * d.porPagina + 1}–{Math.min(d.paginaActual * d.porPagina, d.docentesFiltrados.length)} de {d.docentesFiltrados.length}</p>
              <div className="flex items-center gap-2">
                <button aria-label="Página anterior" disabled={d.paginaActual === 1} onClick={() => d.setPagina(d.paginaActual - 1)} className="enabled:cursor-pointer disabled:cursor-not-allowed rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
                <span className="px-2 text-xs text-slate-600">{d.paginaActual} de {d.totalPaginas}</span>
                <button aria-label="Página siguiente" disabled={d.paginaActual === d.totalPaginas} onClick={() => d.setPagina(d.paginaActual + 1)} className="enabled:cursor-pointer disabled:cursor-not-allowed rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={16} /></button>
              </div>
            </footer>}
      </section>
      {accionCuenta && createPortal(
        <DialogoDocente titulo={accionCuenta.accion === "bloquear" ? "Bloquear cuenta" : "Desbloquear cuenta"}
          ocupado={guardando} onClose={() => setAccionCuenta(null)}>
          <div className="flex min-h-full items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
            <form onSubmit={confirmarCuenta} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold">{accionCuenta.accion === "bloquear" ? "Bloquear cuenta" : "Desbloquear cuenta"}</h2>
              <p className="text-sm">{accionCuenta.docente.nombres} {accionCuenta.docente.apellidos} · {accionCuenta.docente.codigoDocente}</p>
              <p className="text-sm text-slate-600">{accionCuenta.accion === "bloquear" ? "Se cerrarán las sesiones activas de esta cuenta." : "Se habilitará el acceso a esta cuenta."}</p>
              <label className="block text-sm font-semibold">Motivo
                <textarea required minLength={5} maxLength={100} disabled={guardando} value={motivo}
                  onChange={e => setMotivo(e.target.value)} rows={3} className="mt-2 block w-full rounded-xl border p-3 text-base" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className={"enabled:cursor-pointer disabled:cursor-not-allowed " + (boton)} disabled={guardando} onClick={() => setAccionCuenta(null)}>Cancelar</button>
                <button type="submit" className="enabled:cursor-pointer disabled:cursor-not-allowed rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={guardando || motivo.trim().length < 5}>{guardando ? "Guardando…" : "Confirmar"}</button>
              </div>
            </form>
          </div>
        </DialogoDocente>, document.body)}
    </main>
  );
}

export default function DirectorioDocentes() {
  return <GestionDirectorioDocente>{datos => <Lista datos={datos} />}</GestionDirectorioDocente>;
}

export { default as InformacionDocente } from "./InformacionDocente";