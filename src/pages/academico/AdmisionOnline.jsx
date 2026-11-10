import React, { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { admisionService, AdmisionError } from "../../services/admisionService";
import {
  esId,
  normalizarTexto,
  formatoDocumento,
  errorDocumento,
  formatoTelefono,
  calcularFechaMaxima,
  validarDatosPersonales,
  clasificarErrorOferta,
  validarSeleccion,
  validarTarjeta,
  errorIncierto,
} from "../../utils/admisionValidaciones";

const inputClass =
  "w-full h-[50px] bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all shadow-sm placeholder-slate-400 disabled:bg-slate-100/50 disabled:text-slate-400 disabled:cursor-not-allowed";
const labelClass =
  "block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 ml-1";

const PENDIENTE_KEY = "codice.admision.pendiente.v1";
function leerPendiente() {
  try { return JSON.parse(sessionStorage.getItem(PENDIENTE_KEY) || "null"); } 
  catch { return null; }
}
function guardarPendiente(value) {
  try {
    if (value) sessionStorage.setItem(PENDIENTE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(PENDIENTE_KEY);
  } catch { /* Ignorar error de storage */ }
}
const obtenerMensajeError = (error) => error?.data?.mensaje || error?.message || "Ocurrió un error inesperado.";

const datosIniciales = {
  idPersona: null,
  idTipoDocumento: "",
  numeroDocumento: "",
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  sexo: "",
  telefono: "",
  correoPersonal: "",
  idDepartamento: "",
  idDistrito: "",
  direccion: "",
};
const tarjetaVacia = { numero: "", titular: "", expiracion: "", cvv: "" };

function Aviso({ titulo, mensaje, error = false, children }) {
  return (
    <div role={error ? "alert" : "status"} className={`my-6 rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4 shadow-sm ${error ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${error ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <div>
        <p className="font-extrabold text-sm sm:text-base mb-1">{titulo}</p>
        {mensaje && <p className="text-xs sm:text-sm leading-relaxed opacity-90">{mensaje}</p>}
        {children}
      </div>
    </div>
  );
}

function SelectBuscador({ label, value, onChange, options = [], placeholder = "-- Seleccione --", disabled = false, required = false, error }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState(null);
  const trigger = useRef(null), popup = useRef(null), searchRef = useRef(null);
  const selected = options.find((x) => String(x.id) === String(value));
  const filtered = options.filter((x) => normalizarTexto(x.nombre).includes(normalizarTexto(search.trim())));
  
  const close = () => { setOpen(false); setSearch(""); };
  
  useEffect(() => {
    if (!open) return;
    const position = () => {
      if (!trigger.current) return;
      const r = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 12, above = r.top - 12;
      const up = below < 250 && above > below;
      const height = Math.max(80, Math.min(320, up ? above : below));
      setPos({
        position: "fixed",
        left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
        width: Math.min(r.width, window.innerWidth - 16),
        maxHeight: height,
        zIndex: 2000,
        ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      });
    };
    const outside = (e) => { if (!trigger.current?.contains(e.target) && !popup.current?.contains(e.target)) { setOpen(false); setSearch(""); } };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    document.addEventListener("pointerdown", outside);
    const timer = setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  useEffect(() => { if (disabled) { setOpen(false); setSearch(""); } }, [disabled]);

  return (
    <div>
      {label && <label htmlFor={id} className={labelClass}>{label} {required && <span className="text-red-500">*</span>}</label>}
      <button
        id={id} ref={trigger} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-invalid={!!error}
        onClick={() => { setOpen((v) => !v); setSearch(""); }}
        className={`${inputClass} flex items-center justify-between gap-3 text-left`}
      >
        <span className={`min-w-0 truncate ${selected ? "font-semibold" : ""}`}>{selected?.nombre || placeholder}</span>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {error && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</p>}
      
      {open && !disabled && pos && createPortal(
        <div id={`${id}-popup`} role="dialog" ref={popup} style={pos} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="shrink-0 p-2 border-b border-slate-100 bg-slate-50">
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full rounded-lg bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
          <div className="min-h-0 overflow-y-auto">
            {filtered.length ? filtered.map((item) => (
              <button
                key={item.id} type="button" onClick={() => { onChange(String(item.id)); close(); trigger.current?.focus(); }}
                className={`block w-full px-4 py-3 text-left text-[13px] transition-colors ${String(item.id) === String(value) ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-50 font-medium text-slate-700"}`}
              >
                {item.nombre}
              </button>
            )) : <p className="p-4 text-xs text-center text-slate-500 font-medium">Sin resultados</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

const StepLine = ({ percentage }) => (
  <div className="flex-1 flex items-center px-1 sm:px-2">
    <div className="h-[2px] sm:h-1 w-full bg-slate-200 rounded-full overflow-hidden">
      <div className="h-full bg-slate-900 transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
    </div>
  </div>
);

const StepPoint = ({ active, completed, label, stepNum }) => (
  <div className="flex flex-col items-center relative z-10 w-10 sm:w-16 group cursor-default">
    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm bg-white ${
      completed ? 'border-slate-900 bg-slate-900 text-white' : active ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-400'
    }`}>
      {completed ? <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <span className="font-extrabold text-xs sm:text-base">{stepNum}</span>}
    </div>
    <span className={`absolute top-10 sm:top-14 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
      completed || active ? 'text-slate-900' : 'text-slate-400'
    }`}>{label}</span>
  </div>
);

export default function AdmisionOnline() {
  const [paso, setPaso] = useState(1);
  const [personalData, setPersonalData] = useState(datosIniciales);
  const [erroresPaso1, setErroresPaso1] = useState({});
  const [catalogos, setCatalogos] = useState({ tiposDocumento: [], sedes: [], departamentos: [], carreras: [] });
  
  const [estadoCatalogos, setEstadoCatalogos] = useState("cargando");
  const [errorCatalogos, setErrorCatalogos] = useState("");
  const [reintentoCatalogos, setReintentoCatalogos] = useState(0);
  
  const [distritos, setDistritos] = useState([]);
  const [estadoDistritos, setEstadoDistritos] = useState("inicial");
  const [reintentoDistritos, setReintentoDistritos] = useState(0);
  
  const [validandoDocumento, setValidandoDocumento] = useState(false);
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [requiereCodigo, setRequiereCodigo] = useState(false);
  const [codigoCorreo, setCodigoCorreo] = useState("");
  const [tokenVerificacion, setTokenVerificacion] = useState(null);
  const [personaExistente, setPersonaExistente] = useState(false);
  const [correoEnmascarado, setCorreoEnmascarado] = useState("");
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  const [esperaCodigo, setEsperaCodigo] = useState(0);
  
  const [maxFechaNac, setMaxFechaNac] = useState(calcularFechaMaxima(18));
  
  const [sedeSeleccionada, setSedeSeleccionada] = useState("");
  const [carreraSeleccionada, setCarreraSeleccionada] = useState("");
  const [pensumVigente, setPensumVigente] = useState(null);
  const [ofertaAcademica, setOfertaAcademica] = useState([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState([]);
  const [estadoOferta, setEstadoOferta] = useState("inicial");
  const [mensajeOferta, setMensajeOferta] = useState("");
  const [reintentoOferta, setReintentoOferta] = useState(0);
  
  const [modalidadPago, setModalidadPago] = useState("EN_LINEA");
  const [matriculaGenerada, setMatriculaGenerada] = useState(null);
  const [cardData, setCardData] = useState(tarjetaVacia);
  const [erroresTarjeta, setErroresTarjeta] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmacionPago, setConfirmacionPago] = useState(null);
  const [boletaFinalizada, setBoletaFinalizada] = useState(false);
  const [errorOperacion, setErrorOperacion] = useState("");
  const [pagoIncierto, setPagoIncierto] = useState(false);
  const [boletaIncierta, setBoletaIncierta] = useState(false);
  const [reservaIncierta, setReservaIncierta] = useState(false);
  
  const [mostrarConfirmacionNpe, setMostrarConfirmacionNpe] = useState(false);
  
  const [pendienteAnterior] = useState(leerPendiente);
  
  const mainRef = useRef(null), busy = useRef(false), identityBusy = useRef(false), identityVersion = useRef(0), identityValid = useRef(""), mounted = useRef(true), pagoIntento = useRef(null), ofertaVersion = useRef(0);
  
  const cargandoOferta = estadoOferta === "cargando";
  const identidadOcupada = validandoDocumento || verificandoCodigo || reenviandoCodigo;
  const documentoActual = `${personalData.idTipoDocumento}:${personalData.numeroDocumento}`;
  const carrerasDisponibles = catalogos.carreras.filter((c) => !c.idSede || String(c.idSede) === String(sedeSeleccionada));
  
  const hayAdmisionesCerradas = estadoCatalogos === "lista" && catalogos.carreras.length === 0;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; identityVersion.current++; };
  }, []);

  useEffect(() => {
    mainRef.current?.querySelector("h2")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paso]);

  useEffect(() => {
    if ((!matriculaGenerada && !isProcessing) || confirmacionPago || boletaFinalizada) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [matriculaGenerada, isProcessing, confirmacionPago, boletaFinalizada]);

  useEffect(() => {
    if (esperaCodigo <= 0) return;
    const t = setTimeout(() => setEsperaCodigo((v) => Math.max(0, v - 1)), 1000);
    return () => clearTimeout(t);
  }, [esperaCodigo]);

  useEffect(() => {
    if (personalData.idTipoDocumento) {
       const edadMinima = String(personalData.idTipoDocumento) === "1" ? 18 : 15;
       setMaxFechaNac(calcularFechaMaxima(edadMinima));
       if (personalData.fechaNacimiento && personalData.fechaNacimiento > calcularFechaMaxima(edadMinima)) {
           setPersonalData(prev => ({ ...prev, fechaNacimiento: "" }));
       }
    }
  }, [personalData.idTipoDocumento]);

  const actualizarDato = (campo, valor) => {
    setPersonalData((prev) => ({ ...prev, [campo]: valor }));
    setErroresPaso1((prev) => ({ ...prev, [campo]: undefined }));
  };

  const limpiarVerificacion = () => {
    identityValid.current = "";
    setDocumentoVerificado(false);
    setRequiereCodigo(false);
    setCodigoCorreo("");
    setTokenVerificacion(null);
    setPersonaExistente(false);
    setCorreoEnmascarado("");
    setErroresPaso1({});
  };

  const cambiarDocumento = (campo, valor) => {
    if (identityBusy.current || busy.current) return;
    identityVersion.current++;
    limpiarVerificacion();
    setEsperaCodigo(0);
    setPersonalData((prev) => ({
      ...datosIniciales,
      idTipoDocumento: campo === "idTipoDocumento" ? valor : prev.idTipoDocumento,
      numeroDocumento: campo === "numeroDocumento" ? formatoDocumento(prev.idTipoDocumento || (campo === 'idTipoDocumento' ? valor : ''), valor) : "",
    }));
  };

  useEffect(() => {
    const ac = new AbortController();
    setEstadoCatalogos("cargando");
    setErrorCatalogos("");
    admisionService.getCatalogos({ signal: ac.signal }).then((data) => {
      if (ac.signal.aborted) return;
      const types = data.tipos_documento ?? data["tipos-documento"];
      if (![types, data.sedes, data.departamentos, data.carreras].every(Array.isArray)) throw new Error("El catálogo recibido está incompleto.");
      setCatalogos({ tiposDocumento: types, sedes: data.sedes, departamentos: data.departamentos, carreras: data.carreras });
      setEstadoCatalogos("lista");
    }).catch((e) => {
      if (!ac.signal.aborted) { setEstadoCatalogos("error"); setErrorCatalogos(obtenerMensajeError(e)); }
    });
    return () => ac.abort();
  }, [reintentoCatalogos]);

  useEffect(() => {
    const ac = new AbortController();
    setDistritos([]);
    if (!personalData.idDepartamento) {
      setEstadoDistritos("inicial");
      return () => ac.abort();
    }
    setEstadoDistritos("cargando");
    admisionService.getDistritos(personalData.idDepartamento, { signal: ac.signal }).then((data) => {
      if (!ac.signal.aborted) {
         setDistritos(Array.isArray(data) ? data : []);
         setEstadoDistritos("lista");
      }
    }).catch(() => {
      if (!ac.signal.aborted) setEstadoDistritos("error");
    });
    return () => ac.abort();
  }, [personalData.idDepartamento, reintentoDistritos]);

  const limpiarOferta = () => {
    ofertaVersion.current++;
    setPensumVigente(null);
    setOfertaAcademica([]);
    setGruposSeleccionados([]);
    setEstadoOferta("inicial");
    setMensajeOferta("");
  };
  const cambiarSede = (value) => { if (busy.current) return; limpiarOferta(); setCarreraSeleccionada(""); setSedeSeleccionada(value); };
  const cambiarCarrera = (value) => { if (busy.current) return; limpiarOferta(); setCarreraSeleccionada(value); };

  useEffect(() => {
    const ac = new AbortController(), version = ++ofertaVersion.current;
    setPensumVigente(null); setOfertaAcademica([]); setGruposSeleccionados([]); setMensajeOferta("");
    if (!sedeSeleccionada || !carreraSeleccionada) { setEstadoOferta("inicial"); return () => ac.abort(); }
    setEstadoOferta("cargando");
    const vigente = () => !ac.signal.aborted && version === ofertaVersion.current;
    (async () => {
      try {
        const pensum = await admisionService.getPensumVigente(carreraSeleccionada, { signal: ac.signal });
        if (!vigente()) return;
        if (!esId(pensum?.idPensum)) throw new Error("No se recibió un pensum válido para esta selección.");
        const oferta = await admisionService.getOfertaNuevoIngreso(pensum.idPensum, sedeSeleccionada, { signal: ac.signal });
        if (!vigente()) return;
        if (!Array.isArray(oferta)) throw new Error("La oferta recibida está incompleta.");
        setPensumVigente(pensum);
        setOfertaAcademica(oferta);
        setEstadoOferta(oferta.some((m) => m.gruposDisponibles.length) ? "lista" : "vacia");
      } catch (error) {
        if (vigente()) {
          setEstadoOferta(clasificarErrorOferta(error));
          setMensajeOferta(obtenerMensajeError(error));
          setPensumVigente(null); setOfertaAcademica([]); setGruposSeleccionados([]);
        }
      }
    })();
    return () => ac.abort();
  }, [sedeSeleccionada, carreraSeleccionada, reintentoOferta]);

  const verificarDocumento = async () => {
    if (identityBusy.current || documentoVerificado) return;
    const error = errorDocumento(personalData.idTipoDocumento, personalData.numeroDocumento);
    if (error) { setErroresPaso1({ numeroDocumento: error }); return; }
    
    identityBusy.current = true;
    setValidandoDocumento(true);
    setErroresPaso1({});
    const version = identityVersion.current;
    try {
      const r = await admisionService.verificarIdentidad(personalData.idTipoDocumento, personalData.numeroDocumento);
      if (!mounted.current || version !== identityVersion.current) return;
      if (r?.requiereLogin || r?.esEstudianteActivo) {
        limpiarVerificacion();
        setErroresPaso1({ numeroDocumento: r.mensaje || "Ya tienes credenciales. Inicia sesión desde el portal." });
        return;
      }
      if (r?.existePersona && r?.requiereVerificacionCorreo) {
        setPersonaExistente(true);
        setDocumentoVerificado(false);
        setCorreoEnmascarado(r.correoEnmascarado || "correo registrado");
        setRequiereCodigo(true);
        try {
          await admisionService.solicitarCodigoAdmision(personalData.idTipoDocumento, personalData.numeroDocumento);
          if (mounted.current) { setEsperaCodigo(60); toast.success("Código enviado al correo registrado."); }
        } catch (e) {
          if (mounted.current) toast.info(obtenerMensajeError(e));
        }
        return;
      }
      if (r?.existePersona) {
        setErroresPaso1({ numeroDocumento: r.mensaje || "No es posible continuar con este documento." });
        return;
      }
      limpiarVerificacion();
      identityValid.current = documentoActual;
      setDocumentoVerificado(true);
      toast.success("Documento disponible. Completa tus datos.");
    } catch (e) {
      if (mounted.current && version === identityVersion.current) setErroresPaso1({ numeroDocumento: obtenerMensajeError(e) });
    } finally {
      identityBusy.current = false;
      if (mounted.current) setValidandoDocumento(false);
    }
  };

  const reenviarCodigoAdmision = async () => {
    if (identityBusy.current || esperaCodigo > 0) return;
    identityBusy.current = true; setReenviandoCodigo(true);
    try {
      await admisionService.solicitarCodigoAdmision(personalData.idTipoDocumento, personalData.numeroDocumento);
      if (mounted.current) { setCodigoCorreo(""); setEsperaCodigo(60); toast.success("Código enviado. Revisa tu correo."); }
    } catch (e) {
      if (mounted.current) toast.error(obtenerMensajeError(e));
    } finally {
      identityBusy.current = false; if (mounted.current) setReenviandoCodigo(false);
    }
  };

  const confirmarCodigoAdmision = async () => {
    if (identityBusy.current) return;
    if (!/^\d{6}$/.test(codigoCorreo)) { toast.warning("Introduce los seis dígitos."); return; }
    identityBusy.current = true; setVerificandoCodigo(true);
    const version = identityVersion.current;
    try {
      const r = await admisionService.verificarCodigoAdmision(personalData.idTipoDocumento, personalData.numeroDocumento, codigoCorreo);
      if (!mounted.current || version !== identityVersion.current) return;
      const p = r?.persona;
      if (!p || !r.tokenVerificacion) throw new Error("El expediente recibido está incompleto.");
      setPersonalData((prev) => ({
        ...prev, idPersona: p.idPersona, nombres: p.nombres, apellidos: p.apellidos, fechaNacimiento: p.fechaNacimiento,
        sexo: p.sexo, telefono: formatoTelefono(p.telefono || ""), correoPersonal: p.correoPersonal, idDepartamento: String(p.idDepartamento),
        idDistrito: String(p.idDistrito), direccion: p.direccion || "",
      }));
      setTokenVerificacion(r.tokenVerificacion);
      identityValid.current = documentoActual;
      setDocumentoVerificado(true);
      setRequiereCodigo(false);
      setCodigoCorreo("");
      setErroresPaso1({});
      toast.success("Correo verificado correctamente.");
    } catch (e) {
      if (mounted.current) toast.error("No se pudo validar el código", { description: obtenerMensajeError(e) });
    } finally {
      identityBusy.current = false; if (mounted.current) setVerificandoCodigo(false);
    }
  };

  const validarPaso1 = () => {
    if (!documentoVerificado || identityValid.current !== documentoActual || (personaExistente && !tokenVerificacion)) {
      toast.warning("Verifica primero tu identidad.");
      return false;
    }
    const err = validarDatosPersonales(personalData, distritos, maxFechaNac);
    setErroresPaso1(err);
    if (Object.keys(err).length) {
      toast.warning("Revisa los datos personales.");
      setTimeout(() => mainRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return false;
    }
    return true;
  };
  
  const handleNextStep1 = () => { if (validarPaso1()) setPaso(2); };
  
  const toggleGrupo = (idGrupo, idMateria) => {
    if (busy.current || estadoOferta !== "lista") return;
    const m = ofertaAcademica.find((m) => String(m.idMateria) === String(idMateria));
    const g = m?.gruposDisponibles.find((g) => String(g.idGrupo) === String(idGrupo));
    if (!g || Number(g.cuposDisponibles) <= 0) return;
    const ids = m.gruposDisponibles.map((g) => g.idGrupo);
    setGruposSeleccionados((prev) =>
      prev.includes(idGrupo) ? prev.filter((id) => id !== idGrupo) : [...prev.filter((id) => !ids.includes(id)), idGrupo],
    );
  };
  
  const iniciarOperacion = () => { if (busy.current) return false; busy.current = true; setIsProcessing(true); setErrorOperacion(""); return true; };
  const terminarOperacion = () => { busy.current = false; if (mounted.current) setIsProcessing(false); };
  
  const handleCrearPreMatricula = async () => {
    if (busy.current || reservaIncierta || estadoOferta !== "lista") return;
    if (!validarPaso1()) { setPaso(1); return; }
    if (!esId(sedeSeleccionada) || !esId(carreraSeleccionada) || !esId(pensumVigente?.idPensum) || !validarSeleccion(ofertaAcademica, gruposSeleccionados)) {
      toast.warning("Actualiza la oferta y selecciona grupos disponibles."); return;
    }
    if (!iniciarOperacion()) return;
    guardarPendiente({ estado: "reserva_por_confirmar" });
    try {
      const r = await admisionService.procesarPreMatricula({
        idPersona: personaExistente ? Number(personalData.idPersona) : null,
        tokenVerificacion: personaExistente ? tokenVerificacion : null,
        idTipoDocumento: Number(personalData.idTipoDocumento),
        numeroDocumento: personalData.numeroDocumento.trim(),
        nombres: personalData.nombres.trim(),
        apellidos: personalData.apellidos.trim(),
        fechaNacimiento: personalData.fechaNacimiento,
        sexo: personalData.sexo,
        telefono: personalData.telefono.trim(),
        correoPersonal: personalData.correoPersonal.trim().toLowerCase(),
        idDistrito: Number(personalData.idDistrito),
        direccion: personalData.direccion.trim(),
        idSede: Number(sedeSeleccionada),
        idCarreraSede: Number(carreraSeleccionada),
        idPensum: Number(pensumVigente.idPensum),
        idGruposSeleccionados: gruposSeleccionados.map(Number),
      });
      if (!esId(r?.idMatricula) || typeof r?.totalAPagar !== "number" || !Number.isFinite(r.totalAPagar) || r.totalAPagar < 0) {
        const e = new Error("El servidor no devolvió una reserva completa. Solicita que revisen la operación antes de repetirla.");
        e.kind = "invalid-response"; throw e;
      }
      guardarPendiente({ estado: "pendiente", idMatricula: r.idMatricula });
      if (!mounted.current) return;
      setMatriculaGenerada({ idMatricula: r.idMatricula, estudiante: `${personalData.nombres} ${personalData.apellidos}`, documento: personalData.numeroDocumento, totalAPagar: r.totalAPagar, npe: r.npe, fechaVencimiento: r.fechaVencimiento });
      setBoletaFinalizada(false); setBoletaIncierta(false); setConfirmacionPago(null); setCardData(tarjetaVacia); setPagoIncierto(false); pagoIntento.current = null;
      setPaso(3);
    } catch (e) {
      if (!mounted.current) return;
      const uncertain = errorIncierto(e) && e.status !== 409;
      setReservaIncierta(uncertain);
      if (!uncertain) guardarPendiente(null);
      setErrorOperacion(obtenerMensajeError(e));
      if (e.data?.detalles && typeof e.data.detalles === "object") {
        const fields = Object.fromEntries(Object.entries(e.data.detalles).filter(([k]) => k in datosIniciales).map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)]));
        if (Object.keys(fields).length) { setErroresPaso1(fields); setPaso(1); }
      }
      if (clasificarErrorOferta(e) === "cerrada") { setEstadoOferta("cerrada"); setMensajeOferta(obtenerMensajeError(e)); setGruposSeleccionados([]); }
      else if (e.status === 409) setReintentoOferta((v) => v + 1);
      if ([401, 403].includes(e.status) && personaExistente) { limpiarVerificacion(); setPaso(1); }
    } finally { terminarOperacion(); }
  };

  const ejecutarPagoOnline = async () => {
    if (busy.current || !esId(matriculaGenerada?.idMatricula) || confirmacionPago) return;
    const errors = validarTarjeta(cardData);
    setErroresTarjeta(errors);
    if (Object.keys(errors).length) { toast.warning("Revisa los datos de tu tarjeta."); return; }
    if (!iniciarOperacion()) return;
    try {
      if (!pagoIntento.current) {
        if (!globalThis.crypto?.randomUUID) throw new AdmisionError("No se puede generar una clave segura de pago. Abre el portal mediante HTTPS.", { kind: "configuration" });
        pagoIntento.current = { key: crypto.randomUUID(), payload: { idMatricula: matriculaGenerada.idMatricula, cuotasAPagar: 1, numeroTarjeta: cardData.numero, titular: cardData.titular, fechaExpiracion: cardData.expiracion, cvv: cardData.cvv } };
      }
      guardarPendiente({ estado: "pago_por_confirmar", idMatricula: matriculaGenerada.idMatricula });
      const r = await admisionService.liquidarPagoOnline(pagoIntento.current.payload, pagoIntento.current.key);
      if (typeof r?.carnet !== "string" || !r.carnet.trim() || typeof r?.correoInstitucional !== "string" || !r.correoInstitucional.trim()) {
        const e = new Error("El pago respondió sin una confirmación completa. No generes otro intento; solicita revisión."); e.kind = "invalid-response"; throw e;
      }
      guardarPendiente(null);
      if (!mounted.current) return;
      setConfirmacionPago(r); setCardData(tarjetaVacia); pagoIntento.current = null; setPagoIncierto(false);
      toast.success("Matrícula confirmada por el servidor.");
    } catch (e) {
      if (mounted.current) {
        const uncertain = errorIncierto(e); setPagoIncierto(uncertain); setErrorOperacion(obtenerMensajeError(e));
        if (!uncertain) { pagoIntento.current = null; guardarPendiente({ estado: "pendiente", idMatricula: matriculaGenerada.idMatricula }); }
      }
    } finally { terminarOperacion(); }
  };

  const cancelarPreMatricula = async () => {
    if (pagoIncierto || !esId(matriculaGenerada?.idMatricula) || !iniciarOperacion()) return;
    try {
      await admisionService.cancelarPreMatricula(matriculaGenerada.idMatricula);
      guardarPendiente(null);
      if (!mounted.current) return;
      setMatriculaGenerada(null); setCardData(tarjetaVacia); pagoIntento.current = null; setBoletaFinalizada(false); setMostrarConfirmacionNpe(false); setReintentoOferta((v) => v + 1); setPaso(2);
      toast.info("Solicitud cancelada y cupos liberados.");
    } catch (e) { if (mounted.current) setErrorOperacion(obtenerMensajeError(e)); } finally { terminarOperacion(); }
  };

  const continuarPlanFinanciero = async () => {
    if (busy.current || boletaIncierta || !esId(matriculaGenerada?.idMatricula)) return;
    if (modalidadPago === "EN_LINEA") { setErrorOperacion(""); setPaso(4); return; }
    
    if (modalidadPago === "VENTANILLA") {
       if (matriculaGenerada.npe) { setPaso(4); return; }
       setMostrarConfirmacionNpe(true); 
       return;
    }
  };

  const generarNpeConfirmado = async () => {
    setMostrarConfirmacionNpe(false);
    if (!iniciarOperacion()) return;
    try {
      const r = await admisionService.generarBoletaNpe(matriculaGenerada.idMatricula);
      if (typeof r?.npe !== "string" || !r.npe.trim()) {
        const e = new Error("No se recibió una boleta válida. Consulta a la institución antes de solicitarla nuevamente."); e.kind = "invalid-response"; throw e;
      }
      if (!mounted.current) return;
      setMatriculaGenerada((prev) => ({ ...prev, npe: r.npe, fechaVencimiento: r.fechaVencimiento || prev.fechaVencimiento }));
      setPaso(4);
    } catch (e) {
      if (mounted.current) { setBoletaIncierta(errorIncierto(e)); setErrorOperacion(obtenerMensajeError(e)); }
    } finally { terminarOperacion(); }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="max-w-[1200px] mx-auto px-6 py-6 sm:py-10 flex flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">Codice</h1>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Portal de admisión</p>
        </div>
        <Link to="/" className="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl shadow-sm">
          Volver al inicio
        </Link>
      </header>
      
      <main ref={mainRef} className="max-w-[1000px] mx-auto px-4 sm:px-6 pb-20">
        {pendienteAnterior ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-12 shadow-sm">
            <h2 tabIndex={-1} className="text-2xl font-extrabold">Tienes una solicitud pendiente de revisión</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">La página se cerró o recargó durante un trámite. Para evitar solicitudes o pagos duplicados, revisa el correo registrado y contacta con la institución antes de iniciar otro.</p>
            {esId(pendienteAnterior.idMatricula) && <p className="mt-4 font-semibold">Referencia de matrícula: {pendienteAnterior.idMatricula}</p>}
            <Link to="/" className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-bold text-white">Volver al inicio</Link>
          </section>
        ) : (
          <>
            {hayAdmisionesCerradas ? (
              <div className="max-w-2xl mx-auto mb-10">
                <Aviso error titulo="Procesos de admisión inactivos" mensaje="En este momento la institución no cuenta con carreras habilitadas para nuevo ingreso. Por favor mantente pendiente de las próximas aperturas." />
              </div>
            ) : (
              <>
                {errorOperacion && (
                  <Aviso error titulo={pagoIncierto ? "El resultado del pago no está confirmado" : reservaIncierta ? "El resultado de la reserva no está confirmado" : "No se pudo completar la operación"} mensaje={errorOperacion}>
                    {(pagoIncierto || reservaIncierta) && <p className="mt-3 text-sm">No inicies otra solicitud. {pagoIncierto ? "Usa el botón de reconsulta para conocer el resultado del mismo intento. Si el problema persiste, contacta con la institución." : "Consulta con la institución si la reserva fue creada antes de repetirla."}</p>}
                  </Aviso>
                )}

                <div className="flex justify-between items-center max-w-2xl mx-auto mb-10 sm:mb-14 relative px-2 sm:px-0">
                  <StepPoint active={paso === 1} completed={paso > 1} label="Personal" stepNum="1" />
                  <StepLine percentage={paso > 1 ? 100 : 0} />
                  <StepPoint active={paso === 2} completed={paso > 2} label="Académico" stepNum="2" />
                  <StepLine percentage={paso > 2 ? 100 : 0} />
                  <StepPoint active={paso === 3} completed={paso > 3} label="Finanzas" stepNum="3" />
                  <StepLine percentage={paso > 3 ? 100 : 0} />
                  <StepPoint active={paso === 4} completed={false} label="Completado" stepNum="4" />
                </div>

                {paso === 1 && (
                  <section className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
                    <div className="mb-10 pb-6 border-b border-slate-100">
                      <h2 tabIndex={-1} className="text-2xl font-extrabold">Paso 1: Expediente civil</h2>
                      <p className="text-xs text-slate-500 mt-2">Verifica tu documento de identidad para comenzar.</p>
                    </div>
                    {estadoCatalogos === "cargando" && <Aviso titulo="Cargando opciones de admisión…" />}
                    {estadoCatalogos === "error" && (
                      <Aviso error titulo="No pudimos cargar las opciones" mensaje={errorCatalogos}>
                        <button type="button" onClick={() => setReintentoCatalogos((v) => v + 1)} className="mt-3 font-bold underline">Reintentar</button>
                      </Aviso>
                    )}
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end mb-8">
                      <div className="lg:col-span-4">
                        <SelectBuscador
                          label="Tipo de documento" required disabled={identidadOcupada || estadoCatalogos !== "lista"}
                          value={personalData.idTipoDocumento}
                          onChange={(val) => cambiarDocumento("idTipoDocumento", val)}
                          options={catalogos.tiposDocumento.map((d) => ({ id: d.id ?? d.idTipoDocumento, nombre: d.nombre ?? d.nombreTipoDocumento }))}
                        />
                      </div>
                      <div className="lg:col-span-5">
                        <label className={labelClass} htmlFor="admision-numeroDocumento">Número de documento *</label>
                        <input
                          id="admision-numeroDocumento" type="text"
                          aria-invalid={!!erroresPaso1.numeroDocumento}
                          disabled={!personalData.idTipoDocumento || identidadOcupada || estadoCatalogos !== "lista"}
                          value={personalData.numeroDocumento}
                          onChange={(e) => cambiarDocumento("numeroDocumento", e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verificarDocumento(); } }}
                          className={inputClass}
                          placeholder={String(personalData.idTipoDocumento) === "1" ? "00000000-0" : String(personalData.idTipoDocumento) === "3" ? "0000-000000-000-0" : "Ej. A123456789"}
                        />
                        {erroresPaso1.numeroDocumento && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresPaso1.numeroDocumento}</p>}
                      </div>
                      <div className="lg:col-span-3">
                        <button
                          type="button" onClick={verificarDocumento}
                          disabled={identidadOcupada || estadoCatalogos !== "lista" || documentoVerificado || !personalData.numeroDocumento}
                          className="w-full h-[50px] bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                        >
                          {validandoDocumento ? "Verificando..." : documentoVerificado ? "Verificado ✓" : "Verificar"}
                        </button>
                      </div>
                    </div>

                    {requiereCodigo && (
                      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <h3 className="text-base font-extrabold">Verificación de correo electrónico</h3>
                        <p className="text-xs text-slate-500 mt-2 mb-4">Encontramos tu expediente. Introduce el código enviado a tu correo registrado: <strong className="text-slate-900">{correoEnmascarado}</strong></p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text" inputMode="numeric" autoComplete="one-time-code" disabled={identidadOcupada} maxLength={6} value={codigoCorreo}
                            onChange={(e) => setCodigoCorreo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmarCodigoAdmision(); } }}
                            placeholder="000000" className={`${inputClass} text-center font-mono tracking-widest`}
                          />
                          <button
                            type="button" onClick={confirmarCodigoAdmision} disabled={identidadOcupada || codigoCorreo.length !== 6}
                            className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                          >
                            {verificandoCodigo ? "Validando..." : "Validar código"}
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-500">¿No recibiste el código?</span>
                          <button type="button" onClick={reenviarCodigoAdmision} disabled={identidadOcupada || esperaCodigo > 0} className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                            {reenviandoCodigo ? "Enviando..." : esperaCodigo > 0 ? `Reenviar en ${esperaCodigo}s` : "Reenviar código"}
                          </button>
                        </div>
                      </div>
                    )}

                    <fieldset disabled={!documentoVerificado || identidadOcupada || estadoCatalogos !== "lista"} className={`grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7 transition-opacity ${!documentoVerificado ? "opacity-40" : ""}`}>
                      <div>
                        <label className={labelClass} htmlFor="admision-nombres">Nombres *</label>
                        <input
                          id="admision-nombres" type="text" maxLength={100} disabled={personaExistente} value={personalData.nombres}
                          onChange={(e) => actualizarDato("nombres", e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, ""))}
                          className={inputClass} placeholder="EJ. JUAN CARLOS"
                        />
                        {erroresPaso1.nombres && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresPaso1.nombres}</p>}
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="admision-apellidos">Apellidos *</label>
                        <input
                          id="admision-apellidos" type="text" maxLength={100} disabled={personaExistente} value={personalData.apellidos}
                          onChange={(e) => actualizarDato("apellidos", e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, ""))}
                          className={inputClass} placeholder="EJ. PEREZ GARCIA"
                        />
                        {erroresPaso1.apellidos && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresPaso1.apellidos}</p>}
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="admision-fechaNacimiento">Fecha de nacimiento *</label>
                        <input
                          id="admision-fechaNacimiento" type="date" disabled={personaExistente} max={maxFechaNac} value={personalData.fechaNacimiento}
                          onChange={(e) => actualizarDato("fechaNacimiento", e.target.value)}
                          className={inputClass}
                        />
                        {erroresPaso1.fechaNacimiento && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresPaso1.fechaNacimiento}</p>}
                      </div>
                      <div>
                        <SelectBuscador
                          label="Sexo *" required disabled={personaExistente} value={personalData.sexo} error={erroresPaso1.sexo}
                          onChange={(val) => actualizarDato("sexo", val)}
                          options={[{ id: "F", nombre: "Femenino" }, { id: "M", nombre: "Masculino" }]}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="admision-telefono">Teléfono de contacto *</label>
                        <input
                          id="admision-telefono" type="tel" inputMode="tel" value={personalData.telefono} placeholder="7000-0000"
                          onChange={(e) => actualizarDato("telefono", formatoTelefono(e.target.value))}
                          className={inputClass}
                        />
                        {erroresPaso1.telefono && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresPaso1.telefono}</p>}
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="admision-correoPersonal">Correo electrónico *</label>
                        <input
                          id="admision-correoPersonal" type="email" disabled={personaExistente} value={personalData.correoPersonal} placeholder="juan@ejemplo.com"
                          onChange={(e) => actualizarDato("correoPersonal", e.target.value.toLowerCase().trim())}
                          className={inputClass}
                        />
                        {erroresPaso1.correoPersonal && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresPaso1.correoPersonal}</p>}
                        {personaExistente && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 ml-1">Fijo por expediente.</p>}
                      </div>
                      <div>
                        <SelectBuscador
                          label="Departamento *" required value={personalData.idDepartamento} error={erroresPaso1.idDepartamento}
                          onChange={(val) => setPersonalData((prev) => ({ ...prev, idDepartamento: val, idDistrito: "" }))}
                          options={catalogos.departamentos.map((d) => ({ id: d.id ?? d.idDepartamento, nombre: d.nombre ?? d.nombreDepartamento }))}
                        />
                      </div>
                      <div>
                        <SelectBuscador
                          label="Distrito / Municipio *" required disabled={!personalData.idDepartamento || estadoDistritos !== "lista"}
                          value={personalData.idDistrito} error={erroresPaso1.idDistrito}
                          onChange={(val) => actualizarDato("idDistrito", val)}
                          options={distritos.map((d) => ({ id: d.id ?? d.idDistrito, nombre: d.nombre ?? d.nombreDistrito }))}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass} htmlFor="admision-direccion">Dirección residencial completa *</label>
                        <input
                          id="admision-direccion" type="text" maxLength={255} value={personalData.direccion}
                          onChange={(e) => actualizarDato("direccion", e.target.value)}
                          className={inputClass}
                        />
                        {erroresPaso1.direccion && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresPaso1.direccion}</p>}
                      </div>
                    </fieldset>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        type="button" onClick={handleNextStep1} disabled={!documentoVerificado || identidadOcupada || estadoCatalogos !== "lista"}
                        className="w-full sm:w-auto h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                      >
                        Siguiente paso
                      </button>
                    </div>
                  </section>
                )}
                
                {paso === 2 && (
                  <section className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
                    <h2 tabIndex={-1} className="text-2xl font-extrabold mb-2">Paso 2: Carrera y materias</h2>
                    <p className="text-xs text-slate-500 mb-8">Selecciona sede, carrera y grupos disponibles.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                      <SelectBuscador
                        label="Sede universitaria" value={sedeSeleccionada} onChange={cambiarSede} disabled={isProcessing || reservaIncierta}
                        options={catalogos.sedes.map((s) => ({ id: s.id ?? s.idSede, nombre: s.nombre ?? s.nombreSede }))}
                      />
                      <SelectBuscador
                        label="Carrera profesional" value={carreraSeleccionada} onChange={cambiarCarrera} disabled={!sedeSeleccionada || isProcessing || reservaIncierta}
                        options={carrerasDisponibles.map((c) => ({ id: c.idCarreraSede ?? c.id, nombre: c.nombre ?? c.nombreCarrera }))}
                      />
                    </div>

                    <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 border-b pb-3 mb-6">Asignaturas disponibles</h3>
                    
                    {estadoOferta === "cerrada" ? (
                      <Aviso titulo="Admisiones de nuevo ingreso cerradas" mensaje={mensajeOferta}>
                        <button type="button" disabled={isProcessing} onClick={() => setReintentoOferta((v) => v + 1)} className="mt-3 font-bold underline text-sm">Volver a consultar disponibilidad</button>
                      </Aviso>
                    ) : estadoOferta === "error" ? (
                      <Aviso error titulo="No pudimos consultar la oferta académica" mensaje={mensajeOferta}>
                        <button type="button" disabled={isProcessing} onClick={() => setReintentoOferta((v) => v + 1)} className="mt-3 font-bold underline text-sm">Reintentar consulta</button>
                      </Aviso>
                    ) : cargandoOferta ? (
                      <p className="py-12 text-center text-sm text-slate-500 font-medium">Consultando oferta académica...</p>
                    ) : ofertaAcademica.length ? (
                      <div className="space-y-6">
                        {ofertaAcademica.map((materia) => (
                          <div key={materia.idMateria} className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200">
                            <h4 className="text-sm font-extrabold mb-4 text-slate-900">{materia.codigoMateria} {materia.nombreMateria}</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {materia.gruposDisponibles?.map((grupo) => {
                                const seleccionado = gruposSeleccionados.includes(grupo.idGrupo);
                                const sinCupo = grupo.cuposDisponibles <= 0;
                                return (
                                  <button
                                    type="button" key={grupo.idGrupo} disabled={sinCupo || isProcessing || reservaIncierta} aria-pressed={seleccionado}
                                    onClick={() => toggleGrupo(grupo.idGrupo, materia.idMateria)}
                                    className={`text-left p-5 rounded-xl border transition-all ${
                                      sinCupo ? "bg-slate-100 opacity-50 cursor-not-allowed" : seleccionado ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:border-slate-400"
                                    }`}
                                  >
                                    <div className="flex justify-between gap-3">
                                      <span className="text-sm font-extrabold">Grupo {grupo.codigoGrupo}</span>
                                      <span className="text-[10px] font-bold uppercase tracking-widest">{sinCupo ? "SIN CUPO" : `${grupo.cuposDisponibles} cupos`}</span>
                                    </div>
                                    <p className="text-xs mt-3 mb-4 opacity-80 font-medium">{grupo.nombreDocente}</p>
                                    {grupo.horarios?.map((h, i) => (
                                      <p key={i} className="text-[11px] font-bold tracking-wide mt-1 text-slate-500 flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${seleccionado ? 'bg-white' : 'bg-slate-300'}`}></span> {h.diaSemana} {h.horaInicio} - {h.horaFin}</p>
                                    ))}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-12 text-center text-sm text-slate-500 font-medium">{sedeSeleccionada && carreraSeleccionada ? "No hay grupos ofertados para esta carrera." : "Selecciona sede y carrera."}</p>
                    )}

                    <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row justify-between gap-4">
                      <button type="button" onClick={() => { setErrorOperacion(""); setPaso(1); }} disabled={isProcessing || reservaIncierta} className="px-8 h-[50px] text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                        Atrás
                      </button>
                      <button
                        type="button" onClick={handleCrearPreMatricula}
                        disabled={isProcessing || reservaIncierta || estadoOferta !== "lista" || !validarSeleccion(ofertaAcademica, gruposSeleccionados)}
                        className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                      >
                        {isProcessing ? "Procesando..." : "Generar plan financiero"}
                      </button>
                    </div>
                  </section>
                )}
                
                {paso === 3 && matriculaGenerada && (
                  <section className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
                    <h2 tabIndex={-1} className="text-2xl font-extrabold mb-2">Paso 3: Plan financiero</h2>
                    <p className="text-xs text-slate-500 mb-8">Importe informado por la institución para esta solicitud.</p>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mb-8">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Total a cancelar</p>
                      <p className="text-5xl font-black">${matriculaGenerada.totalAPagar.toFixed(2)}</p>
                    </div>
                    
                    <div className="bg-slate-100/50 rounded-xl p-4 mb-8 border border-slate-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <p className="text-xs text-slate-600 font-medium">Ref: <span className="font-bold text-slate-900">{matriculaGenerada.idMatricula}</span></p>
                       <p className="text-xs text-slate-600 font-medium">Vence: <span className="font-bold text-slate-900">{matriculaGenerada.fechaVencimiento || "Consulta con la institución"}</span></p>
                    </div>

                    {boletaIncierta && <Aviso error titulo="La boleta está pendiente de confirmación" mensaje="Revisa el correo registrado o consulta con la institución antes de solicitar otra boleta o pagar por otro medio." />}
                    
                    <h3 className={labelClass}>Método de pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                      {[['EN_LINEA', 'Pago en línea', 'Tarjeta de crédito o débito'], ['VENTANILLA', 'Pago en ventanilla', 'Boleta NPE para pagos presenciales']].map(([id, titulo, descripcion]) => (
                        <button
                          type="button" key={id} onClick={() => setModalidadPago(id)} disabled={isProcessing || pagoIncierto || boletaIncierta}
                          className={`p-5 sm:p-6 rounded-2xl border text-left transition-all ${modalidadPago === id ? "border-slate-900 ring-2 ring-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}
                        >
                          <h4 className="font-extrabold text-sm mb-1.5 text-slate-900">{titulo}</h4>
                          <p className="text-[11px] font-medium text-slate-500">{descripcion}</p>
                        </button>
                      ))}
                    </div>

                    {mostrarConfirmacionNpe && modalidadPago === "VENTANILLA" && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
                         <h4 className="font-extrabold text-sm mb-2 text-slate-900">¿Generar boleta de pago?</h4>
                         <p className="text-xs text-slate-600 mb-5">Al continuar, se bloquearán tus cupos y se emitirá una boleta física. Esta acción no se puede deshacer.</p>
                         <div className="flex gap-3">
                            <button type="button" onClick={() => setMostrarConfirmacionNpe(false)} className="px-6 h-[40px] text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100">Cancelar</button>
                            <button type="button" onClick={generarNpeConfirmado} disabled={isProcessing} className="px-6 h-[40px] text-xs font-bold text-white bg-slate-900 rounded-xl disabled:opacity-50 flex items-center gap-2">
                              {isProcessing ? "Generando..." : "Sí, generar boleta NPE"}
                            </button>
                         </div>
                      </div>
                    )}

                    <div className="mt-12 pt-6 border-t flex flex-col-reverse sm:flex-row justify-between gap-4">
                      <button type="button" onClick={cancelarPreMatricula} disabled={isProcessing || pagoIncierto} className="h-[50px] px-6 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">
                        Cancelar y liberar cupos
                      </button>
                      {(!mostrarConfirmacionNpe || modalidadPago === "EN_LINEA") && (
                        <button type="button" onClick={continuarPlanFinanciero} disabled={isProcessing || boletaIncierta} className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50">
                          {isProcessing ? "Procesando..." : "Continuar al pago"}
                        </button>
                      )}
                    </div>
                  </section>
                )}

                {paso === 4 && modalidadPago === "EN_LINEA" && !confirmacionPago && (
                  <section className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-12 border border-slate-200 shadow-sm">
                    <h2 tabIndex={-1} className="text-2xl font-extrabold text-center mb-2">Pago en línea</h2>
                    <p className="text-sm text-center text-slate-500 font-bold mb-8">Total: ${matriculaGenerada.totalAPagar.toFixed(2)}</p>
                    
                    <Aviso titulo="Transacción segura" mensaje="Tus datos están protegidos por cifrado de extremo a extremo. No almacenamos la información de tu tarjeta." />
                    
                    <fieldset disabled={isProcessing || pagoIncierto} className="space-y-5 mt-8">
                      <div>
                        <label className={labelClass} htmlFor="tarjeta-numero">Número de tarjeta</label>
                        <input
                          id="tarjeta-numero" aria-invalid={!!erroresTarjeta.numero} inputMode="numeric" value={cardData.numero} maxLength={23}
                          onChange={(e) => setCardData((prev) => ({ ...prev, numero: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim() }))}
                          className={inputClass} placeholder="0000 0000 0000 0000"
                        />
                        {erroresTarjeta.numero && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresTarjeta.numero}</p>}
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="tarjeta-titular">Titular de la tarjeta</label>
                        <input
                          id="tarjeta-titular" aria-invalid={!!erroresTarjeta.titular} maxLength={150} value={cardData.titular}
                          onChange={(e) => setCardData((prev) => ({ ...prev, titular: e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, "") }))}
                          className={inputClass} placeholder="EJ. JUAN PEREZ"
                        />
                        {erroresTarjeta.titular && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresTarjeta.titular}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className={labelClass} htmlFor="tarjeta-expiracion">Expiración</label>
                          <input
                            id="tarjeta-expiracion" aria-invalid={!!erroresTarjeta.expiracion} inputMode="numeric" value={cardData.expiracion} maxLength={5} placeholder="MM/AA"
                            onChange={(e) => {
                              const n = e.target.value.replace(/\D/g, "").slice(0, 4);
                              setCardData((prev) => ({ ...prev, expiracion: n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n }));
                            }}
                            className={inputClass}
                          />
                          {erroresTarjeta.expiracion && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresTarjeta.expiracion}</p>}
                        </div>
                        <div>
                          <label className={labelClass} htmlFor="tarjeta-cvv">CVV</label>
                          <input
                            id="tarjeta-cvv" aria-invalid={!!erroresTarjeta.cvv} inputMode="numeric" type="password" value={cardData.cvv} maxLength={4}
                            onChange={(e) => setCardData((prev) => ({ ...prev, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                            className={inputClass} placeholder="123"
                          />
                          {erroresTarjeta.cvv && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1.5 ml-1">{erroresTarjeta.cvv}</p>}
                        </div>
                      </div>
                    </fieldset>
                    
                    <div className="mt-10 flex flex-col sm:flex-row justify-between gap-4">
                      <button type="button" onClick={() => { setErrorOperacion(""); setPaso(3); }} disabled={isProcessing || pagoIncierto} className="px-6 h-[50px] text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Volver al plan</button>
                      <button type="button" onClick={ejecutarPagoOnline} disabled={isProcessing} className="px-10 h-[50px] bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50">
                        {isProcessing ? "Procesando..." : pagoIncierto ? "Reconsultar intento" : "Pagar ahora"}
                      </button>
                    </div>
                  </section>
                )}
                
                {paso === 4 && modalidadPago === "EN_LINEA" && confirmacionPago && (
                  <section className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center shadow-sm">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 tabIndex={-1} className="text-3xl font-extrabold mb-3">¡Matrícula exitosa!</h2>
                    <p className="text-sm text-slate-500 font-medium mb-10">La institución confirmó tu matrícula. Revisa las instrucciones enviadas al correo registrado.</p>
                    
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-left space-y-5 mb-10">
                      <div>
                        <p className={labelClass}>Carnet estudiantil</p>
                        <p className="font-black font-mono text-lg">{confirmacionPago.carnet}</p>
                      </div>
                      <div>
                        <p className={labelClass}>Correo institucional</p>
                        <p className="font-bold text-sm text-slate-900">{confirmacionPago.correoInstitucional}</p>
                      </div>
                      <div>
                        <p className={labelClass}>Contraseña provisional</p>
                        <p className="font-bold text-sm text-slate-600">Consulta las instrucciones en tu correo personal.</p>
                      </div>
                    </div>
                    <Link to="/" className="w-full h-[50px] flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold">Ir al portal de inicio de sesión</Link>
                  </section>
                )}

                {paso === 4 && modalidadPago === "VENTANILLA" && matriculaGenerada && (
                  <section className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center shadow-sm">
                    {!boletaFinalizada ? (
                      <>
                        <h2 tabIndex={-1} className="text-3xl font-extrabold mb-3">Boleta generada</h2>
                        <p className="text-sm text-slate-500 font-medium mb-8">Tu solicitud está pendiente de pago. Presenta el siguiente NPE en colecturía o tu banca en línea.</p>
                        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white mb-8 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Número de Pago Electrónico (NPE)</p>
                          <p className="text-xl sm:text-2xl font-black font-mono break-all leading-tight">{matriculaGenerada.npe}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8 text-sm font-medium">
                          <p>Importe: <span className="font-black">${matriculaGenerada.totalAPagar.toFixed(2)}</span></p>
                          <p>Vence: <span className="font-bold text-slate-600">{matriculaGenerada.fechaVencimiento || "Consulta con la institución"}</span></p>
                        </div>
                        <button type="button" onClick={() => { guardarPendiente(null); setBoletaFinalizada(true); }} className="w-full h-[50px] bg-slate-900 text-white rounded-xl font-bold">He guardado mi boleta</button>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 tabIndex={-1} className="text-3xl font-extrabold mb-3">Solicitud en espera de pago</h2>
                        <p className="text-sm text-slate-500 font-medium mb-10">La matrícula se completará de forma automática cuando la institución confirme el pago de tu NPE. Conserva el número y respeta la fecha de vencimiento.</p>
                        <Link to="/" className="w-full h-[50px] flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold">Terminar y volver al inicio</Link>
                      </>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}