
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { admisionService } from '../../services/admisionService';

const inputClass =
  'w-full h-[50px] bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-400';

const labelClass =
  'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2';

function SelectBuscador({
  label,
  value,
  onChange,
  options = [],
  placeholder = '-- Seleccione --',
  disabled = false,
  required = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const cerrar = e => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const seleccionado = options.find(x => String(x.id) === String(value));
  const filtrados = options.filter(x =>
    (x.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className={labelClass}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span className={seleccionado ? '' : 'text-slate-400'}>
          {seleccionado?.nombre || placeholder}
        </span>
        <span>⌄</span>
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-slate-50 rounded-lg p-3 text-sm outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtrados.length === 0 ? (
              <p className="p-4 text-sm text-slate-400">Sin resultados</p>
            ) : filtrados.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  onChange(String(item.id));
                  setSearch('');
                  setOpen(false);
                }}
                className="block w-full text-left px-4 py-3 text-sm hover:bg-slate-100"
              >
                {item.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const validarDUI = dui => {
  if (!/^\d{8}-\d$/.test(dui)) return false;
  const numeros = dui.replace('-', '').split('').map(Number);
  if (numeros.every(n => n === 0)) return false;
  const digito = numeros.pop();
  const suma = numeros.reduce((acc, n, i) => acc + n * (9 - i), 0);
  return digito === (10 - (suma % 10)) % 10;
};

const formatoDocumento = (tipo, valor) => {
  if (String(tipo) === '1') {
    const n = valor.replace(/\D/g, '').slice(0, 9);
    return n.length <= 8 ? n : `${n.slice(0, 8)}-${n.slice(8)}`;
  }
  if (String(tipo) === '2') {
    return valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
  }
  if (String(tipo) === '3') {
    const n = valor.replace(/\D/g, '').slice(0, 14);
    if (n.length <= 4) return n;
    if (n.length <= 10) return `${n.slice(0, 4)}-${n.slice(4)}`;
    if (n.length <= 13) return `${n.slice(0, 4)}-${n.slice(4, 10)}-${n.slice(10)}`;
    return `${n.slice(0, 4)}-${n.slice(4, 10)}-${n.slice(10, 13)}-${n.slice(13)}`;
  }
  return '';
};

const errorDocumento = (tipo, numero) => {
  switch (String(tipo)) {
    case '1':
      return validarDUI(numero) ? '' : 'DUI inválido.';
    case '2':
      return /^[A-Z][0-9]{7,8}$/.test(numero)
        ? '' : 'Pasaporte inválido.';
    case '3':
      return /^\d{4}-\d{6}-\d{3}-\d$/.test(numero) &&
        !/^0{14}$/.test(numero.replace(/-/g, ''))
        ? '' : 'NIT inválido.';
    default:
      return 'Selecciona un tipo de documento.';
  }
};

const formatoTelefono = valor => {
  const n = valor.replace(/\D/g, '').slice(0, 8);
  return n.length <= 4 ? n : `${n.slice(0, 4)}-${n.slice(4)}`;
};

const datosIniciales = {
  idPersona: null,
  idTipoDocumento: '',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  sexo: 'F',
  telefono: '',
  correoPersonal: '',
  idDepartamento: '',
  idDistrito: '',
  direccion: ''
};

const obtenerMensajeError = error =>
  error?.response?.data?.mensaje ||
  error?.response?.data?.message ||
  error?.message ||
  'Ocurrió un error inesperado.';

export default function AdmisionOnline() {
  const [activeTab, setActiveTab] = useState('estudiante');
  const [paso, setPaso] = useState(1);

  const [personalData, setPersonalData] = useState(datosIniciales);
  const [erroresPaso1, setErroresPaso1] = useState({});
  const [catalogos, setCatalogos] = useState({
    tiposDocumento: [],
    sedes: [],
    departamentos: [],
    carreras: []
  });
  const [distritos, setDistritos] = useState([]);

  const [validandoDocumento, setValidandoDocumento] = useState(false);
  const [documentoVerificado, setDocumentoVerificado] = useState(false);

  const [requiereCodigo, setRequiereCodigo] = useState(false);
  const [codigoCorreo, setCodigoCorreo] = useState('');
  const [tokenVerificacion, setTokenVerificacion] = useState(null);
  const [personaExistente, setPersonaExistente] = useState(false);
  const [correoEnmascarado, setCorreoEnmascarado] = useState('');
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);

  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('');
  const [pensumVigente, setPensumVigente] = useState(null);
  const [ofertaAcademica, setOfertaAcademica] = useState([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState([]);
  const [cargandoOferta, setCargandoOferta] = useState(false);

  const [modalidadPago, setModalidadPago] = useState('EN_LINEA');
  const [matriculaGenerada, setMatriculaGenerada] = useState(null);
  const [cardData, setCardData] = useState({
    numero: '',
    titular: '',
    expiracion: '',
    cvv: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmacionPago, setConfirmacionPago] = useState(null);
  const [boletaFinalizada, setBoletaFinalizada] = useState(false);

  const [busquedaCajero, setBusquedaCajero] = useState('');
  const [estudianteEnCaja, setEstudianteEnCaja] = useState(null);
  const [cargosSeleccionadosCaja, setCargosSeleccionadosCaja] = useState([]);
  const [cajaProcesada, setCajaProcesada] = useState(null);

  const [reenviandoCodigo, setReenviandoCodigo] = useState(false);
  

  const actualizarDato = (campo, valor) => {
    setPersonalData(prev => ({ ...prev, [campo]: valor }));
  };

  const limpiarVerificacion = () => {
    setDocumentoVerificado(false);
    setRequiereCodigo(false);
    setCodigoCorreo('');
    setTokenVerificacion(null);
    setPersonaExistente(false);
    setCorreoEnmascarado('');
    setErroresPaso1({});
  };

  const cambiarDocumento = (campo, valor) => {
    limpiarVerificacion();
    setPersonalData(prev => ({
      ...datosIniciales,
      idTipoDocumento: campo === 'idTipoDocumento'
        ? valor : prev.idTipoDocumento,
      numeroDocumento: campo === 'numeroDocumento'
        ? valor : ''
    }));
  };

  useEffect(() => {
    admisionService.getCatalogos()
      .then(data => setCatalogos({
        tiposDocumento: data.tipos_documento || [],
        sedes: data.sedes || [],
        departamentos: data.departamentos || [],
        carreras: data.carreras || []
      }))
      .catch(() => toast.error('Error al cargar catálogos.'));
  }, []);

  useEffect(() => {
    if (!personalData.idDepartamento) {
      setDistritos([]);
      return;
    }

    let activo = true;
    admisionService.getDistritos(personalData.idDepartamento)
      .then(data => {
        if (activo) setDistritos(data);
      })
      .catch(() => {
        if (activo) toast.error('Error al obtener distritos.');
      });

    return () => { activo = false; };
  }, [personalData.idDepartamento]);

  useEffect(() => {
    if (!carreraSeleccionada) {
      setPensumVigente(null);
      return;
    }

    let activo = true;
    admisionService.getPensumVigente(carreraSeleccionada)
      .then(data => {
        if (activo) setPensumVigente(data);
      })
      .catch(() => {
        if (activo) {
          setPensumVigente(null);
          toast.error('Sin pensum vigente para esta carrera.');
        }
      });

    return () => { activo = false; };
  }, [carreraSeleccionada]);

  useEffect(() => {
    if (!pensumVigente?.idPensum || !sedeSeleccionada) {
      setOfertaAcademica([]);
      setGruposSeleccionados([]);
      return;
    }

    let activo = true;
    setCargandoOferta(true);

    admisionService.getOfertaNuevoIngreso(
      pensumVigente.idPensum,
      sedeSeleccionada
    )
      .then(data => {
        if (activo) {
          setOfertaAcademica(data);
          setGruposSeleccionados([]);
        }
      })
      .catch(() => {
        if (activo) toast.error('Error al cargar oferta académica.');
      })
      .finally(() => {
        if (activo) setCargandoOferta(false);
      });

    return () => { activo = false; };
  }, [pensumVigente, sedeSeleccionada]);

  const verificarDocumento = async () => {
    const error = errorDocumento(
      personalData.idTipoDocumento,
      personalData.numeroDocumento
    );

    if (error) {
      setErroresPaso1({ numeroDocumento: error });
      return;
    }

    setValidandoDocumento(true);
    setErroresPaso1({});

    try {
      const respuesta = await admisionService.verificarIdentidad(
        personalData.idTipoDocumento,
        personalData.numeroDocumento
      );

      // 1. Estudiante que ya posee credenciales
      if (respuesta?.requiereLogin || respuesta?.esEstudianteActivo) {
        limpiarVerificacion();

        toast.warning('Debes iniciar sesión', {
          description:
            respuesta.mensaje ||
            'Ya posees credenciales estudiantiles.',
          duration: 7000
        });

        return;
      }

      // 2. Persona existente que necesita verificar correo
      if (
        respuesta?.existePersona &&
        respuesta?.requiereVerificacionCorreo
      ) {
        setPersonaExistente(true);
        setDocumentoVerificado(false);

        setCorreoEnmascarado(
          respuesta.correoEnmascarado || 'correo registrado'
        );

        // Mostrar el campo OTP antes de intentar solicitar
        // otro código.
        setRequiereCodigo(true);

        // No solicitar otro código si ya tenemos
        // una verificación pendiente en este componente.
        if (requiereCodigo) {
          return;
        }

        try {
          await admisionService.solicitarCodigoAdmision(
            personalData.idTipoDocumento,
            personalData.numeroDocumento
          );

          toast.success('Código enviado al correo registrado.');

        } catch (errorSolicitud) {
          const mensaje = obtenerMensajeError(errorSolicitud);

          // El backend ya tiene un código vigente.
          // Permitimos que el usuario lo introduzca.
          if (mensaje.includes('Ya existe un código vigente')) {
            toast.info('Ya tienes un código vigente', {
              description:
                'Introduce el código recibido en tu correo.'
            });

            return;
          }

          // Error real al enviar el correo.
          toast.error('No se pudo solicitar el código', {
            description: mensaje
          });
        }

        return;
      }

      // 3. Persona existente que no puede continuar
      if (respuesta?.existePersona) {
        limpiarVerificacion();

        toast.warning('Documento ya registrado', {
          description:
            respuesta.mensaje ||
            'No es posible continuar con este documento.'
        });

        return;
      }

      // 4. Respuesta inesperada
      if (respuesta?.existePersona !== false) {
        throw new Error('Respuesta de verificación no válida.');
      }

      // 5. Persona nueva
      limpiarVerificacion();
      setDocumentoVerificado(true);

      toast.success('Documento disponible. Completa tus datos.');

    } catch (error) {
      const mensaje = obtenerMensajeError(error);

      setErroresPaso1({
        numeroDocumento: mensaje
      });

      toast.error(mensaje);

    } finally {
      setValidandoDocumento(false);
    }
  };

  const reenviarCodigoAdmision = async () => {
    if (reenviandoCodigo || validandoDocumento) return;

    setReenviandoCodigo(true);

    try {
      await admisionService.solicitarCodigoAdmision(
        personalData.idTipoDocumento,
        personalData.numeroDocumento
      );

      setCodigoCorreo('');

      toast.success('Nuevo código enviado', {
        description: 'Revisa tu correo electrónico.'
      });

    } catch (error) {
      toast.error('No se pudo reenviar el código', {
        description: obtenerMensajeError(error)
      });
    } finally {
      setReenviandoCodigo(false);
    }
  };

  const confirmarCodigoAdmision = async () => {
    if (!/^\d{6}$/.test(codigoCorreo)) {
      toast.warning('Introduce los seis dígitos.');
      return;
    }

    setVerificandoCodigo(true);

    try {
      const respuesta = await admisionService.verificarCodigoAdmision(
        personalData.idTipoDocumento,
        personalData.numeroDocumento,
        codigoCorreo
      );

      const token = respuesta?.tokenVerificacion;
      const persona = respuesta?.persona;

      if (
        !token ||
        !persona?.idPersona ||
        !persona?.correoPersonal ||
        !persona?.fechaNacimiento ||
        !persona?.idDistrito ||
        !persona?.idDepartamento
      ) {
        throw new Error(
          'El backend no devolvió todos los datos de la persona verificada.'
        );
      }

      setPersonalData(prev => ({
        ...prev,
        idPersona: persona.idPersona,
        nombres: persona.nombres || '',
        apellidos: persona.apellidos || '',
        fechaNacimiento: persona.fechaNacimiento || '',
        sexo: persona.sexo || 'F',
        telefono: persona.telefono || '',
        correoPersonal: persona.correoPersonal || '',
        idDepartamento: String(persona.idDepartamento),
        idDistrito: String(persona.idDistrito),
        direccion: persona.direccion || ''
      }));

      setTokenVerificacion(token);
      setDocumentoVerificado(true);
      setRequiereCodigo(false);
      setCodigoCorreo('');
      setErroresPaso1({});

      toast.success('Correo verificado correctamente.');

    } catch (error) {
      toast.error('Código no validado', {
        description: obtenerMensajeError(error)
      });
    } finally {
      setVerificandoCodigo(false);
    }
  };

  const handleNextStep1 = () => {
    if (!documentoVerificado) {
      toast.warning('Verifica primero tu documento.');
      return;
    }

    if (personaExistente && !tokenVerificacion) {
      toast.warning('Debes verificar el correo registrado.');
      return;
    }

    const err = {};
    const documentoError = errorDocumento(
      personalData.idTipoDocumento,
      personalData.numeroDocumento
    );

    if (documentoError) err.numeroDocumento = documentoError;
    if (!personalData.nombres.trim()) err.nombres = 'Requerido';
    if (!personalData.apellidos.trim()) err.apellidos = 'Requerido';
    if (!personalData.fechaNacimiento) err.fechaNacimiento = 'Requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.correoPersonal)) {
      err.correoPersonal = 'Correo inválido';
    }
    if (!/^\d{4}-\d{4}$/.test(personalData.telefono)) {
      err.telefono = 'Teléfono inválido';
    }
    if (!personalData.idDistrito) err.idDistrito = 'Requerido';

    setErroresPaso1(err);

    if (Object.keys(err).length) {
      toast.warning('Revisa los datos personales.');
      return;
    }

    setPaso(2);
  };

  const toggleGrupo = (idGrupo, idMateria) => {
    const materia = ofertaAcademica.find(
      m => m.idMateria === idMateria
    );

    const gruposMateria = materia?.gruposDisponibles
      ?.map(g => g.idGrupo) || [];

    setGruposSeleccionados(prev => {
      if (prev.includes(idGrupo)) {
        return prev.filter(id => id !== idGrupo);
      }
      return [
        ...prev.filter(id => !gruposMateria.includes(id)),
        idGrupo
      ];
    });
  };

  const handleCrearPreMatricula = async () => {
    if (!sedeSeleccionada || !carreraSeleccionada || !pensumVigente?.idPensum) {
      toast.error('Selecciona sede y carrera.');
      return;
    }

    if (personaExistente && !tokenVerificacion) {
      toast.error('Debes verificar tu identidad.');
      return;
    }

    if (!gruposSeleccionados.length) {
      toast.warning('Selecciona al menos un grupo.');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        idPersona: personalData.idPersona
          ? Number(personalData.idPersona) : null,
        tokenVerificacion: personaExistente
          ? tokenVerificacion : null,
        idTipoDocumento: Number(personalData.idTipoDocumento),
        numeroDocumento: personalData.numeroDocumento.trim(),
        nombres: personalData.nombres.trim(),
        apellidos: personalData.apellidos.trim(),
        fechaNacimiento: personalData.fechaNacimiento,
        sexo: personalData.sexo,
        telefono: personalData.telefono.trim(),
        correoPersonal: personalData.correoPersonal.trim().toLowerCase(),
        idDistrito: Number(personalData.idDistrito),
        direccion: personalData.direccion?.trim() || 'No especificada',
        idSede: Number(sedeSeleccionada),
        idCarreraSede: Number(carreraSeleccionada),
        idPensum: Number(pensumVigente.idPensum),
        idGruposSeleccionados: gruposSeleccionados.map(Number)
      };

      const res = await admisionService.procesarPreMatricula(payload);

      setMatriculaGenerada({
        idMatricula: res.idMatricula,
        estudiante: `${personalData.nombres} ${personalData.apellidos}`,
        documento: personalData.numeroDocumento,
        totalAPagar: Number(res.totalAPagar ?? 0),
        npe: res.npe,
        fechaVencimiento: res.fechaVencimiento,
        cargosCiclo: res.cargosCiclo || []
      });

      setPaso(3);
    } catch (error) {
      toast.error('Error al generar prematrícula', {
        description: obtenerMensajeError(error)
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const ejecutarPagoOnline = async () => {
    if (
      !cardData.numero ||
      !cardData.titular ||
      !cardData.expiracion ||
      !cardData.cvv
    ) {
      toast.warning('Completa los datos de la tarjeta.');
      return;
    }

    setIsProcessing(true);

    try {
      const payload = {
        idMatricula: matriculaGenerada.idMatricula,
        cuotasAPagar: 1,
        numeroTarjeta: cardData.numero,
        titular: cardData.titular,
        fechaExpiracion: cardData.expiracion,
        cvv: cardData.cvv
      };

      const resultado = await admisionService.liquidarPagoOnline(
        payload,
        crypto.randomUUID()
      );

      setConfirmacionPago(resultado);
      toast.success('Pago procesado correctamente.');
    } catch (error) {
      toast.error('Transacción denegada', {
        description: obtenerMensajeError(error)
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelarPreMatricula = async () => {
    setIsProcessing(true);
    try {
      await admisionService.cancelarPreMatricula(
        matriculaGenerada.idMatricula
      );
      setMatriculaGenerada(null);
      setPaso(2);
      toast.info('Cupos liberados correctamente.');
    } catch (error) {
      toast.error(obtenerMensajeError(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const continuarPlanFinanciero = async () => {
    if (modalidadPago === 'EN_LINEA') {
      setPaso(4);
      return;
    }

    setIsProcessing(true);
    try {
      const res = await admisionService.generarBoletaNpe(
        matriculaGenerada.idMatricula
      );
      setMatriculaGenerada(prev => ({ ...prev, npe: res.npe }));
      toast.success(res.mensaje || 'Boleta generada.');
      setPaso(4);
    } catch (error) {
      toast.error(obtenerMensajeError(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const consultarCaja = async () => {
    if (!busquedaCajero.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${encodeURIComponent(busquedaCajero)}/estado-cuenta`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {}
        }
      );
      if (!res.ok) throw new Error('Estudiante no encontrado.');

      const data = await res.json();
      setEstudianteEnCaja(data);
      setCargosSeleccionadosCaja(
        data.cargosPendientes?.map(c => c.idCargo) || []
      );
      setCajaProcesada(null);
    } catch (error) {
      toast.error(obtenerMensajeError(error));
    }
  };

  const procesarCaja = async () => {
    if (!estudianteEnCaja || !cargosSeleccionadosCaja.length) {
      toast.warning('Selecciona los cargos a pagar.');
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/procesar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            idEstudiante: estudianteEnCaja.estudiante.idEstudiante,
            idsCargosAPagar: cargosSeleccionadosCaja,
            montoRecibido: 140,
            idMetodoPago: 1,
            numeroReferencia: 'VENTANILLA'
          })
        }
      );

      if (!res.ok) throw new Error('No se pudo procesar el pago.');
      setCajaProcesada(await res.json());
      toast.success('Pago registrado.');
    } catch (error) {
      toast.error(obtenerMensajeError(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="max-w-[1200px] mx-auto px-6 py-10 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-2xl font-extrabold">Codice</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            Portal de admisión
          </p>
        </div>

      </header>

      <main className="max-w-[1000px] mx-auto px-6 pb-20">
        {activeTab === 'estudiante' ? (
          <>
            <div className="max-w-3xl mx-auto mb-14 grid grid-cols-4 gap-3">
              {[
                'Datos personales',
                'Carrera y materias',
                'Plan financiero',
                'Confirmación'
              ].map((nombre, i) => (
                <div key={nombre} className="text-center">
                  <div className={`w-11 h-11 rounded-full mx-auto flex items-center justify-center font-black ${
                    paso >= i + 1
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-400'
                  }`}>
                    {paso > i + 1 ? '✓' : i + 1}
                  </div>
                  <p className="mt-3 text-[10px] font-bold text-slate-500">
                    {nombre}
                  </p>
                </div>
              ))}
            </div>

            {paso === 1 && (
              <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200">
                <div className="mb-10 pb-6 border-b border-slate-100">
                  <h2 className="text-2xl font-extrabold">
                    Paso 1: Expediente de identificación civil
                  </h2>
                  <p className="text-xs text-slate-500 mt-2">
                    Verifica tu documento antes de completar los datos.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                  {/* TIPO DE DOCUMENTO */}
                  <div className="md:col-span-4">
                    <SelectBuscador
                      label="Tipo de documento"
                      required
                      disabled={validandoDocumento}
                      value={personalData.idTipoDocumento}
                      onChange={val => cambiarDocumento('idTipoDocumento', val)}
                      options={catalogos.tiposDocumento.map(d => ({
                        id: d.id ?? d.idTipoDocumento,
                        nombre: d.nombre ?? d.nombreTipoDocumento
                      }))}
                    />
                  </div>

                  {/* NÚMERO DE DOCUMENTO */}
                  <div className="md:col-span-5">
                    <label className={labelClass}>
                      Número de documento *
                    </label>

                    <input
                      type="text"
                      disabled={!personalData.idTipoDocumento || validandoDocumento}
                      value={personalData.numeroDocumento}
                      onChange={e =>
                        cambiarDocumento(
                          'numeroDocumento',
                          formatoDocumento(
                            personalData.idTipoDocumento,
                            e.target.value
                          )
                        )
                      }
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          verificarDocumento();
                        }
                      }}
                      className={inputClass}
                      placeholder={
                        Number(personalData.idTipoDocumento) === 1
                          ? '00000000-0'
                          : Number(personalData.idTipoDocumento) === 3
                            ? '0000-000000-000-0'
                            : 'Ingresa el número de documento'
                      }
                    />
                  </div>

                  {/* BOTÓN VERIFICAR */}
                  <div className="md:col-span-3">
                    <button
                      type="button"
                      onClick={verificarDocumento}
                      disabled={
                        validandoDocumento ||
                        documentoVerificado ||
                        !personalData.numeroDocumento
                      }
                      className="w-full h-[50px] bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                    >
                      {validandoDocumento
                        ? 'Verificando...'
                        : documentoVerificado
                          ? 'Verificado ✓'
                          : 'Verificar'}
                    </button>
                  </div>

                </div>

                {/* MENSAJE DE ERROR FUERA DEL GRID */}
                {erroresPaso1.numeroDocumento && (
                  <div
                    role="alert"
                    className="mt-3 flex items-center gap-2 text-sm text-red-600"
                  >
                    <span>⚠</span>
                    <span>{erroresPaso1.numeroDocumento}</span>
                  </div>
                )}

                <div className="mb-8" />



                {requiereCodigo && (
                  <div className="mb-8 p-6 rounded-2xl bg-slate-50 border border-slate-200">
                    <h3 className="text-base font-extrabold">
                      Verificación de correo electrónico
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">
                      Encontramos tu expediente. Introduce el código
                      enviado a tu correo registrado:
                    </p>
                    <p className="font-bold mt-2 mb-5">
                      {correoEnmascarado}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={codigoCorreo}
                        onChange={e => setCodigoCorreo(
                          e.target.value.replace(/\D/g, '').slice(0, 6)
                        )}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
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
                        disabled={verificandoCodigo || codigoCorreo.length !== 6}
                        className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                      >
                        {verificandoCodigo ? 'Validando...' : 'Validar código'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-4">
                      El código vence en 10 minutos.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-slate-500">
                          ¿No recibiste el código?
                        </span>

                        <button
                          type="button"
                          onClick={reenviarCodigoAdmision}
                          disabled={reenviandoCodigo || validandoDocumento}
                          className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reenviandoCodigo
                            ? 'Enviando...'
                            : 'Reenviar código'}
                        </button>
                      </div>
                  </div>
                )}

                <fieldset
                  disabled={!documentoVerificado}
                  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 ${
                    !documentoVerificado ? 'opacity-40' : ''
                  }`}
                >
                  <div>
                    <label className={labelClass}>Fecha de nacimiento *</label>
                    <input
                      type="date"
                      disabled={personaExistente}
                      value={personalData.fechaNacimiento}
                      onChange={e => actualizarDato('fechaNacimiento', e.target.value)}
                      className={inputClass}
                    />
                    {erroresPaso1.fechaNacimiento && (
                      <p className="text-xs text-red-500 mt-2">
                        {erroresPaso1.fechaNacimiento}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Nombres *</label>
                    <input
                      type="text"
                      disabled={personaExistente}
                      value={personalData.nombres}
                      onChange={e => actualizarDato(
                        'nombres',
                        e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, '')
                      )}
                      className={inputClass}
                    />
                    {erroresPaso1.nombres && (
                      <p className="text-xs text-red-500 mt-2">
                        {erroresPaso1.nombres}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Apellidos *</label>
                    <input
                      type="text"
                      disabled={personaExistente}
                      value={personalData.apellidos}
                      onChange={e => actualizarDato(
                        'apellidos',
                        e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, '')
                      )}
                      className={inputClass}
                    />
                    {erroresPaso1.apellidos && (
                      <p className="text-xs text-red-500 mt-2">
                        {erroresPaso1.apellidos}
                      </p>
                    )}
                  </div>

                  <SelectBuscador
                    label="Sexo"
                    required
                    disabled={personaExistente}
                    value={personalData.sexo}
                    onChange={val => actualizarDato('sexo', val)}
                    options={[
                      { id: 'F', nombre: 'Femenino' },
                      { id: 'M', nombre: 'Masculino' }
                    ]}
                  />

                  <div>
                    <label className={labelClass}>Teléfono móvil *</label>
                    <input
                      type="text"
                      value={personalData.telefono}
                      onChange={e => actualizarDato(
                        'telefono',
                        formatoTelefono(e.target.value)
                      )}
                      placeholder="0000-0000"
                      className={inputClass}
                    />
                    {erroresPaso1.telefono && (
                      <p className="text-xs text-red-500 mt-2">
                        {erroresPaso1.telefono}
                      </p>
                    )}
                  </div>

                  <SelectBuscador
                    label="Departamento"
                    required
                    value={personalData.idDepartamento}
                    onChange={val => setPersonalData(prev => ({
                      ...prev,
                      idDepartamento: val,
                      idDistrito: ''
                    }))}
                    options={catalogos.departamentos.map(d => ({
                      id: d.id ?? d.idDepartamento,
                      nombre: d.nombre ?? d.nombreDepartamento
                    }))}
                  />

                  <SelectBuscador
                    label="Distrito / Municipio"
                    required
                    disabled={!personalData.idDepartamento}
                    value={personalData.idDistrito}
                    onChange={val => actualizarDato('idDistrito', val)}
                    options={distritos.map(d => ({
                      id: d.id ?? d.idDistrito,
                      nombre: d.nombre ?? d.nombreDistrito
                    }))}
                  />

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className={labelClass}>
                      Correo electrónico personal *
                    </label>
                    <input
                      type="email"
                      disabled={personaExistente}
                      value={personalData.correoPersonal}
                      onChange={e => actualizarDato(
                        'correoPersonal',
                        e.target.value.toLowerCase().trim()
                      )}
                      className={inputClass}
                    />
                    {erroresPaso1.correoPersonal && (
                      <p className="text-xs text-red-500 mt-2">
                        {erroresPaso1.correoPersonal}
                      </p>
                    )}
                    {personaExistente && (
                      <p className="text-xs text-slate-500 mt-2">
                        Este correo pertenece a tu expediente verificado
                        y no puede modificarse aquí.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <label className={labelClass}>
                      Dirección residencial completa
                    </label>
                    <input
                      type="text"
                      value={personalData.direccion}
                      onChange={e => actualizarDato('direccion', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </fieldset>

                <div className="mt-12 pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep1}
                    disabled={!documentoVerificado}
                    className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    Siguiente paso
                  </button>
                </div>
              </section>
            )}

            {paso === 2 && (
              <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-extrabold mb-2">
                  Paso 2: Carrera y materias
                </h2>
                <p className="text-xs text-slate-500 mb-10">
                  Selecciona sede, carrera y grupos disponibles.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mb-10">
                  <SelectBuscador
                    label="Sede universitaria"
                    value={sedeSeleccionada}
                    onChange={setSedeSeleccionada}
                    options={catalogos.sedes.map(s => ({
                      id: s.id ?? s.idSede,
                      nombre: s.nombre ?? s.nombreSede
                    }))}
                  />

                  <SelectBuscador
                    label="Carrera profesional"
                    value={carreraSeleccionada}
                    onChange={setCarreraSeleccionada}
                    options={catalogos.carreras.map(c => ({
                      id: c.id ?? c.idCarreraSede,
                      nombre: c.nombre ?? c.nombreCarrera
                    }))}
                  />
                </div>

                <h3 className="text-xs uppercase font-bold tracking-widest text-slate-500 border-b pb-3 mb-6">
                  Asignaturas disponibles
                </h3>

                {cargandoOferta ? (
                  <p className="py-12 text-center text-slate-500">
                    Consultando oferta académica...
                  </p>
                ) : ofertaAcademica.length ? (
                  <div className="space-y-6">
                    {ofertaAcademica.map(materia => (
                      <div
                        key={materia.idMateria}
                        className="p-6 bg-slate-50 rounded-2xl border border-slate-200"
                      >
                        <h4 className="text-sm font-extrabold mb-5">
                          {materia.codigoMateria} {materia.nombreMateria}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {materia.gruposDisponibles?.map(grupo => {
                            const seleccionado = gruposSeleccionados.includes(
                              grupo.idGrupo
                            );
                            const sinCupo = grupo.cuposDisponibles <= 0;

                            return (
                              <button
                                type="button"
                                key={grupo.idGrupo}
                                disabled={sinCupo}
                                onClick={() => toggleGrupo(
                                  grupo.idGrupo,
                                  materia.idMateria
                                )}
                                className={`text-left p-5 rounded-xl border transition-all ${
                                  sinCupo
                                    ? 'bg-slate-100 opacity-50 cursor-not-allowed'
                                    : seleccionado
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white hover:border-slate-400'
                                }`}
                              >
                                <div className="flex justify-between gap-3">
                                  <span className="text-sm font-extrabold">
                                    Grupo {grupo.codigoGrupo}
                                  </span>
                                  <span className="text-xs">
                                    {sinCupo
                                      ? 'SIN CUPO'
                                      : `${grupo.cuposDisponibles} cupos`}
                                  </span>
                                </div>

                                <p className="text-xs mt-3 mb-4 opacity-70">
                                  {grupo.nombreDocente}
                                </p>

                                {grupo.horarios?.map((h, i) => (
                                  <p key={i} className="text-xs mt-2">
                                    {h.diaSemana} {h.horaInicio} - {h.horaFin}
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
                  <p className="py-12 text-center text-sm text-slate-500">
                    {sedeSeleccionada && carreraSeleccionada
                      ? 'No hay grupos ofertados.'
                      : 'Selecciona sede y carrera.'}
                  </p>
                )}

                <div className="mt-12 pt-6 border-t flex justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setPaso(1)}
                    className="px-8 h-[50px] text-sm font-bold text-slate-500"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={handleCrearPreMatricula}
                    disabled={isProcessing || !gruposSeleccionados.length}
                    className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {isProcessing
                      ? 'Procesando...'
                      : 'Generar plan financiero'}
                  </button>
                </div>
              </section>
            )}

            {paso === 3 && matriculaGenerada && (
              <section className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200">
                <h2 className="text-2xl font-extrabold mb-2">
                  Paso 3: Plan financiero
                </h2>
                <p className="text-xs text-slate-500 mb-8">
                  Matrícula y primera mensualidad.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mb-10">
                  <p className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Total a cancelar
                  </p>
                  <p className="text-5xl font-black">
                    ${matriculaGenerada.totalAPagar.toFixed(2)}
                  </p>
                </div>

                <h3 className={labelClass}>Método de pago</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    ['EN_LINEA', 'En línea', 'Tarjeta de crédito o débito'],
                    ['VENTANILLA', 'Ventanilla', 'Boleta NPE para pago presencial']
                  ].map(([id, titulo, descripcion]) => (
                    <button
                      type="button"
                      key={id}
                      onClick={() => setModalidadPago(id)}
                      className={`p-6 rounded-2xl border text-left ${
                        modalidadPago === id
                          ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <h4 className="font-extrabold">{titulo}</h4>
                      <p className="text-xs text-slate-500 mt-2">
                        {descripcion}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="mt-12 pt-6 border-t flex justify-between">
                  <button
                    type="button"
                    onClick={cancelarPreMatricula}
                    disabled={isProcessing}
                    className="h-[50px] px-8 font-bold text-slate-500 disabled:opacity-50"
                  >
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={continuarPlanFinanciero}
                    disabled={isProcessing}
                    className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {isProcessing ? 'Procesando...' : 'Continuar'}
                  </button>
                </div>
              </section>
            )}

            {paso === 4 &&
              modalidadPago === 'EN_LINEA' &&
              !confirmacionPago && (
                <section className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200">
                  <h2 className="text-2xl font-extrabold text-center mb-3">
                    Pago seguro
                  </h2>
                  <p className="text-sm text-center text-slate-500 mb-10">
                    Total: ${matriculaGenerada.totalAPagar.toFixed(2)}
                  </p>

                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Número de tarjeta</label>
                      <input
                        value={cardData.numero}
                        maxLength={19}
                        onChange={e => setCardData(prev => ({
                          ...prev,
                          numero: e.target.value
                            .replace(/\D/g, '')
                            .slice(0, 16)
                            .replace(/(.{4})/g, '$1 ')
                            .trim()
                        }))}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Titular</label>
                      <input
                        value={cardData.titular}
                        onChange={e => setCardData(prev => ({
                          ...prev,
                          titular: e.target.value.toUpperCase()
                        }))}
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Expiración</label>
                        <input
                          value={cardData.expiracion}
                          maxLength={5}
                          placeholder="MM/AA"
                          onChange={e => {
                            const n = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setCardData(prev => ({
                              ...prev,
                              expiracion: n.length > 2
                                ? `${n.slice(0, 2)}/${n.slice(2)}`
                                : n
                            }));
                          }}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>CVV</label>
                        <input
                          type="password"
                          value={cardData.cvv}
                          maxLength={4}
                          onChange={e => setCardData(prev => ({
                            ...prev,
                            cvv: e.target.value.replace(/\D/g, '').slice(0, 4)
                          }))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setPaso(3)}
                      disabled={isProcessing}
                      className="px-6 h-[50px] text-slate-500 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={ejecutarPagoOnline}
                      disabled={isProcessing}
                      className="px-10 h-[50px] bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50"
                    >
                      {isProcessing ? 'Procesando...' : 'Pagar ahora'}
                    </button>
                  </div>
                </section>
              )}

            {paso === 4 &&
              modalidadPago === 'EN_LINEA' &&
              confirmacionPago && (
                <section className="max-w-xl mx-auto bg-white rounded-3xl p-10 border border-slate-200 text-center">
                  <div className="text-5xl mb-6">✓</div>
                  <h2 className="text-3xl font-extrabold mb-3">
                    ¡Matrícula exitosa!
                  </h2>
                  <p className="text-sm text-slate-500 mb-8">
                    Tus credenciales han sido generadas.
                  </p>

                  <div className="bg-slate-50 rounded-2xl p-7 text-left space-y-5 mb-8">
                    <div>
                      <p className={labelClass}>Carnet</p>
                      <p className="font-black font-mono">
                        {confirmacionPago.carnet}
                      </p>
                    </div>
                    <div>
                      <p className={labelClass}>Correo institucional</p>
                      <p className="font-bold">
                        {confirmacionPago.correoInstitucional}
                      </p>
                    </div>
                    <div>
                      <p className={labelClass}>Contraseña provisional</p>
                      <p className="font-bold">
                        Consulta las instrucciones enviadas a tu correo.
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/"
                    className="block py-4 bg-slate-900 text-white rounded-xl font-bold"
                  >
                    Ir a iniciar sesión
                  </Link>
                </section>
              )}

            {paso === 4 &&
              modalidadPago === 'VENTANILLA' &&
              matriculaGenerada && (
                <section className="max-w-xl mx-auto bg-white rounded-3xl p-10 border border-slate-200 text-center">
                  {!boletaFinalizada ? (
                    <>
                      <h2 className="text-3xl font-extrabold mb-3">
                        Boleta generada
                      </h2>
                      <p className="text-sm text-slate-500 mb-8">
                        Presenta el siguiente NPE en colecturía.
                      </p>
                      <div className="p-8 rounded-2xl border-2 border-slate-900 mb-8">
                        <p className={labelClass}>NPE</p>
                        <p className="text-2xl font-black font-mono break-all">
                          {matriculaGenerada.npe}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBoletaFinalizada(true)}
                        className="w-full h-[50px] bg-slate-900 text-white rounded-xl font-bold"
                      >
                        Finalizar registro
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-6">✓</div>
                      <h2 className="text-3xl font-extrabold mb-3">
                        Reserva completada
                      </h2>
                      <p className="text-sm text-slate-500 mb-8">
                        Consulta tu correo para conocer los siguientes pasos.
                      </p>
                      <Link
                        to="/"
                        className="block py-4 bg-slate-900 text-white rounded-xl font-bold"
                      >
                        Volver al inicio
                      </Link>
                    </>
                  )}
                </section>
              )}
          </>
        ) : (
          <section className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 border border-slate-200">
            <h2 className="text-3xl font-extrabold mb-3">
              Colecturía
            </h2>
            <p className="text-sm text-slate-500 mb-10">
              Consulta y cobro de aranceles por ventanilla.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <input
                type="text"
                value={busquedaCajero}
                onChange={e => setBusquedaCajero(
                  e.target.value.toUpperCase().trim()
                )}
                placeholder="DUI o carnet"
                className={inputClass}
              />
              <button
                type="button"
                onClick={consultarCaja}
                className="h-[50px] px-8 bg-slate-900 text-white rounded-xl font-bold"
              >
                Buscar
              </button>
            </div>

            {estudianteEnCaja && !cajaProcesada && (
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                <h3 className="text-lg font-extrabold">
                  {estudianteEnCaja.estudiante?.nombreCompleto}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  {estudianteEnCaja.estudiante?.carnet}
                </p>

                <h4 className="text-xs font-bold uppercase mt-8 mb-4">
                  Cargos pendientes
                </h4>

                <div className="space-y-3 mb-8">
                  {estudianteEnCaja.cargosPendientes?.map(cargo => (
                    <label
                      key={cargo.idCargo}
                      className="flex items-center gap-3 bg-white p-4 rounded-xl border"
                    >
                      <input
                        type="checkbox"
                        checked={cargosSeleccionadosCaja.includes(cargo.idCargo)}
                        onChange={e => setCargosSeleccionadosCaja(prev =>
                          e.target.checked
                            ? [...prev, cargo.idCargo]
                            : prev.filter(id => id !== cargo.idCargo)
                        )}
                      />
                      <span className="text-sm font-bold">
                        {cargo.concepto || `Cargo ${cargo.idCargo}`}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={procesarCaja}
                  disabled={isProcessing || !cargosSeleccionadosCaja.length}
                  className="w-full h-[50px] bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar pago'}
                </button>
              </div>
            )}

            {cajaProcesada && (
              <div className="p-8 bg-slate-50 border rounded-2xl text-center">
                <div className="text-4xl mb-4">✓</div>
                <h3 className="text-xl font-extrabold">
                  Pago registrado correctamente
                </h3>
                <p className="text-sm text-slate-500 mt-3">
                  La transacción fue confirmada por el servidor.
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
