import React, { useLayoutEffect, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
async function solicitar(ruta, opciones = {}) {
  if (!API_URL)
    throw new Error("Error de configuración: VITE_API_URL no está definida.");
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Inicia sesión para administrar las carreras.");
  const customHeaders = {
    "Content-Type": "application/json",
    ...opciones.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: customHeaders,
  });
  if (!res.ok) {
    const mensajes = {
      401: "Tu sesión ha expirado. Inicia sesión nuevamente.",
      403: "Acceso denegado: No tienes permisos para esta acción.",
      404: "El recurso solicitado ya no existe.",
      409: "Conflicto: La operación interfiere con un registro existente.",
      429: "Demasiadas solicitudes. Por favor, espera un momento.",
    };
    let detalle;
    if ([400, 422].includes(res.status)) {
      const body = await res.json().catch(() => null);
      if (body && typeof body.mensaje === "string") detalle = body.mensaje;
    }
    throw new Error(
      detalle ||
        mensajes[res.status] ||
        "Error en el servidor. Inténtalo nuevamente.",
    );
  }
  return res;
}

function SelectBuscador({
  label,
  loading = false,
  value,
  onChange,
  options = [],
  placeholder = "-- Seleccione --",
  searchPlaceholder = "Buscar...",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const [posicion, setPosicion] = useState(null);
  useLayoutEffect(() => {
    if (!open) { setPosicion(null); return; }
    let frame;
    const colocar = () => {
      const boton = triggerRef.current;
      if (!boton) return;
      const rect = boton.getBoundingClientRect();
      const viewport = window.visualViewport;
      const arribaViewport = viewport?.offsetTop || 0;
      const izquierdaViewport = viewport?.offsetLeft || 0;
      const alto = viewport?.height || window.innerHeight;
      const ancho = viewport?.width || window.innerWidth;
      const abajo = Math.max(0, arribaViewport + alto - rect.bottom - 14);
      const arriba = Math.max(0, rect.top - arribaViewport - 14);
      const haciaArriba = abajo < 280 && arriba > abajo;
      const maxHeight = Math.min(320, haciaArriba ? arriba : abajo);
      const width = Math.min(rect.width, ancho - 24);
      const left = Math.max(izquierdaViewport + 12, Math.min(rect.left, izquierdaViewport + ancho - width - 12));
      const top = haciaArriba ? rect.top - 6 : rect.bottom + 6;
      const siguiente = { top, left, width, maxHeight, transform: haciaArriba ? 'translateY(-100%)' : 'none' };
      setPosicion(anterior => anterior && Object.keys(siguiente).every(k => anterior[k] === siguiente[k]) ? anterior : siguiente);
      frame = requestAnimationFrame(colocar);
    };
    colocar();
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const normalizar = texto => String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtrados = options.filter(item => normalizar(item.nombre || item.label || "").includes(normalizar(search.trim())));
  const seleccionado = options.find(
    (item) => String(item.id) === String(value),
  );
  const handleLimpiar = (e) => {
    e.stopPropagation();
    if (search) {
      setSearch("");
      inputRef.current?.focus();
    } else if (value) {
      onChange("");
      setOpen(false);
    }
  };
  return (
    <div
      ref={containerRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          containerRef.current?.querySelector("button")?.focus();
        }
      }}
      className={`relative ${open ? "z-40" : "z-10"}`}
    >
      <div className="h-5 mb-1.5 ml-1 flex items-center">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {label}
          {loading && (
            <span className="animate-pulse text-blue-600 normal-case ml-1">
              (...)
            </span>
          )}
        </label>
      </div>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || loading}
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) setSearch("");
          }
        }}
        className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm disabled:opacity-50 disabled:bg-slate-50 flex items-center justify-between text-left gap-3"
      >
        <span
          className={`truncate ${seleccionado ? "text-slate-900 font-semibold" : "text-slate-400 font-medium"}`}
        >
          {seleccionado
            ? seleccionado.nombre || seleccionado.label
            : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && !disabled && posicion && createPortal(
        <div ref={panelRef} role="group" aria-label={`Opciones: ${label}`}
          style={{ ...posicion, position: 'fixed', zIndex: 2000, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              e.stopPropagation();
              const elementos = [...panelRef.current.querySelectorAll('input, button:not(:disabled)')];
              const index = elementos.indexOf(document.activeElement);
              const next = index + (e.shiftKey ? -1 : 1);
              if (next < 0 || next >= elementos.length) { setOpen(false); triggerRef.current?.focus(); }
              else elementos[next].focus();
            }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault(); e.stopPropagation();
              const opciones = [...panelRef.current.querySelectorAll('[data-opcion]')];
              if (!opciones.length) return;
              const index = opciones.indexOf(document.activeElement);
              const next = index < 0 ? (e.key === 'ArrowDown' ? 0 : opciones.length - 1) : (index + (e.key === 'ArrowDown' ? 1 : -1) + opciones.length) % opciones.length;
              opciones[next].focus();
            }
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-xl">

          <div className="shrink-0 p-2.5 border-b border-slate-100 bg-slate-50">
            <div className="relative flex items-center">
              <svg
                className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs focus:outline-none focus:border-slate-400 font-medium placeholder-slate-500"
              />
              {(search || seleccionado) && (
                <button
                  type="button"
                  onClick={handleLimpiar}
                  aria-label={search ? "Limpiar búsqueda" : "Limpiar selección"}
                  className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-50">
            {filtrados.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-600 text-center font-medium">
                No se encontraron resultados
              </div>
            ) : (
              filtrados.map((item) => {
                const activo = String(item.id) === String(value);
                return (
                  <button
                    type="button"
                    key={item.id}
                    data-opcion="true"
                    onClick={() => {
                      onChange(String(item.id));
                      setOpen(false);
                      containerRef.current?.querySelector("button")?.focus();
                      setSearch("");
                    }}
                    className={`w-full text-left px-4 py-3 text-[13px] transition-colors flex items-center justify-between gap-3 ${
                      activo
                        ? "bg-slate-900 text-white font-semibold"
                        : "text-slate-700 font-medium hover:bg-slate-50"
                    }`}
                  >
                    <span className="leading-snug break-words">
                      {item.nombre || item.label}
                    </span>
                    {activo && (
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>, document.body
      )}
    </div>
  );
}
export default function GestionCarreras({ catalogoFacultades = [] }) {
  const montado = useRef(false);
  const peticionActiva = useRef(null);
  const guardando = useRef(false);
  const peticionCambio = useRef(null);
  const dialogoRef = useRef(null);
  const ocupadoRef = useRef(false);
  const [carreras, setCarreras] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [facultadesRecibidas, setFacultadesRecibidas] = useState([]);
  const facultades = catalogoFacultades.length
    ? catalogoFacultades
    : facultadesRecibidas;
  const [busqueda, setBusqueda] = useState("");
  const [facultadFiltro, setFacultadFiltro] = useState("");
  const [nivelFiltro, setNivelFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [orden, setOrden] = useState("asc");
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(10);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [modalFormulario, setModalFormulario] = useState(false);
  const [modalEstado, setModalEstado] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [formData, setFormData] = useState({
    idCarrera: null,
    nombreCarrera: "",
    idFacultad: "",
    idNivel: "",
  });
  const [motivoCambioEstado, setMotivoCambioEstado] = useState("");
  const cargarDatos = useCallback(async () => {
    peticionActiva.current?.abort();
    const control = new AbortController();
    peticionActiva.current = control;
    setCargando(true);
    setErrorCarga("");
    const timer = setTimeout(() => control.abort("timeout"), 20000);
    try {
      const [resCat, resCar] = await Promise.all([
        solicitar("/api/v1/catalogos?nombres=niveles_academicos", {
          signal: control.signal,
        }),
        solicitar("/api/v1/carreras", { signal: control.signal }),
      ]);
      const [dataCat, dataCar] = await Promise.all([
        resCat.json(),
        resCar.json(),
      ]);
      if (
        !Array.isArray(dataCar) ||
        dataCar.some(
          (c) =>
            !c || c.idCarrera == null || typeof c.nombreCarrera !== "string",
        )
      )
        throw new Error(
          "El servidor devolvió un formato de carreras inválido.",
        );
      if (!Array.isArray(dataCat.niveles_academicos))
        throw new Error("No se pudo cargar el catálogo de niveles académicos.");
      const catalogoNiveles = dataCat.niveles_academicos.map((n) => ({
        id: n.id ?? n.idNivel,
        nombre: n.nombre || n.nivel || n.nombreNivel,
      }));
      if (catalogoNiveles.some((n) => !n.id || typeof n.nombre !== "string"))
        throw new Error("El catálogo de niveles contiene registros inválidos.");
      if (montado.current && peticionActiva.current === control) {
        setNiveles(catalogoNiveles);
        setFacultadesRecibidas([
          ...new Map(
            dataCar
              .filter(
                (c) =>
                  c.idFacultad != null &&
                  typeof c.facultad === "string" &&
                  c.facultad.trim(),
              )
              .map((c) => [
                String(c.idFacultad),
                { id: c.idFacultad, nombre: c.facultad },
              ]),
          ).values(),
        ]);
        setCarreras(dataCar);
      }
    } catch (error) {
      if (
        montado.current &&
        peticionActiva.current === control &&
        (!control.signal.aborted || control.signal.reason === "timeout")
      ) {
        setErrorCarga(
          control.signal.reason === "timeout"
            ? "El servidor tardó demasiado. Inténtalo nuevamente."
            : error.message || "Fallo de conexión al servidor.",
        );
      }
    } finally {
      clearTimeout(timer);
      if (montado.current && peticionActiva.current === control)
        setCargando(false);
    }
  }, []);
  useEffect(() => {
    montado.current = true;
    cargarDatos();
    return () => {
      montado.current = false;
      peticionActiva.current?.abort();
      peticionCambio.current?.abort();
    };
  }, [cargarDatos]);
  ocupadoRef.current = procesando;
  useEffect(() => {
    if (!modalFormulario && !modalEstado) return;
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() =>
      dialogoRef.current?.querySelector("input, textarea, button")?.focus(),
    );
    const teclado = (e) => {
      if (e.key === "Escape" && !ocupadoRef.current && !e.defaultPrevented) {
        setModalFormulario(false);
        setModalEstado(false);
      }
      if (e.key !== "Tab") return;
      const elementos = [
        ...(dialogoRef.current?.querySelectorAll(
          "input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)",
        ) || []),
      ];
      const primero = elementos[0],
        ultimo = elementos[elementos.length - 1];
      if (!primero) {
        e.preventDefault();
        dialogoRef.current?.focus();
      } else if (
        e.shiftKey &&
        (document.activeElement === primero ||
          !dialogoRef.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        ultimo.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === ultimo ||
          !dialogoRef.current?.contains(document.activeElement))
      ) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", teclado);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", teclado);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [modalFormulario, modalEstado]);
  const abrirNuevo = () => {
    setModoEdicion(false);
    setFormData({
      idCarrera: null,
      nombreCarrera: "",
      idFacultad: "",
      idNivel: "",
    });
    setModalFormulario(true);
  };
  const abrirEdicion = (carrera) => {
    setModoEdicion(true);
    let facId = carrera.idFacultad || "";
    if (!facId && carrera.facultad) {
      const match = facultades.find(
        (f) => f.nombre.toUpperCase() === carrera.facultad.toUpperCase(),
      );
      if (match) facId = match.id;
    }
    setFormData({
      idCarrera: carrera.idCarrera,
      nombreCarrera: carrera.nombreCarrera,
      idFacultad: facId,
      idNivel: carrera.idNivel || "",
    });
    setModalFormulario(true);
  };
  const abrirModalEstado = (carrera) => {
    setFormData({
      ...formData,
      idCarrera: carrera.idCarrera,
      nombreCarrera: carrera.nombreCarrera,
    });

    setMotivoCambioEstado("");
    setModalEstado(true);
  };
  const ejecutarCambio = async (ruta, metodo, payload, mensaje) => {
    if (guardando.current) return;
    guardando.current = true;
    setProcesando(true);
    const control = new AbortController();
    peticionCambio.current = control;
    const timer = setTimeout(() => control.abort(), 30000);
    try {
      await solicitar(ruta, {
        method: metodo,
        signal: control.signal,
        body: JSON.stringify(payload),
      });
      clearTimeout(timer);
      if (!montado.current) return;
      toast.success(mensaje);
      setModalFormulario(false);
      setModalEstado(false);
      await cargarDatos();
    } catch (error) {
      if (montado.current)
        toast.error("No se pudo completar la operación", {
          description:
            control.signal.aborted || error instanceof TypeError
              ? "No se confirmó la respuesta. Actualiza el catálogo antes de volver a intentar."
              : error.message,
        });
    } finally {
      clearTimeout(timer);
      guardando.current = false;
      if (montado.current) setProcesando(false);
    }
  };
  const guardarRegistro = (e) => {
    e.preventDefault();
    const nombreStr = formData.nombreCarrera.trim().replace(/\s+/g, " ");
    if (nombreStr.length < 3 || nombreStr.length > 150)
      return toast.warning("El nombre debe contener entre 3 y 150 caracteres.");
    if (
      !facultades.some((f) => String(f.id) === String(formData.idFacultad)) ||
      !niveles.some((n) => String(n.id) === String(formData.idNivel))
    )
      return toast.warning("Selecciona una facultad y un nivel válidos.");
    if (modoEdicion && formData.idCarrera == null)
      return toast.error("Identificador de carrera inválido.");
    return ejecutarCambio(
      modoEdicion
        ? `/api/v1/carreras/${encodeURIComponent(formData.idCarrera)}`
        : "/api/v1/carreras",
      modoEdicion ? "PUT" : "POST",
      {
        nombreCarrera: nombreStr,
        idFacultad: Number(formData.idFacultad),
        idNivel: Number(formData.idNivel),
      },
      modoEdicion ? "Carrera actualizada" : "Carrera registrada",
    );
  };
  const confirmarCambioEstado = (e) => {
    e.preventDefault();
    const motivo = motivoCambioEstado.trim();
    if (motivo.length < 10 || motivo.length > 250)
      return toast.warning(
        "La justificación debe contener entre 10 y 250 caracteres.",
      );
    if (formData.idCarrera == null)
      return toast.error("Identificador de carrera inválido.");
    return ejecutarCambio(
      `/api/v1/carreras/${encodeURIComponent(formData.idCarrera)}/desactivar`,
      "PATCH",
      { motivo },
      "Carrera desactivada",
    );
  };
  const getEstado = (c) => {
    const nombre =
      typeof c.estadoCarrera === "string"
        ? c.estadoCarrera.trim().toUpperCase()
        : "";
    if (nombre === "ACTIVA" || nombre === "INACTIVA") return nombre;
    return Number(c.idEstadoCarrera) === 1 ? "ACTIVA" : "NO DISPONIBLE";
  };
  const getFacultadNombre = (c) =>
    typeof c.facultad === "string"
      ? c.facultad
      : facultades.find((f) => String(f.id) === String(c.idFacultad))?.nombre ||
        "Sin asignar";
  const getNivelNombre = (c) =>
    niveles.find((n) => String(n.id) === String(c.idNivel))?.nombre ||
    niveles.find((n) => String(n.id) === String(c.idNivel))?.nivel ||
    "Sin asignar";
  const normalizarTxt = (t) =>
    String(t || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const opcionesFacultades = [...new Set(carreras.map(getFacultadNombre))]
    .filter(Boolean)
    .sort()
    .map((f, i) => ({ id: f, nombre: f }));
  const opcionesNiveles = [...new Set(carreras.map(getNivelNombre))]
    .filter(Boolean)
    .sort()
    .map((n, i) => ({ id: n, nombre: n }));
  const listadoFiltrado = carreras
    .filter((c) => {
      const matchBuscador = normalizarTxt(
        `${c.nombreCarrera} ${c.codigoCarrera}`,
      ).includes(normalizarTxt(busqueda.trim()));
      const matchFacultad =
        !facultadFiltro || getFacultadNombre(c) === facultadFiltro;
      const matchNivel = !nivelFiltro || getNivelNombre(c) === nivelFiltro;
      const matchEstado =
        !estadoFiltro || String(getEstado(c)) === estadoFiltro;
      return matchBuscador && matchFacultad && matchNivel && matchEstado;
    })
    .sort((a, b) => {
      const strA = String(a.nombreCarrera);
      const strB = String(b.nombreCarrera);
      return orden === "asc"
        ? strA.localeCompare(strB, "es")
        : strB.localeCompare(strA, "es");
    });
  useEffect(() => {
    setPagina(1);
  }, [busqueda, facultadFiltro, nivelFiltro, estadoFiltro, limite, orden]);
  const totalPaginas = Math.max(1, Math.ceil(listadoFiltrado.length / limite));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const elementosVisibles = listadoFiltrado.slice(
    (paginaSegura - 1) * limite,
    paginaSegura * limite,
  );
  const renderBadgeEstado = (id) => {
    switch (id) {
      case "ACTIVA":
        return (
          <span className="bg-slate-900 text-white border border-slate-900 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-widest">
            ACTIVA
          </span>
        );
      case "INACTIVA":
        return (
          <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-widest">
            INACTIVA
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-widest">
            NO DISPONIBLE
          </span>
        );
    }
  };
  const inputClasses =
    "w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm placeholder-slate-400 disabled:opacity-50 disabled:bg-slate-50";
  return (
    <div className="w-full min-h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-inter font-extrabold text-slate-900 tracking-tight">
            Gestión de carreras
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Catálogo institucional de oferta académica.
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          disabled={
            cargando || !!errorCarga || !facultades.length || !niveles.length
          }
          className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center"
        >
          Nueva carrera
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            id: "",
            titulo: "Total de carreras",
            sub: "Catálogo institucional",
          },
          { id: "ACTIVA", titulo: "Activas", sub: "Oferta académica vigente" },
          {
            id: "INACTIVA",
            titulo: "Inactivas",
            sub: "Historial del catálogo",
          },
        ].map((card) => {
          const conteo =
            cargando || errorCarga
              ? "—"
              : card.id === ""
                ? carreras.length
                : carreras.filter((c) => getEstado(c) === card.id).length;
          const activo = estadoFiltro === card.id;
          return (
            <button
              key={card.id}
              aria-pressed={estadoFiltro === card.id}
              onClick={() => setEstadoFiltro(card.id)}
              className={`text-left p-6 rounded-2xl border transition-all ${activo ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-sm"}`}
            >
              <span
                className={`block text-[11px] font-bold uppercase tracking-widest ${activo ? "text-slate-300" : "text-slate-500"}`}
              >
                {card.titulo}
              </span>
              <span className="block text-3xl font-black tracking-tight my-2">
                {conteo}
              </span>
              <span
                className={`block text-xs font-medium ${activo ? "text-slate-400" : "text-slate-500"}`}
              >
                {card.sub}
              </span>
            </button>
          );
        })}
      </div>
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col flex-1">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Listado de carreras
            </h2>
            <button
              onClick={cargarDatos}
              disabled={cargando || procesando}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 uppercase tracking-widest disabled:opacity-50"
            >
              {cargando ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="carrera-buscar"
                className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5"
              >
                Buscar por nombre o código
              </label>
              <input
                id="carrera-buscar"
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Ej. Arquitectura..."
                className={inputClasses}
              />
            </div>
            <div>
              <SelectBuscador
                label="Filtrar por Facultad"
                value={facultadFiltro}
                onChange={setFacultadFiltro}
                options={opcionesFacultades}
                placeholder="Todas las facultades"
                searchPlaceholder="Buscar facultad..."
              />
            </div>
            <div>
              <SelectBuscador
                label="Nivel Académico"
                value={nivelFiltro}
                onChange={setNivelFiltro}
                options={opcionesNiveles}
                placeholder="Todos los niveles"
                searchPlaceholder="Buscar nivel..."
              />
            </div>
            <div>
              <SelectBuscador
                label="Estado"
                value={estadoFiltro}
                onChange={setEstadoFiltro}
                options={[
                  { id: "ACTIVA", nombre: "Activa" },
                  { id: "INACTIVA", nombre: "Inactiva" },
                ]}
                placeholder="Todos los estados"
                searchPlaceholder="Buscar estado..."
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-slate-500">
            <span aria-live="polite">
              {cargando || errorCarga
                ? "—"
                : `${listadoFiltrado.length} de ${carreras.length} carreras`}
            </span>
            <div className="flex items-center gap-4">
              {(busqueda || facultadFiltro || nivelFiltro || estadoFiltro) && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setFacultadFiltro("");
                    setNivelFiltro("");
                    setEstadoFiltro("");
                  }}
                  className="underline underline-offset-4 text-slate-700"
                >
                  Limpiar filtros
                </button>
              )}
              <select
                aria-label="Ordenar carreras"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="rounded-lg border border-slate-200 p-2 bg-white text-slate-700"
              >
                <option value="asc">Nombre A–Z</option>
                <option value="desc">Nombre Z–A</option>
              </select>
            </div>
          </div>
        </div>
        {errorCarga ? (
          <div role="alert" className="p-12 text-center">
            <p className="text-slate-600 font-medium">{errorCarga}</p>
            <button
              onClick={cargarDatos}
              className="mt-4 text-sm font-bold text-slate-900 underline underline-offset-4"
            >
              Reintentar conexión
            </button>
          </div>
        ) : cargando ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <svg
              className="w-8 h-8 animate-spin mb-4"
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
            <p className="text-xs font-bold uppercase tracking-widest">
              Consultando registros...
            </p>
          </div>
        ) : listadoFiltrado.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
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
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No se encontraron resultados
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Ajusta los filtros de búsqueda o registra una nueva carrera para
              comenzar.
            </p>
            {(busqueda || facultadFiltro || nivelFiltro || estadoFiltro) && (
              <button
                onClick={() => {
                  setBusqueda("");
                  setFacultadFiltro("");
                  setNivelFiltro("");
                  setEstadoFiltro("");
                }}
                className="mt-6 px-6 py-2.5 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest"
                  >
                    Código
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest"
                  >
                    Carrera / Facultad
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest"
                  >
                    Nivel Académico
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {elementosVisibles.map((carrera) => (
                  <tr
                    key={carrera.idCarrera}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-5 align-top">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] font-mono font-bold text-slate-700">
                        {carrera.codigoCarrera || "S/C"}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <p className="font-semibold text-slate-900 leading-snug min-w-[220px]">
                        {carrera.nombreCarrera}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {getFacultadNombre(carrera)}
                      </p>
                    </td>
                    <td className="px-6 py-5 align-top pt-6 text-xs font-semibold text-slate-600">
                      {getNivelNombre(carrera)}
                    </td>
                    <td className="px-6 py-5 align-top text-center pt-6">
                      {renderBadgeEstado(getEstado(carrera))}
                    </td>
                    <td className="px-6 py-5 align-top text-right">
                      <div className="flex items-center justify-end gap-2 pt-1 opacity-100">
                        <button
                          onClick={() => abrirEdicion(carrera)}
                          title="Editar carrera"
                          aria-label={`Editar ${carrera.nombreCarrera}`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
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
                        </button>
                        {getEstado(carrera) === "ACTIVA" ? (
                          <button
                            onClick={() => abrirModalEstado(carrera)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
                          >
                            Desactivar
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!cargando && !errorCarga && listadoFiltrado.length > 0 && (
          <div className="border-t border-slate-100 p-5 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-2">
              <span>Mostrando</span>
              <select
                aria-label="Filas por página"
                value={limite}
                onChange={(e) => setLimite(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-slate-400"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>por página</span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                {(paginaSegura - 1) * limite + 1} -{" "}
                {Math.min(paginaSegura * limite, listadoFiltrado.length)} de{" "}
                {listadoFiltrado.length} registros
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={paginaSegura <= 1}
                  aria-label="Página anterior"
                  onClick={() => setPagina(paginaSegura - 1)}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  disabled={paginaSegura >= totalPaginas}
                  aria-label="Página siguiente"
                  onClick={() => setPagina(paginaSegura + 1)}
                  className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {(modalFormulario || modalEstado) && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { if (!procesando) { setModalFormulario(false); setModalEstado(false); } }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
              <motion.div ref={dialogoRef} role="dialog" aria-modal="true" aria-labelledby="carrera-dialog-title"
                tabIndex={-1} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="relative flex w-full max-w-xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <header className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div>
                    <h2 id="carrera-dialog-title" className="text-xl font-bold tracking-tight text-slate-900">{modalEstado ? 'Desactivar carrera' : modoEdicion ? 'Actualizar carrera' : 'Nueva carrera'}</h2>
                    <p className="mt-1 text-sm text-slate-500">{modalEstado ? 'Indica el motivo de la baja para dejar constancia.' : 'Completa la información de la oferta académica.'}</p>
                  </div>
                  <button type="button" disabled={procesando} aria-label="Cerrar ventana" onClick={() => { setModalFormulario(false); setModalEstado(false); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40">×</button>
                </header>
                <form onSubmit={modalEstado ? confirmarCambioEstado : guardarRegistro} className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-6 space-y-5">
                    {modalEstado ? <>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Carrera seleccionada</p><p className="mt-1 text-sm font-semibold leading-relaxed text-slate-900 break-words">{formData.nombreCarrera}</p></div>
                      <div>
                        <label htmlFor="carrera-motivo" className="mb-2 block text-sm font-semibold text-slate-700">Justificación de cierre <span aria-hidden="true">*</span></label>
                        <textarea id="carrera-motivo" required minLength={10} maxLength={250} disabled={procesando} value={motivoCambioEstado} onChange={e => setMotivoCambioEstado(e.target.value)} aria-describedby="carrera-motivo-ayuda" placeholder="Describe la resolución o el motivo de la baja…" className="w-full min-h-28 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50" />
                        <div id="carrera-motivo-ayuda" className="mt-2 flex justify-between gap-3 text-xs text-slate-500"><span>Mínimo 10 caracteres.</span><span>{motivoCambioEstado.trim().length} / 250</span></div>
                      </div>
                    </> : <>
                      <div>
                        <label htmlFor="carrera-nombre" className="mb-2 block text-sm font-semibold text-slate-700">Nombre oficial <span aria-hidden="true">*</span></label>
                        <input id="carrera-nombre" required minLength={3} maxLength={150} disabled={procesando} value={formData.nombreCarrera} onChange={e => setFormData({ ...formData, nombreCarrera: e.target.value })} placeholder="Ej. Licenciatura en Informática" className={inputClasses} />
                      </div>
                      <div>
                        <SelectBuscador label="Facultad *" disabled={procesando} value={formData.idFacultad} onChange={value => setFormData({ ...formData, idFacultad: value })} options={facultades} placeholder="Selecciona una facultad" searchPlaceholder="Buscar facultad…" />
                      </div>
                      <div>
                        <SelectBuscador label="Nivel académico *" disabled={procesando} value={formData.idNivel} onChange={value => setFormData({ ...formData, idNivel: value })} options={niveles} placeholder="Selecciona un nivel" searchPlaceholder="Buscar nivel…" />
                      </div>
                    </>}
                  </div>
                  <footer className="shrink-0 flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
                    <button type="button" disabled={procesando} onClick={() => { setModalFormulario(false); setModalEstado(false); }} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancelar</button>
                    <button type="submit" disabled={procesando} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{procesando ? 'Procesando…' : modalEstado ? 'Desactivar carrera' : 'Guardar carrera'}</button>
                  </footer>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>, document.body
      )}
    </div>
  );
}
