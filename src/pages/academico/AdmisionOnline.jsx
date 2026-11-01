import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { admisionService } from '../../services/admisionService';
import { Link } from 'react-router-dom';

function SelectBuscador({ label, loading = false, value, onChange, options = [], placeholder = '-- Seleccione --', searchPlaceholder = 'Buscar...', disabled = false, required = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const filtrados = options.filter(item => (item.nombre || '').toLowerCase().includes(search.toLowerCase()));
  const seleccionado = options.find(item => String(item.id) === String(value));

  const handleLimpiar = (e) => {
    e.stopPropagation();
    if (search) {
      setSearch('');
      inputRef.current?.focus();
    } else if (value) {
      onChange('');
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-40' : 'z-10'}`}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          {label} {required && <span className="text-red-500">*</span>}
          {loading && <span className="animate-pulse text-slate-400 normal-case ml-2">...</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) setSearch('');
          }
        }}
        className={`w-full h-[50px] bg-white border rounded-xl px-4 py-2 text-sm focus:outline-none transition-all flex items-center justify-between shadow-sm ${
          open ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'
        } disabled:bg-slate-50 disabled:text-slate-400`}
      >
        <span className={`line-clamp-1 ${seleccionado ? 'font-bold text-slate-900' : 'text-slate-400 font-medium'}`}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100">
            <div className="relative flex items-center">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-slate-50 text-slate-900 rounded-lg pl-9 pr-9 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
              {(search || seleccionado) && (
                <button type="button" onClick={handleLimpiar} className="absolute right-2 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filtrados.length === 0 ? (
              <div className="px-4 py-6 text-xs font-medium text-slate-400 text-center">Sin resultados</div>
            ) : (
              filtrados.map(item => {
                const activo = String(item.id) === String(value);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => { onChange(String(item.id)); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-3 text-[13px] transition-colors flex items-center justify-between ${activo ? 'bg-slate-900 text-white font-bold' : 'text-slate-700 font-medium hover:bg-slate-50'}`}
                  >
                    <span className="leading-relaxed break-words">{item.nombre}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState('estudiante'); 
  const [paso, setPaso] = useState(1); 

  const [personalData, setPersonalData] = useState({
    idPersona: null,
    idTipoDocumento: 1,
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

  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('');
  const [pensumVigente, setPensumVigente] = useState(null);
  const [ofertaAcademica, setOfertaAcademica] = useState([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState([]);
  const [cargandoOferta, setCargandoOferta] = useState(false);

  const [modalidadPago, setModalidadPago] = useState('EN_LINEA'); 
  const [matriculaGenerada, setMatriculaGenerada] = useState(null);
  const [idempotencyKey] = useState(crypto.randomUUID());

  const [cardData, setCardData] = useState({
    numero: '',
    titular: '',
    expiracion: '',
    cvv: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmacionPago, setConfirmacionPago] = useState(null);

  const [busquedaCajero, setBusquedaCajero] = useState('');
  const [estudianteEnCaja, setEstudianteEnCaja] = useState(null);
  const [cargosSeleccionadosCaja, setCargosSeleccionadosCaja] = useState([]);
  const [cajaProcesada, setCajaProcesada] = useState(null);

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
      .catch(() => toast.error('Error al cargar catálogos'));
  }, []);

  useEffect(() => {
    if (!personalData.idDepartamento) {
      setDistritos([]);
      return;
    }
    admisionService.getDistritos(personalData.idDepartamento)
      .then(setDistritos)
      .catch(() => toast.error('Error al obtener distritos'));
  }, [personalData.idDepartamento]);

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

  const handleNextStep1 = async () => {
    const err = {};
    if (!validarDUI(personalData.numeroDocumento)) err.numeroDocumento = 'DUI inválido';
    if (!personalData.nombres.trim()) err.nombres = 'Requerido';
    if (!personalData.apellidos.trim()) err.apellidos = 'Requerido';
    if (!personalData.fechaNacimiento) err.fechaNacimiento = 'Requerido';
    if (!personalData.correoPersonal.includes('@')) err.correoPersonal = 'Correo inválido';
    if (personalData.telefono.length < 9) err.telefono = 'Requerido';
    if (!personalData.idDistrito) err.idDistrito = 'Requerido';

    setErroresPaso1(err);
    if (Object.keys(err).length > 0) return;

    try {
      const persona = await admisionService.buscarPersonaPorDocumento(personalData.numeroDocumento);
      if (persona) {
        setPersonalData(p => ({
          ...p,
          idPersona: persona.idPersona || persona.id,
          nombres: persona.nombres,
          apellidos: persona.apellidos
        }));
      }
    } catch {}

    setPaso(2);
  };

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

  const handleCrearPreMatricula = async () => {
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
        totalAPagar: res.totalAPagar,
        npe: res.npe,
        fechaVencimiento: res.fechaVencimiento,
        cargosCiclo: [
          { id: 1, concepto: 'Matrícula', cuota: 1, monto: 70.0, obligatoria: true },
          { id: 2, concepto: 'Primera mensualidad', cuota: 1, monto: 70.0, obligatoria: true },
          { id: 3, concepto: 'Mensualidad 2', cuota: 2, monto: 70.0, obligatoria: false },
          { id: 4, concepto: 'Mensualidad 3', cuota: 3, monto: 70.0, obligatoria: false },
          { id: 5, concepto: 'Mensualidad 4', cuota: 4, monto: 70.0, obligatoria: false },
          { id: 6, concepto: 'Mensualidad 5', cuota: 5, monto: 70.0, obligatoria: false }
        ]
      });

      setPaso(3);
    } catch (err) {
      toast.error('Error al procesar');
    } finally {
      setIsProcessing(false);
    }
  };

  const ejecutarPagoOnline = async () => {
    if (!cardData.numero || !cardData.titular || !cardData.expiracion || !cardData.cvv) return;

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
    } catch (err) {
      toast.error('Transacción denegada');
    } finally {
      setIsProcessing(false);
    }
  };

  const inputClass = "w-full h-[50px] bg-white border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400 placeholder-slate-400";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      <div className="w-full max-w-[1200px] mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-inter font-extrabold text-slate-900 leading-none">Codice</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">Portal de admisión</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('estudiante')}
            className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'estudiante' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Aspirante online
          </button>
          <button
            onClick={() => setActiveTab('colecturia')}
            className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'colecturia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Caja / Colecturía
          </button>
        </div>
      </div>

      <main className="w-full max-w-[1000px] mx-auto px-6 pb-20">
        
        {/* ENVOLTORIO DE ANIMACIÓN PARA LAS PESTAÑAS */}
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out">
          
          {activeTab === 'estudiante' ? (
            <div>
              <div className="max-w-3xl mx-auto mb-16 px-4">
                <div className="flex items-start justify-between w-full relative">
                  {/* LÍNEAS DEL STEPPER CORREGIDAS (z-0 y top-6 absoluto) */}
                  <div className="absolute top-6 left-0 w-full h-[2px] bg-slate-200 z-0"></div>
                  <div className="absolute top-6 left-0 h-[2px] bg-slate-900 transition-all duration-500 ease-in-out z-0" style={{ width: `${((paso - 1) / 3) * 100}%` }}></div>
                  
                  {[
                    { num: 1, label: 'Datos personales', desc: 'Validación DUI' },
                    { num: 2, label: 'Carrera & Materias', desc: 'Reserva cupos' },
                    { num: 3, label: 'Plan financiero', desc: 'Matrícula + Mes 1' },
                    { num: 4, label: 'Confirmación', desc: 'Credenciales IAM' }
                  ].map((item) => (
                    // z-10 y bg-slate-50 aseguran que la línea quede por detrás y no cruce el número visualmente
                    <div key={item.num} className="flex flex-col items-center bg-slate-50 px-2 sm:px-4 relative z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 shadow-sm ${
                        paso >= item.num ? 'bg-slate-900 text-white ring-4 ring-slate-100' : 'bg-white text-slate-400 border-2 border-slate-200'
                      }`}>
                        {paso > item.num ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : item.num}
                      </div>
                      <div className="absolute top-16 w-32 text-center hidden sm:block">
                        <p className={`text-[11px] font-bold ${paso >= item.num ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</p>
                        <p className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {paso === 1 && (
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b border-slate-100 gap-4">
                    <div>
                      <h2 className="text-2xl font-inter font-extrabold text-slate-900 mb-1">Paso 1: Expediente de identificación civil</h2>
                      <p className="text-xs font-medium text-slate-500">Cumplimiento de la Ley del Registro Nacional de Personas Naturales de El Salvador.</p>
                    </div>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200">
                      Validación RNPN
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                      <label className={labelClass}>Tipo de documento</label>
                      <input value="DUI - Documento Único" disabled className={inputClass} />
                    </div>

                    <div>
                      <label className={labelClass}>Número de DUI <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        maxLength={10}
                        value={personalData.numeroDocumento}
                        onChange={(e) => setPersonalData({ ...personalData, numeroDocumento: formatearDUIInput(e.target.value) })}
                        placeholder="00000000-0"
                        className={`${inputClass} font-mono tracking-widest ${erroresPaso1.numeroDocumento ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : ''}`}
                      />
                      {erroresPaso1.numeroDocumento && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{erroresPaso1.numeroDocumento}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Fecha de nacimiento <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={personalData.fechaNacimiento}
                        onChange={(e) => setPersonalData({ ...personalData, fechaNacimiento: e.target.value })}
                        className={`${inputClass} ${erroresPaso1.fechaNacimiento ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : ''}`}
                      />
                      {erroresPaso1.fechaNacimiento && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{erroresPaso1.fechaNacimiento}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Nombres <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={personalData.nombres}
                        onChange={(e) => setPersonalData({ ...personalData, nombres: e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, '') })}
                        className={`${inputClass} uppercase ${erroresPaso1.nombres ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : ''}`}
                      />
                      {erroresPaso1.nombres && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{erroresPaso1.nombres}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>Apellidos <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={personalData.apellidos}
                        onChange={(e) => setPersonalData({ ...personalData, apellidos: e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g, '') })}
                        className={`${inputClass} uppercase ${erroresPaso1.apellidos ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : ''}`}
                      />
                      {erroresPaso1.apellidos && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{erroresPaso1.apellidos}</p>}
                    </div>

                    <div>
                      <SelectBuscador 
                        label="Sexo"
                        required
                        value={personalData.sexo}
                        onChange={(val) => setPersonalData({ ...personalData, sexo: val })}
                        options={[{id: 'F', nombre: 'Femenino'}, {id: 'M', nombre: 'Masculino'}]}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Teléfono móvil <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={personalData.telefono}
                        onChange={(e) => setPersonalData({ ...personalData, telefono: formatearTelefonoInput(e.target.value) })}
                        placeholder="0000-0000"
                        className={`${inputClass} font-mono tracking-widest ${erroresPaso1.telefono ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : ''}`}
                      />
                      {erroresPaso1.telefono && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{erroresPaso1.telefono}</p>}
                    </div>

                    <div>
                      <SelectBuscador 
                        label="Departamento"
                        required
                        value={personalData.idDepartamento}
                        onChange={(val) => setPersonalData({ ...personalData, idDepartamento: val, idDistrito: '' })}
                        options={catalogos.departamentos.map(d => ({ id: d.id || d.idDepartamento, nombre: d.nombre || d.nombreDepartamento }))}
                        searchPlaceholder="Buscar departamento..."
                      />
                    </div>

                    <div>
                      <SelectBuscador 
                        label="Distrito / Municipio"
                        required
                        value={personalData.idDistrito}
                        onChange={(val) => setPersonalData({ ...personalData, idDistrito: val })}
                        options={distritos.map(d => ({ id: d.id || d.idDistrito, nombre: d.nombre || d.nombreDistrito }))}
                        disabled={!personalData.idDepartamento}
                        searchPlaceholder="Buscar distrito..."
                      />
                      {erroresPaso1.idDistrito && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{erroresPaso1.idDistrito}</p>}
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <label className={labelClass}>Correo electrónico personal <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        value={personalData.correoPersonal}
                        onChange={(e) => setPersonalData({ ...personalData, correoPersonal: e.target.value.toLowerCase().trim() })}
                        className={`${inputClass} ${erroresPaso1.correoPersonal ? 'border-red-400 focus:border-red-500 focus:ring-red-100 bg-red-50/30' : ''}`}
                      />
                      {erroresPaso1.correoPersonal && <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-wider">{erroresPaso1.correoPersonal}</p>}
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <label className={labelClass}>Dirección residencial completa</label>
                      <input
                        type="text"
                        value={personalData.direccion}
                        onChange={(e) => setPersonalData({ ...personalData, direccion: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-12 pt-6 border-t border-slate-100 flex justify-end">
                    <button onClick={handleNextStep1} className="w-full sm:w-auto h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                      Siguiente paso
                    </button>
                  </div>
                </div>
              )}

              {paso === 2 && (
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b border-slate-100 gap-4">
                    <div>
                      <h2 className="text-2xl font-inter font-extrabold text-slate-900 mb-1">Paso 2: Carrera y materias</h2>
                      <p className="text-xs font-medium text-slate-500">Selecciona tu sede, carrera y reserva tus cupos.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <SelectBuscador 
                      label="Sede universitaria"
                      value={sedeSeleccionada}
                      onChange={(val) => setSedeSeleccionada(val)}
                      options={catalogos.sedes.map(s => ({ id: s.id || s.idSede, nombre: s.nombre || s.nombreSede }))}
                    />
                    <SelectBuscador 
                      label="Carrera profesional"
                      value={carreraSeleccionada}
                      onChange={(val) => setCarreraSeleccionada(val)}
                      options={catalogos.carreras.map(c => ({ id: c.id || c.idCarreraSede, nombre: c.nombre || c.nombreCarrera }))}
                      searchPlaceholder="Buscar carrera..."
                    />
                  </div>

                  <div className="mt-10">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">
                      Asignaturas disponibles
                    </label>

                    {cargandoOferta ? (
                      <div className="py-16 text-center text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 border-dashed animate-pulse">
                        Consultando disponibilidad...
                      </div>
                    ) : ofertaAcademica.length > 0 ? (
                      <div className="space-y-6">
                        {ofertaAcademica.map((materia) => (
                          <div key={materia.idMateria} className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                            <h4 className="font-extrabold text-slate-900 text-sm mb-4">
                              {materia.codigoMateria} {materia.nombreMateria}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {materia.gruposDisponibles.map(grp => {
                                const seleccionado = gruposSeleccionados.includes(grp.idGrupo);
                                const sinCupo = grp.cuposDisponibles <= 0;
                                return (
                                  <div
                                    key={grp.idGrupo}
                                    onClick={() => !sinCupo && toggleGrupo(grp.idGrupo, materia.idMateria)}
                                    className={`p-5 rounded-xl border cursor-pointer transition-all ${
                                      sinCupo ? 'bg-slate-100 border-slate-200 opacity-60' : seleccionado ? 'bg-slate-900 border-slate-900 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <p className={`font-extrabold text-sm ${seleccionado ? 'text-white' : 'text-slate-900'}`}>Grupo {grp.codigoGrupo}</p>
                                      <span className={`text-[9px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${
                                        sinCupo ? 'bg-red-100 text-red-700' : seleccionado ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {sinCupo ? 'SIN CUPO' : `${grp.cuposDisponibles} cupos`}
                                      </span>
                                    </div>
                                    <p className={`text-xs font-medium truncate mb-4 ${seleccionado ? 'text-slate-300' : 'text-slate-500'}`}>{grp.nombreDocente}</p>
                                    <div className="space-y-1.5">
                                      {grp.horarios?.map((h, i) => (
                                        <p key={i} className={`text-[10px] font-bold px-2.5 py-1.5 rounded-md ${
                                          seleccionado ? 'bg-white/10 text-slate-200' : 'bg-slate-50 text-slate-600 border border-slate-100'
                                        }`}>
                                          {h.diaSemana} {h.horaInicio}-{h.horaFin}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                        {carreraSeleccionada && sedeSeleccionada ? 'No hay grupos ofertados.' : 'Selecciona sede y carrera.'}
                      </div>
                    )}
                  </div>

                  <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={() => setPaso(1)} className="h-[50px] px-8 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                      Atrás
                    </button>
                    <button onClick={handleCrearPreMatricula} disabled={isProcessing || gruposSeleccionados.length === 0} className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50">
                      {isProcessing ? 'Procesando...' : 'Generar plan financiero'}
                    </button>
                  </div>
                </div>
              )}

              {paso === 3 && matriculaGenerada && (
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b border-slate-100 gap-4">
                    <div>
                      <h2 className="text-2xl font-inter font-extrabold text-slate-900 mb-1">Paso 3: Plan financiero</h2>
                      <p className="text-xs font-medium text-slate-500">Matrícula y primera cuota requerida.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-10 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Total a cancelar (1+1)</p>
                    <p className="text-5xl font-black text-slate-900 tracking-tight">${matriculaGenerada.totalAPagar.toFixed(2)}</p>
                  </div>

                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Método de pago</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
                    <div onClick={() => setModalidadPago('EN_LINEA')} className={`p-6 rounded-2xl border cursor-pointer transition-all ${modalidadPago === 'EN_LINEA' ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded-md uppercase tracking-widest">Inmediato</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm mb-1">En línea</h4>
                      <p className="text-[11px] font-medium text-slate-500">Tarjeta de crédito/débito.</p>
                    </div>
                    <div onClick={() => setModalidadPago('VENTANILLA')} className={`p-6 rounded-2xl border cursor-pointer transition-all ${modalidadPago === 'VENTANILLA' ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <span className="text-[9px] font-bold bg-slate-200 text-slate-700 px-2 py-1 rounded-md uppercase tracking-widest">48 Horas</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-sm mb-1">Ventanilla</h4>
                      <p className="text-[11px] font-medium text-slate-500">Boleta para pago presencial.</p>
                    </div>
                  </div>

                  <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={() => setPaso(2)} className="h-[50px] px-8 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                      Atrás
                    </button>
                    <button onClick={() => setPaso(4)} className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                      Continuar
                    </button>
                  </div>
                </div>
              )}

              {paso === 4 && modalidadPago === 'EN_LINEA' && !confirmacionPago && (
                <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 animate-in fade-in zoom-in-95 duration-300">
                  <div className="text-center mb-10">
                    <h2 className="text-2xl font-inter font-extrabold text-slate-900 mb-2">Pago seguro</h2>
                    <p className="text-xs font-medium text-slate-500">Monto a debitar: <span className="font-extrabold text-slate-900">$140.00</span></p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className={labelClass}>Número de tarjeta</label>
                      <input
                        type="text"
                        maxLength={19}
                        value={cardData.numero}
                        onChange={(e) => setCardData({ ...cardData, numero: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() })}
                        className={`${inputClass} font-mono tracking-widest`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Titular</label>
                      <input
                        type="text"
                        value={cardData.titular}
                        onChange={(e) => setCardData({ ...cardData, titular: e.target.value.toUpperCase().replace(/[^A-Z ]/g, '') })}
                        className={`${inputClass} uppercase`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Expiración</label>
                        <input
                          type="text"
                          maxLength={5}
                          value={cardData.expiracion}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                            setCardData({ ...cardData, expiracion: val });
                          }}
                          placeholder="MM/AA"
                          className={`${inputClass} text-center font-mono`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardData.cvv}
                          onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                          className={`${inputClass} text-center font-mono`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={() => setPaso(3)} disabled={isProcessing} className="h-[50px] px-6 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50">
                      Cancelar
                    </button>
                    <button onClick={ejecutarPagoOnline} disabled={isProcessing || !cardData.numero} className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50">
                      {isProcessing ? 'Procesando...' : 'Pagar ahora'}
                    </button>
                  </div>
                </div>
              )}

              {paso === 4 && modalidadPago === 'EN_LINEA' && confirmacionPago && (
                <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 animate-in zoom-in-95 duration-300 text-center">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-md">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className="text-3xl font-inter font-extrabold text-slate-900 mb-2">¡Matrícula exitosa!</h2>
                  <p className="text-sm font-medium text-slate-500 mb-10">Tus credenciales han sido generadas correctamente.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-left space-y-5 mb-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Carnet</p>
                      <p className="text-xl font-black text-slate-900 font-mono tracking-widest">{confirmacionPago.carnet}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Correo institucional</p>
                      <p className="text-sm font-bold text-slate-900">{confirmacionPago.correoInstitucional}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contraseña provisional</p>
                      <p className="text-sm font-bold text-slate-900">{confirmacionPago.carnet}Uma*</p>
                    </div>
                  </div>

                  <Link to="/" className="inline-flex h-[50px] items-center justify-center px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm w-full">
                    Ir a iniciar sesión
                  </Link>
                </div>
              )}

              {paso === 4 && modalidadPago === 'VENTANILLA' && matriculaGenerada && (
                <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 animate-in zoom-in-95 duration-300 text-center">
                  {!boletaFinalizada ? (
                    <>
                      <h2 className="text-3xl font-inter font-extrabold text-slate-900 mb-2">Boleta generada</h2>
                      <p className="text-sm font-medium text-slate-500 mb-10">Presenta este código NPE en colecturía.</p>
                      
                      <div className="bg-white border-2 border-slate-900 rounded-2xl p-10 mb-10 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">NPE</p>
                        <p className="text-3xl font-black text-slate-900 font-mono tracking-widest">{matriculaGenerada.npe}</p>
                      </div>

                      <button
                        onClick={() => setBoletaFinalizada(true)}
                        className="h-[50px] w-full bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        Finalizar registro
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-md">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h2 className="text-3xl font-inter font-extrabold text-slate-900 mb-2">Reserva completada</h2>
                      <p className="text-sm font-medium text-slate-500 mb-10">Instrucciones enviadas a tu correo.</p>
                      <Link to="/" className="inline-flex h-[50px] items-center justify-center px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm w-full">
                        Volver al inicio
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            
            <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200">
              <h2 className="text-3xl font-inter font-extrabold text-slate-900 mb-2">Colecturía</h2>
              <p className="text-sm font-medium text-slate-500 mb-10">Cobro de aranceles por ventanilla.</p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <input
                  type="text"
                  value={busquedaCajero}
                  onChange={(e) => setBusquedaCajero(e.target.value.toUpperCase().trim())}
                  placeholder="DUI o Carnet"
                  className="flex-1 h-[50px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm"
                />
                <button
                  onClick={async () => {
                    if (!busquedaCajero.trim()) return;
                    try {
                      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/estudiantes/${encodeURIComponent(busquedaCajero)}/estado-cuenta`);
                      if (!res.ok) throw new Error();
                      const data = await res.json();
                      setEstudianteEnCaja(data);
                      setCargosSeleccionadosCaja(data.cargosPendientes?.map(c => c.idCargo) || []);
                      setCajaProcesada(null);
                    } catch {
                      toast.error('No encontrado');
                    }
                  }}
                  className="h-[50px] px-8 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm w-full sm:w-auto"
                >
                  Buscar
                </button>
              </div>

              {estudianteEnCaja && !cajaProcesada && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 animate-in zoom-in-95 duration-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg mb-1">{estudianteEnCaja.estudiante?.nombreCompleto}</h3>
                      <p className="text-slate-500 font-mono text-sm font-bold">{estudianteEnCaja.estudiante?.carnet}</p>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">A cobrar</p>
                      <p className="text-4xl font-black text-slate-900 tracking-tight">$140.00</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/pagos/procesar`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) },
                          body: JSON.stringify({
                            idEstudiante: estudianteEnCaja.estudiante.idEstudiante,
                            idsCargosAPagar: cargosSeleccionadosCaja,
                            montoRecibido: 140.0,
                            idMetodoPago: 1,
                            numeroReferencia: 'VENTANILLA'
                          })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error();
                        setCajaProcesada(data);
                      } catch {
                        toast.error('Error al procesar');
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    disabled={isProcessing}
                    className="w-full h-[50px] bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isProcessing ? 'Procesando...' : 'Confirmar pago'}
                  </button>
                </div>
              )}

              {cajaProcesada && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center mb-6 shadow-md">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-2xl font-inter font-extrabold text-slate-900 mb-2">Pago completado</h3>
                  <p className="text-slate-500 font-medium text-sm mb-8">La factura ha sido emitida.</p>
                  <button onClick={() => { setEstudianteEnCaja(null); setBusquedaCajero(''); }} className="h-[50px] px-10 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                    Nueva consulta
                  </button>
                </div>
              )}
            </div>
            
          )}
        </div>
      </main>
    </div>
  );
} 