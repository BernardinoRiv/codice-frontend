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

function ErrorCampo({ mensaje }) {
  if (!mensaje) return null;

  return (
    <p role="alert" className="mt-1.5 ml-1 text-xs font-medium text-red-600">
      {mensaje}
    </p>
  );
}

const claseCampo = (error) =>
  `${inputClass} ${
    error ? "border-red-500 focus:ring-red-500 bg-red-50/30" : ""
  }`;

const PENDIENTE_KEY = "codice.admision.pendiente.v1";
function leerPendiente() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDIENTE_KEY) || "null");
  } catch {
    return null;
  }
}
function guardarPendiente(value) {
  try {
    if (value) sessionStorage.setItem(PENDIENTE_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(PENDIENTE_KEY);
  } catch {
    /* Ignorar error de storage */
  }
}
const obtenerMensajeError = (error) =>
  error?.data?.mensaje || error?.message || "Ocurrió un error inesperado.";

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
    <div
      role={error ? "alert" : "status"}
      className={`my-6 rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-4 shadow-sm ${error ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-slate-50 text-slate-800"}`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${error ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-600"}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p className="font-extrabold text-sm sm:text-base mb-1">{titulo}</p>
        {mensaje && (
          <p className="text-xs sm:text-sm leading-relaxed opacity-90">
            {mensaje}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

function SelectBuscador({
  label,
  value,
  onChange,
  options = [],
  placeholder = "-- Seleccione --",
  disabled = false,
  required = false,
  error,
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState(null);
  const trigger = useRef(null),
    popup = useRef(null),
    searchRef = useRef(null);
  const selected = options.find((x) => String(x.id) === String(value));
  const filtered = options.filter((x) =>
    normalizarTexto(x.nombre).includes(normalizarTexto(search.trim())),
  );

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (!open) return;
    const position = () => {
      if (!trigger.current) return;
      const r = trigger.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - 12,
        above = r.top - 12;
      const up = below < 250 && above > below;
      const height = Math.max(80, Math.min(320, up ? above : below));
      setPos({
        position: "fixed",
        left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
        width: Math.min(r.width, window.innerWidth - 16),
        maxHeight: height,
        zIndex: 2000,
        ...(up
          ? { bottom: window.innerHeight - r.top + 6 }
          : { top: r.bottom + 6 }),
      });
    };
    const outside = (e) => {
      if (
        !trigger.current?.contains(e.target) &&
        !popup.current?.contains(e.target)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
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

  useEffect(() => {
    if (disabled) {
      setOpen(false);
      setSearch("");
    }
  }, [disabled]);

  return (
    <div>
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        id={id}
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={!!error}
        onClick={() => {
          setOpen((v) => !v);
          setSearch("");
        }}
        className={`${inputClass} flex items-center justify-between gap-3 text-left`}
      >
        <span className={`min-w-0 truncate ${selected ? "font-semibold" : ""}`}>
          {selected?.nombre || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
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
      {error && (
        <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">
          {error}
        </p>
      )}

      {open &&
        !disabled &&
        pos &&
        createPortal(
          <div
            id={`${id}-popup`}
            role="dialog"
            ref={popup}
            style={pos}
            className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="shrink-0 p-2 border-b border-slate-100 bg-slate-50">
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-lg bg-white border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="min-h-0 overflow-y-auto">
              {filtered.length ? (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(String(item.id));
                      close();
                      trigger.current?.focus();
                    }}
                    className={`block w-full px-4 py-3 text-left text-[13px] transition-colors ${String(item.id) === String(value) ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-50 font-medium text-slate-700"}`}
                  >
                    {item.nombre}
                  </button>
                ))
              ) : (
                <p className="p-4 text-xs text-center text-slate-500 font-medium">
                  Sin resultados
                </p>
              )}
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
      <div
        className="h-full bg-slate-900 transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  </div>
);

const StepPoint = ({ active, completed, label, stepNum }) => (
  <div className="flex flex-col items-center relative z-10 w-10 sm:w-16 group cursor-default">
    <div
      className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm bg-white ${
        completed
          ? "border-slate-900 bg-slate-900 text-white"
          : active
            ? "border-slate-900 text-slate-900"
            : "border-slate-200 text-slate-400"
      }`}
    >
      {completed ? (
        <svg
          className="w-4 h-4 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <span className="font-extrabold text-xs sm:text-base">{stepNum}</span>
      )}
    </div>
    <span
      className={`absolute top-10 sm:top-14 text-[8px] sm:text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
        completed || active ? "text-slate-900" : "text-slate-400"
      }`}
    >
      {label}
    </span>
  </div>
);

export default function AdmisionOnline() {
  const [paso, setPaso] = useState(1);
  const [personalData, setPersonalData] = useState(datosIniciales);
  const [erroresPaso1, setErroresPaso1] = useState({});
  const [catalogos, setCatalogos] = useState({
    tiposDocumento: [],
    sedes: [],
    departamentos: [],
    carreras: [],
  });

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

  const [tokenCorreoNuevo, setTokenCorreoNuevo] = useState(null);
  const [codigoCorreoNuevo, setCodigoCorreoNuevo] = useState("");
  const [enviandoCorreoNuevo, setEnviandoCorreoNuevo] = useState(false);
  const [verificandoCorreoNuevo, setVerificandoCorreoNuevo] = useState(false);
  const [esperaCorreoNuevo, setEsperaCorreoNuevo] = useState(0);
  const [correoNuevoVerificado, setCorreoNuevoVerificado] = useState("");

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
  const [planFinanciero, setPlanFinanciero] = useState(null);
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

  const [pendienteAnterior, setPendienteAnterior] = useState(leerPendiente);

  const actualizarPendiente = (valor) => {
    guardarPendiente(valor);
    setPendienteAnterior(valor);
  };

  const mainRef = useRef(null),
    busy = useRef(false),
    identityBusy = useRef(false),
    identityVersion = useRef(0),
    identityValid = useRef(""),
    mounted = useRef(true),
    pagoIntento = useRef(null),
    ofertaVersion = useRef(0);

  const correoNuevoVersion = useRef(0);
  const correoNuevoBusy = useRef(false);

  const cargandoOferta = estadoOferta === "cargando";
  const identidadOcupada =
    validandoDocumento || verificandoCodigo || reenviandoCodigo;
  const documentoActual = `${personalData.idTipoDocumento}:${personalData.numeroDocumento}`;
  const carrerasDisponibles = catalogos.carreras.filter(
    (c) => !c.idSede || String(c.idSede) === String(sedeSeleccionada),
  );

  const hayAdmisionesCerradas =
    estadoCatalogos === "lista" && catalogos.carreras.length === 0;

  useEffect(() => {
    if (estadoCatalogos !== "lista") return;

    const sedeSantaAna = catalogos.sedes.find((sede) =>
      normalizarTexto(sede.nombre ?? sede.nombreSede ?? "").includes(
        "santa ana",
      ),
    );

    if (sedeSantaAna) {
      const id = sedeSantaAna.id ?? sedeSantaAna.idSede;
      setSedeSeleccionada(String(id));
    }
  }, [catalogos.sedes, estadoCatalogos]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      identityVersion.current++;
    };
  }, []);

  useEffect(() => {
    mainRef.current?.querySelector("h2")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [paso]);

  useEffect(() => {
    if (
      (!matriculaGenerada && !isProcessing) ||
      confirmacionPago ||
      boletaFinalizada
    )
      return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [matriculaGenerada, isProcessing, confirmacionPago, boletaFinalizada]);

  useEffect(() => {
    if (esperaCodigo <= 0) return;
    const t = setTimeout(
      () => setEsperaCodigo((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [esperaCodigo]);

  useEffect(() => {
    if (esperaCorreoNuevo <= 0) return;

    const timer = setTimeout(() => {
      setEsperaCorreoNuevo((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [esperaCorreoNuevo]);

  useEffect(() => {
    if (personalData.idTipoDocumento) {
      const edadMinima = String(personalData.idTipoDocumento) === "1" ? 18 : 15;
      setMaxFechaNac(calcularFechaMaxima(edadMinima));
      if (
        personalData.fechaNacimiento &&
        personalData.fechaNacimiento > calcularFechaMaxima(edadMinima)
      ) {
        setPersonalData((prev) => ({ ...prev, fechaNacimiento: "" }));
      }
    }
  }, [personalData.idTipoDocumento]);

  const actualizarDato = (campo, valor) => {
    if (campo === "correoPersonal") {
      correoNuevoVersion.current++;
      setTokenCorreoNuevo(null);
      setCorreoNuevoVerificado("");
      setCodigoCorreoNuevo("");
      setEsperaCorreoNuevo(0);
    }

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
    correoNuevoVersion.current++;
    setTokenCorreoNuevo(null);
    setCorreoNuevoVerificado("");
    setCodigoCorreoNuevo("");
    setEsperaCorreoNuevo(0);
  };

  const cambiarDocumento = (campo, valor) => {
    if (identityBusy.current || busy.current) return;
    identityVersion.current++;
    limpiarVerificacion();
    setEsperaCodigo(0);
    setPersonalData((prev) => ({
      ...datosIniciales,
      idTipoDocumento:
        campo === "idTipoDocumento" ? valor : prev.idTipoDocumento,
      numeroDocumento:
        campo === "numeroDocumento"
          ? formatoDocumento(
              prev.idTipoDocumento ||
                (campo === "idTipoDocumento" ? valor : ""),
              valor,
            )
          : "",
    }));
  };

  useEffect(() => {
    const ac = new AbortController();
    setEstadoCatalogos("cargando");
    setErrorCatalogos("");
    admisionService
      .getCatalogos({ signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        const types = data.tipos_documento ?? data["tipos-documento"];
        if (
          ![types, data.sedes, data.departamentos, data.carreras].every(
            Array.isArray,
          )
        )
          throw new Error("El catálogo recibido está incompleto.");
        setCatalogos({
          tiposDocumento: types,
          sedes: data.sedes,
          departamentos: data.departamentos,
          carreras: data.carreras,
        });
        setEstadoCatalogos("lista");
      })
      .catch((e) => {
        if (!ac.signal.aborted) {
          setEstadoCatalogos("error");
          setErrorCatalogos(obtenerMensajeError(e));
        }
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
    admisionService
      .getDistritos(personalData.idDepartamento, { signal: ac.signal })
      .then((data) => {
        if (!ac.signal.aborted) {
          setDistritos(Array.isArray(data) ? data : []);
          setEstadoDistritos("lista");
        }
      })
      .catch(() => {
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
  const cambiarSede = (value) => {
    if (busy.current) return;
    limpiarOferta();
    setCarreraSeleccionada("");
    setSedeSeleccionada(value);
  };
  const cambiarCarrera = (value) => {
    if (busy.current) return;
    limpiarOferta();
    setCarreraSeleccionada(value);
  };

  useEffect(() => {
    const ac = new AbortController(),
      version = ++ofertaVersion.current;
    setPensumVigente(null);
    setOfertaAcademica([]);
    setGruposSeleccionados([]);
    setMensajeOferta("");
    if (!sedeSeleccionada || !carreraSeleccionada) {
      setEstadoOferta("inicial");
      return () => ac.abort();
    }
    setEstadoOferta("cargando");
    const vigente = () =>
      !ac.signal.aborted && version === ofertaVersion.current;
    (async () => {
      try {
        const pensum = await admisionService.getPensumVigente(
          carreraSeleccionada,
          { signal: ac.signal },
        );
        if (!vigente()) return;
        if (!esId(pensum?.idPensum))
          throw new Error(
            "No se recibió un pensum válido para esta selección.",
          );
        const oferta = await admisionService.getOfertaNuevoIngreso(
          pensum.idPensum,
          sedeSeleccionada,
          { signal: ac.signal },
        );
        if (!vigente()) return;
        if (!Array.isArray(oferta))
          throw new Error("La oferta recibida está incompleta.");
        setPensumVigente(pensum);
        setOfertaAcademica(oferta);
        setEstadoOferta(
          oferta.some((m) => m.gruposDisponibles.length) ? "lista" : "vacia",
        );
      } catch (error) {
        if (vigente()) {
          setEstadoOferta(clasificarErrorOferta(error));
          setMensajeOferta(obtenerMensajeError(error));
          setPensumVigente(null);
          setOfertaAcademica([]);
          setGruposSeleccionados([]);
        }
      }
    })();
    return () => ac.abort();
  }, [sedeSeleccionada, carreraSeleccionada, reintentoOferta]);

  const verificarDocumento = async () => {
    if (identityBusy.current || documentoVerificado) return;
    const error = errorDocumento(
      personalData.idTipoDocumento,
      personalData.numeroDocumento,
    );

    // EN LUGAR DE ACTUALIZAR EL ESTADO erroresPaso1, LOGRAMOS UN TOAST
    if (error) {
      toast.error("Documento incompleto o inválido", { description: error });
      return;
    }

    identityBusy.current = true;
    setValidandoDocumento(true);
    setErroresPaso1({});
    const version = identityVersion.current;
    try {
      const r = await admisionService.verificarIdentidad(
        personalData.idTipoDocumento,
        personalData.numeroDocumento,
      );
      if (!mounted.current || version !== identityVersion.current) return;
      if (r?.requiereLogin || r?.esEstudianteActivo) {
        limpiarVerificacion();
        toast.error("Atención", {
          description:
            r.mensaje ||
            "Ya tienes credenciales. Inicia sesión desde el portal.",
        });
        return;
      }
      if (r?.existePersona && r?.requiereVerificacionCorreo) {
        setPersonaExistente(true);
        setDocumentoVerificado(false);
        setCorreoEnmascarado(r.correoEnmascarado || "correo registrado");
        setRequiereCodigo(true);
        try {
          await admisionService.solicitarCodigoAdmision(
            personalData.idTipoDocumento,
            personalData.numeroDocumento,
          );
          if (mounted.current) {
            setEsperaCodigo(60);
            toast.success("Código enviado al correo registrado.");
          }
        } catch (e) {
          if (mounted.current) toast.info(obtenerMensajeError(e));
        }
        return;
      }
      if (r?.existePersona) {
        toast.error("Atención", {
          description:
            r.mensaje || "No es posible continuar con este documento.",
        });
        return;
      }
      limpiarVerificacion();
      identityValid.current = documentoActual;
      setDocumentoVerificado(true);
      toast.success("Documento disponible. Completa tus datos.");
    } catch (e) {
      if (mounted.current && version === identityVersion.current) {
        toast.error("Error de verificación", {
          description: obtenerMensajeError(e),
        });
      }
    } finally {
      identityBusy.current = false;
      if (mounted.current) setValidandoDocumento(false);
    }
  };

  const reenviarCodigoAdmision = async () => {
    if (identityBusy.current || esperaCodigo > 0) return;
    identityBusy.current = true;
    setReenviandoCodigo(true);
    try {
      await admisionService.solicitarCodigoAdmision(
        personalData.idTipoDocumento,
        personalData.numeroDocumento,
      );
      if (mounted.current) {
        setCodigoCorreo("");
        setEsperaCodigo(60);
        toast.success("Código enviado. Revisa tu correo.");
      }
    } catch (e) {
      if (mounted.current) toast.error(obtenerMensajeError(e));
    } finally {
      identityBusy.current = false;
      if (mounted.current) setReenviandoCodigo(false);
    }
  };

  const confirmarCodigoAdmision = async () => {
    if (identityBusy.current) return;
    if (!/^\d{6}$/.test(codigoCorreo)) {
      toast.warning("Introduce los seis dígitos.");
      return;
    }
    identityBusy.current = true;
    setVerificandoCodigo(true);
    const version = identityVersion.current;
    try {
      const r = await admisionService.verificarCodigoAdmision(
        personalData.idTipoDocumento,
        personalData.numeroDocumento,
        codigoCorreo,
      );
      if (!mounted.current || version !== identityVersion.current) return;
      const p = r?.persona;
      if (!p || !r.tokenVerificacion)
        throw new Error("El expediente recibido está incompleto.");
      setPersonalData((prev) => ({
        ...prev,
        idPersona: p.idPersona,
        nombres: p.nombres,
        apellidos: p.apellidos,
        fechaNacimiento: p.fechaNacimiento,
        sexo: p.sexo,
        telefono: formatoTelefono(p.telefono || ""),
        correoPersonal: p.correoPersonal,
        idDepartamento: String(p.idDepartamento),
        idDistrito: String(p.idDistrito),
        direccion: p.direccion || "",
      }));
      setTokenVerificacion(r.tokenVerificacion);
      identityValid.current = documentoActual;
      setDocumentoVerificado(true);
      setRequiereCodigo(false);
      setCodigoCorreo("");
      setErroresPaso1({});
      toast.success("Correo verificado correctamente.");
    } catch (e) {
      if (mounted.current)
        toast.error("No se pudo validar el código", {
          description: obtenerMensajeError(e),
        });
    } finally {
      identityBusy.current = false;
      if (mounted.current) setVerificandoCodigo(false);
    }
  };

  const solicitarCodigoCorreoNuevo = async () => {
    if (
      correoNuevoBusy.current ||
      personaExistente ||
      !documentoVerificado ||
      esperaCorreoNuevo > 0
    )
      return;

    const error = validarCorreo(personalData.correoPersonal);

    if (error) {
      setErroresPaso1((prev) => ({
        ...prev,
        correoPersonal: error,
      }));
      return;
    }

    const version = ++correoNuevoVersion.current;
    const correo = personalData.correoPersonal.trim().toLowerCase();

    correoNuevoBusy.current = true;
    setEnviandoCorreoNuevo(true);
    setTokenCorreoNuevo(null);
    setCorreoNuevoVerificado("");
    setCodigoCorreoNuevo("");

    try {
      await admisionService.solicitarCodigoCorreoNuevo(
        personalData.idTipoDocumento,
        personalData.numeroDocumento,
        correo,
        personalData.nombres,
      );

      if (!mounted.current || version !== correoNuevoVersion.current) return;

      setEsperaCorreoNuevo(60);

      toast.info("Solicitud de verificación recibida", {
        description:
          "Revisa tu correo y la carpeta de spam. Si no recibes el código, comprueba que el correo sea correcto o utiliza otra dirección personal que te pertenezca y no esté vinculada a otro expediente.",
        duration: 9000,
      });
    } catch (error) {
      if (mounted.current && version === correoNuevoVersion.current) {
        toast.error("No se pudo procesar la solicitud", {
          description: obtenerMensajeError(error),
        });
      }
    } finally {
      correoNuevoBusy.current = false;
      if (mounted.current) setEnviandoCorreoNuevo(false);
    }
  };

  const confirmarCodigoCorreoNuevo = async () => {
    if (correoNuevoBusy.current || personaExistente || !documentoVerificado)
      return;

    if (!/^\d{6}$/.test(codigoCorreoNuevo)) {
      toast.warning("Introduce los seis dígitos del código.");
      return;
    }

    const version = ++correoNuevoVersion.current;
    const correo = personalData.correoPersonal.trim().toLowerCase();

    correoNuevoBusy.current = true;
    setVerificandoCorreoNuevo(true);

    try {
      const respuesta = await admisionService.verificarCodigoCorreoNuevo(
        personalData.idTipoDocumento,
        personalData.numeroDocumento,
        correo,
        codigoCorreoNuevo,
      );

      if (!mounted.current || version !== correoNuevoVersion.current) return;

      if (
        typeof respuesta?.tokenCorreoNuevo !== "string" ||
        !respuesta.tokenCorreoNuevo.trim()
      ) {
        throw new Error("El servidor no devolvió una autorización válida.");
      }

      setTokenCorreoNuevo(respuesta.tokenCorreoNuevo);
      setCorreoNuevoVerificado(correo);
      setCodigoCorreoNuevo("");
      setErroresPaso1((prev) => ({
        ...prev,
        correoPersonal: undefined,
      }));

      toast.success("Correo electrónico verificado correctamente.");
    } catch (error) {
      if (mounted.current && version === correoNuevoVersion.current) {
        toast.error("No se pudo verificar el correo", {
          description: obtenerMensajeError(error),
        });
      }
    } finally {
      correoNuevoBusy.current = false;
      if (mounted.current) setVerificandoCorreoNuevo(false);
    }
  };

  const validarCorreo = (correo) => {
    const valor = String(correo || "").trim();

    if (!valor) {
      return "El correo electrónico es obligatorio.";
    }

    if (!/^[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+$/i.test(valor)) {
      return "Ingresa un correo electrónico válido. Ejemplo: usuario@gmail.com";
    }

    return "";
  };

  const validarPaso1 = () => {
    if (
      !documentoVerificado ||
      identityValid.current !== documentoActual ||
      (personaExistente && !tokenVerificacion)
    ) {
      toast.warning("Verifica primero tu identidad.");
      return false;
    }

    const err = validarDatosPersonales(personalData, distritos, maxFechaNac);

    const errorCorreo = validarCorreo(personalData.correoPersonal);

    if (errorCorreo) {
      err.correoPersonal = errorCorreo;
    } else if (
      !personaExistente &&
      (!tokenCorreoNuevo ||
        correoNuevoVerificado !==
          personalData.correoPersonal.trim().toLowerCase())
    ) {
      err.correoPersonal =
        "Debes verificar tu correo electrónico antes de continuar.";
    }

    setErroresPaso1(err);

    if (Object.keys(err).length > 0) {
      toast.warning("Corrige los campos señalados antes de continuar.");

      setTimeout(() => {
        const primerCampo = mainRef.current?.querySelector(
          '[aria-invalid="true"]',
        );

        primerCampo?.focus();
      }, 0);

      return false;
    }

    setErrorOperacion("");
    return true;
  };

  const handleNextStep1 = () => {
    if (validarPaso1()) setPaso(2);
  };

  const toggleGrupo = (idGrupo, idMateria) => {
    if (busy.current || estadoOferta !== "lista") return;
    const m = ofertaAcademica.find(
      (m) => String(m.idMateria) === String(idMateria),
    );
    const g = m?.gruposDisponibles.find(
      (g) => String(g.idGrupo) === String(idGrupo),
    );
    if (!g || Number(g.cuposDisponibles) <= 0) return;
    const ids = m.gruposDisponibles.map((g) => g.idGrupo);
    setGruposSeleccionados((prev) =>
      prev.includes(idGrupo)
        ? prev.filter((id) => id !== idGrupo)
        : [...prev.filter((id) => !ids.includes(id)), idGrupo],
    );
  };

  const iniciarOperacion = () => {
    if (busy.current) return false;
    busy.current = true;
    setIsProcessing(true);
    setErrorOperacion("");
    return true;
  };
  const terminarOperacion = () => {
    busy.current = false;
    if (mounted.current) setIsProcessing(false);
  };

  // ==========================================================
  // CONSULTAR PLAN FINANCIERO SIN GUARDAR REGISTROS
  // ==========================================================
  const handleConsultarPlanFinanciero = async () => {
    if (busy.current || estadoOferta !== "lista") return;

    if (!validarPaso1()) {
      setPaso(1);
      return;
    }

    if (
      !esId(sedeSeleccionada) ||
      !esId(carreraSeleccionada) ||
      !esId(pensumVigente?.idPensum) ||
      !validarSeleccion(ofertaAcademica, gruposSeleccionados)
    ) {
      toast.warning("Selecciona una carrera y grupos académicos válidos.");
      return;
    }

    if (!iniciarOperacion()) return;

    try {
      const respuesta = await admisionService.consultarPlanFinanciero(
        Number(carreraSeleccionada),
      );

      const campos = [
        "idCiclo",
        "montoMatricula",
        "montoCuota",
        "numeroCuotas",
        "montoExtraordinaria",
        "totalCiclo",
        "totalInicial",
      ];

      if (
        !campos.every(
          (campo) =>
            typeof respuesta?.[campo] === "number" &&
            Number.isFinite(respuesta[campo]) &&
            respuesta[campo] >= 0,
        ) ||
        !esId(respuesta.idCiclo) ||
        respuesta.numeroCuotas < 1
      ) {
        throw new Error("El servidor devolvió un plan financiero incompleto.");
      }

      if (!mounted.current) return;

      setPlanFinanciero(respuesta);
      setMatriculaGenerada(null);
      setMostrarConfirmacionNpe(false);
      setErrorOperacion("");
      setPaso(3);

      toast.success("Plan financiero calculado correctamente.");
    } catch (error) {
      if (!mounted.current) return;

      setPlanFinanciero(null);
      setErrorOperacion(obtenerMensajeError(error));

      toast.error("No se pudo calcular el plan financiero.", {
        description: obtenerMensajeError(error),
      });
    } finally {
      terminarOperacion();
    }
  };

  const handleCrearPreMatricula = async () => {
    if (busy.current || reservaIncierta || estadoOferta !== "lista") return;
    if (!validarPaso1()) {
      setPaso(1);
      return;
    }
    if (
      !esId(sedeSeleccionada) ||
      !esId(carreraSeleccionada) ||
      !esId(pensumVigente?.idPensum) ||
      !validarSeleccion(ofertaAcademica, gruposSeleccionados)
    ) {
      toast.warning("Actualiza la oferta y selecciona grupos disponibles.");
      return;
    }
    if (!iniciarOperacion()) return;
    guardarPendiente({ estado: "reserva_por_confirmar" });
    try {
      const r = await admisionService.procesarPreMatricula({
        idPersona: personaExistente ? Number(personalData.idPersona) : null,
        tokenVerificacion: personaExistente
          ? tokenVerificacion
          : tokenCorreoNuevo,
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
      if (
        !esId(r?.idMatricula) ||
        typeof r?.totalAPagar !== "number" ||
        !Number.isFinite(r.totalAPagar) ||
        r.totalAPagar < 0
      ) {
        const e = new Error(
          "El servidor no devolvió una reserva completa. Solicita que revisen la operación antes de repetirla.",
        );
        e.kind = "invalid-response";
        throw e;
      }
      guardarPendiente({ estado: "pendiente", idMatricula: r.idMatricula });
      if (!mounted.current) return;
      setMatriculaGenerada({
        idMatricula: r.idMatricula,
        estudiante: `${personalData.nombres} ${personalData.apellidos}`,
        documento: personalData.numeroDocumento,
        totalAPagar: r.totalAPagar,
        npe: r.npe,
        fechaVencimiento: r.fechaVencimiento,
      });
      setBoletaFinalizada(false);
      setBoletaIncierta(false);
      setConfirmacionPago(null);
      setCardData(tarjetaVacia);
      setPagoIncierto(false);
      pagoIntento.current = null;
      // La prematrícula ya existe.
      // No volver a crearla si falla el paso siguiente.
      setReservaIncierta(false);

      if (modalidadPago === "EN_LINEA") {
        setPaso(4);
      } else {
        setPaso(3);
        setMostrarConfirmacionNpe(true);
      }

      return r;
    } catch (e) {
      if (!mounted.current) return;
      const uncertain = errorIncierto(e) && e.status !== 409;
      setReservaIncierta(uncertain);
      if (!uncertain) guardarPendiente(null);
      setErrorOperacion(obtenerMensajeError(e));
      const mensajeError = obtenerMensajeError(e);

      if (
        /(ya existe una persona registrada con el correo personal|no es posible continuar con el correo proporcionado)/i.test(
          mensajeError,
        )
      ) {
        setErroresPaso1((prev) => ({
          ...prev,
          correoPersonal: mensajeError,
        }));

        setErrorOperacion("");
        setPaso(1);
        return;
      }
      if (e.data?.detalles && typeof e.data.detalles === "object") {
        const fields = Object.fromEntries(
          Object.entries(e.data.detalles)
            .filter(([k]) => k in datosIniciales)
            .map(([k, v]) => [k, Array.isArray(v) ? v.join(" ") : String(v)]),
        );
        if (Object.keys(fields).length) {
          setErroresPaso1(fields);
          setPaso(1);
        }
      }
      if (clasificarErrorOferta(e) === "cerrada") {
        setEstadoOferta("cerrada");
        setMensajeOferta(obtenerMensajeError(e));
        setGruposSeleccionados([]);
      } else if (e.status === 409) setReintentoOferta((v) => v + 1);
      if ([401, 403].includes(e.status) && personaExistente) {
        limpiarVerificacion();
        setPaso(1);
      }
    } finally {
      terminarOperacion();
    }
  };

  const ejecutarPagoOnline = async () => {
    if (
      busy.current ||
      !esId(matriculaGenerada?.idMatricula) ||
      confirmacionPago
    )
      return;
    const errors = validarTarjeta(cardData);
    setErroresTarjeta(errors);
    if (Object.keys(errors).length) {
      toast.warning("Revisa los datos de tu tarjeta.");
      return;
    }
    if (!iniciarOperacion()) return;
    try {
      if (!pagoIntento.current) {
        if (!globalThis.crypto?.randomUUID)
          throw new AdmisionError(
            "No se puede generar una clave segura de pago. Abre el portal mediante HTTPS.",
            { kind: "configuration" },
          );
        pagoIntento.current = {
          key: crypto.randomUUID(),
          payload: {
            idMatricula: matriculaGenerada.idMatricula,
            cuotasAPagar: 1,
            numeroTarjeta: cardData.numero,
            titular: cardData.titular,
            fechaExpiracion: cardData.expiracion,
            cvv: cardData.cvv,
          },
        };
      }
      guardarPendiente({
        estado: "pago_por_confirmar",
        idMatricula: matriculaGenerada.idMatricula,
      });
      const r = await admisionService.liquidarPagoOnline(
        pagoIntento.current.payload,
        pagoIntento.current.key,
      );
      if (
        typeof r?.carnet !== "string" ||
        !r.carnet.trim() ||
        typeof r?.correoInstitucional !== "string" ||
        !r.correoInstitucional.trim()
      ) {
        const e = new Error(
          "El pago respondió sin una confirmación completa. No generes otro intento; solicita revisión.",
        );
        e.kind = "invalid-response";
        throw e;
      }
      guardarPendiente(null);
      if (!mounted.current) return;
      setConfirmacionPago(r);
      setCardData(tarjetaVacia);
      pagoIntento.current = null;
      setPagoIncierto(false);
      toast.success("Matrícula confirmada exitosamente.");
    } catch (e) {
      if (mounted.current) {
        const uncertain = errorIncierto(e);
        setPagoIncierto(uncertain);
        setErrorOperacion(obtenerMensajeError(e));
        if (!uncertain) {
          pagoIntento.current = null;
          guardarPendiente({
            estado: "pendiente",
            idMatricula: matriculaGenerada.idMatricula,
          });
        }
      }
    } finally {
      terminarOperacion();
    }
  };

  const cancelarPreMatricula = async () => {
    if (
      pagoIncierto ||
      !esId(matriculaGenerada?.idMatricula) ||
      !iniciarOperacion()
    )
      return;
    try {
      await admisionService.cancelarPreMatricula(matriculaGenerada.idMatricula);
      guardarPendiente(null);
      if (!mounted.current) return;
      setMatriculaGenerada(null);
      setCardData(tarjetaVacia);
      pagoIntento.current = null;
      setBoletaFinalizada(false);
      setMostrarConfirmacionNpe(false);
      setReintentoOferta((v) => v + 1);
      setPaso(2);
      toast.info("Solicitud cancelada y cupos liberados.");
    } catch (e) {
      if (mounted.current) setErrorOperacion(obtenerMensajeError(e));
    } finally {
      terminarOperacion();
    }
  };

  const continuarPlanFinanciero = async () => {
    if (busy.current || !planFinanciero || reservaIncierta || boletaIncierta)
      return;

    setErrorOperacion("");

    if (modalidadPago === "VENTANILLA") {
      setMostrarConfirmacionNpe(true);
      return;
    }

    if (modalidadPago === "EN_LINEA") {
      if (esId(matriculaGenerada?.idMatricula)) {
        setPaso(4);
        return;
      }

      await handleCrearPreMatricula();
    }
  };

  const generarNpeConfirmado = async () => {
    if (busy.current || reservaIncierta || boletaIncierta) return;

    const token = personaExistente ? tokenVerificacion : tokenCorreoNuevo;

    if (!token) {
      toast.error("Debes verificar tu correo antes de continuar.");
      return;
    }

    setErrorOperacion("");

    let idMatricula = matriculaGenerada?.idMatricula;

    if (!esId(idMatricula)) {
      const reserva = await handleCrearPreMatricula();

      if (!esId(reserva?.idMatricula)) {
        return;
      }

      idMatricula = reserva.idMatricula;
    }

    if (!iniciarOperacion()) return;

    try {
      const respuesta = await admisionService.generarBoletaNpe(
        idMatricula,
        token,
      );

      if (typeof respuesta?.npe !== "string" || !respuesta.npe.trim()) {
        const error = new Error(
          "No se recibió una confirmación completa del NPE. Consulta el estado antes de repetir la operación.",
        );
        error.kind = "invalid-response";
        throw error;
      }

      if (!mounted.current) return;

      setMatriculaGenerada((prev) => ({
        ...prev,
        idMatricula,
        npe: respuesta.npe,
        fechaVencimiento: respuesta.fechaVencimiento || prev?.fechaVencimiento,
      }));

      setBoletaIncierta(false);
      setMostrarConfirmacionNpe(false);
      setPaso(4);

      toast.success("Boleta NPE generada correctamente.");
    } catch (error) {
      if (!mounted.current) return;

      setBoletaIncierta(errorIncierto(error));
      setErrorOperacion(obtenerMensajeError(error));
    } finally {
      terminarOperacion();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="max-w-[1200px] mx-auto px-6 py-6 sm:py-10 flex flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-none">
            Codice
          </h1>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Portal de admisión
          </p>
        </div>
        <Link
          to="/"
          className="text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl shadow-sm"
        >
          Volver al inicio
        </Link>
      </header>

      <main ref={mainRef} className="max-w-[1000px] mx-auto px-4 sm:px-6 pb-20">
        {pendienteAnterior ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-12 shadow-sm">
            <h2 tabIndex={-1} className="text-2xl font-extrabold">
              Tienes una solicitud pendiente de revisión
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              La página se cerró o recargó durante un trámite. Para evitar
              solicitudes o pagos duplicados, revisa el correo registrado y
              contacta con la institución antes de iniciar otro.
            </p>
            {esId(pendienteAnterior.idMatricula) && (
              <p className="mt-4 font-semibold">
                Referencia de matrícula: {pendienteAnterior.idMatricula}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                actualizarPendiente(null);
                window.location.reload();
              }}
              className="mt-6 mr-3 inline-block rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-900"
            >
              Iniciar nuevo registro
            </button>

            <button
              type="button"
              onClick={() => {
                actualizarPendiente(null);
                window.location.href = "/";
              }}
              className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-bold text-white"
            >
              Volver al inicio
            </button>
          </section>
        ) : (
          <>
            {hayAdmisionesCerradas ? (
              <div className="max-w-2xl mx-auto mb-10">
                <Aviso
                  error
                  titulo="Procesos de admisión inactivos"
                  mensaje="En este momento la institución no cuenta con carreras habilitadas para nuevo ingreso. Por favor mantente pendiente de las próximas aperturas."
                />
              </div>
            ) : (
              <>
                {errorOperacion && (
                  <Aviso
                    error
                    titulo={
                      pagoIncierto
                        ? "El resultado del pago no está confirmado"
                        : reservaIncierta
                          ? "El resultado de la reserva no está confirmado"
                          : "No se pudo completar la operación"
                    }
                    mensaje={errorOperacion}
                  >
                    {(pagoIncierto || reservaIncierta) && (
                      <p className="mt-3 text-sm">
                        No inicies otra solicitud.{" "}
                        {pagoIncierto
                          ? "Usa el botón de reconsulta para conocer el resultado del mismo intento. Si el problema persiste, contacta con la institución."
                          : "Consulta con la institución si la reserva fue creada antes de repetirla."}
                      </p>
                    )}
                  </Aviso>
                )}

                <div className="flex justify-between items-center max-w-2xl mx-auto mb-10 sm:mb-14 relative px-2 sm:px-0">
                  <StepPoint
                    active={paso === 1}
                    completed={paso > 1}
                    label="Personal"
                    stepNum="1"
                  />
                  <StepLine percentage={paso > 1 ? 100 : 0} />
                  <StepPoint
                    active={paso === 2}
                    completed={paso > 2}
                    label="Académico"
                    stepNum="2"
                  />
                  <StepLine percentage={paso > 2 ? 100 : 0} />
                  <StepPoint
                    active={paso === 3}
                    completed={paso > 3}
                    label="Finanzas"
                    stepNum="3"
                  />
                  <StepLine percentage={paso > 3 ? 100 : 0} />
                  <StepPoint
                    active={paso === 4}
                    completed={false}
                    label="Completado"
                    stepNum="4"
                  />
                </div>

                {paso === 1 && (
                  <section className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
                    <div className="mb-10 pb-6 border-b border-slate-100">
                      <h2 tabIndex={-1} className="text-2xl font-extrabold">
                        Paso 1: Expediente civil
                      </h2>
                      <p className="text-xs text-slate-500 mt-2">
                        Verifica tu documento de identidad para comenzar.
                      </p>
                    </div>
                    {estadoCatalogos === "cargando" && (
                      <Aviso titulo="Cargando opciones de admisión…" />
                    )}
                    {estadoCatalogos === "error" && (
                      <Aviso
                        error
                        titulo="No pudimos cargar las opciones"
                        mensaje={errorCatalogos}
                      >
                        <button
                          type="button"
                          onClick={() => setReintentoCatalogos((v) => v + 1)}
                          className="mt-3 font-bold underline"
                        >
                          Reintentar
                        </button>
                      </Aviso>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end mb-8">
                      <div className="lg:col-span-4">
                        <SelectBuscador
                          label="Tipo de documento"
                          required
                          disabled={
                            identidadOcupada || estadoCatalogos !== "lista"
                          }
                          value={personalData.idTipoDocumento}
                          onChange={(val) =>
                            cambiarDocumento("idTipoDocumento", val)
                          }
                          options={catalogos.tiposDocumento.map((d) => ({
                            id: d.id ?? d.idTipoDocumento,
                            nombre: d.nombre ?? d.nombreTipoDocumento,
                          }))}
                        />
                      </div>
                      <div className="lg:col-span-5">
                        <label
                          className={labelClass}
                          htmlFor="admision-numeroDocumento"
                        >
                          Número de documento *
                        </label>
                        <input
                          id="admision-numeroDocumento"
                          type="text"
                          maxLength={
                            String(personalData.idTipoDocumento) === "1"
                              ? 10
                              : String(personalData.idTipoDocumento) === "3"
                                ? 17
                                : 9
                          }
                          aria-invalid={!!erroresPaso1.numeroDocumento}
                          disabled={
                            !personalData.idTipoDocumento ||
                            identidadOcupada ||
                            estadoCatalogos !== "lista"
                          }
                          value={personalData.numeroDocumento}
                          onChange={(e) =>
                            cambiarDocumento("numeroDocumento", e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              verificarDocumento();
                            }
                          }}
                          className={claseCampo(erroresPaso1.numeroDocumento)}
                          placeholder={
                            String(personalData.idTipoDocumento) === "1"
                              ? "00000000-0"
                              : String(personalData.idTipoDocumento) === "3"
                                ? "0000-000000-000-0"
                                : "A12345678"
                          }
                        />
                        <ErrorCampo mensaje={erroresPaso1.numeroDocumento} />
                      </div>
                      <div className="lg:col-span-3">
                        <button
                          type="button"
                          onClick={verificarDocumento}
                          disabled={
                            identidadOcupada ||
                            estadoCatalogos !== "lista" ||
                            documentoVerificado ||
                            !personalData.numeroDocumento
                          }
                          className="w-full h-[50px] bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                        >
                          {validandoDocumento
                            ? "Verificando..."
                            : documentoVerificado
                              ? "Verificado ✓"
                              : "Verificar"}
                        </button>
                      </div>
                    </div>

                    {requiereCodigo && (
                      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200">
                        <h3 className="text-base font-extrabold">
                          Verificación de correo electrónico
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 mb-4">
                          Encontramos tu expediente. Introduce el código enviado
                          a tu correo registrado:{" "}
                          <strong className="text-slate-900">
                            {correoEnmascarado}
                          </strong>
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            disabled={identidadOcupada}
                            maxLength={6}
                            value={codigoCorreo}
                            onChange={(e) =>
                              setCodigoCorreo(
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                confirmarCodigoAdmision();
                              }
                            }}
                            placeholder="000000"
                            className={`${inputClass} text-center font-mono tracking-widest`}
                          />
                          <button
                            type="button"
                            onClick={confirmarCodigoAdmision}
                            disabled={
                              identidadOcupada || codigoCorreo.length !== 6
                            }
                            className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                          >
                            {verificandoCodigo
                              ? "Validando..."
                              : "Validar código"}
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="text-sm text-slate-500">
                            ¿No recibiste el código?
                          </span>
                          <button
                            type="button"
                            onClick={reenviarCodigoAdmision}
                            disabled={identidadOcupada || esperaCodigo > 0}
                            className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {reenviandoCodigo
                              ? "Enviando..."
                              : esperaCodigo > 0
                                ? `Reenviar en ${esperaCodigo}s`
                                : "Reenviar código"}
                          </button>
                        </div>
                      </div>
                    )}

                    <fieldset
                      disabled={
                        !documentoVerificado ||
                        identidadOcupada ||
                        estadoCatalogos !== "lista"
                      }
                      className={`grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-7 transition-opacity ${!documentoVerificado ? "opacity-40" : ""}`}
                    >
                      <div>
                        <label
                          className={labelClass}
                          htmlFor="admision-nombres"
                        >
                          Nombres *
                        </label>
                        <input
                          id="admision-nombres"
                          type="text"
                          maxLength={100}
                          disabled={personaExistente}
                          value={personalData.nombres}
                          onChange={(e) =>
                            actualizarDato(
                              "nombres",
                              e.target.value
                                .toUpperCase()
                                .replace(/[^A-ZÁÉÍÓÚÑ ]/g, ""),
                            )
                          }
                          aria-invalid={!!erroresPaso1.nombres}
                          className={claseCampo(erroresPaso1.nombres)}
                          placeholder="EJ. JUAN CARLOS"
                        />
                        <ErrorCampo mensaje={erroresPaso1.nombres} />
                      </div>
                      <div>
                        <label
                          className={labelClass}
                          htmlFor="admision-apellidos"
                        >
                          Apellidos *
                        </label>
                        <input
                          id="admision-apellidos"
                          type="text"
                          maxLength={100}
                          disabled={personaExistente}
                          value={personalData.apellidos}
                          onChange={(e) =>
                            actualizarDato(
                              "apellidos",
                              e.target.value
                                .toUpperCase()
                                .replace(/[^A-ZÁÉÍÓÚÑ ]/g, ""),
                            )
                          }
                          aria-invalid={!!erroresPaso1.apellidos}
                          className={claseCampo(erroresPaso1.apellidos)}
                          placeholder="EJ. PEREZ GARCIA"
                        />
                        <ErrorCampo mensaje={erroresPaso1.apellidos} />
                      </div>
                      <div>
                        <label
                          className={labelClass}
                          htmlFor="admision-fechaNacimiento"
                        >
                          Fecha de nacimiento *
                        </label>
                        <input
                          id="admision-fechaNacimiento"
                          type="date"
                          disabled={personaExistente}
                          max={maxFechaNac}
                          value={personalData.fechaNacimiento}
                          onChange={(e) =>
                            actualizarDato("fechaNacimiento", e.target.value)
                          }
                          aria-invalid={!!erroresPaso1.fechaNacimiento}
                          className={claseCampo(erroresPaso1.fechaNacimiento)}
                        />
                        <ErrorCampo mensaje={erroresPaso1.fechaNacimiento} />
                      </div>
                      <div>
                        <SelectBuscador
                          label="Sexo *"
                          required
                          disabled={personaExistente}
                          value={personalData.sexo}
                          error={erroresPaso1.sexo}
                          onChange={(val) => actualizarDato("sexo", val)}
                          options={[
                            { id: "F", nombre: "Femenino" },
                            { id: "M", nombre: "Masculino" },
                          ]}
                        />
                      </div>
                      <div>
                        <label
                          className={labelClass}
                          htmlFor="admision-telefono"
                        >
                          Teléfono de contacto *
                        </label>
                        <input
                          id="admision-telefono"
                          type="tel"
                          inputMode="tel"
                          value={personalData.telefono}
                          placeholder="7000-0000"
                          onChange={(e) =>
                            actualizarDato(
                              "telefono",
                              formatoTelefono(e.target.value),
                            )
                          }
                          aria-invalid={!!erroresPaso1.telefono}
                          className={claseCampo(erroresPaso1.telefono)}
                        />
                        <ErrorCampo mensaje={erroresPaso1.telefono} />
                      </div>
                      <div>
                        <label
                          className={labelClass}
                          htmlFor="admision-correoPersonal"
                        >
                          Correo electrónico *
                        </label>

                        <input
                          id="admision-correoPersonal"
                          type="email"
                          disabled={personaExistente}
                          value={personalData.correoPersonal}
                          placeholder="juan@ejemplo.com"
                          aria-invalid={!!erroresPaso1.correoPersonal}
                          aria-describedby={
                            erroresPaso1.correoPersonal
                              ? "error-correoPersonal"
                              : undefined
                          }
                          onChange={(e) =>
                            actualizarDato(
                              "correoPersonal",
                              e.target.value.toLowerCase().trim(),
                            )
                          }
                          className={claseCampo(erroresPaso1.correoPersonal)}
                        />

                        <div id="error-correoPersonal">
                          <ErrorCampo mensaje={erroresPaso1.correoPersonal} />
                        </div>

                        {!personaExistente && documentoVerificado && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            {tokenCorreoNuevo &&
                            correoNuevoVerificado ===
                              personalData.correoPersonal
                                .trim()
                                .toLowerCase() ? (
                              <p className="text-sm font-semibold text-green-700">
                                ✓ Correo electrónico verificado
                              </p>
                            ) : (
                              <>
                                <p className="mb-3 text-xs text-slate-600">
                                  Para continuar, verifica que tienes acceso a
                                  este correo electrónico.
                                </p>

                                <button
                                  type="button"
                                  onClick={solicitarCodigoCorreoNuevo}
                                  disabled={
                                    enviandoCorreoNuevo ||
                                    verificandoCorreoNuevo ||
                                    esperaCorreoNuevo > 0 ||
                                    !personalData.correoPersonal
                                  }
                                  className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
                                >
                                  {enviandoCorreoNuevo
                                    ? "Solicitando..."
                                    : esperaCorreoNuevo > 0
                                      ? `Reenviar código en ${esperaCorreoNuevo}s`
                                      : "Enviar código de verificación"}
                                </button>

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    placeholder="Código de 6 dígitos"
                                    value={codigoCorreoNuevo}
                                    disabled={
                                      enviandoCorreoNuevo ||
                                      verificandoCorreoNuevo
                                    }
                                    onChange={(e) =>
                                      setCodigoCorreoNuevo(
                                        e.target.value
                                          .replace(/\D/g, "")
                                          .slice(0, 6),
                                      )
                                    }
                                    className={`${inputClass} text-center font-mono tracking-widest`}
                                  />

                                  <button
                                    type="button"
                                    onClick={confirmarCodigoCorreoNuevo}
                                    disabled={
                                      enviandoCorreoNuevo ||
                                      verificandoCorreoNuevo ||
                                      codigoCorreoNuevo.length !== 6
                                    }
                                    className="h-[50px] rounded-xl bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-50"
                                  >
                                    {verificandoCorreoNuevo
                                      ? "Verificando..."
                                      : "Verificar código"}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {personaExistente && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 ml-1">
                            Fijo por expediente.
                          </p>
                        )}
                      </div>
                      <div>
                        <SelectBuscador
                          label="Departamento *"
                          required
                          value={personalData.idDepartamento}
                          error={erroresPaso1.idDepartamento}
                          onChange={(val) => {
                            setPersonalData((prev) => ({
                              ...prev,
                              idDepartamento: val,
                              idDistrito: "",
                            }));
                            setErroresPaso1((prev) => ({
                              ...prev,
                              idDepartamento: undefined,
                              idDistrito: undefined,
                            }));
                          }}
                          options={catalogos.departamentos.map((d) => ({
                            id: d.id ?? d.idDepartamento,
                            nombre: d.nombre ?? d.nombreDepartamento,
                          }))}
                        />
                      </div>
                      <div>
                        <SelectBuscador
                          label="Distrito / Municipio *"
                          required
                          disabled={
                            !personalData.idDepartamento ||
                            estadoDistritos !== "lista"
                          }
                          value={personalData.idDistrito}
                          error={erroresPaso1.idDistrito}
                          onChange={(val) => actualizarDato("idDistrito", val)}
                          options={distritos.map((d) => ({
                            id: d.id ?? d.idDistrito,
                            nombre: d.nombre ?? d.nombreDistrito,
                          }))}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className={labelClass}
                          htmlFor="admision-direccion"
                        >
                          Dirección residencial completa *
                        </label>
                        <input
                          id="admision-direccion"
                          type="text"
                          maxLength={255}
                          value={personalData.direccion}
                          onChange={(e) =>
                            actualizarDato("direccion", e.target.value)
                          }
                          aria-invalid={!!erroresPaso1.direccion}
                          className={claseCampo(erroresPaso1.direccion)}
                        />
                        <ErrorCampo mensaje={erroresPaso1.direccion} />
                      </div>
                    </fieldset>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={handleNextStep1}
                        disabled={
                          !documentoVerificado ||
                          identidadOcupada ||
                          estadoCatalogos !== "lista"
                        }
                        className="w-full sm:w-auto h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                      >
                        Siguiente paso
                      </button>
                    </div>
                  </section>
                )}

                {paso === 2 && (
                  <section className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
                    <h2 tabIndex={-1} className="text-2xl font-extrabold mb-2">
                      Paso 2: Carrera y materias
                    </h2>
                    <p className="text-xs text-slate-500 mb-8">
                      Selecciona sede, carrera y grupos disponibles.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                      <SelectBuscador
                        label="Sede universitaria"
                        value={sedeSeleccionada}
                        onChange={() => {}}
                        disabled={true}
                        options={catalogos.sedes.map((sede) => ({
                          id: sede.id ?? sede.idSede,
                          nombre: sede.nombre ?? sede.nombreSede,
                        }))}
                      />

                      <SelectBuscador
                        label="Carrera profesional"
                        value={carreraSeleccionada}
                        onChange={cambiarCarrera}
                        disabled={
                          !sedeSeleccionada || isProcessing || reservaIncierta
                        }
                        options={carrerasDisponibles.map((c) => ({
                          id: c.idCarreraSede ?? c.id,
                          nombre: c.nombre ?? c.nombreCarrera,
                        }))}
                      />
                    </div>

                    <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 border-b pb-3 mb-6">
                      Asignaturas disponibles
                    </h3>

                    {estadoOferta === "cerrada" ? (
                      <Aviso
                        titulo="Admisiones de nuevo ingreso cerradas"
                        mensaje={mensajeOferta}
                      >
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setReintentoOferta((v) => v + 1)}
                          className="mt-3 font-bold underline text-sm"
                        >
                          Volver a consultar disponibilidad
                        </button>
                      </Aviso>
                    ) : estadoOferta === "error" ? (
                      <Aviso
                        error
                        titulo="No pudimos consultar la oferta académica"
                        mensaje={mensajeOferta}
                      >
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => setReintentoOferta((v) => v + 1)}
                          className="mt-3 font-bold underline text-sm"
                        >
                          Reintentar consulta
                        </button>
                      </Aviso>
                    ) : cargandoOferta ? (
                      <p className="py-12 text-center text-sm text-slate-500 font-medium">
                        Consultando oferta académica...
                      </p>
                    ) : ofertaAcademica.length ? (
                      <div className="space-y-6">
                        {ofertaAcademica.map((materia) => (
                          <div
                            key={materia.idMateria}
                            className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200"
                          >
                            <h4 className="text-sm font-extrabold mb-4 text-slate-900">
                              {materia.codigoMateria} {materia.nombreMateria}
                            </h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {materia.gruposDisponibles?.map((grupo) => {
                                const seleccionado =
                                  gruposSeleccionados.includes(grupo.idGrupo);
                                const sinCupo = grupo.cuposDisponibles <= 0;
                                return (
                                  <button
                                    type="button"
                                    key={grupo.idGrupo}
                                    disabled={
                                      sinCupo || isProcessing || reservaIncierta
                                    }
                                    aria-pressed={seleccionado}
                                    onClick={() =>
                                      toggleGrupo(
                                        grupo.idGrupo,
                                        materia.idMateria,
                                      )
                                    }
                                    className={`text-left p-5 rounded-xl border transition-all ${
                                      sinCupo
                                        ? "bg-slate-100 opacity-50 cursor-not-allowed"
                                        : seleccionado
                                          ? "bg-slate-900 text-white border-slate-900"
                                          : "bg-white hover:border-slate-400"
                                    }`}
                                  >
                                    <div className="flex justify-between gap-3">
                                      <span className="text-sm font-extrabold">
                                        Grupo {grupo.codigoGrupo}
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-widest">
                                        {sinCupo
                                          ? "SIN CUPO"
                                          : `${grupo.cuposDisponibles} cupos`}
                                      </span>
                                    </div>
                                    <p className="text-xs mt-3 mb-4 opacity-80 font-medium">
                                      {grupo.nombreDocente}
                                    </p>
                                    {grupo.horarios?.map((h, i) => (
                                      <p
                                        key={i}
                                        className="text-[11px] font-bold tracking-wide mt-1 text-slate-500 flex items-center gap-1.5"
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${seleccionado ? "bg-white" : "bg-slate-300"}`}
                                        ></span>{" "}
                                        {h.diaSemana} {h.horaInicio} -{" "}
                                        {h.horaFin}
                                      </p>
                                    ))}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-12 text-center text-sm text-slate-500 font-medium">
                        {sedeSeleccionada && carreraSeleccionada
                          ? "No hay grupos ofertados para esta carrera."
                          : "Selecciona sede y carrera."}
                      </p>
                    )}

                    <div className="mt-12 pt-6 border-t flex flex-col sm:flex-row justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorOperacion("");
                          setPaso(1);
                        }}
                        disabled={isProcessing || reservaIncierta}
                        className="px-8 h-[50px] text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        Atrás
                      </button>
                      <button
                        type="button"
                        onClick={handleConsultarPlanFinanciero}
                        disabled={
                          isProcessing ||
                          reservaIncierta ||
                          estadoOferta !== "lista" ||
                          !validarSeleccion(
                            ofertaAcademica,
                            gruposSeleccionados,
                          )
                        }
                        className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                      >
                        {isProcessing
                          ? "Procesando..."
                          : "Generar plan financiero"}
                      </button>
                    </div>
                  </section>
                )}

                {paso === 3 && planFinanciero && (
                  <section className="bg-white rounded-3xl p-6 sm:p-12 shadow-sm border border-slate-200">
                    <h2 tabIndex={-1} className="text-2xl font-extrabold mb-2">
                      Paso 3: Plan financiero
                    </h2>
                    <p className="text-xs text-slate-500 mb-8">
                      Importe informado por la institución para esta solicitud.
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mb-8">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                        Total a cancelar
                      </p>
                      <p className="text-5xl font-black">
                        ${planFinanciero.totalInicial.toFixed(2)}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      {[
                        ["Matrícula", planFinanciero.montoMatricula],
                        ["Primera cuota", planFinanciero.montoCuota],
                        [
                          "Recargo extraordinario",
                          planFinanciero.montoExtraordinaria,
                        ],
                        ["Total del ciclo", planFinanciero.totalCiclo],
                      ].map(([nombre, monto]) => (
                        <div
                          key={nombre}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <p className="text-xs font-semibold text-slate-500">
                            {nombre}
                          </p>
                          <p className="mt-2 text-xl font-extrabold text-slate-900">
                            ${Number(monto).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="mb-8 text-xs text-slate-500">
                      Ciclo: {planFinanciero.codigoCiclo}. Este cálculo es
                      informativo. Todavía no se ha registrado una prematrícula
                      ni reservado cupos.
                    </p>

                    {boletaIncierta && (
                      <Aviso
                        error
                        titulo="La boleta está pendiente de confirmación"
                        mensaje="Revisa el correo registrado o consulta con la institución antes de solicitar otra boleta o pagar por otro medio."
                      />
                    )}

                    <h3 className={labelClass}>Método de pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                      {[
                        [
                          "EN_LINEA",
                          "Pago en línea",
                          "Tarjeta de crédito o débito",
                        ],
                        [
                          "VENTANILLA",
                          "Pago en ventanilla",
                          "Boleta NPE para pagos presenciales",
                        ],
                      ].map(([id, titulo, descripcion]) => (
                        <button
                          type="button"
                          key={id}
                          onClick={() => setModalidadPago(id)}
                          disabled={
                            isProcessing || pagoIncierto || boletaIncierta
                          }
                          className={`p-5 sm:p-6 rounded-2xl border text-left transition-all ${modalidadPago === id ? "border-slate-900 ring-2 ring-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"}`}
                        >
                          <h4 className="font-extrabold text-sm mb-1.5 text-slate-900">
                            {titulo}
                          </h4>
                          <p className="text-[11px] font-medium text-slate-500">
                            {descripcion}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="mt-12 pt-6 border-t flex flex-col-reverse sm:flex-row justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setPlanFinanciero(null);
                          setMostrarConfirmacionNpe(false);
                          setErrorOperacion("");
                          setPaso(2);
                        }}
                        disabled={isProcessing}
                        className="h-[50px] px-6 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-50"
                      >
                        Volver a selección académica
                      </button>

                      {(!mostrarConfirmacionNpe ||
                        modalidadPago === "EN_LINEA") && (
                        <button
                          type="button"
                          onClick={continuarPlanFinanciero}
                          disabled={isProcessing || !planFinanciero}
                          className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                        >
                          {modalidadPago === "VENTANILLA"
                            ? "Continuar con boleta NPE"
                            : "Continuar al pago"}
                        </button>
                      )}
                    </div>

                    {mostrarConfirmacionNpe &&
                      modalidadPago === "VENTANILLA" && (
                        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                          <h3 className="text-lg font-extrabold text-slate-900">
                            Confirmación de solicitud
                          </h3>

                          <p className="mt-3 text-sm text-slate-700">
                            Estás por confirmar tu solicitud de nuevo ingreso
                            para el ciclo {planFinanciero.codigoCiclo}.
                          </p>

                          <p className="mt-3 text-sm text-slate-700">
                            Importe inicial:
                            <strong>
                              {" "}
                              ${planFinanciero.totalInicial.toFixed(2)}
                            </strong>
                          </p>

                          <p className="mt-3 text-sm text-slate-600">
                            Al confirmar, se registrará tu prematrícula, se
                            reservarán los cupos disponibles y se solicitará la
                            generación de tu boleta NPE.
                          </p>

                          <div className="mt-5 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => setMostrarConfirmacionNpe(false)}
                              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold"
                            >
                              Volver
                            </button>

                            <button
                              type="button"
                              onClick={generarNpeConfirmado}
                              disabled={
                                isProcessing ||
                                reservaIncierta ||
                                boletaIncierta
                              }
                              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              {isProcessing
                                ? "Procesando solicitud..."
                                : matriculaGenerada?.idMatricula
                                  ? "Generar boleta NPE"
                                  : "Confirmar prematrícula"}
                            </button>
                          </div>
                        </div>
                      )}
                  </section>
                )}

                {paso === 4 &&
                  modalidadPago === "EN_LINEA" &&
                  !confirmacionPago && (
                    <section className="max-w-xl mx-auto bg-white rounded-3xl p-6 sm:p-12 border border-slate-200 shadow-sm">
                      <h2
                        tabIndex={-1}
                        className="text-2xl font-extrabold text-center mb-2"
                      >
                        Pago en línea
                      </h2>
                      <p className="text-sm text-center text-slate-500 font-bold mb-8">
                        Total: ${matriculaGenerada.totalAPagar.toFixed(2)}
                      </p>

                      <Aviso
                        titulo="Transacción segura"
                        mensaje="Tus datos están protegidos por cifrado de extremo a extremo. No almacenamos la información de tu tarjeta."
                      />

                      <fieldset
                        disabled={isProcessing || pagoIncierto}
                        className="space-y-5 mt-8"
                      >
                        <div>
                          <label
                            className={labelClass}
                            htmlFor="tarjeta-numero"
                          >
                            Número de tarjeta
                          </label>
                          <input
                            id="tarjeta-numero"
                            aria-invalid={!!erroresTarjeta.numero}
                            inputMode="numeric"
                            value={cardData.numero}
                            maxLength={23}
                            onChange={(e) =>
                              setCardData((prev) => ({
                                ...prev,
                                numero: e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 16)
                                  .replace(/(.{4})/g, "$1 ")
                                  .trim(),
                              }))
                            }
                            className={inputClass}
                            placeholder="0000 0000 0000 0000"
                          />
                          {/* Se eliminó el <p> de errores inferior para tarjeta */}
                        </div>
                        <div>
                          <label
                            className={labelClass}
                            htmlFor="tarjeta-titular"
                          >
                            Titular de la tarjeta
                          </label>
                          <input
                            id="tarjeta-titular"
                            aria-invalid={!!erroresTarjeta.titular}
                            maxLength={150}
                            value={cardData.titular}
                            onChange={(e) =>
                              setCardData((prev) => ({
                                ...prev,
                                titular: e.target.value
                                  .toUpperCase()
                                  .replace(/[^A-ZÁÉÍÓÚÑ ]/g, ""),
                              }))
                            }
                            className={inputClass}
                            placeholder="EJ. JUAN PEREZ"
                          />
                          {/* Se eliminó el <p> de errores inferior para tarjeta */}
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label
                              className={labelClass}
                              htmlFor="tarjeta-expiracion"
                            >
                              Expiración
                            </label>
                            <input
                              id="tarjeta-expiracion"
                              aria-invalid={!!erroresTarjeta.expiracion}
                              inputMode="numeric"
                              value={cardData.expiracion}
                              maxLength={5}
                              placeholder="MM/AA"
                              onChange={(e) => {
                                const n = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 4);
                                setCardData((prev) => ({
                                  ...prev,
                                  expiracion:
                                    n.length > 2
                                      ? `${n.slice(0, 2)}/${n.slice(2)}`
                                      : n,
                                }));
                              }}
                              className={inputClass}
                            />
                            {/* Se eliminó el <p> de errores inferior para tarjeta */}
                          </div>
                          <div>
                            <label className={labelClass} htmlFor="tarjeta-cvv">
                              CVV
                            </label>
                            <input
                              id="tarjeta-cvv"
                              aria-invalid={!!erroresTarjeta.cvv}
                              inputMode="numeric"
                              type="password"
                              value={cardData.cvv}
                              maxLength={4}
                              onChange={(e) =>
                                setCardData((prev) => ({
                                  ...prev,
                                  cvv: e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4),
                                }))
                              }
                              className={inputClass}
                              placeholder="123"
                            />
                            {/* Se eliminó el <p> de errores inferior para tarjeta */}
                          </div>
                        </div>
                      </fieldset>

                      <div className="mt-10 flex flex-col sm:flex-row justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setErrorOperacion("");
                            setPaso(3);
                          }}
                          disabled={isProcessing || pagoIncierto}
                          className="px-6 h-[50px] text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                        >
                          Volver al plan
                        </button>
                        <button
                          type="button"
                          onClick={ejecutarPagoOnline}
                          disabled={isProcessing}
                          className="px-10 h-[50px] bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50"
                        >
                          {isProcessing
                            ? "Procesando..."
                            : pagoIncierto
                              ? "Reconsultar intento"
                              : "Pagar ahora"}
                        </button>
                      </div>
                    </section>
                  )}

                {paso === 4 &&
                  modalidadPago === "EN_LINEA" &&
                  confirmacionPago && (
                    <section className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center shadow-sm">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h2
                        tabIndex={-1}
                        className="text-3xl font-extrabold mb-3"
                      >
                        ¡Matrícula exitosa!
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mb-10">
                        La institución confirmó tu matrícula. Revisa las
                        instrucciones enviadas al correo registrado.
                      </p>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-left space-y-5 mb-10">
                        <div>
                          <p className={labelClass}>Carnet estudiantil</p>
                          <p className="font-black font-mono text-lg">
                            {confirmacionPago.carnet}
                          </p>
                        </div>
                        <div>
                          <p className={labelClass}>Correo institucional</p>
                          <p className="font-bold text-sm text-slate-900">
                            {confirmacionPago.correoInstitucional}
                          </p>
                        </div>
                        <div>
                          <p className={labelClass}>Contraseña provisional</p>
                          <p className="font-bold text-sm text-slate-600">
                            Consulta las instrucciones en tu correo personal.
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/"
                        className="w-full h-[50px] flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold"
                      >
                        Ir al portal de inicio de sesión
                      </Link>
                    </section>
                  )}

                {paso === 4 &&
                  modalidadPago === "VENTANILLA" &&
                  matriculaGenerada && (
                    <section className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center shadow-sm">
                      {!boletaFinalizada ? (
                        <>
                          <h2
                            tabIndex={-1}
                            className="text-3xl font-extrabold mb-3"
                          >
                            Boleta generada
                          </h2>
                          <p className="text-sm text-slate-500 font-medium mb-8">
                            Tu solicitud está pendiente de pago. Presenta el
                            siguiente NPE en colecturía o tu banca en línea.
                          </p>
                          <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 text-white mb-8 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                              Número de Pago Electrónico (NPE)
                            </p>
                            <p className="text-xl sm:text-2xl font-black font-mono break-all leading-tight">
                              {matriculaGenerada.npe}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8 text-sm font-medium">
                            <p>
                              Importe:{" "}
                              <span className="font-black">
                                ${matriculaGenerada.totalAPagar.toFixed(2)}
                              </span>
                            </p>
                            <p>
                              Vence:{" "}
                              <span className="font-bold text-slate-600">
                                {matriculaGenerada.fechaVencimiento ||
                                  "Consulta con la institución"}
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              guardarPendiente(null);
                              setBoletaFinalizada(true);
                            }}
                            className="w-full h-[50px] bg-slate-900 text-white rounded-xl font-bold"
                          >
                            He guardado mi boleta
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg
                              className="w-8 h-8"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <h2
                            tabIndex={-1}
                            className="text-3xl font-extrabold mb-3"
                          >
                            Solicitud en espera de pago
                          </h2>
                          <p className="text-sm text-slate-500 font-medium mb-10">
                            La matrícula se completará de forma automática
                            cuando la institución confirme el pago de tu NPE.
                            Conserva el número y respeta la fecha de
                            vencimiento.
                          </p>
                          <Link
                            to="/"
                            className="w-full h-[50px] flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold"
                          >
                            Terminar y volver al inicio
                          </Link>
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
