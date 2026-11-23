import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Building2, CalendarDays, CheckCircle2, Edit3, FileBadge, BriefcaseBusiness, LockKeyhole, Mail, MapPin, Phone, RefreshCw, Save, ShieldAlert, UserRound, X } from "lucide-react";

const API = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const normalizar = (v) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const vacio = (v) => v === null || v === undefined || v === "" ? "No registrado" : v;
const fecha = (v) => v ? String(v).slice(0, 10) : "No registrado";

// Validación de edades según las reglas administrativas del SRA.
function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}


function edadEnAnios(fechaNacimiento) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(fechaNacimiento ?? ""))) {
    return null;
  }

  const [anio, mes, dia] = fechaNacimiento.split("-").map(Number);
  const nacimiento = new Date(anio, mes - 1, dia);
  if(nacimiento.getFullYear() !== anio ||
    nacimiento.getMonth() !== mes - 1 ||
    nacimiento.getDate() !== dia) {
    return null;
  }

  const hoy = new Date();
  let edad = hoy.getFullYear() - anio;
  if(hoy.getMonth() + 1 < mes ||
    (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) {
    edad--;
  }
  return edad;
}



// Los identificadores se obtienen del catálogo; las reglas de formato siguen el backend.
function formatoDocumento(tipo, valor) {
  const id = String(tipo);
  const texto = String(valor ?? "").toUpperCase();
  if(id === "1") {
    const n = texto.replace(/\D/g, "").slice(0, 9);
    return n.length <= 8 ? n : `${n.slice(0, 8)}-${n.slice(8)}`;
  }
  if(id === "3") {
    const n = texto.replace(/\D/g, "").slice(0, 14);
    if(n.length <= 4) return n;
    if(n.length <= 10) return `${n.slice(0, 4)}-${n.slice(4)}`;
    if(n.length <= 13) return `${n.slice(0, 4)}-${n.slice(4, 10)}-${n.slice(10)}`;
    return `${n.slice(0, 4)}-${n.slice(4, 10)}-${n.slice(10, 13)}-${n.slice(13)}`;
  }
  if(id === "2") return texto.replace(/[^A-Z0-9]/g, "").slice(0, 9);
  return texto;
}

function longitudDocumento(tipo) {
  return String(tipo) === "1" ? 10 : String(tipo) === "3" ? 17 : 9;
}

function placeholderDocumento(tipo) {
  return String(tipo) === "1" ? "00000000-0" : String(tipo) === "3" ? "0000-000000-000-0" : "A12345678";
}


// Validación previa equivalente a las reglas de documento del backend.
function errorDocumento(tipo, numero) {
  const id = String(tipo);
  const valor = String(numero ?? "").trim().toUpperCase();
  if(id === "1") {
    if(!/^\d{8}-\d$/.test(valor)) return "El DUI debe tener el formato 00000000-0.";
    const digitos = valor.replace(/\D/g, "");
    const suma = [...digitos.slice(0, 8)].reduce((total, digito, indice) => total + Number(digito) * (9 - indice), 0);
    const verificador = (10 - (suma % 10)) % 10;
    if(verificador !== Number(digitos[8])) return "DUI inválido. El dígito verificador no coincide.";
    return "";
  }
  if(id === "2") return /^[A-Z][0-9]{7,8}$/.test(valor) ? "" : "El pasaporte debe comenzar con una letra seguida de 7 u 8 números.";
  if(id === "3") return /^\d{4}-\d{6}-\d{3}-\d$/.test(valor) ? "" : "El NIT debe tener el formato 0000-000000-000-0.";
  return "Selecciona un tipo de documento válido.";
}

function mensajeErrorApi(body, status) {
  if(body?.detalles && typeof body.detalles === "object") {
    const mensajes = Object.values(body.detalles).flat().filter(valor => typeof valor === "string" && valor.trim());
    if(mensajes.length) return mensajes.join(". ");
  }
  const mensaje = [body?.mensaje, body?.message, body?.error].find(valor => typeof valor === "string" && valor.trim());
  return mensaje || `No se pudo completar la solicitud (HTTP ${status}).`;
}

async function apiRequest(ruta, options = {}) {
  const response = await fetch(`${API}${ruta}`, { ...options, headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  if(!response.ok) { const body = await response.json().catch(() => null); throw new Error(typeof body === "string" ? body : mensajeErrorApi(body, response.status)); }
  return response.status === 204 ? null : response.json().catch(() => null);
}

function Campo({ titulo, valor, icon: Icon }) {
  return <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">{Icon && <Icon size={14} />}{titulo}</div>
    <p className="mt-2 break-words text-sm font-semibold text-slate-800">{vacio(valor)}</p>
  </div>;
}
function Indicador({ titulo, valor }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-2xl font-bold text-slate-900">{valor ?? 0}</p>
    <p className="mt-1 text-xs text-slate-500">{titulo}</p>
  </div>;
}
function Badge({ children, type = "neutral" }) { const cls = type === "success" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : type === "danger" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-700 ring-slate-200"; return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${cls}`}>{children}</span>; }
function Input({
  label, value, onChange, type = "text", required = false,
  placeholder, min, max, disabled = false, mayusculas = false
}) {
  return <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
    <input
      type={type}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      onBlur={e => {
        if (mayusculas) {
          onChange(e.target.value.toLocaleUpperCase("es"));
        }
      }}
      required={required}
      min={min}
      max={max}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-100 ${mayusculas ? "uppercase" : ""}`}
    />
  </label>;
}

export default function InformacionEmpleado() {
  const { idEmpleado } = useParams();
  const navigate = useNavigate();
  const [empleado, setEmpleado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [seccion, setSeccion] = useState("personal");
  const [modal, setModal] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [formPersonal, setFormPersonal] = useState({});
  const [formDocumento, setFormDocumento] = useState({});
  const [departamentos, setDepartamentos] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false);
  const [cargandoDistritos, setCargandoDistritos] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState("");
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [cargandoTipos, setCargandoTipos] = useState(false);
  const [errorTipos, setErrorTipos] = useState("");
  const [motivo, setMotivo] = useState("");
  const [formLaboral, setFormLaboral] = useState({});
  const [estadoLaboralNuevo, setEstadoLaboralNuevo] = useState("");
  const [areas, setAreas] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [estadosLaborales, setEstadosLaborales] = useState([]);
  const [errorCatalogosLaborales, setErrorCatalogosLaborales] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setEmpleado(await apiRequest(`/api/v1/empleados/${idEmpleado}`)); }
    catch(error) { toast.error(error.message); }
    finally { setCargando(false); }
  }, [idEmpleado]);
  useEffect(() => { cargar(); }, [cargar]);

  const abrirPersonal = () => {
    const e = empleado;
    setFormPersonal({
      nombres: String(e.nombres || "").toLocaleUpperCase("es"),
      apellidos: String(e.apellidos || "").toLocaleUpperCase("es"),
      fechaNacimiento: e.fechaNacimiento ? String(e.fechaNacimiento).slice(0, 10) : "",
      sexo: e.sexo || "",
      telefono: e.telefono || "",
      correoPersonal: e.correoPersonal || "",
      direccion: String(e.direccion || "").toLocaleUpperCase("es"),
      idDepartamento: String(e.idDepartamento ?? e.departamento?.idDepartamento ?? ""),
      idDistrito: String(e.idDistrito ?? e.distrito?.idDistrito ?? "")
    });
    setErrorUbicacion("");
    setModal("personal");
  };

  const normalizarOpciones = (items, campoId, campoNombre) => {
    if(!Array.isArray(items)) {
      throw new Error("El servidor no devolvió un catálogo válido.");
    }
    return items
      .map(item => ({
        id: item.id ?? item[campoId],
        nombre: item.nombre ?? item[campoNombre] ?? item.descripcion
      }))
      .filter(item => item.id != null && item.nombre)
      .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
  };

  useEffect(() => {
    if(modal !== "personal") return;
    let cancelado = false;

    const cargarDepartamentos = async () => {
      setCargandoDepartamentos(true);
      setErrorUbicacion("");
      try {
        const data = await apiRequest("/api/v1/catalogos?nombres=departamentos");
        const opciones = normalizarOpciones(
          data?.departamentos,
          "idDepartamento",
          "nombreDepartamento"
        );
        if(!cancelado) setDepartamentos(opciones);
      } catch(error) {
        if(!cancelado) {
          setDepartamentos([]);
          setErrorUbicacion(error.message);
        }
      } finally {
        if(!cancelado) setCargandoDepartamentos(false);
      }
    };

    cargarDepartamentos();
    return () => { cancelado = true; };
  }, [modal]);

  useEffect(() => {
    if(modal !== "personal") return;
    if(!formPersonal.idDepartamento) {
      setDistritos([]);
      setCargandoDistritos(false);
      return;
    }

    let cancelado = false;
    const cargarDistritos = async () => {
      setCargandoDistritos(true);
      setErrorUbicacion("");
      try {
        const data = await apiRequest(
          `/api/v1/catalogos/distritos?padreId=${encodeURIComponent(formPersonal.idDepartamento)}`
        );
        const opciones = normalizarOpciones(
          Array.isArray(data) ? data : data?.distritos,
          "idDistrito",
          "nombreDistrito"
        );
        if(!cancelado) setDistritos(opciones);
      } catch(error) {
        if(!cancelado) {
          setDistritos([]);
          setErrorUbicacion(error.message);
        }
      } finally {
        if(!cancelado) setCargandoDistritos(false);
      }
    };

    cargarDistritos();
    return () => { cancelado = true; };
  }, [modal, formPersonal.idDepartamento]);

  const cargarTiposDocumento = async () => {
    setCargandoTipos(true);
    setErrorTipos("");
    try {
      const respuesta = await apiRequest("/api/v1/catalogos?nombres=tipos_documento");
      const tipos = respuesta?.tipos_documento ?? respuesta?.["tipos-documento"];
      if(!Array.isArray(tipos)) throw new Error("El catálogo de tipos de documento no está disponible.");
      const opciones = tipos.map(d => ({ id: d.id ?? d.idTipoDocumento, nombre: d.nombre ?? d.nombreTipoDocumento }))
        .filter(d => d.id != null && typeof d.nombre === "string" && d.nombre.trim());
      if(!opciones.length) throw new Error("No hay tipos de documento disponibles.");
      setTiposDocumento(opciones);
    } catch(error) {
      setTiposDocumento([]);
      setErrorTipos(error.message);
    } finally {
      setCargandoTipos(false);
    }
  };

  const abrirDocumento = () => {
    setFormDocumento({ documentoActual: empleado.numeroDocumento || "", idTipoDocumento: empleado.idTipoDocumento ?? empleado.tipoDocumento?.idTipoDocumento ?? "", numeroDocumento: "", motivo: "" });
    setModal("documento");
    cargarTiposDocumento();
  };
  useEffect(() => {
    if (modal !== "laboral" && modal !== "estado") return;
    let cancelado = false;
    const cargarCatalogos = async () => {
      setErrorCatalogosLaborales("");
      try {
        const data = await apiRequest("/api/v1/catalogos?nombres=areas,cargos,sedes,estados_empleado");
        if (cancelado) return;
        const normalizarCatalogo = (items, id, nombre) => (Array.isArray(items) ? items : []).map(x => ({
          id: x.id ?? x[id], nombre: x.nombre ?? x[nombre] ?? x.descripcion
        })).filter(x => x.id != null && x.nombre);
        setAreas(normalizarCatalogo(data?.areas, "idArea", "area"));
        setCargos(normalizarCatalogo(data?.cargos, "idCargo", "cargo"));
        setSedes(normalizarCatalogo(data?.sedes, "idSede", "nombreSede"));
        setEstadosLaborales(normalizarCatalogo(data?.estados_empleado, "idEstadoEmpleado", "estadoEmpleado"));
      } catch (error) {
        if (!cancelado) setErrorCatalogosLaborales(error.message);
      }
    };
    cargarCatalogos();
    return () => { cancelado = true; };
  }, [modal]);

  const cerrar = () => { if(!procesando) { setModal(null); setMotivo(""); } };

  const ejecutar = async (event) => {
    event.preventDefault();
    if(!empleado) return;
    setProcesando(true);
    try {
      if(modal === "personal") {
        if(!formPersonal.idDepartamento || !formPersonal.idDistrito) {
          throw new Error("Selecciona el departamento y el distrito de residencia.");
        }
        if(!distritos.some(d => String(d.id) === String(formPersonal.idDistrito))) {
          throw new Error("El distrito seleccionado no corresponde al departamento.");
        }
        if (!formPersonal.fechaNacimiento || formPersonal.fechaNacimiento >= fechaLocalISO()) {
          throw new Error("La fecha de nacimiento debe ser anterior a hoy.");
        }

        await apiRequest(
          `/api/v1/empleados/${idEmpleado}/datos-personales`,
          {
            method: "PUT",
            body: JSON.stringify({
              nombres: formPersonal.nombres.trim().toLocaleUpperCase("es"),
              apellidos: formPersonal.apellidos.trim().toLocaleUpperCase("es"),
              fechaNacimiento: formPersonal.fechaNacimiento,
              sexo: formPersonal.sexo,
              telefono: formPersonal.telefono.trim(),
              correoPersonal: formPersonal.correoPersonal.trim().toLowerCase(),
              direccion: formPersonal.direccion.trim().toLocaleUpperCase("es"),
              idDistrito: Number(formPersonal.idDistrito)
            })
          }
        );
        toast.success("Información personal actualizada.");
      } else if(modal === "documento") {
        if(cargandoTipos || errorTipos || !tiposDocumento.some(t => String(t.id) === String(formDocumento.idTipoDocumento))) {
          throw new Error("Selecciona un tipo de documento válido del catálogo.");
        }
        const errorValidacion = errorDocumento(formDocumento.idTipoDocumento, formDocumento.numeroDocumento);
        if(errorValidacion) throw new Error(errorValidacion);


        await apiRequest(
          `/api/v1/empleados/${idEmpleado}/documento`,
          {
            method: "PATCH",
            body: JSON.stringify({
              documentoActual: formDocumento.documentoActual,
              idTipoDocumento: Number(formDocumento.idTipoDocumento),
              numeroDocumento: formDocumento.numeroDocumento,
              motivo: formDocumento.motivo.trim()
            })
          }
        );
        toast.success("Documento actualizado y operación auditada.");
       } else if(modal === "laboral") {
        if (!formLaboral.idArea || !formLaboral.idCargo || !formLaboral.idSede || !formLaboral.fechaIngreso) throw new Error("Completa área, cargo, sede y fecha de ingreso.");
        if (formLaboral.fechaFin && formLaboral.fechaFin < formLaboral.fechaIngreso) throw new Error("La fecha de finalización no puede ser anterior al ingreso.");
        await apiRequest(`/api/v1/empleados/${idEmpleado}/datos-laborales`, { method: "PATCH", body: JSON.stringify({
          idArea: Number(formLaboral.idArea), idCargo: Number(formLaboral.idCargo), idSede: Number(formLaboral.idSede),
          fechaIngreso: formLaboral.fechaIngreso, fechaFin: formLaboral.fechaFin || null
        }) });
        toast.success("Datos laborales actualizados.");
      } else if(modal === "estado") {
        if (!estadoLaboralNuevo || motivo.trim().length < 5) throw new Error("Selecciona un estado y un motivo de al menos 5 caracteres.");
        await apiRequest(`/api/v1/empleados/${idEmpleado}/estado`, { method: "PATCH", body: JSON.stringify({
          idEstadoEmpleado: Number(estadoLaboralNuevo), motivo: motivo.trim()
        }) });
        toast.success("Estado laboral actualizado.");
      } else if(modal === "reset") {
        await apiRequest(`/api/v1/auth/admin/usuarios/${empleado.idUsuario}/reset-password`, { method: "POST" });
        toast.success("Contraseña restablecida. Comprueba el envío al correo personal.");
      } else if(modal === "bloquear" || modal === "desbloquear") {
        if(motivo.trim().length < 5) throw new Error("El motivo debe contener al menos 5 caracteres.");
        await apiRequest(`/api/v1/empleados/${idEmpleado}/usuario/${modal}`, { method: "PATCH", body: JSON.stringify({ motivo: motivo.trim() }) });
        toast.success(modal === "bloquear" ? "Cuenta bloqueada." : "Cuenta desbloqueada.");
      }
      setModal(null); setMotivo(""); await cargar();
    } catch(error) { toast.error(error.message); }
    finally { setProcesando(false); }
  };

  if(cargando && !empleado) return <div className="mx-auto max-w-6xl p-8 text-sm text-slate-500">Cargando información del empleado...</div>;
  if(!empleado) return <div className="mx-auto max-w-6xl p-8">
    <p className="text-slate-600">No se encontró la información del empleado.</p>
    <button onClick={() => navigate("/dashboard/directorio-empleados")} className="mt-4 text-sm font-semibold text-slate-900 underline">Volver al directorio</button>
  </div>;
  const e = empleado;
  const estadoUsuario = normalizar(e.estadoUsuario);
  const tabs = [{ id: "personal", titulo: "Información personal", icon: UserRound }, { id: "laboral", titulo: "Información laboral", icon: Building2 }, { id: "cuenta", titulo: "Cuenta institucional", icon: LockKeyhole }];

  return <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={() => navigate("/dashboard/directorio-empleados")} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={17} /> Volver al directorio</button>
      <button onClick={cargar} disabled={cargando} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:opacity-50">
        <RefreshCw size={16} className={cargando ? "animate-spin" : ""} /> Actualizar</button>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-2 bg-slate-900" />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <BriefcaseBusiness size={30} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Expediente del empleado</p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-900">{e.nombres} {e.apellidos}</h1>
          <p className="mt-1 text-sm text-slate-500">Código: {vacio(e.codigoEmpleado)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>Empleado: {vacio(e.estadoEmpleado)}</Badge>
            <Badge type={estadoUsuario === "activo" ? "success" : estadoUsuario === "bloqueado" ? "danger" : "neutral"}>Usuario: {vacio(e.estadoUsuario)}</Badge>
          </div>
        </div>
      </div>
    </div>

    <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">{tabs.map(({ id, titulo, icon: Icon }) => <button key={id} type="button" onClick={() => setSeccion(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${seccion === id ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"}`}>
      <Icon size={16} />{titulo}</button>)}</div>

    {seccion === "personal" && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Datos personales</h2>
          <p className="mt-1 text-sm text-slate-500">Información de identidad y contacto registrada.</p>
        </div>
        <button onClick={abrirPersonal} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          <Edit3 size={16} /> Editar información</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo titulo="Nombres" valor={e.nombres} icon={UserRound} />
        <Campo titulo="Apellidos" valor={e.apellidos} icon={UserRound} />
        <Campo titulo="Documento" valor={e.numeroDocumento} icon={FileBadge} />
        <Campo titulo="Fecha de nacimiento" valor={fecha(e.fechaNacimiento)} icon={CalendarDays} />
        <Campo titulo="Sexo" valor={e.sexo === "M" ? "Masculino" : e.sexo === "F" ? "Femenino" : e.sexo} />
        <Campo titulo="Teléfono" valor={e.telefono} icon={Phone} />
        <Campo titulo="Correo personal" valor={e.correoPersonal} icon={Mail} />
        <Campo titulo="Departamento" valor={e.nombreDepartamento ?? e.departamento?.nombreDepartamento} icon={MapPin} />
        <Campo titulo="Distrito" valor={e.nombreDistrito ?? e.distrito?.nombreDistrito ?? e.idDistrito} icon={MapPin} />
        <Campo titulo="Fecha de ingreso" valor={fecha(e.fechaIngreso)} icon={CalendarDays} />
        <div className="sm:col-span-2 lg:col-span-3">
          <Campo titulo="Dirección" valor={e.direccion} icon={MapPin} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div>
          <p className="text-sm font-semibold text-amber-900">Documento de identidad</p>
          <p className="mt-1 text-xs text-amber-800">La modificación requiere justificación y se registra en auditoría.</p>
        </div>
        <button onClick={abrirDocumento} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
          <FileBadge size={15} /> Cambiar documento</button>
      </div>
    </div>}

    {seccion === "laboral" && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold text-slate-900">Información laboral</h2>
          <p className="mt-1 text-sm text-slate-500">Asignación, sede y vigencia del empleado.</p></div>
        <button onClick={() => { setFormLaboral({ idArea: String(e.idArea ?? ""), idCargo: String(e.idCargo ?? ""), idSede: String(e.idSede ?? ""), fechaIngreso: fecha(e.fechaIngreso) === "No registrado" ? "" : fecha(e.fechaIngreso), fechaFin: e.fechaFin ? fecha(e.fechaFin) : "" }); setModal("laboral"); }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Edit3 size={16} /> Editar datos laborales</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo titulo="Código de empleado" valor={e.codigoEmpleado} icon={FileBadge} />
        <Campo titulo="Área" valor={e.nombreArea ?? e.area} icon={Building2} />
        <Campo titulo="Cargo" valor={e.nombreCargo ?? e.cargo} icon={BriefcaseBusiness} />
        <Campo titulo="Sede" valor={e.nombreSede} icon={MapPin} />
        <Campo titulo="Estado laboral" valor={e.estadoEmpleado} icon={CheckCircle2} />
        <Campo titulo="Fecha de ingreso" valor={fecha(e.fechaIngreso)} icon={CalendarDays} />
        <Campo titulo="Fecha de finalización" valor={fecha(e.fechaFin)} icon={CalendarDays} />
      </div>
      <div className="mt-5 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-800">Cambiar estado laboral</h3>
        <p className="mt-1 text-xs text-slate-500">Esta operación es independiente del bloqueo de la cuenta.</p>
        <button onClick={() => { setEstadoLaboralNuevo(String(e.idEstadoEmpleado ?? "")); setMotivo(""); setModal("estado"); }}
          className="mt-3 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Actualizar estado</button>
      </div>
    </div>}

    {seccion === "cuenta" && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">Cuenta institucional</h2>
        <p className="mt-1 text-sm text-slate-500">Acceso, seguridad y credenciales del empleado.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo titulo="Correo institucional" valor={e.correoInstitucional} icon={Mail} />
        <Campo titulo="Estado del usuario" valor={e.estadoUsuario} icon={CheckCircle2} />
        <Campo titulo="Identificador de usuario" valor={e.idUsuario} icon={LockKeyhole} />
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-800">Acciones administrativas</h3>
        <p className="mt-1 text-xs text-slate-500">Estas operaciones requieren permisos de administrador.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button disabled={!e.idUsuario} onClick={() => setModal("reset")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
            <LockKeyhole size={16} /> Restablecer contraseña</button>{estadoUsuario === "activo" && <button onClick={() => setModal("bloquear")} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              <ShieldAlert size={16} /> Bloquear cuenta</button>}{estadoUsuario === "bloqueado" && <button onClick={() => setModal("desbloquear")} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
                <CheckCircle2 size={16} /> Desbloquear cuenta</button>}</div>
      </div>
    </div>}

    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={ev => { if(ev.target === ev.currentTarget) cerrar(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-titulo" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-titulo" className="text-lg font-bold text-slate-900">{modal === "personal" ? "Editar datos personales" : modal === "documento" ? "Cambio de documento" : modal === "laboral" ? "Editar datos laborales" : modal === "estado" ? "Cambiar estado laboral" : modal === "reset" ? "Restablecer contraseña" : modal === "bloquear" ? "Bloquear cuenta" : "Desbloquear cuenta"}</h2>
            <p className="mt-1 text-sm text-slate-500">{e.nombres} {e.apellidos}</p>
          </div>
          <button type="button" onClick={cerrar} disabled={procesando} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={ejecutar} className="space-y-5">{modal === "personal" && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombres" mayusculas required value={formPersonal.nombres} onChange={v => setFormPersonal(p => ({ ...p, nombres: v }))} />
            <Input label="Apellidos" mayusculas required value={formPersonal.apellidos} onChange={v => setFormPersonal(p => ({ ...p, apellidos: v }))} />
            <Input
              label="Fecha de nacimiento"
              required
              type="date"
              max={fechaLocalISO()}
              value={formPersonal.fechaNacimiento}
              onChange={v => setFormPersonal(p => ({
                ...p,
                fechaNacimiento: v
              }))}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Sexo</span>
              <select required value={formPersonal.sexo} onChange={ev => setFormPersonal(p => ({ ...p, sexo: ev.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </label>
            <Input label="Teléfono" placeholder="7123-4567" value={formPersonal.telefono} onChange={v => setFormPersonal(p => ({ ...p, telefono: v }))} />
            <Input label="Correo personal" type="email" value={formPersonal.correoPersonal} onChange={v => setFormPersonal(p => ({ ...p, correoPersonal: v }))} />
            <div className="sm:col-span-2">
              <Input label="Dirección" mayusculas required value={formPersonal.direccion} onChange={v => setFormPersonal(p => ({ ...p, direccion: v }))} />
            </div>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Departamento *
              </span>
              <select
                required
                value={formPersonal.idDepartamento ?? ""}
                disabled={cargandoDepartamentos}
                onChange={event => setFormPersonal(p => ({
                  ...p,
                  idDepartamento: event.target.value,
                  idDistrito: ""
                }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 disabled:bg-slate-100"
              >
                <option value="">
                  {cargandoDepartamentos ? "Cargando departamentos..." : "Seleccione un departamento"}
                </option>
                {departamentos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Distrito *
              </span>
              <select
                required
                value={formPersonal.idDistrito ?? ""}
                disabled={!formPersonal.idDepartamento || cargandoDistritos}
                onChange={event => setFormPersonal(p => ({
                  ...p,
                  idDistrito: event.target.value
                }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 disabled:bg-slate-100"
              >
                <option value="">
                  {cargandoDistritos ? "Cargando distritos..." : "Seleccione un distrito"}
                </option>
                {distritos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-2">
            {errorUbicacion && (
              <p role="alert" className="text-xs text-rose-700">
                No se pudo cargar la ubicación: {errorUbicacion}. Cierra y vuelve a abrir el formulario para reintentar.
              </p>
            )}
            <p className="text-xs text-slate-500">
              Verifica que los datos personales y la ubicación de residencia sean correctos antes de guardar.
            </p>
          </div>
        </>}{modal === "laboral" && <>
          {errorCatalogosLaborales && <p role="alert" className="text-sm text-rose-700">{errorCatalogosLaborales}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {[["Área", "idArea", areas], ["Cargo", "idCargo", cargos], ["Sede", "idSede", sedes]].map(([label, campo, opciones]) =>
              <label key={campo} className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label} *</span>
                <select required value={formLaboral[campo] ?? ""} onChange={ev => setFormLaboral(p => ({ ...p, [campo]: ev.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                  <option value="">Seleccionar</option>{opciones.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select></label>)}
            <Input label="Fecha de ingreso" type="date" required value={formLaboral.fechaIngreso} onChange={v => setFormLaboral(p => ({ ...p, fechaIngreso: v }))} />
            <Input label="Fecha de finalización (opcional)" type="date" min={formLaboral.fechaIngreso} value={formLaboral.fechaFin} onChange={v => setFormLaboral(p => ({ ...p, fechaFin: v }))} />
          </div>
        </>}{modal === "estado" && <>
          {errorCatalogosLaborales && <p role="alert" className="text-sm text-rose-700">{errorCatalogosLaborales}</p>}
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Nuevo estado laboral *</span>
            <select required value={estadoLaboralNuevo} onChange={ev => setEstadoLaboralNuevo(ev.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              <option value="">Seleccionar</option>{estadosLaborales.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Motivo *</span>
            <textarea required minLength={5} maxLength={255} rows={3} value={motivo} onChange={ev => setMotivo(ev.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>
        </>}{modal === "documento" && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Documento actual" required value={formDocumento.documentoActual} onChange={v => setFormDocumento(p => ({ ...p, documentoActual: v }))} />
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Tipo de documento *</span>
              <select required disabled={cargandoTipos || !!errorTipos} value={formDocumento.idTipoDocumento} onChange={ev => setFormDocumento(p => ({ ...p, idTipoDocumento: ev.target.value, numeroDocumento: "" }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-100">
                <option value="">{cargandoTipos ? "Cargando documentos..." : "-- Seleccione --"}</option>{tiposDocumento.map(tipo => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}</select>{errorTipos && <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span role="alert" className="text-xs text-rose-600">{errorTipos}</span>
                  <button type="button" onClick={cargarTiposDocumento} className="text-xs font-semibold text-slate-900 underline">Reintentar</button>
                </div>}</label>
            <div className="sm:col-span-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">Nuevo número de documento *</span>
                <input required disabled={!formDocumento.idTipoDocumento || cargandoTipos || !!errorTipos} maxLength={longitudDocumento(formDocumento.idTipoDocumento)} placeholder={formDocumento.idTipoDocumento ? placeholderDocumento(formDocumento.idTipoDocumento) : "Selecciona el tipo de documento"} value={formDocumento.numeroDocumento} onChange={ev => setFormDocumento(p => ({ ...p, numeroDocumento: formatoDocumento(p.idTipoDocumento, ev.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-100" />
              </label>
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Justificación obligatoria (10–500 caracteres)</span>
            <textarea required minLength={10} maxLength={500} rows={3} value={formDocumento.motivo} onChange={ev => setFormDocumento(p => ({ ...p, motivo: ev.target.value }))} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400" placeholder="Explica la razón de la corrección..." />
          </label>
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Comprueba el documento original antes de confirmar. La operación quedará registrada en auditoría.</p>
        </>}{(modal === "bloquear" || modal === "desbloquear") && <>
          <p className="text-sm text-slate-600">{modal === "bloquear" ? "Se cerrarán las sesiones activas y se impedirá el acceso a la cuenta." : "La cuenta volverá al estado ACTIVO."}</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Motivo administrativo</span>
            <textarea required minLength={5} maxLength={500} rows={3} value={motivo} onChange={ev => setMotivo(ev.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" placeholder="Describe el motivo..." />
          </label>
        </>}{modal === "reset" && <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">Se generará una contraseña temporal para esta cuenta y se enviará al correo personal registrado, según el funcionamiento del backend. Las sesiones anteriores se cerrarán.</p>}<div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={cerrar} disabled={procesando} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancelar</button>
            <button type="submit" disabled={procesando || ((modal === "laboral" || modal === "estado") && !!errorCatalogosLaborales) || (modal === "personal" && (cargandoDepartamentos || cargandoDistritos || !!errorUbicacion)) || (modal === "documento" && (cargandoTipos || !!errorTipos || !formDocumento.idTipoDocumento))} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${modal === "bloquear" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}>
              <Save size={16} />{procesando ? "Guardando..." : "Actualizar"}</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}
