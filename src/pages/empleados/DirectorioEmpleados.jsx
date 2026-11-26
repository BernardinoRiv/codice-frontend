import useSesion from "../../hooks/useSesion";
import { puedeAdministrarDirectorio } from "../../config/permisos";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Eye,
  KeyRound,
  Lock,
  Unlock,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X
} from "lucide-react";

import { normalizarBusqueda } from "../../utils/validacionesRegistro";

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
  ocultarEtiqueta = false,
}) {
  const [destino, setDestino] = useState(null);
  const open = Boolean(destino) && !disabled && !loading;
  const [search, setSearch] = useState("");
  const [activo, setActivo] = useState(0);
  const [posicion, setPosicion] = useState(null);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const listaId = useId();
  const lista = opcionTodos
    ? [{ id: "", nombre: opcionTodos }, ...options]
    : options;
  const filtrados = lista.filter((item) =>
    normalizarBusqueda(item.nombre).includes(normalizarBusqueda(search)),
  );
  const seleccionado = lista.find((item) => String(item.id) === String(value));
  const abrir = (trigger) => {
    setDestino(trigger.closest('[role="dialog"]') || trigger.ownerDocument.body);
    setSearch("");
    setActivo(0);
  };
  const cerrar = (devolverFoco = false) => {
    setDestino(null);
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
  const enfocarBuscador = useCallback((input) => { input?.focus(); }, []);
  useEffect(() => {
    if (!open) return;
    const fuera = (event) => {
      if (
        !ref.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      )
        setDestino(null);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [open]);
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
        className={ocultarEtiqueta ? "sr-only" : "block text-xs font-semibold text-slate-600 mb-2"}
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
        onClick={event => {
          if (open) cerrar();
          else abrir(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) abrir(event.currentTarget);
          }
        }}
        className="enabled:cursor-pointer disabled:cursor-not-allowed w-full min-h-11 bg-white border border-slate-200 rounded-xl px-4 py-3 text-base sm:text-sm font-normal text-slate-800 shadow-sm flex items-center justify-between gap-3 text-left focus:outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="z-[10020] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="relative p-3 border-b border-slate-100 shrink-0">
              <Search aria-hidden="true" size={15} className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={enfocarBuscador}
                role="combobox"
                aria-label={searchPlaceholder}
                aria-expanded="true"
                aria-controls={listaId}
                aria-autocomplete="list"
                aria-activedescendant={
                  filtrados[activo] ? `${listaId}-${activo}` : undefined
                }
                value={search}
                onChange={e => { setSearch(e.target.value); setActivo(0); }}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-base sm:text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div
              id={listaId}
              role="listbox"
              aria-label={label}
              className="min-h-0 divide-y divide-slate-100 overflow-y-auto overscroll-contain"
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
                  className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-normal text-slate-800 leading-relaxed ${String(item.id) === String(value) ? "bg-slate-50" : index === activo ? "bg-slate-100" : ""}`}
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

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const normalizar = (valor) => String(valor ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();
const estadoLaboral = (e) => String(e.estadoEmpleado || "SIN ESTADO").trim().toUpperCase();
const contratoPorVencer = (e) => {
  if (!e.fechaFin) return false;
  const fecha = new Date(`${String(e.fechaFin).slice(0, 10)}T12:00:00`);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy); limite.setDate(limite.getDate() + 30);
  return fecha >= hoy && fecha <= limite && estadoLaboral(e) === "ACTIVO";
};
const estado = (e) => !e.idUsuario
  ? "SIN USUARIO"
  : String(e.estadoUsuario || "SIN ESTADO").trim().toUpperCase();

async function apiRequest(ruta, options = {}) {
  const response = await fetch(`${API}${ruta}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body === "string"
        ? body
        : body?.message || body?.error || `Error HTTP ${response.status}`
    );
  }
  return response.status === 204 ? null : response.json().catch(() => null);
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

export default function DirectorioEmpleados() {
  const sesion = useSesion();
  const puedeAdministrar = puedeAdministrarDirectorio(sesion, "directorio-empleados");
  const navigate = useNavigate();
  const [empleados, setEmpleados] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [procesando, setProcesando] = useState(false);
  const porPagina = 10;

  const cargarEmpleados = useCallback(async () => {
    setCargando(true);
    try {
      const data = await apiRequest("/api/v1/empleados");
      setEmpleados(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.content) ? data.content : []
      );
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarEmpleados();
  }, [cargarEmpleados]);
  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtro]);

  const filtrados = useMemo(() => {
    return empleados.filter(e => {
      const texto = normalizar(
        `${e.nombres} ${e.apellidos} ${e.codigoEmpleado} ${e.correoInstitucional} ${e.numeroDocumento} ${e.nombreArea ?? e.area ?? ""} ${e.nombreCargo ?? e.cargo ?? ""} ${e.nombreSede}`
      );

      const coincideBusqueda = texto.includes(normalizar(busqueda));
      const coincideFiltro =
        filtro === "TODOS" ||
        (filtro === "POR_VENCER"
          ? contratoPorVencer(e)
          : filtro.startsWith("LABORAL_")
            ? estadoLaboral(e) === filtro.slice("LABORAL_".length)
            : estado(e) === filtro);

      return coincideBusqueda && coincideFiltro;
    });
  }, [empleados, busqueda, filtro]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const visibles = filtrados.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina
  );
  const cerrarModal = () => {
    if (!procesando) {
      setModal(null);
      setMotivo("");
    }
  };

  const ejecutarAccion = async () => {
    if (!modal || procesando) return;
    if (modal.accion === "reset" && !empleados.some(e => e.idEmpleado === modal.empleado.idEmpleado && estado(e) === "ACTIVO")) {
      return toast.error("La cuenta debe estar activa para restablecer la contraseña.");
    }
    if (modal.accion !== "reset" && motivo.trim().length < 5) {
      return toast.error("Escribe un motivo de al menos 5 caracteres.");
    }
    setProcesando(true);
    try {
      const ruta = modal.accion === "reset"
        ? `/api/v1/auth/admin/usuarios/${modal.empleado.idUsuario}/reset-password`
        : `/api/v1/empleados/${modal.empleado.idEmpleado}/usuario/${modal.accion === "bloquear" ? "bloquear" : "desbloquear"}`;
      await apiRequest(ruta, {
        method: modal.accion === "reset" ? "POST" : "PATCH",
        ...(modal.accion !== "reset"
          ? { body: JSON.stringify({ motivo: motivo.trim() }) }
          : {})
      });
      toast.success(
        modal.accion === "reset"
          ? "Contraseña restablecida. Revisa el envío al correo personal."
          : modal.accion === "bloquear"
            ? "Usuario bloqueado correctamente."
            : "Usuario desbloqueado correctamente."
      );
      setModal(null);
      setMotivo("");
      await cargarEmpleados();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <BriefcaseBusiness size={16} />
            Gestión administrativa
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Directorio de empleados
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta de personal, contratos y administración de cuentas institucionales.
          </p>
        </div>
        <button
          type="button"
          onClick={cargarEmpleados}
          disabled={cargando}
          className="enabled:cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={cargando ? "animate-spin" : ""}
          />
          Actualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          title="Total de empleados"
          value={empleados.length}
          detail="Registros en el directorio"
          active={filtro === "TODOS"}
          onClick={() => setFiltro("TODOS")}
        />
        <Stat
          icon={CheckCircle2}
          title="Empleados activos"
          value={empleados.filter(e => estadoLaboral(e) === "ACTIVO").length}
          detail="Estado laboral activo"
          active={filtro === "LABORAL_ACTIVO"}
          onClick={() => setFiltro("LABORAL_ACTIVO")}
        />
        <Stat
          icon={Ban}
          title="Cuentas bloqueadas"
          value={empleados.filter(e => estado(e) === "BLOQUEADO").length}
          detail="Bloqueo administrativo"
          active={filtro === "BLOQUEADO"}
          onClick={() => setFiltro("BLOQUEADO")}
        />
        <Stat
          icon={BriefcaseBusiness}
          title="Contratos por vencer"
          value={empleados.filter(contratoPorVencer).length}
          detail="Finalizan en los próximos 30 días"
          active={filtro === "POR_VENCER"}
          onClick={() => setFiltro("POR_VENCER")}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Listado de empleados
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {filtrados.length} resultados encontrados
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Nombre, código, correo, área o cargo"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <SelectBuscador label="Filtrar empleados por estado" ocultarEtiqueta value={filtro}
              onChange={setFiltro} searchPlaceholder="Buscar estado..." options={[
                { id: "TODOS", nombre: "Todos los estados" },
                { id: "LABORAL_ACTIVO", nombre: "Empleados activos" },
                { id: "LABORAL_INACTIVO", nombre: "Empleados inactivos" },
                { id: "ACTIVO", nombre: "Cuentas activas" },
                { id: "BLOQUEADO", nombre: "Cuentas bloqueadas" },
                { id: "POR_VENCER", nombre: "Contratos por vencer" }
              ]} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Empleado</th>
                <th className="px-5 py-4">Área / Cargo</th>
                <th className="px-5 py-4">Correo institucional</th>
                <th scope="col" className="px-5 py-4">Estado laboral</th>
                <th scope="col" className="px-5 py-4">Estado de cuenta</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!cargando && visibles.map(e => {
                const actual = estado(e);

                return (
                  <tr
                    key={e.idEmpleado}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {e.nombres} {e.apellidos}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {e.codigoEmpleado || "Sin código"}
                      </p>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-slate-600">
                      {[e.nombreArea ?? e.area, e.nombreCargo ?? e.cargo].filter(Boolean).join(" / ") || "Sin asignación"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {e.correoInstitucional || "No registrado"}
                    </td>
                    <td className="px-5 py-4">
                      <EstadoBadge value={estadoLaboral(e)} />
                    </td>
                    <td className="px-5 py-4">
                      <EstadoBadge value={actual} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {puedeAdministrar && (<button
                          type="button"
                          disabled={actual !== "ACTIVO"}
                          onClick={() => setModal({
                            accion: "reset",
                            empleado: e
                          })}
                          title={actual === "BLOQUEADO" ? "Desbloquea la cuenta para restablecer la contraseña" : "Restablecer contraseña"}
                          aria-label={`Restablecer contraseña de ${e.nombres} ${e.apellidos}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <KeyRound size={17} aria-hidden="true" />
                        </button>)}

                        {puedeAdministrar && ["ACTIVO", "BLOQUEADO"].includes(actual) && (
                          <button
                            type="button"
                            onClick={() => setModal({
                              accion: actual === "ACTIVO" ? "bloquear" : "desbloquear",
                              empleado: e
                            })}
                            title={actual === "ACTIVO" ? "Bloquear cuenta" : "Desbloquear cuenta"}
                            aria-label={`${actual === "ACTIVO" ? "Bloquear" : "Desbloquear"} cuenta de ${e.nombres} ${e.apellidos}`}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                              actual === "ACTIVO"
                                ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {actual === "ACTIVO" ? (
                              <Lock size={17} aria-hidden="true" />
                            ) : (
                              <Unlock size={17} aria-hidden="true" />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => navigate(
                            `/dashboard/directorio-empleados/${e.idEmpleado}`
                          )}
                          title="Ver perfil del empleado"
                          aria-label={`Ver perfil de ${e.nombres} ${e.apellidos}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          <Eye size={17} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {cargando && (
          <div className="p-12 text-center text-sm text-slate-500">
            Cargando empleados...
          </div>
        )}
        {!cargando && filtrados.length === 0 && (
          <div className="p-12 text-center">
            <Search size={26} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-700">
              No se encontraron empleados
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Prueba con otro término o estado.
            </p>
          </div>
        )}
        {!cargando && filtrados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-500">
              Mostrando {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, filtrados.length)} de {filtrados.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs text-slate-600">
                {pagina} de {paginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(paginas, p + 1))}
                disabled={pagina === paginas}
                className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={e => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-titulo"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                modal.accion === "bloquear"
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-100 text-slate-700"
              }`}>
                <ShieldCheck size={22} />
              </span>

              <h3
                id="modal-titulo"
                className="text-lg font-bold text-slate-900"
              >
                {modal.accion === "reset"
                  ? "Restablecer contraseña"
                  : modal.accion === "bloquear"
                    ? "Bloquear cuenta"
                    : "Desbloquear cuenta"}
              </h3>
            </div>

            <button
              type="button"
              onClick={cerrarModal}
              disabled={procesando}
              className="enabled:cursor-pointer disabled:cursor-not-allowed rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Cerrar modal"
            >
              <X size={19} />
            </button>
          </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {modal.empleado.nombres} {modal.empleado.apellidos} · {modal.empleado.codigoEmpleado}
            </p>
            {modal.accion === "reset" && (
              <p className="mt-1 break-all text-xs text-slate-500">
                <strong>Correo personal: </strong>
                {modal.empleado.correoPersonal || "No registrado"}
              </p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              {modal.accion === "reset"
                ? "Se generará una contraseña temporal y se enviará al correo personal registrado."
                : modal.accion === "bloquear"
                  ? "Se impedirá el acceso y se cerrarán las sesiones activas del usuario."
                  : "Se habilitará nuevamente el acceso a la cuenta institucional."}
            </p>
            {modal.accion !== "reset" && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Motivo de la operación
                </label>
                <textarea
                  rows={3}
                  maxLength={100}
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Describe el motivo administrativo..."
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={cerrarModal}
                disabled={procesando}
                className="enabled:cursor-pointer disabled:cursor-not-allowed rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarAccion}
                disabled={
                  procesando ||
                  (modal.accion !== "reset" && motivo.trim().length < 5)
                }
                className={`enabled:cursor-pointer disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  modal.accion === "bloquear"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {procesando ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
