import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
        className="w-full min-h-11 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 shadow-sm flex items-center justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
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

function ListaDocentes() {
  const [docentes, setDocentes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
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

  const [modalEditar, setModalEditar] = useState({
    open: false,
    docente: null,
  });

  const [formEdit, setFormEdit] = useState({
    telefono: "",
    correoPersonal: "",
    direccion: "",
    idDistrito: "",
    idSede: "",
    idTipoContratacion: "",
  });

  const [modalEstado, setModalEstado] = useState({
    open: false,
    docente: null,
  });

  const [formEstado, setFormEstado] = useState({
    idEstadoDocente: "",
    motivo: "",
  });

  const [isSaving, setIsSaving] = useState(false);

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

  const formatearTelefono = (valor) => {
    const numeros = valor.replace(/\D/g, "").substring(0, 8);
    if (numeros.length > 4) {
      return `${numeros.substring(0, 4)}-${numeros.substring(4)}`;
    }
    return numeros;
  };

  const extraerDetalleError = (data) => {
    if (data?.detalles && typeof data.detalles === "object") {
      return Object.entries(data.detalles)
        .map(([campo, msj]) => `${campo}: ${msj}`)
        .join(" | ");
    }
    return undefined;
  };

  const obtenerNombreDistrito = (idDistrito) => {
    if (!idDistrito) return "";
    const encontrado = catalogos.distritos.find(
      (d) => Number(d.id) === Number(idDistrito),
    );
    return encontrado ? encontrado.nombre : "";
  };

  const handleAbrirEditar = (docente) => {
    const normalizar = (str) => (str || "").toString().trim().toLowerCase();

    const sedeEncontrada = catalogos.sedes.find(
      (s) =>
        normalizar(s.nombre || s.descripcion) ===
        normalizar(docente.nombreSede),
    );

    const contratoEncontrado = catalogos.tiposContratacion.find(
      (t) =>
        normalizar(t.nombre || t.descripcion) ===
        normalizar(docente.tipoContratacion),
    );

    setFormEdit({
      telefono: docente.telefono || "",
      correoPersonal: docente.correoPersonal || "",
      direccion: docente.direccion || "",
      idDistrito: docente.idDistrito || "",
      idSede: docente.idSede || sedeEncontrada?.id || "",
      idTipoContratacion:
        docente.idTipoContratacion || contratoEncontrado?.id || "",
    });

    setModalEditar({ open: true, docente });
  };

  const handleActualizarDocente = async (e) => {
    e.preventDefault();

    if (
      !formEdit.telefono ||
      !formEdit.correoPersonal ||
      !formEdit.direccion ||
      !formEdit.idDistrito ||
      !formEdit.idSede ||
      !formEdit.idTipoContratacion
    ) {
      toast.warning("Campos incompletos", {
        description: "Por favor completa todos los campos requeridos.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        telefono: formEdit.telefono.trim(),
        correoPersonal: formEdit.correoPersonal.trim(),
        direccion: formEdit.direccion.trim(),
        idDistrito: Number(formEdit.idDistrito),
        idSede: Number(formEdit.idSede),
        idTipoContratacion: Number(formEdit.idTipoContratacion),
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/docentes/${modalEditar.docente.idDocente}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success("Docente actualizado correctamente");
        setModalEditar({ open: false, docente: null });
        fetchDocentes();
      } else {
        toast.error(
          data.mensaje || data.error || "No se pudo actualizar el docente",
          {
            description: extraerDetalleError(data),
          },
        );
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAbrirCambiarEstado = (docente) => {
    const estadoActual = (docente.estadoDocente || "").toUpperCase();
    const estadoDestino = catalogos.estadosDocente.find(
      (e) => (e.nombre || "").toUpperCase() !== estadoActual,
    );

    setFormEstado({
      idEstadoDocente: estadoDestino
        ? estadoDestino.id
        : estadoActual === "ACTIVO"
          ? 2
          : 1,
      motivo: "",
    });
    setModalEstado({ open: true, docente });
  };

  const handleConfirmarCambioEstado = async (e) => {
    e.preventDefault();

    if (!formEstado.motivo.trim()) {
      toast.warning("Motivo requerido", {
        description:
          "Debes justificar el motivo del cambio de estado para auditoría.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        idEstadoDocente: Number(formEstado.idEstadoDocente),
        motivo: formEstado.motivo.trim(),
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/docentes/${modalEstado.docente.idDocente}/estado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success(
          data.mensaje || "Estado del docente actualizado correctamente",
        );
        setModalEstado({ open: false, docente: null });
        fetchDocentes();
      } else {
        toast.error(
          data.mensaje ||
            data.error ||
            "No se pudo cambiar el estado del docente",
          {
            description: extraerDetalleError(data),
          },
        );
      }
    } catch (error) {
      toast.error("Error de conexión con el servidor");
    } finally {
      setIsSaving(false);
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
    ].some((valor) =>
      normalizarTexto(valor).includes(normalizarTexto(searchTerm)),
    );
    return (
      coincideBusqueda &&
      (!estadoFiltro ||
        (docente.estadoDocente || "").toUpperCase() === estadoFiltro) &&
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

  const inputClass =
    "w-full bg-white shadow-sm text-slate-900 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";
  const labelClass =
    "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5";

  return (
    <>
      <div className="w-full pb-20 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">
              Gestión de docentes
            </h1>
            <p className="text-slate-500 text-sm">
              Gestiona y consulta la plantilla académica de la institución.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDocentes}
              disabled={isLoading}
              aria-label="Actualizar docentes"
              title="Actualizar docentes"
              className="h-[50px] w-[50px] flex items-center justify-center disabled:opacity-50 p-2.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
            >
              <svg
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={() => navigate("/dashboard/registro-docente")}
              className="bg-slate-900 text-white h-[50px] px-6 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Nuevo docente
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { id: "", titulo: "Total de docentes", sub: "Plantilla académica" },
            {
              id: "ACTIVO",
              titulo: "Activos",
              sub: "Estado registrado en el directorio",
            },
            {
              id: "INACTIVO",
              titulo: "Inactivos",
              sub: "Historial de la plantilla",
            },
          ].map((card) => (
            <button
              key={card.id}
              type="button"
              aria-pressed={estadoFiltro === card.id}
              onClick={() => setEstadoFiltro(card.id)}
              className={`text-left p-6 rounded-2xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${estadoFiltro === card.id ? "bg-blue-50/50 border-blue-500 ring-1 ring-blue-500 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"}`}
            >
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                {card.titulo}
              </span>
              <span className="block text-3xl font-extrabold tracking-tight my-2">
                {isLoading || errorCarga
                  ? "—"
                  : card.id
                    ? docentes.filter(
                        (d) =>
                          (d.estadoDocente || "").toUpperCase() === card.id,
                      ).length
                    : docentes.length}
              </span>
              <span className="block text-xs font-medium text-slate-500">
                {card.sub}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Listado de docentes
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Consulta el contacto, la sede y la contratación de cada
                  docente.
                </p>
              </div>
              {hayFiltros && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-sm font-semibold text-blue-700 hover:underline rounded focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label htmlFor="docente-buscar" className={labelClass}>
                  Buscar docente
                </label>
                <input
                  id="docente-buscar"
                  type="search"
                  placeholder="Nombre, código, correo…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={inputClass}
                />
              </div>
              <SelectBuscador
                label="Sede"
                value={sedeFiltro}
                onChange={(id) => setSedeFiltro(String(id))}
                options={catalogos.sedes}
                opcionTodos="Todas las sedes"
                searchPlaceholder="Buscar sede..."
                loading={cargandoCatalogos}
                disabled={errorCatalogos}
              />
              <SelectBuscador
                label="Contratación"
                value={contratoFiltro}
                onChange={(id) => setContratoFiltro(String(id))}
                options={catalogos.tiposContratacion}
                opcionTodos="Todos los contratos"
                searchPlaceholder="Buscar contratación..."
                loading={cargandoCatalogos}
                disabled={errorCatalogos}
              />
              <SelectBuscador
                label="Estado"
                value={estadoFiltro}
                onChange={setEstadoFiltro}
                options={catalogos.estadosDocente.map((item) => ({
                  id: item.nombre.toUpperCase(),
                  nombre: item.nombre,
                }))}
                opcionTodos="Todos los estados"
                searchPlaceholder="Buscar estado..."
                loading={cargandoCatalogos}
                disabled={errorCatalogos}
              />
            </div>
            {errorCatalogos && (
              <div
                role="alert"
                className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
              >
                <span>
                  No pudimos cargar los catálogos. Los filtros y la edición
                  estarán disponibles al recuperarlos.
                </span>
                <button
                  type="button"
                  onClick={fetchCatalogos}
                  className="font-bold underline"
                >
                  Reintentar catálogos
                </button>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500" role="status">
                {isLoading || errorCarga
                  ? "—"
                  : `${docentesFiltrados.length} de ${docentes.length} docentes`}
              </p>
              <select
                aria-label="Ordenar docentes"
                value={orden}
                onChange={(e) => {
                  setOrden(e.target.value);
                  setPagina(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="nombre-asc">Nombre A–Z</option>
                <option value="nombre-desc">Nombre Z–A</option>
                <option value="codigo">Código</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table
              aria-label="Directorio de docentes"
              className="w-full min-w-[1150px] text-left text-sm"
            >
              <thead className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <tr>
                  <th className="px-5 py-5 font-bold">Docente</th>
                  <th className="px-5 py-5 font-bold">Contacto</th>
                  <th className="px-5 py-5 font-bold">Especialidad / Sede</th>
                  <th className="px-5 py-5 font-bold">Contrato</th>
                  <th className="px-5 py-5 font-bold text-center">Estado</th>
                  <th className="px-5 py-5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-3">
                        <svg
                          className="w-8 h-8 animate-spin text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Cargando directorio...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : errorCarga ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-14 text-center">
                      <p role="alert" className="font-semibold text-slate-900">
                        No pudimos cargar el directorio
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        Vuelve a intentarlo para consultar los registros
                        actualizados.
                      </p>
                      <button
                        type="button"
                        onClick={fetchDocentes}
                        className="mt-4 font-semibold text-blue-700 underline"
                      >
                        Reintentar consulta
                      </button>
                    </td>
                  </tr>
                ) : docentesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg
                          className="w-8 h-8 text-slate-300 mb-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                          No se encontraron docentes
                        </span>
                        <p className="text-xs font-normal mt-1">
                          Intenta con otros términos de búsqueda o registra uno
                          nuevo.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  docentesVisibles.map((docente) => {
                    const esActivo =
                      (docente.estadoDocente || "").toUpperCase() === "ACTIVO";
                    const nombreDistrito = obtenerNombreDistrito(
                      docente.idDistrito,
                    );

                    return (
                      <tr
                        key={docente.idDocente}
                        className="odd:bg-slate-50/60 hover:bg-slate-100/60 transition-colors group"
                      >
                        <td className="px-5 py-5 align-top">
                          <p className="font-bold text-slate-900 group-hover:text-black transition-colors leading-snug">
                            {docente.nombres} {docente.apellidos}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              {docente.codigoDocente || "SIN CÓDIGO"}
                            </span>
                            {docente.numeroDocumento && (
                              <span className="text-xs font-semibold text-slate-500">
                                • Documento: {docente.numeroDocumento}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="space-y-1.5 min-w-[190px] max-w-[260px]">
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                              <svg
                                className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              <span
                                className="break-all"
                                title={docente.correoInstitucional}
                              >
                                {docente.correoInstitucional || (
                                  <span className="text-slate-400 italic">
                                    Sin correo inst.
                                  </span>
                                )}
                              </span>
                            </div>

                            {docente.correoPersonal && (
                              <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                                <svg
                                  className="w-3.5 h-3.5 text-slate-300 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                                  />
                                </svg>
                                <span
                                  className="break-all"
                                  title={docente.correoPersonal}
                                >
                                  {docente.correoPersonal}
                                </span>
                              </div>
                            )}

                            {docente.telefono && (
                              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                <svg
                                  className="w-3.5 h-3.5 text-slate-300 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                <span>{docente.telefono}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top">
                          <div className="min-w-[230px] max-w-[340px]">
                            <p
                              className="text-slate-900 font-semibold leading-relaxed break-words"
                              title={docente.especialidad}
                            >
                              {docente.especialidad || "---"}
                            </p>
                            <p
                              className="text-slate-500 text-xs font-medium mt-1 break-words"
                              title={docente.nombreSede}
                            >
                              {docente.nombreSede || "---"}
                            </p>
                            {(docente.direccion || nombreDistrito) && (
                              <p
                                className="text-slate-500 text-xs mt-1 leading-relaxed break-words"
                                title={`${docente.direccion || ""}${nombreDistrito ? ` (${nombreDistrito})` : ""}`}
                              >
                                {docente.direccion || "Sin dirección"}
                                {nombreDistrito ? ` • ${nombreDistrito}` : ""}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-5 align-top whitespace-nowrap">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-slate-200">
                            {docente.tipoContratacion || "NO DEFINIDO"}
                          </span>
                          {(docente.fechaInicio || docente.fechaFin) && (
                            <div className="mt-1.5 text-xs text-slate-400 space-y-0.5">
                              {docente.fechaInicio && (
                                <p>
                                  Inicio:{" "}
                                  <span className="text-slate-600 font-medium">
                                    {docente.fechaInicio}
                                  </span>
                                </p>
                              )}
                              <p>
                                Fin:{" "}
                                <span className="text-slate-600 font-medium">
                                  {docente.fechaFin || "Indefinido"}
                                </span>
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-5 text-center align-top whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
                              esActivo
                                ? "bg-slate-900 text-white border-slate-900"
                                : docente.estadoDocente === "INACTIVO"
                                  ? "bg-slate-100 text-slate-600 border-slate-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            {docente.estadoDocente || "DESCONOCIDO"}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-right align-top whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={
                                cargandoCatalogos || errorCatalogos || isSaving
                              }
                              onClick={() => handleAbrirEditar(docente)}
                              title="Editar docente"
                              aria-label={`Editar a ${docente.nombres} ${docente.apellidos}`}
                              className="inline-flex items-center gap-2 text-slate-600 bg-white hover:bg-slate-50 transition-colors p-2.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                              <span className="text-xs font-semibold">
                                Editar
                              </span>
                            </button>

                            <button
                              disabled={
                                cargandoCatalogos || errorCatalogos || isSaving
                              }
                              onClick={() => handleAbrirCambiarEstado(docente)}
                              title="Cambiar estado"
                              aria-label={`Cambiar estado de ${docente.nombres} ${docente.apellidos}`}
                              className={`inline-flex items-center gap-2 transition-colors p-2.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                                esActivo
                                  ? "text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100"
                                  : "text-slate-400 hover:text-green-600 hover:bg-green-50 hover:border-green-100"
                              }`}
                            >
                              {esActivo ? (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM17 11h6"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM19 8v6m3-3h-6"
                                  />
                                </svg>
                              )}
                              <span className="text-xs font-semibold">
                                Estado
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && !errorCarga && (
            <div className="p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-500" role="status">
                {docentesFiltrados.length
                  ? `${(paginaActual - 1) * porPagina + 1}–${Math.min(paginaActual * porPagina, docentesFiltrados.length)} de ${docentesFiltrados.length} docentes`
                  : "0 docentes"}
                {hayFiltros ? " · Filtros aplicados" : ""}
              </p>
              <nav
                aria-label="Paginación de docentes"
                className="flex items-center gap-3"
              >
                <button
                  type="button"
                  disabled={paginaActual === 1}
                  onClick={() => setPagina(paginaActual - 1)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-slate-600">
                  {paginaActual} / {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={paginaActual === totalPaginas}
                  onClick={() => setPagina(paginaActual + 1)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {modalEditar.open &&
        modalEditar.docente &&
        createPortal(
          <DialogoDocente
            titulo="Editar ficha de docente"
            ocupado={isSaving}
            onClose={() => setModalEditar({ open: false, docente: null })}
          >
            <div
              className="fixed inset-0 bg-black/40 transition-opacity"
              onClick={() =>
                !isSaving && setModalEditar({ open: false, docente: null })
              }
            ></div>

            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              <div className="relative bg-white rounded-2xl w-full max-w-3xl p-5 sm:p-8 shadow-2xl border border-slate-100 text-left my-8 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      Editar Ficha de Docente
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {modalEditar.docente.nombres}{" "}
                      {modalEditar.docente.apellidos}
                      <span className="block mt-1 text-slate-500 font-normal leading-relaxed">
                        {modalEditar.docente.especialidad}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-mono font-semibold">
                    {modalEditar.docente.codigoDocente}
                  </span>
                </div>

                <form onSubmit={handleActualizarDocente} className="space-y-5">
                  <h4 className="text-sm font-bold text-slate-900">
                    Información de contacto
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="editar-telefono" className={labelClass}>
                        Teléfono
                      </label>
                      <input
                        type="text"
                        id="editar-telefono"
                        value={formEdit.telefono}
                        onChange={(e) =>
                          setFormEdit({
                            ...formEdit,
                            telefono: formatearTelefono(e.target.value),
                          })
                        }
                        placeholder="7890-1234"
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="editar-correoPersonal"
                        className={labelClass}
                      >
                        Correo Personal
                      </label>
                      <input
                        type="email"
                        id="editar-correoPersonal"
                        value={formEdit.correoPersonal}
                        onChange={(e) =>
                          setFormEdit({
                            ...formEdit,
                            correoPersonal: e.target.value,
                          })
                        }
                        placeholder="contacto.personal@gmail.com"
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="editar-direccion" className={labelClass}>
                        Dirección de Residencia
                      </label>
                      <input
                        type="text"
                        id="editar-direccion"
                        value={formEdit.direccion}
                        onChange={(e) =>
                          setFormEdit({
                            ...formEdit,
                            direccion: e.target.value,
                          })
                        }
                        placeholder="Colonia San José #45, Santa Ana"
                        required
                        className={inputClass}
                      />
                    </div>

                    <SelectBuscador
                      label="Distrito"
                      disabled={isSaving}
                      value={formEdit.idDistrito}
                      onChange={(id) =>
                        setFormEdit({ ...formEdit, idDistrito: id })
                      }
                      options={catalogos.distritos}
                      placeholder="Seleccione un distrito"
                      searchPlaceholder="Buscar distrito..."
                    />
                  </div>

                  <h4 className="border-t border-slate-100 pt-5 text-sm font-bold text-slate-900">
                    Asignación institucional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <SelectBuscador
                      label="Sede Asignada"
                      disabled={isSaving}
                      value={formEdit.idSede}
                      onChange={(id) =>
                        setFormEdit({ ...formEdit, idSede: id })
                      }
                      options={catalogos.sedes}
                      placeholder="Seleccione sede"
                      searchPlaceholder="Buscar sede..."
                    />

                    <SelectBuscador
                      label="Tipo de Contratación"
                      disabled={isSaving}
                      value={formEdit.idTipoContratacion}
                      onChange={(id) =>
                        setFormEdit({ ...formEdit, idTipoContratacion: id })
                      }
                      options={catalogos.tiposContratacion}
                      placeholder="Seleccione contrato"
                      searchPlaceholder="Buscar tipo de contrato..."
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 mt-8 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        setModalEditar({ open: false, docente: null })
                      }
                      disabled={isSaving}
                      className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </DialogoDocente>,
          document.body,
        )}

      {modalEstado.open &&
        modalEstado.docente &&
        createPortal(
          <DialogoDocente
            titulo="Cambiar estado del docente"
            ocupado={isSaving}
            onClose={() => setModalEstado({ open: false, docente: null })}
          >
            <div
              className="fixed inset-0 bg-black/40 transition-opacity"
              onClick={() =>
                !isSaving && setModalEstado({ open: false, docente: null })
              }
            ></div>

            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              <div className="relative bg-white rounded-2xl w-full max-w-lg p-5 sm:p-8 shadow-2xl border border-slate-100 text-left my-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      Number(formEstado.idEstadoDocente) === 1
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      Cambiar Estado del Docente
                    </h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      {modalEstado.docente.nombres}{" "}
                      {modalEstado.docente.apellidos} (
                      {modalEstado.docente.codigoDocente})
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleConfirmarCambioEstado}
                  className="space-y-5"
                >
                  <SelectBuscador
                    label="Nuevo Estado"
                    disabled={isSaving}
                    value={formEstado.idEstadoDocente}
                    onChange={(id) =>
                      setFormEstado({
                        ...formEstado,
                        idEstadoDocente: Number(id),
                      })
                    }
                    options={catalogos.estadosDocente}
                    placeholder="Seleccione estado"
                    searchPlaceholder="Buscar estado..."
                  />

                  <div>
                    <label htmlFor="docente-motivo" className={labelClass}>
                      Motivo de Auditoría
                    </label>
                    <textarea
                      id="docente-motivo"
                      rows="3"
                      value={formEstado.motivo}
                      onChange={(e) =>
                        setFormEstado({ ...formEstado, motivo: e.target.value })
                      }
                      placeholder="Ej. Suspensión administrativa por finalización de ciclo"
                      required
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 mt-8 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        setModalEstado({ open: false, docente: null })
                      }
                      disabled={isSaving}
                      className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${
                        Number(formEstado.idEstadoDocente) === 1
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isSaving ? "Procesando..." : "Confirmar Cambio"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </DialogoDocente>,
          document.body,
        )}
    </>
  );
}

export default ListaDocentes;
