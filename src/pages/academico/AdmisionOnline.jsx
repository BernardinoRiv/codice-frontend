import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { admisionService } from '../../services/admisionService';

// --- UTILIDADES DE FORMATO Y VALIDACIÓN DE EL SALVADOR ---
const validarDUI = (dui) => {
  const regex = /^\d{8}-\d{1}$/;
  if (!regex.test(dui)) return false;
  const digits = dui.replace('-', '').split('').map(Number);
  const verificador = digits.pop();
  let suma = 0;
  for (let i = 0; i < digits.length; i++) {
    suma += digits[i] * (9 - i);
  }
  const mod = suma % 10;
  const esperado = mod === 0 ? 0 : 10 - mod;
  return verificador === esperado;
};

const formatearDUIInput = (val) => {
  const nums = val.replace(/\D/g, '').slice(0, 9);
  if (nums.length <= 8) return nums;
  return `${nums.slice(0, 8)}-${nums.slice(8, 9)}`;
};

const formatearTelefonoInput = (val) => {
  const nums = val.replace(/\D/g, '').slice(0, 8);
  if (nums.length <= 4) return nums;
  return `${nums.slice(0, 4)}-${nums.slice(4, 8)}`;
};

export default function AdmisionOnline() {
  const [activeTab, setActiveTab] = useState('estudiante'); // 'estudiante' | 'colecturia'
  const [paso, setPaso] = useState(1); // 1: Datos, 2: Carrera/Horarios, 3: Plan 1+1, 4: Liquidación/NPE

  // --- ESTADO PASO 1: DATOS CIVILES ---
  const [personalData, setPersonalData] = useState({
    idPersona: null,
    idTipoDocumento: 1, // DUI
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
  });
  const [erroresPaso1, setErroresPaso1] = useState({});
  const [catalogos, setCatalogos] = useState({ tiposDocumento: [], sedes: [], departamentos: [], carreras: [] });
  const [distritos, setDistritos] = useState([]);

  const [boletaFinalizada, setBoletaFinalizada] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  // --- ESTADO PASO 2: ACADÉMICO ---
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('');
  const [pensumVigente, setPensumVigente] = useState(null);
  const [ofertaAcademica, setOfertaAcademica] = useState([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState([]);
  const [cargandoOferta, setCargandoOferta] = useState(false);

  // --- ESTADO PASO 3: MODALIDAD DE PAGO ---
  const [modalidadPago, setModalidadPago] = useState('EN_LINEA'); // 'EN_LINEA' | 'VENTANILLA'
  const [matriculaGenerada, setMatriculaGenerada] = useState(null);
  const [idempotencyKey] = useState(crypto.randomUUID());

  // --- ESTADO PASO 4: TARJETA INTERACTIVA (ONLINE) ---
  const [cardData, setCardData] = useState({
    numero: '',
    titular: '',
    expiracion: '',
    cvv: ''
  });
  const [cardFlipped, setCardFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmacionPago, setConfirmacionPago] = useState(null);

  // --- ESTADO COLECTURÍA (CAJERO) ---
  const [busquedaCajero, setBusquedaCajero] = useState('');
  const [estudianteEnCaja, setEstudianteEnCaja] = useState(null);
  const [cargosSeleccionadosCaja, setCargosSeleccionadosCaja] = useState([]);
  const [cajaProcesada, setCajaProcesada] = useState(null);

  // 1. Carga de Catálogos Iniciales
  useEffect(() => {
    admisionService.getCatalogos()
      .then(data => {
        setCatalogos({
          tiposDocumento: data['tipos_documento'] || [],
          sedes: data['sedes'] || [],
          departamentos: data['departamentos'] || [],
          carreras: data['carreras'] || []
        });
      })
      .catch(() => toast.error('Error al cargar catálogos del servidor'));
  }, []);

  // 2. Cargar Distritos dependientes
  useEffect(() => {
    if (!personalData.idDepartamento) {
      setDistritos([]);
      return;
    }
    admisionService.getDistritos(personalData.idDepartamento)
      .then(setDistritos)
      .catch(() => toast.error('Error al obtener distritos'));
  }, [personalData.idDepartamento]);

  // 3. Cargar Pensum al seleccionar carrera
  useEffect(() => {
    if (!carreraSeleccionada) {
      setPensumVigente(null);
      return;
    }
    admisionService.getPensumVigente(carreraSeleccionada)
      .then(setPensumVigente)
      .catch(() => {
        toast.error('Sin pensum activo para la carrera seleccionada');
        setPensumVigente(null);
      });
  }, [carreraSeleccionada]);

  // 4. Cargar Oferta de grupos al seleccionar Pensum y Sede
  useEffect(() => {
    if (!pensumVigente?.idPensum || !sedeSeleccionada) {
      setOfertaAcademica([]);
      return;
    }
    setCargandoOferta(true);
    admisionService.getOfertaNuevoIngreso(pensumVigente.idPensum, sedeSeleccionada)
      .then(data => {
        setOfertaAcademica(data);
        setGruposSeleccionados([]);
      })
      .catch(() => toast.error('Error al cargar oferta académica'))
      .finally(() => setCargandoOferta(false));
  }, [pensumVigente, sedeSeleccionada]);

  // Validación y Navegación Paso 1 -> 2
  const handleNextStep1 = async () => {
    const err = {};
    if (!validarDUI(personalData.numeroDocumento)) {
      err.numeroDocumento = 'DUI inválido o dígito verificador incorrecto (Formato: 00000000-0)';
    }
    if (!personalData.nombres.trim()) err.nombres = 'Nombres requeridos';
    if (!personalData.apellidos.trim()) err.apellidos = 'Apellidos requeridos';
    if (!personalData.fechaNacimiento) err.fechaNacimiento = 'Fecha requerida';
    if (!personalData.correoPersonal.includes('@')) err.correoPersonal = 'Correo personal inválido';
    if (personalData.telefono.length < 9) err.telefono = 'Teléfono requerido (0000-0000)';
    if (!personalData.idDistrito) err.idDistrito = 'Seleccione distrito';

    setErroresPaso1(err);
    if (Object.keys(err).length > 0) {
      toast.warning('Datos incompletos', { description: 'Revisa los campos marcados en rojo.' });
      return;
    }

    try {
      const persona = await admisionService.buscarPersonaPorDocumento(personalData.numeroDocumento);
      if (persona) {
        setPersonalData(p => ({
          ...p,
          idPersona: persona.idPersona || persona.id,
          nombres: persona.nombres,
          apellidos: persona.apellidos
        }));
        toast.info('Aspirante registrado previamente', { description: 'Recuperamos tu expediente existente.' });
      }
    } catch {
      // Si falla búsqueda continúa como aspirante nuevo
    }

    setPaso(2);
  };

  // Selección de Asignaturas (Paso 2)
  const toggleGrupo = (idGrupo, idMateria) => {
    const materia = ofertaAcademica.find(m => m.idMateria === idMateria);
    const gruposMateria = materia ? materia.gruposDisponibles.map(g => g.idGrupo) : [];

    if (gruposSeleccionados.includes(idGrupo)) {
      setGruposSeleccionados(gruposSeleccionados.filter(id => id !== idGrupo));
    } else {
      const sinEstaMateria = gruposSeleccionados.filter(id => !gruposMateria.includes(id));
      setGruposSeleccionados([...sinEstaMateria, idGrupo]);
    }
  };

  // Enviar Pre-Matrícula Paso 2 -> 3
  const handleCrearPreMatricula = async () => {
    if (gruposSeleccionados.length === 0) {
      toast.warning('Sin selección', { description: 'Selecciona al menos una materia para continuar.' });
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        idPersona: personalData.idPersona,
        idTipoDocumento: Number(personalData.idTipoDocumento),
        numeroDocumento: personalData.numeroDocumento,
        nombres: personalData.nombres,
        apellidos: personalData.apellidos,
        fechaNacimiento: personalData.fechaNacimiento,
        sexo: personalData.sexo,
        telefono: personalData.telefono,
        correoPersonal: personalData.correoPersonal,
        idDistrito: Number(personalData.idDistrito),
        direccion: personalData.direccion,
        idSede: Number(sedeSeleccionada),
        idCarreraSede: Number(carreraSeleccionada),
        idPensum: Number(pensumVigente.idPensum),
        idGruposSeleccionados: gruposSeleccionados,
        modalidadPago: modalidadPago
      };

      const res = await admisionService.procesarPreMatricula(payload);

      setMatriculaGenerada({
        idMatricula: res.idMatricula,
        estudiante: `${personalData.nombres} ${personalData.apellidos}`,
        documento: personalData.numeroDocumento,
        totalAPagar: res.totalAPagar, // 140.00 determinista
        npe: res.npe,
        fechaVencimiento: res.fechaVencimiento,
        cargosCiclo: [
          { id: 1, concepto: 'Matrícula de Pregrado', cuota: 1, monto: 70.0, obligatoria: true },
          { id: 2, concepto: 'Primera Mensualidad (Cuota 1)', cuota: 1, monto: 70.0, obligatoria: true },
          { id: 3, concepto: 'Cuota Mensual 2', cuota: 2, monto: 70.0, obligatoria: false },
          { id: 4, concepto: 'Cuota Mensual 3', cuota: 3, monto: 70.0, obligatoria: false },
          { id: 5, concepto: 'Cuota Mensual 4', cuota: 4, monto: 70.0, obligatoria: false },
          { id: 6, concepto: 'Cuota Mensual 5', cuota: 5, monto: 70.0, obligatoria: false }
        ]
      });

      setPaso(3);
      toast.success('Cupos Reservados', { description: res.mensaje });
    } catch (err) {
      toast.error('Error al generar pre-matrícula', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Liquidación Online Paso 4A
  const ejecutarPagoOnline = async () => {
    if (!cardData.numero || !cardData.titular || !cardData.expiracion || !cardData.cvv) {
      toast.warning('Datos incompletos', { description: 'Completa los datos de tu tarjeta bancaria.' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await admisionService.liquidarPagoOnline(
        matriculaGenerada.idMatricula,
        {
          numeroTarjeta: cardData.numero,
          titularTarjeta: cardData.titular,
          fechaExpiracion: cardData.expiracion,
          cvv: cardData.cvv
        },
        idempotencyKey
      );

      setConfirmacionPago(res);
      toast.success('¡Pago Exitoso!', { description: res.mensaje });
    } catch (err) {
      toast.error('Transacción Denegada', { description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-amber-200 selection:text-amber-900">
      
      {/* HEADER INSTITUCIONAL */}
      <header className="sticky top-0 z-40 border-b border-blue-950/20 bg-blue-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 font-serif font-black text-blue-950 shadow-inner">
              UMA
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Universidad Modular Abierta
              </h1>
              <p className="text-xs text-amber-300">
                Portal de Admisión y Matrícula Oficial • SRA
              </p>
            </div>
          </div>

          <div className="flex rounded-lg bg-blue-950/60 p-1 text-xs">
            <button
              onClick={() => setActiveTab('estudiante')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === 'estudiante'
                  ? 'bg-amber-400 text-blue-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Aspirante Online
            </button>
            <button
              onClick={() => setActiveTab('colecturia')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
                activeTab === 'colecturia'
                  ? 'bg-amber-400 text-blue-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Caja / Colecturía
            </button>
          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {activeTab === 'estudiante' ? (
          <div>
            
            {/* STEPPER DE NAVEGACIÓN */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[
                  { num: 1, label: 'Datos Personales', desc: 'Validación DUI' },
                  { num: 2, label: 'Carrera & Materias', desc: 'Reserva cupos' },
                  { num: 3, label: 'Plan Financiero (1+1)', desc: 'Matrícula + Mes 1' },
                  { num: 4, label: 'Confirmación', desc: 'Emisión y Credenciales' }
                ].map((item, idx) => (
                  <div key={item.num} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all shadow-sm ${
                          paso > item.num
                            ? 'bg-emerald-600 text-white'
                            : paso === item.num
                            ? 'bg-blue-900 text-white ring-4 ring-amber-400/50'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {paso > item.num ? '✓' : item.num}
                      </div>
                      <span className="mt-2 text-xs font-semibold text-slate-800 text-center hidden sm:block">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 hidden sm:block">
                        {item.desc}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div
                        className={`h-1 flex-1 mx-2 rounded transition-colors ${
                          paso > item.num ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PASO 1: DATOS PERSONALES */}
            {/* ========================================================================= */}
            {paso === 1 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 animate-in fade-in duration-300">
                <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-blue-950 sm:text-2xl">
                      Paso 1: Expediente de Identificación Civil
                    </h2>
                    <p className="text-sm text-slate-500">
                      Cumplimiento de la Ley del Registro Nacional de Personas Naturales de El Salvador.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    Validación RNPN
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Tipo de Documento
                    </label>
                    <select
                      value={personalData.idTipoDocumento}
                      disabled
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
                    >
                      <option value={1}>DUI - Documento Único de Identidad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Número de DUI <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={personalData.numeroDocumento}
                      onChange={(e) => {
                        const fmt = formatearDUIInput(e.target.value);
                        setPersonalData({ ...personalData, numeroDocumento: fmt });
                      }}
                      placeholder="00000000-0"
                      className={`mt-1 w-full rounded-lg border px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                        erroresPaso1.numeroDocumento
                          ? 'border-red-400 bg-red-50 text-red-900 focus:ring-red-400'
                          : 'border-slate-300 focus:border-blue-900 focus:ring-blue-900/20'
                      }`}
                    />
                    {erroresPaso1.numeroDocumento && (
                      <p className="mt-1 text-xs text-red-600">{erroresPaso1.numeroDocumento}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Fecha de Nacimiento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={personalData.fechaNacimiento}
                      onChange={(e) => setPersonalData({ ...personalData, fechaNacimiento: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                    {erroresPaso1.fechaNacimiento && (
                      <p className="mt-1 text-xs text-red-600">{erroresPaso1.fechaNacimiento}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Nombres <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personalData.nombres}
                      onChange={(e) => setPersonalData({ ...personalData, nombres: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                    {erroresPaso1.nombres && (
                      <p className="mt-1 text-xs text-red-600">{erroresPaso1.nombres}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Apellidos <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personalData.apellidos}
                      onChange={(e) => setPersonalData({ ...personalData, apellidos: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                    {erroresPaso1.apellidos && (
                      <p className="mt-1 text-xs text-red-600">{erroresPaso1.apellidos}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Sexo <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personalData.sexo}
                      onChange={(e) => setPersonalData({ ...personalData, sexo: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none"
                    >
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Teléfono Móvil <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personalData.telefono}
                      onChange={(e) => setPersonalData({ ...personalData, telefono: formatearTelefonoInput(e.target.value) })}
                      placeholder="0000-0000"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                    {erroresPaso1.telefono && (
                      <p className="mt-1 text-xs text-red-600">{erroresPaso1.telefono}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Departamento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personalData.idDepartamento}
                      onChange={(e) => setPersonalData({ ...personalData, idDepartamento: e.target.value, idDistrito: '' })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none"
                    >
                      <option value="">-- Seleccionar --</option>
                      {catalogos.departamentos.map(d => (
                        <option key={d.id || d.idDepartamento} value={d.id || d.idDepartamento}>
                          {d.nombre || d.nombreDepartamento}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Distrito / Municipio <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={personalData.idDistrito}
                      onChange={(e) => setPersonalData({ ...personalData, idDistrito: e.target.value })}
                      disabled={!personalData.idDepartamento}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="">-- Seleccionar --</option>
                      {distritos.map(dis => (
                        <option key={dis.id || dis.idDistrito} value={dis.id || dis.idDistrito}>
                          {dis.nombre || dis.nombreDistrito}
                        </option>
                      ))}
                    </select>
                    {erroresPaso1.idDistrito && (
                      <p className="mt-1 text-xs text-red-600">{erroresPaso1.idDistrito}</p>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Correo Electrónico Personal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={personalData.correoPersonal}
                      onChange={(e) => setPersonalData({ ...personalData, correoPersonal: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                    {erroresPaso1.correoPersonal && (
                      <p className="mt-1 text-xs text-red-600">{erroresPaso1.correoPersonal}</p>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Dirección Residencial Completa
                    </label>
                    <input
                      type="text"
                      value={personalData.direccion}
                      onChange={(e) => setPersonalData({ ...personalData, direccion: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleNextStep1}
                    className="flex items-center gap-2 rounded-xl bg-blue-900 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-800"
                  >
                    <span>Continuar a Oferta Académica</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 2: SELECCIÓN ACADÉMICA Y ASIGNATURAS */}
            {/* ========================================================================= */}
            {paso === 2 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 animate-in fade-in duration-300">
                <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-blue-950 sm:text-2xl">
                      Paso 2: Selección de Carrera y Horarios
                    </h2>
                    <p className="text-sm text-slate-500">
                      Reserva atómica de cupos con validación pesimista en base de datos.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Ciclo Vigente
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Sede Universitaria
                    </label>
                    <select
                      value={sedeSeleccionada}
                      onChange={(e) => setSedeSeleccionada(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-medium"
                    >
                      <option value="">-- Seleccionar Sede --</option>
                      {catalogos.sedes.map((s) => (
                        <option key={s.id || s.idSede} value={s.id || s.idSede}>
                          {s.nombre || s.nombreSede}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Carrera Profesional
                    </label>
                    <select
                      value={carreraSeleccionada}
                      onChange={(e) => setCarreraSeleccionada(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-medium"
                    >
                      <option value="">-- Seleccionar Carrera --</option>
                      {catalogos.carreras.map((c) => (
                        <option key={c.id || c.idCarreraSede} value={c.id || c.idCarreraSede}>
                          {c.nombre || c.nombreCarrera}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LISTADO DE ASIGNATURAS */}
                <div className="mt-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Asignaturas Disponibles del Nivel I
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Selecciona al menos una materia para formalizar la reserva de matrícula.
                  </p>

                  {cargandoOferta ? (
                    <div className="py-8 text-center text-sm font-semibold text-slate-400 animate-pulse">
                      Consultando cupos y docentes asignados...
                    </div>
                  ) : ofertaAcademica.length > 0 ? (
                    <div className="space-y-4">
                      {ofertaAcademica.map((materia) => (
                        <div key={materia.idMateria} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                          <h4 className="font-bold text-slate-900 text-sm mb-2">
                            {materia.codigoMateria} - {materia.nombreMateria}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {materia.gruposDisponibles.map(grp => {
                              const seleccionado = gruposSeleccionados.includes(grp.idGrupo);
                              const cuposRestantes = grp.cuposDisponibles;
                              const sinCupo = cuposRestantes <= 0;

                              return (
                                <div
                                  key={grp.idGrupo}
                                  onClick={() => !sinCupo && toggleGrupo(grp.idGrupo, materia.idMateria)}
                                  className={`flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition ${
                                    sinCupo
                                      ? 'border-red-200 bg-red-50/50 opacity-60 cursor-not-allowed'
                                      : seleccionado
                                      ? 'border-blue-900 bg-blue-50/70 ring-2 ring-blue-900/30'
                                      : 'border-slate-200 hover:border-slate-300 bg-white'
                                  }`}
                                >
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="font-bold text-slate-900 text-xs">
                                        Grupo {grp.codigoGrupo}
                                      </span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        sinCupo ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        {sinCupo ? 'SIN CUPO' : `${cuposRestantes} cupos`}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-600 truncate">Docente: {grp.nombreDocente}</p>
                                    <div className="mt-2 space-y-1">
                                      {grp.horarios?.map((h, i) => (
                                        <p key={i} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {h.diaSemana} • {h.horaInicio} - {h.horaFin} ({h.modalidad})
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-sm text-slate-400">
                      {carreraSeleccionada && sedeSeleccionada
                        ? 'No hay secciones ofertadas actualmente para esta sede.'
                        : 'Selecciona una sede y carrera para visualizar los grupos.'}
                    </p>
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => setPaso(1)}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <span>← Regresar</span>
                  </button>
                  <button
                    onClick={handleCrearPreMatricula}
                    disabled={isProcessing || gruposSeleccionados.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-blue-900 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-800 disabled:opacity-50"
                  >
                    <span>{isProcessing ? 'Reservando cupos...' : 'Generar Plan Financiero (1+1)'}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 3: RESUMEN FINANCIERO Y CANAL DE PAGO */}
            {/* ========================================================================= */}
            {paso === 3 && matriculaGenerada && (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 animate-in fade-in duration-300">
                <div className="space-y-6 lg:col-span-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <h2 className="text-xl font-bold text-blue-950 sm:text-2xl">
                      Paso 3: Plan Financiero y Modalidad de Cobro
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Conforme al reglamento institucional, el ingreso requiere liquidar Matrícula + Primera Cuota[cite: 2].
                    </p>

                    {/* Desglose Canasta 1+1 */}
                    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-5">
                      <div className="flex items-center justify-between pb-3 border-b border-amber-200/80">
                        <span className="font-bold text-amber-900 text-sm">
                          Monto Obligatorio para Formalizar (1 + 1)[cite: 2]
                        </span>
                        <span className="text-2xl font-black text-amber-900">$140.00 USD</span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs text-amber-950">
                        <div className="flex justify-between">
                          <span>1. Arancel de Matrícula (Cuota 1)[cite: 2, 5]</span>
                          <span className="font-semibold">$70.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2. Primera Mensualidad (Cuota 1)[cite: 2, 5]</span>
                          <span className="font-semibold">$70.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Proyección del ciclo completo */}
                    <div className="mt-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Proyección Financiera del Ciclo Completo (FIFO)[cite: 2]
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                            <tr>
                              <th className="p-2.5">Concepto</th>
                              <th className="p-2.5 text-center">Cuota</th>
                              <th className="p-2.5 text-right">Monto</th>
                              <th className="p-2.5 text-center">Estado al Liquidar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {matriculaGenerada.cargosCiclo.map((c) => (
                              <tr key={c.id} className={c.obligatoria ? 'bg-amber-50/30' : ''}>
                                <td className="p-2.5 font-medium text-slate-800">{c.concepto}</td>
                                <td className="p-2.5 text-center font-mono">#{c.cuota}</td>
                                <td className="p-2.5 text-right font-semibold">${c.monto.toFixed(2)}</td>
                                <td className="p-2.5 text-center">
                                  {c.obligatoria ? (
                                    <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 text-[10px]">
                                      SE LIQUIDARÁ HOY
                                    </span>
                                  ) : (
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 text-[10px]">
                                      QUEDA PENDIENTE
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SELECCIÓN DE CANAL */}
                    <div className="mt-8">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3">
                        Selecciona el Canal de Pago
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div
                          onClick={() => setModalidadPago('EN_LINEA')}
                          className={`cursor-pointer rounded-xl border p-5 transition ${
                            modalidadPago === 'EN_LINEA'
                              ? 'border-blue-900 bg-blue-50/70 ring-2 ring-blue-900'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xl">💳</span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                              INMEDIATO
                            </span>
                          </div>
                          <h4 className="mt-3 font-bold text-slate-900 text-base">
                            Pago en Línea con Tarjeta
                          </h4>
                          <p className="mt-1 text-xs text-slate-600">
                            Tarjeta de crédito o débito. Carnet y credenciales asignados al instante[cite: 2].
                          </p>
                        </div>

                        <div
                          onClick={() => setModalidadPago('VENTANILLA')}
                          className={`cursor-pointer rounded-xl border p-5 transition ${
                            modalidadPago === 'VENTANILLA'
                              ? 'border-blue-900 bg-blue-50/70 ring-2 ring-blue-900'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xl">🏦</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              48 HORAS
                            </span>
                          </div>
                          <h4 className="mt-3 font-bold text-slate-900 text-base">
                            Pago en Ventanilla / Colecturía
                          </h4>
                          <p className="mt-1 text-xs text-slate-600">
                            Genera boleta digital con NPE o cancela en caja presentando tu DUI.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-between">
                      <button
                        onClick={() => setPaso(2)}
                        className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <span>← Regresar</span>
                      </button>

                      <button
                        onClick={() => setPaso(4)}
                        className="flex items-center gap-2 rounded-xl bg-blue-900 px-6 py-3 font-semibold text-white shadow-md hover:bg-blue-800"
                      >
                        <span>{modalidadPago === 'EN_LINEA' ? 'Proceder a la Pasarela' : 'Generar Boleta NPE'}</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: FICHA RESUMIDA */}
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                      Ficha de Pre-Matrícula #{matriculaGenerada.idMatricula}
                    </h3>
                    <div className="mt-4 space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400">Aspirante:</span>
                        <p className="font-semibold text-slate-800">{matriculaGenerada.estudiante}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">DUI Verificado:</span>
                        <p className="font-mono font-semibold text-slate-800">{matriculaGenerada.documento}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Estado de Matrícula:</span>
                        <p className="font-semibold text-amber-700">PENDIENTE_PAGO</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Vigencia de Reserva:</span>
                        <p className="font-medium text-slate-700">48 horas (Vence: {matriculaGenerada.fechaVencimiento})</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 text-xs text-blue-950">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <span>🔒 Transacción Idempotente</span>
                    </div>
                    <p className="text-blue-800/80">
                      Clave de idempotencia única: <span className="font-mono text-[10px] break-all">{idempotencyKey.slice(0, 18)}...</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 4A: TARJETA INTERACTIVA 3D (PAGO ONLINE) */}
            {/* ========================================================================= */}
            {paso === 4 && modalidadPago === 'EN_LINEA' && !confirmacionPago && (
              <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 animate-in zoom-in-95 duration-300">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-blue-950 sm:text-2xl">
                      Pasarela de Pago Segura (Simulación PCI-DSS)
                    </h2>
                    <p className="text-sm text-slate-500">
                      Total a debitar: <span className="font-bold text-blue-950">$140.00 USD</span>
                    </p>
                  </div>
                  <span className="text-2xl">🛡️</span>
                </div>

                {/* TARJETA 3D */}
                <div className="mx-auto mb-8 max-w-sm">
                  <div
                    onClick={() => setCardFlipped(!cardFlipped)}
                    className="relative h-48 w-full cursor-pointer rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-900 p-6 text-white shadow-xl transition-transform duration-500 hover:scale-[1.02]"
                  >
                    {!cardFlipped ? (
                      <div className="flex h-full flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-mono font-semibold tracking-widest text-amber-300">
                            UMA ONLINE PAY
                          </span>
                          <span className="font-bold italic text-slate-200">VISA / MC</span>
                        </div>
                        <div className="font-mono text-lg tracking-widest text-center">
                          {cardData.numero || '•••• •••• •••• ••••'}
                        </div>
                        <div className="flex justify-between text-xs">
                          <div>
                            <span className="text-[9px] uppercase text-slate-400">Titular</span>
                            <p className="font-semibold tracking-wide uppercase">
                              {cardData.titular || 'TITULAR DE LA CUENTA'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase text-slate-400">Expira</span>
                            <p className="font-mono font-semibold">{cardData.expiracion || 'MM/AA'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col justify-between py-2">
                        <div className="h-9 w-full bg-slate-800 -mx-6 mt-1" />
                        <div className="flex justify-end pr-4">
                          <div className="bg-white px-3 py-1 font-mono text-slate-900 text-sm font-bold rounded">
                            CVV: {cardData.cvv || '•••'}
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 text-center">
                          Simulador de pasarela financiera institucional con control de idempotencia
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-400">
                    Haz clic sobre la tarjeta para ver el reverso (CVV)
                  </p>
                </div>

                {/* FORMULARIO */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Número de Tarjeta
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardData.numero}
                      onChange={(e) => setCardData({ ...cardData, numero: e.target.value })}
                      placeholder="4000 1234 5678 9010"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Nombre del Titular
                    </label>
                    <input
                      type="text"
                      value={cardData.titular}
                      onChange={(e) => setCardData({ ...cardData, titular: e.target.value.toUpperCase() })}
                      placeholder="COMO APARECE EN EL PLÁSTICO"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Fecha Expiración
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardData.expiracion}
                        onChange={(e) => setCardData({ ...cardData, expiracion: e.target.value })}
                        placeholder="MM/AA"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-center font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                        CVV
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        placeholder="•••"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-center font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between items-center">
                  <button
                    onClick={() => setPaso(3)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <span>← Regresar</span>
                  </button>

                  <button
                    onClick={ejecutarPagoOnline}
                    disabled={isProcessing}
                    className="flex items-center gap-2 rounded-xl bg-blue-900 px-8 py-3.5 font-bold text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800 disabled:opacity-50"
                  >
                    <span>{isProcessing ? 'Procesando con Pasarela...' : 'Pagar $140.00 Ahora'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMACIÓN DE PAGO ONLINE (ÉXITO REAL) */}
            {paso === 4 && modalidadPago === 'EN_LINEA' && confirmacionPago && (
              <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-6 shadow-md sm:p-8 animate-in zoom-in-95 duration-300">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-bold">
                    ✓
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-900">
                    ¡Matrícula Formalizada Exitosamente!
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Tu expediente ha transicionado a estado <strong className="text-emerald-700">MATRICULADA</strong>.
                  </p>
                </div>

                {/* CREDENCIALES IAM GENERADAS POR EL BACKEND */}
                <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/70 p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 mb-3">
                    Credenciales Institucionales Generadas (IAM)[cite: 2]
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                    <div>
                      <span className="text-slate-500">Carnet Oficial:</span>
                      <p className="font-mono text-base font-black text-blue-900">
                        {confirmacionPago.carnet}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Correo Institucional:</span>
                      <p className="font-mono font-bold text-blue-900">
                        {confirmacionPago.correoInstitucional}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Contraseña Provisional:</span>
                      <p className="font-mono text-slate-800">
                        {confirmacionPago.carnet}Uma* (Enviada a tu correo personal)
                      </p>
                    </div>
                  </div>
                </div>

                {/* DETALLE FACTURA */}
                <div className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Número de Factura Electrónica:</span>
                    <span className="font-mono font-semibold text-slate-800">{confirmacionPago.numeroFactura}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Código de Autorización Bancaria:</span>
                    <span className="font-mono font-semibold text-slate-800">{confirmacionPago.numeroAutorizacion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto Cobrado (1+1):</span>
                    <span className="font-bold text-slate-900">${confirmacionPago.montoPagado.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha y Hora:</span>
                    <span>{confirmacionPago.fechaPago}</span>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-3 font-semibold text-white shadow hover:bg-blue-800"
                  >
                    <span>Descargar Comprobante PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaso(1);
                      setConfirmacionPago(null);
                    }}
                    className="rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Finalizar y Salir
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PASO 4B: BOLETA DIGITAL NPE (VENTANILLA)                                  */}
            {/* ========================================================================= */}
            {paso === 4 && modalidadPago === 'VENTANILLA' && matriculaGenerada && (
            <div className="mx-auto max-w-2xl">
                {!boletaFinalizada ? (
                /* VISTA PREVIA DE LA BOLETA CON ACCIONES DE IMPRESIÓN Y CIERRE */
                <div className="rounded-2xl border border-amber-300 bg-white p-6 shadow-md sm:p-8 animate-in zoom-in-95 duration-300">
                    <div className="border-b border-dashed border-slate-300 pb-4 text-center">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                        COBRO EN COLECTURÍA / VENTANILLA
                    </span>
                    <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                        Boleta de Pre-Matrícula • UMA
                    </h2>
                    <p className="text-xs text-slate-500">
                        Presenta esta boleta impresa o en tu dispositivo móvil en Colecturía.
                    </p>
                    </div>

                    <div className="mt-6 space-y-4 text-xs">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                        <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-slate-400">Aspirante:</span>
                            <p className="font-semibold text-slate-800">{matriculaGenerada.estudiante}</p>
                        </div>
                        <div>
                            <span className="text-slate-400">DUI:</span>
                            <p className="font-mono font-semibold text-slate-800">{matriculaGenerada.documento}</p>
                        </div>
                        <div>
                            <span className="text-slate-400">Total a Cancelar en Ventanilla (1+1):</span>
                            <p className="text-lg font-black text-amber-900">$140.00 USD</p>
                        </div>
                        <div>
                            <span className="text-slate-400">Correo para Envío:</span>
                            <p className="font-semibold text-blue-900 truncate">{personalData.correoPersonal}</p>
                        </div>
                        </div>
                    </div>

                    {/* CÓDIGO NPE Y BARRAS */}
                    <div className="text-center rounded-xl border-2 border-slate-800 p-5 bg-white">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Número de Pago Electrónico (NPE)
                        </p>
                        <p className="mt-1 font-mono text-lg font-black tracking-widest text-slate-900">
                        {matriculaGenerada.npe}
                        </p>

                        <div className="my-3 flex justify-center">
                        <div className="flex h-14 items-center gap-[2px] bg-white px-4">
                            {[4, 2, 6, 2, 8, 3, 2, 7, 3, 2, 6, 3, 2, 8, 4, 2, 7, 3, 2, 5, 2, 8, 4, 3].map((w, i) => (
                            <div key={i} className="bg-black h-full" style={{ width: `${w}px` }} />
                            ))}
                        </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                        *NPE-{matriculaGenerada.idMatricula}-14000*
                        </p>
                    </div>

                    {/* ALERTA DE CADUCIDAD */}
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-800">
                        <span>
                        Tus cupos permanecerán reservados por <strong>48 horas</strong>. Fecha límite de pago:{' '}
                        <strong>{matriculaGenerada.fechaVencimiento}</strong>.
                        </span>
                    </div>
                    </div>

                    {/* ACCIONES DE CIERRE DEL PROCESO */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => setPaso(3)}
                        className="w-full sm:w-auto rounded-xl border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        ← Cambiar Canal
                    </button>

                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                        <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-full sm:w-auto rounded-xl border border-blue-900 px-5 py-2.5 font-semibold text-blue-900 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                        >
                        <span>🖨️ Imprimir Boleta</span>
                        </button>

                        <button
                        type="button"
                        disabled={enviandoCorreo}
                        onClick={async () => {
                            setEnviandoCorreo(true);
                            try {
                            // Notificación formal y cambio a estado terminal
                            toast.success('Boleta generada y enviada', {
                                description: `Instrucciones enviadas a ${personalData.correoPersonal}`
                            });
                            setBoletaFinalizada(true);
                            } catch {
                            toast.error('No se pudo confirmar el envío del correo');
                            } finally {
                            setEnviandoCorreo(false);
                            }
                        }}
                        className="w-full sm:w-auto rounded-xl bg-blue-900 px-6 py-2.5 font-bold text-white shadow-md hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                        >
                        <span>{enviandoCorreo ? 'Enviando...' : 'Finalizar Registro →'}</span>
                        </button>
                    </div>
                    </div>
                </div>
                ) : (
                /* PANTALLA TERMINAL DE CONFIRMACIÓN DE ENVÍO */
                <div className="rounded-2xl border border-emerald-300 bg-white p-8 shadow-md text-center animate-in zoom-in-95 duration-300">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl font-bold mb-4">
                    ✓
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-900">
                    ¡Pre-Matrícula Asentada con Éxito!
                    </h2>
                    
                    <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                    Hemos enviado la boleta con el código NPE y las instrucciones detalladas de pago a tu correo electrónico:
                    </p>

                    <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 max-w-md mx-auto text-left space-y-2">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Destinatario:</span>
                        <span className="font-mono font-bold text-blue-900">{personalData.correoPersonal}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">NPE de Caja:</span>
                        <span className="font-mono font-bold text-slate-800">{matriculaGenerada.npe}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Total a Pagar:</span>
                        <span className="font-bold text-emerald-700">$140.00 USD</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Plazo Límite:</span>
                        <span className="font-medium text-amber-800">48 horas</span>
                    </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-6">
                    Al cancelar en ventanilla, colecturía emitirá tu factura y se activará tu acceso institucional.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                        Reimprimir Boleta
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => {
                        // Limpiar formulario y reiniciar ciclo de admisión
                        setPaso(1);
                        setMatriculaGenerada(null);
                        setBoletaFinalizada(false);
                        window.location.href = '/';
                        }}
                        className="rounded-xl bg-blue-900 px-8 py-3 font-bold text-white shadow hover:bg-blue-800 transition-colors"
                    >
                        Volver a la Página Principal
                    </button>
                    </div>
                </div>
                )}
            </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* PESTAÑA 2: MÓDULO COLECTURÍA / CAJA (CONSUMO FINANZAS SERVICE) */
          /* ========================================================================= */
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 animate-in fade-in duration-300">
            <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-blue-950 sm:text-2xl">
                  Terminal de Caja y Colecturía Institucional
                </h2>
                <p className="text-sm text-slate-500">
                  Cobro de aranceles y liquidación en ventanilla por DUI o Carnet[cite: 6].
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                Punto Recaudo: Colecturía Central
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={busquedaCajero}
                onChange={(e) => setBusquedaCajero(e.target.value.toUpperCase())}
                placeholder="Ingrese DUI del aspirante (ej. 09112233-4) o Carnet..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-blue-900 focus:outline-none"
              />
              <button
                onClick={async () => {
                  if (!busquedaCajero.trim()) return;
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${encodeURIComponent(busquedaCajero)}/estado-cuenta`);
                    if (!res.ok) throw new Error('No encontrado');
                    const data = await res.json();
                    setEstudianteEnCaja(data);
                    setCargosSeleccionadosCaja(data.cargosPendientes?.map(c => c.idCargo) || []);
                    setCajaProcesada(null);
                  } catch {
                    toast.error('Aspirante no encontrado', { description: 'Verifique el DUI o Carnet ingresado.' });
                  }
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-6 py-2.5 font-semibold text-white hover:bg-blue-800"
              >
                <span>Consultar Deuda</span>
              </button>
            </div>

            {estudianteEnCaja && !cajaProcesada && (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {estudianteEnCaja.estudiante?.nombreCompleto || 'Aspirante UMA'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Identificador: <span className="font-mono font-semibold">{estudianteEnCaja.estudiante?.carnet}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <span className="text-xs text-slate-500">Total a percibir en Efectivo / POS:</span>
                    <p className="text-2xl font-black text-blue-950">$140.00 USD</p>
                  </div>
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/procesar`, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            ...(token && { 'Authorization': `Bearer ${token}` })
                          },
                          body: JSON.stringify({
                            idEstudiante: estudianteEnCaja.estudiante.idEstudiante,
                            idsCargosAPagar: cargosSeleccionadosCaja,
                            arancelesAdicionales: [],
                            montoRecibido: 140.0,
                            idMetodoPago: 1, // Efectivo
                            numeroReferencia: 'COBRO-VENTANILLA-ONLINE'
                          })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Error al procesar en ventanilla');
                        setCajaProcesada(data);
                        toast.success('Cobro registrado en Colecturía');
                      } catch (e) {
                        toast.error(e.message);
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <span>{isProcessing ? 'Procesando...' : 'Procesar Pago y Emitir Factura'}</span>
                  </button>
                </div>
              </div>
            )}

            {cajaProcesada && (
              <div className="mt-8 rounded-xl border border-emerald-300 bg-emerald-50/50 p-6 text-center">
                <h3 className="text-lg font-bold text-emerald-950">¡Cobro Asentado en Colecturía!</h3>
                <p className="text-xs text-slate-600 mt-1">Factura emitida exitosamente.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 Universidad Modular Abierta (UMA). Sistema de Registro Académico y Admisiones Online.</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Arquitectura Transaccional • Regla 1+1 • Idempotencia Bancaria y Gestión de Identidad IAM[cite: 2]
        </p>
      </footer>
    </div>
  );
}