import { normalizarBusqueda, validarCorreoRegistro, validarNacimientoRegistro, limitesFechaNacimiento } from '../../utils/validacionesRegistro';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const extraerDigitos = (texto = '') => {
  let resultado = '';
  const str = String(texto || '');
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch >= '0' && ch <= '9') resultado += ch;
  }
  return resultado;
};

const extraerAlfanumerico = (texto = '') => {
  let resultado = '';
  const str = String(texto || '').toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'Z')) resultado += ch;
  }
  return resultado;
};

const formatearDui = (valor = '') => {
  const digitos = extraerDigitos(valor).slice(0, 9);
  if (digitos.length > 8) return `${digitos.slice(0, 8)}-${digitos.slice(8, 9)}`;
  return digitos;
};

const formatearNit = (valor = '') => {
  const digitos = extraerDigitos(valor).slice(0, 14);
  if (digitos.length > 13) return `${digitos.slice(0, 4)}-${digitos.slice(4, 10)}-${digitos.slice(10, 13)}-${digitos.slice(13, 14)}`;
  if (digitos.length > 10) return `${digitos.slice(0, 4)}-${digitos.slice(4, 10)}-${digitos.slice(10)}`;
  if (digitos.length > 4) return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
  return digitos;
};

const formatearTelefono = (valor = '') => {
  const digitos = extraerDigitos(valor).slice(0, 8);
  if (digitos.length > 4) return `${digitos.slice(0, 4)}-${digitos.slice(4, 8)}`;
  return digitos;
};

const formatearMayusculas = (t = '') => String(t || '').toUpperCase().replace(/[0-9<>]/g, '');

const esDuiValido = (dui) => {
  const digitos = extraerDigitos(dui);
  if (digitos.length !== 9 || digitos === '000000000') return false;
  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 8; i++) suma += Number(digitos[i]) * pesos[i];
  const verificadorCalculado = (10 - (suma % 10)) % 10;
  return verificadorCalculado === Number(digitos[8]);
};

const esPasaporteValido = (pasaporte) => {
  const limpio = extraerAlfanumerico(pasaporte);
  if (limpio.length < 5 || limpio.length > 15) return false;
  const digitos = extraerDigitos(limpio);
  if (digitos.length === 0 || Number(digitos) === 0) return false;
  return true;
};

const esTelefonoValido = (telefono) => {
  const digitos = extraerDigitos(telefono);
  if (digitos.length !== 8) return false;
  return ['2', '6', '7'].includes(digitos[0]);
};

const esCorreoValido = correo => validarCorreoRegistro(correo) === '';

const calcularFechaMaxima = edadMinima => limitesFechaNacimiento(edadMinima).max;

const obtenerSedeDesdeToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payloadBase64 = token.split('.')[1];
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const decodedJson = JSON.parse(atob(base64));
    return decodedJson.idSede || decodedJson.sedeId || decodedJson.id_sede || '';
  } catch (e) {
    return '';
  }
};

const numeroArancel = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? Math.round((numero + Number.EPSILON) * 100) / 100 : null;
};

const esCarreraPosgrado = (carrera) => {
  const texto = normalizarBusqueda([
    carrera?.nivel,
    carrera?.nombreNivel,
    carrera?.nivelAcademico,
    carrera?.nivelNombre,
    carrera?.nombreCarrera
  ].filter(Boolean).join(' '));
  const esPosgrado = /posgrado|maestria|doctorado|especializacion|tesis/.test(texto);
  const esPregrado = /pregrado|licenciatura|tecnico|grado/.test(texto);
  return esPosgrado && !esPregrado;
};

const construirUrlComprobante = (data) => {
  const endpoint = data?.urlComprobante || data?.comprobanteUrl || data?.urlPrevisualizacion || data?.previewUrl || data?.comprobante?.url || data?.comprobante?.urlPrevisualizacion;
  if (typeof endpoint === 'string' && endpoint.trim()) return { url: endpoint.trim(), local: false };

  const Candidatos = [
    data?.comprobantePdf,
    data?.comprobantePDF,
    data?.comprobanteBase64,
    data?.pdfBase64,
    data?.pdf,
    typeof data?.comprobante === 'string' ? data.comprobante : null,
    data?.comprobante?.base64,
    data?.comprobante?.contenido
  ];
  const base64 = Candidatos.find(valor => typeof valor === 'string' && valor.trim());
  if (!base64) return null;

  const limpio = base64.replace(/^data:application\/(?:pdf|octet-stream|x-pdf);base64,/i, '').replace(/\s/g, '');
  if (!limpio || !/^[A-Za-z0-9+/]+={0,2}$/.test(limpio)) return null;

  try {
    const binario = atob(limpio);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return { url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), local: true };
  } catch {
    return null;
  }
};

const ORDEN_DIAS = {
  'LUNES': 1,
  'MARTES': 2,
  'MIÉRCOLES': 3,
  'MIERCOLES': 3,
  'JUEVES': 4,
  'VIERNES': 5,
  'SÁBADO': 6,
  'SABADO': 6,
  'DOMINGO': 7
};

function SelectBuscador({ label, loading = false, value, onChange, options = [], placeholder = '-- Seleccione --', searchPlaceholder = 'Buscar...', disabled = false }) {
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

  const filtrados = options.filter(item => {
    const nombreItem = item.nombre || item.nombreCarrera || item.nombreSede || '';
    return normalizarBusqueda(nombreItem).includes(normalizarBusqueda(search));
  });

  const seleccionado = options.find(item => {
    const idItem = item.id || item.idCarreraSede;
    return String(idItem) === String(value);
  });

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
        <div className="h-5 mb-1.5 ml-1 flex items-center">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest">
            {label}
            {loading && <span className="animate-pulse text-blue-600 normal-case ml-1">(...)</span>}
          </label>
        </div>
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
        className="w-full h-[50px] bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl px-4 text-base focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm disabled:bg-slate-100/50 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-between text-left gap-3"
      >
        <span className={`truncate ${seleccionado ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium'}`}>
          {seleccionado ? (seleccionado.nombre || seleccionado.nombreCarrera || seleccionado.nombreSede) : placeholder}
        </span>
        <svg className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 border-b border-slate-100 bg-slate-50">
            <div className="relative flex items-center">
              <svg className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-base focus:outline-none focus:border-slate-400 font-medium placeholder-slate-500"
              />
              {(search || seleccionado) && (
                <button type="button" onClick={handleLimpiar} className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
            {filtrados.length === 0 ? (
              <div className="px-4 py-4 text-xs text-slate-600 text-center font-medium">No se encontraron resultados</div>
            ) : (
              filtrados.map(item => {
                const idItem = item.id || item.idCarreraSede;
                const nombreItem = item.nombre || item.nombreCarrera || item.nombreSede;
                const activo = String(idItem) === String(value);
                return (
                  <button
                    type="button"
                    key={idItem}
                    onClick={() => { onChange(String(idItem)); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-3 text-[13px] transition-colors flex items-center justify-between gap-3 ${activo ? 'bg-slate-900 text-white font-semibold' : 'text-slate-700 font-medium hover:bg-slate-50'}`}
                  >
                    <span className="leading-snug break-words">{nombreItem}</span>
                    {activo && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
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

function FilaResumen({ etiqueta, valor, tipo = 'normal', conBorde = false }) {
  const estilos = {
    normal: 'font-bold text-slate-800',
    fuerte: 'font-extrabold text-slate-900',
    total: 'font-black text-lg text-slate-900',
    descuento: 'font-extrabold text-emerald-600',
    externo: 'font-extrabold text-blue-700'
  };
  return (
    <div className={`flex justify-between items-center gap-3 text-sm ${conBorde ? 'pt-3 border-t border-slate-200' : ''}`}>
      <span className="text-slate-500 font-medium">{etiqueta}</span>
      <span className={`${estilos[tipo] || estilos.normal} text-right whitespace-nowrap`}>{valor}</span>
    </div>
  );
}

export default function RegistroNuevoIngreso() {
  const [isLoading, setIsLoading] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [maxFechaNacimiento, setMaxFechaNacimiento] = useState(calcularFechaMaxima(18));
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [personaExistente, setPersonaExistente] = useState(false);
  
  const [catalogos, setCatalogos] = useState({ tiposDocumento: [], sedes: [], departamentos: [], carreras: [] });
  const [distritos, setDistritos] = useState([]);
  const [pensumVigente, setPensumVigente] = useState(null); 
  const [ofertaAcademica, setOfertaAcademica] = useState([]);
  const [cargandoOferta, setCargandoOferta] = useState(false);
  const [cicloActivoStr, setCicloActivoStr] = useState('');

  const [beneficiosDb, setBeneficiosDb] = useState([]);
  const [tipoBeca, setTipoBeca] = useState('1'); 
  const [promocionSeleccionada, setPromocionSeleccionada] = useState(''); 
  const [arancelesPorConcepto, setArancelesPorConcepto] = useState({ matricula: null, cuota: null, cuotaFranja: null });
  const [montosApertura, setMontosApertura] = useState({ matriculaPregrado: null, cuotaPregrado: null, matriculaMaestria: null, cuotaMaestria: null });
  const [comprobanteBeca, setComprobanteBeca] = useState(null);
  const urlComprobanteLocalRef = useRef(null);

  const [formData, setFormData] = useState({
    idPersona: null, idTipoDocumento: '', numeroDocumento: '', nombres: '', apellidos: '',
    fechaNacimiento: '', sexo: '', telefono: '', correoPersonal: '', idDepartamento: '', idDistrito: '', direccion: '',
    idSede: obtenerSedeDesdeToken(),
    idCarreraSede: '', idPensum: '', idGruposSeleccionados: []
  });

  useEffect(() => () => {
    if (urlComprobanteLocalRef.current) URL.revokeObjectURL(urlComprobanteLocalRef.current);
  }, []);

  const esTipoDui = () => {
    if (String(formData.idTipoDocumento) === '1') return true;
    const docOpt = catalogos.tiposDocumento?.find(d => String(d.id) === String(formData.idTipoDocumento));
    return (docOpt?.nombre || '').toUpperCase().includes('DUI');
  };

  const esTipoNit = () => {
    if (String(formData.idTipoDocumento) === '3') return true;
    const docOpt = catalogos.tiposDocumento?.find(d => String(d.id) === String(formData.idTipoDocumento));
    return (docOpt?.nombre || '').toUpperCase().includes('NIT');
  };

  useEffect(() => {
    if (formData.idTipoDocumento && catalogos.tiposDocumento.length > 0) {
      const edadMinima = esTipoDui() ? 18 : 15;
      const maxFecha = calcularFechaMaxima(edadMinima);
      setMaxFechaNacimiento(maxFecha);
      
      if (formData.fechaNacimiento && formData.fechaNacimiento > maxFecha) {
        setFormData(prev => ({ ...prev, fechaNacimiento: '' }));
      }
    } else {
      setMaxFechaNacimiento(calcularFechaMaxima(18));
    }
  }, [formData.idTipoDocumento, catalogos.tiposDocumento]);

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/catalogos?nombres=tipos_documento,sedes,departamentos,carreras`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCatalogos({
            tiposDocumento: data['tipos_documento'] || data['tipos-documento'] || [], 
            sedes: data['sedes'] || [], 
            departamentos: data['departamentos'] || [],
            carreras: data['carreras'] || []
          });
        }
      } catch (error) { toast.error('Error al cargar catálogos.'); }
    };
    fetchCatalogos();
  }, []);

  useEffect(() => {
    let activo = true;
    const fetchCicloActivo = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/operativo-oferta`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const nombreCiclo = data.ciclo && data.anio ? `${data.ciclo}-${data.anio}` : data.nombre || data.codigoCiclo;
          setCicloActivoStr(nombreCiclo);

          if (data.idCiclo) {
            const [resAranceles, resApertura] = await Promise.all([
              fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/aranceles/ciclo/${data.idCiclo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }),
              fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/${data.idCiclo}/aranceles-apertura`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
            ]);

            if (resAranceles.ok) {
              const arancelesData = await resAranceles.json();
              let mat = null, cuo = null, cuoFranja = null;
              arancelesData.forEach(a => {
                const nombre = String(a.concepto || '').toLowerCase();
                if (nombre.includes('matrícula') || nombre.includes('matricula')) mat = a.montoBase;
                else if (nombre.includes('franja')) cuoFranja = a.montoBase;
                else if (nombre.includes('cuota') || nombre.includes('mensual')) cuo = a.montoBase;
              });
              if (activo) setArancelesPorConcepto({ matricula: numeroArancel(mat), cuota: numeroArancel(cuo), cuotaFranja: numeroArancel(cuoFranja) });
            }

            if (resApertura.ok) {
              const apertura = await resApertura.json();
              if (activo) setMontosApertura({
                matriculaPregrado: numeroArancel(apertura.montoMatriculaPregrado),
                cuotaPregrado: numeroArancel(apertura.montoCuotaPregrado),
                matriculaMaestria: numeroArancel(apertura.montoMatriculaMaestria),
                cuotaMaestria: numeroArancel(apertura.montoCuotaMaestria)
              });
            }
          }
        }
      } catch (error) {}
    };
    fetchCicloActivo();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const fetchBeneficios = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/finanzas/beneficios`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapeados = data.map(b => ({
            id: String(b.id || b.idBeneficio),
            nombre: b.beneficio || b.nombre,
            porcentaje: b.porcentaje,
            monto: b.monto,
            fechaInicio: b.fechaInicio,
            fechaFin: b.fechaFin
          }));
          const soloPromociones = mapeados.filter(b => !b.nombre.toLowerCase().includes('franja') && !b.nombre.toLowerCase().includes('beca'));
          setBeneficiosDb([{ id: '0', nombre: 'Ninguna promoción' }, ...soloPromociones]);
        }
      } catch (error) {}
    };
    fetchBeneficios();
  }, []);

  useEffect(() => {
    if (!formData.idDepartamento) { setDistritos([]); return; }
    const fetchDistritos = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/catalogos/distritos?padreId=${formData.idDepartamento}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) setDistritos(await res.json());
    };
    fetchDistritos();
  }, [formData.idDepartamento]);

  useEffect(() => {
    if (!formData.idCarreraSede) {
      setPensumVigente(null);
      setFormData(p => ({ ...p, idPensum: '' }));
      return;
    }
    const fetchPensum = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/oferta-academica/pensum-vigente?idCarreraSede=${formData.idCarreraSede}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setPensumVigente(data);
          setFormData(p => ({ ...p, idPensum: data.idPensum })); 
        } else {
          toast.error("Atención", { description: "No hay un plan de estudios activo configurado para esta carrera." });
          setPensumVigente(null);
          setFormData(p => ({ ...p, idPensum: '' }));
        }
      } catch (error) { toast.error("Error al consultar el pensum."); }
    };
    fetchPensum();
  }, [formData.idCarreraSede]);

  useEffect(() => {
    if (!formData.idPensum || !formData.idSede) { setOfertaAcademica([]); return; }
    const fetchOferta = async () => {
      setCargandoOferta(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/oferta-academica/nuevo-ingreso?idPensum=${formData.idPensum}&idSede=${formData.idSede}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          
          const dataOrdenada = data.map(materia => {
            return {
              ...materia,
              gruposDisponibles: materia.gruposDisponibles.map(grupo => {
                return {
                  ...grupo,
                  horarios: [...grupo.horarios].sort((a, b) => {
                    const diaA = (a.diaSemana || '').toUpperCase();
                    const diaB = (b.diaSemana || '').toUpperCase();
                    const ordenA = ORDEN_DIAS[diaA] || 99;
                    const ordenB = ORDEN_DIAS[diaB] || 99;
                    
                    if (ordenA !== ordenB) {
                      return ordenA - ordenB;
                    }
                    return (a.horaInicio || '').localeCompare(b.horaInicio || '');
                  })
                };
              })
            };
          });

          setOfertaAcademica(dataOrdenada);
          setFormData(prev => ({ ...prev, idGruposSeleccionados: [] }));
        }
      } catch (error) { toast.error('Error al cargar horarios.'); } finally { setCargandoOferta(false); }
    };
    fetchOferta();
  }, [formData.idPensum, formData.idSede]);

  const handleReset = () => {
    toast.dismiss();
    if (urlComprobanteLocalRef.current) {
      URL.revokeObjectURL(urlComprobanteLocalRef.current);
      urlComprobanteLocalRef.current = null;
    }
    setComprobanteBeca(null);
    setDocumentoVerificado(false);
    setPersonaExistente(false);
    setTipoBeca('1');
    setPromocionSeleccionada('');
    setFormData(prev => ({
      idPersona: null, idTipoDocumento: prev.idTipoDocumento, numeroDocumento: '', nombres: '', apellidos: '',
      fechaNacimiento: '', sexo: '', telefono: '', correoPersonal: '', idDepartamento: '', idDistrito: '', direccion: '',
      idCarreraSede: '', idPensum: '', idGruposSeleccionados: []
    }));
  };

  const handleTipoDocumentoChange = (val) => {
    toast.dismiss();
    setDocumentoVerificado(false);
    setPersonaExistente(false);
    setFormData(prev => ({ ...prev, idTipoDocumento: val, numeroDocumento: '' }));
  };

  const handleNumeroDocumentoChange = (valorInput) => {
    toast.dismiss();
    setDocumentoVerificado(false);
    setPersonaExistente(false);
    
    let nuevoValor = valorInput;
    if (esTipoDui()) {
      nuevoValor = formatearDui(valorInput);
    } else if (esTipoNit()) {
      nuevoValor = formatearNit(valorInput);
    } else {
      nuevoValor = extraerAlfanumerico(valorInput).slice(0, 15);
    }
    
    setFormData(p => ({ ...p, numeroDocumento: nuevoValor }));
  };

  const handleTelefonoChange = (valorInput) => setFormData(prev => ({ ...prev, telefono: formatearTelefono(valorInput) }));
  
  const verificarDocumento = async () => {
    toast.dismiss();
    if (!formData.idTipoDocumento || !formData.numeroDocumento) {
      toast.error('Datos incompletos', { description: 'Selecciona el tipo e ingresa el número de documento.' });
      return;
    }
    
    let docParaEnviar = formData.numeroDocumento.trim();
    if (esTipoDui()) {
      const digitosDui = extraerDigitos(docParaEnviar);
      if (digitosDui.length !== 9) {
        toast.error('DUI incompleto', { description: 'Ingresa los 9 dígitos del DUI (formato 00000000-0).' });
        return;
      }
      if (!esDuiValido(digitosDui)) {
        toast.error('DUI no válido', { description: 'El DUI ingresado no supera la validación matemática.' });
        return;
      }
      docParaEnviar = formatearDui(digitosDui);
    } else if (esTipoNit()) {
      const digitosNit = extraerDigitos(docParaEnviar);
      if (digitosNit.length !== 14) {
        toast.error('NIT incompleto', { description: 'Ingresa los 14 dígitos del NIT (formato 0000-000000-000-0).' });
        return;
      }
      docParaEnviar = formatearNit(digitosNit);
    } else {
      const alfanum = extraerAlfanumerico(docParaEnviar);
      if (!esPasaporteValido(alfanum)) {
        toast.error('Documento inválido', { description: 'Debe contener entre 5 y 15 caracteres alfanuméricos válidos.' });
        return;
      }
      docParaEnviar = alfanum;
    }

    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/personas/buscar-por-documento?numeroDocumento=${encodeURIComponent(docParaEnviar)}`, { headers: { 'Authorization': `Bearer ${token}` }});
      
      if (res.status === 404 || res.status === 204) {
        setDocumentoVerificado(true);
        setPersonaExistente(false);
        setFormData(p => ({ ...p, numeroDocumento: docParaEnviar }));
        toast.success('Aspirante nuevo', { description: 'Documento verificado. Completa el formulario.' });
      } else if (res.ok) {
        const data = await res.json();
        setFormData(p => ({
          ...p, numeroDocumento: docParaEnviar, idPersona: data.idPersona || data.id, 
          nombres: formatearMayusculas(data.nombres || data.nombre), apellidos: formatearMayusculas(data.apellidos || data.apellido), 
          fechaNacimiento: data.fechaNacimiento || data.fechanacimiento, sexo: data.sexo, 
          telefono: formatearTelefono(data.telefono || data.telefonoPersonal || data.celular), 
          correoPersonal: data.correoPersonal || data.correo || data.email, 
          idDepartamento: data.idDepartamento ? String(data.idDepartamento) : '', 
          idDistrito: data.idDistrito ? String(data.idDistrito) : '', direccion: data.direccion || ''
        }));
        setDocumentoVerificado(true);
        setPersonaExistente(true);
        toast.info('Registro existente', { description: 'El estudiante ya se encuentra en el sistema.' });
      } else {
        const errData = await res.json().catch(() => ({}));
        let msjDetallado = errData.mensaje;
        if (!msjDetallado && errData.detalles) {
          msjDetallado = Object.entries(errData.detalles).map(([k, v]) => `${v}`).join(' | ');
        }
        toast.error('Rechazado por el servidor', { description: msjDetallado || `HTTP ${res.status}` });
      }
    } catch (e) { toast.error('Error de conexión', { description: 'Revisa tu conexión con el servidor.' }); } 
    finally { setIsVerifying(false); }
  };

  const toggleGrupo = (idGrupo, idMateria) => {
    if (personaExistente) return;
    setFormData(prev => {
      const materiaActual = ofertaAcademica.find(m => m.idMateria === idMateria);
      const gruposDeEstaMateria = materiaActual ? materiaActual.gruposDisponibles.map(g => g.idGrupo) : [];
      if (prev.idGruposSeleccionados.includes(idGrupo)) {
        return { ...prev, idGruposSeleccionados: prev.idGruposSeleccionados.filter(id => id !== idGrupo) };
      }
      const seleccionadosSinEstaMateria = prev.idGruposSeleccionados.filter(id => !gruposDeEstaMateria.includes(id));
      return { ...prev, idGruposSeleccionados: [...seleccionadosSinEstaMateria, idGrupo] };
    });
  };

  const errorCorreo = validarCorreoRegistro(formData.correoPersonal);
  const errorNacimiento = validarNacimientoRegistro(formData.fechaNacimiento, esTipoDui() ? 18 : 15);
  const validarContactoNacimiento = () => {
    const mensaje = validarCorreoRegistro(formData.correoPersonal) || validarNacimientoRegistro(formData.fechaNacimiento, esTipoDui() ? 18 : 15);
    if (mensaje) { toast.warning('Revisa los datos personales', { description: mensaje }); return false; }
    return true;
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!validarContactoNacimiento()) return;
    if (personaExistente) return;
    if (!esTelefonoValido(formData.telefono)) {
      toast.warning('Teléfono inválido', { description: 'El número telefónico debe tener 8 dígitos e iniciar con 2, 6 o 7.' });
      return;
    }
    if (formData.idGruposSeleccionados.length === 0) {
      toast.warning('Selección académica vacía', { description: 'Debe elegir al menos una materia para pre-matricular.' });
      return;
    }
    setModalConfirmar(true);
  };

  const handleConfirmar = async () => {
    if (isLoading || !validarContactoNacimiento()) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      let idBeneficioFinal = 1; 
      if (tipoBeca !== '1') {
          idBeneficioFinal = Number(tipoBeca);
      } else if (promocionSeleccionada !== '0' && promocionSeleccionada !== '') {
          idBeneficioFinal = Number(promocionSeleccionada);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/nuevo-ingreso/pre-matricula`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          idTipoDocumento: Number(formData.idTipoDocumento),
          idDistrito: Number(formData.idDistrito),
          idSede: Number(formData.idSede),
          idCarreraSede: Number(formData.idCarreraSede),
          idPensum: Number(formData.idPensum),
          tipoBeca: idBeneficioFinal
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detalle = data?.detalles ? Object.entries(data.detalles).map(([c, m]) => `${c}: ${m}`).join(' | ') : data.mensaje;
        throw new Error(detalle || 'Error al generar pre-matrícula.');
      }
      
      const comprobante = construirUrlComprobante(data);
      setModalConfirmar(false);
      handleReset();
      if (comprobante) {
        if (comprobante.local) urlComprobanteLocalRef.current = comprobante.url;
        setComprobanteBeca(comprobante);
      }
      toast.success(data.mensaje || 'Pre-matrícula generada', { description: data.instrucciones, duration: 10000 });
    } catch (err) {
      toast.error('Rechazado por el servidor', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const carreraSeleccionada = catalogos.carreras?.find(c => String(c.idCarreraSede ?? c.id) === String(formData.idCarreraSede));
  const nivelSeleccionado = esCarreraPosgrado(carreraSeleccionada) ? 'POSGRADO' : 'PREGRADO';
  const arancelesCiclo = useMemo(() => {
    const esPosgrado = nivelSeleccionado === 'POSGRADO';
    const matriculaNivel = esPosgrado ? montosApertura.matriculaMaestria : montosApertura.matriculaPregrado;
    const cuotaNivel = esPosgrado ? montosApertura.cuotaMaestria : montosApertura.cuotaPregrado;
    const cuotaBase = cuotaNivel ?? arancelesPorConcepto.cuota ?? arancelesPorConcepto.matricula ?? 0;

    return {
      nivel: nivelSeleccionado,
      matricula: matriculaNivel ?? arancelesPorConcepto.matricula ?? 0,
      cuota: cuotaBase,
      cuotaFranja: arancelesPorConcepto.cuotaFranja ?? cuotaBase
    };
  }, [nivelSeleccionado, montosApertura, arancelesPorConcepto]);

  const getFinanzas = () => {
    const redondear = valor => Math.round((valor + Number.EPSILON) * 100) / 100;
    const matricula = arancelesCiclo.matricula;
    const cuotaBase = arancelesCiclo.cuota;
    const subsidioDesdeArancel = cuotaBase - arancelesCiclo.cuotaFranja;
    const subsidioUnitario = subsidioDesdeArancel > 0
      ? redondear(subsidioDesdeArancel)
      : (arancelesCiclo.nivel === 'PREGRADO' && cuotaBase > 0 ? 17 : 0);
    const cuotaBecada = Math.max(0, redondear(cuotaBase - subsidioUnitario));
    const subtotal = redondear(matricula + (cuotaBase * 6));

    let descMatricula = 0;
    let descCuotaTotal = 0;
    let descCuotaUnica = 0;
    let descUnitarioPromo = 0;

    if (tipoBeca === '2') {
      descCuotaTotal = redondear(subsidioUnitario * 6);
    } else if (tipoBeca === '3') {
      descMatricula = matricula;
      descCuotaTotal = redondear(cuotaBase * 6);
    } else if (tipoBeca === '1' && promocionSeleccionada !== '0' && promocionSeleccionada !== '') {
      const promo = beneficiosDb.find(b => String(b.id) === String(promocionSeleccionada));
      if (promo) {
        const hoy = new Date().toISOString().split('T')[0];
        const esValidaHoy = (!promo.fechaInicio || hoy >= promo.fechaInicio) && (!promo.fechaFin || hoy <= promo.fechaFin);

        if (esValidaHoy) {
          const isFeria = promo.nombre.toLowerCase().includes('feria');
          let valorDescCuota = 0;

          if (promo.porcentaje > 0) {
            valorDescCuota = (cuotaBase * promo.porcentaje) / 100;
          } else if (promo.monto > 0) {
            valorDescCuota = Math.min(promo.monto, cuotaBase);
          }
          descUnitarioPromo = redondear(valorDescCuota);

          if (isFeria) {
            descCuotaUnica = descUnitarioPromo;
          } else {
            descCuotaTotal = redondear(descUnitarioPromo * 6);
          }
        }
      }
    }

    const descuento = redondear(descMatricula + descCuotaTotal + descCuotaUnica);
    const total = Math.max(0, redondear(subtotal - descuento));
    const cuotaInicial = tipoBeca === '2' ? cuotaBecada : cuotaBase;
    const pagoInicial = (tipoBeca === '3' || tipoBeca === '4')
      ? 0
      : Math.max(0, redondear(matricula - descMatricula + cuotaInicial - descUnitarioPromo));

    return {
      nivel: arancelesCiclo.nivel,
      matricula,
      cuotaBase,
      cuotaBecada,
      subsidioUnitario,
      subtotal,
      descuentoMatricula: descMatricula,
      descuentoCuotas: descCuotaTotal,
      descuentoUnico: descCuotaUnica,
      descuento,
      total,
      pagoInicial,
      cubiertoTerceros: tipoBeca === '4' ? subtotal : 0
    };
  };

  const finanzas = getFinanzas();

  const digitosDocActual = extraerDigitos(formData.numeroDocumento);
  const alfanumDocActual = extraerAlfanumerico(formData.numeroDocumento);
  
  const documentoFormatoCompleto = esTipoDui()
    ? digitosDocActual.length === 9
    : esTipoNit()
      ? digitosDocActual.length === 14
      : alfanumDocActual.length >= 5;

  const docValido = documentoFormatoCompleto && (
    esTipoDui() ? esDuiValido(digitosDocActual)
    : esTipoNit() ? digitosDocActual.length === 14
    : esPasaporteValido(alfanumDocActual)
  );

  const c1 = [formData.nombres, formData.apellidos, formData.idTipoDocumento, docValido, !errorNacimiento, formData.sexo].filter(Boolean).length;
  const c2 = [esTelefonoValido(formData.telefono), esCorreoValido(formData.correoPersonal), formData.idDepartamento, formData.idDistrito, formData.direccion].filter(Boolean).length;
  const c3 = [formData.idSede, formData.idCarreraSede, formData.idPensum, formData.idGruposSeleccionados.length > 0].filter(Boolean).length;

  const getStatus1 = () => (c1 === 6 && documentoVerificado) ? { state: 'complete' } : (c1 > 0 ? { state: 'active', pct: Math.round((c1 / 6) * 100) } : { state: 'idle' });
  const getStatus2 = () => (c2 === 5 && documentoVerificado) ? { state: 'complete' } : (c2 > 0 ? { state: 'active', pct: Math.round((c2 / 5) * 100) } : { state: 'idle' });
  const getStatus3 = () => personaExistente ? { state: 'idle' } : (c3 === 4 && documentoVerificado) ? { state: 'complete' } : (c3 > 0 ? { state: 'active', pct: Math.round((c3 / 4) * 100) } : { state: 'idle' });
  const isReady = (c1 === 6 && c2 === 5 && c3 === 4 && documentoVerificado && !personaExistente);

  const st1 = getStatus1(); const st2 = getStatus2(); const st3 = getStatus3();

  const StepPoint = ({ statusObj, label, stepNum }) => {
    const { state, pct } = statusObj;
    return (
      <div className="flex flex-col items-center relative z-10 w-10 group cursor-default">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm ${
          state === 'complete' ? 'border-[#2E7D32] bg-[#2E7D32]' : 
          state === 'active' ? 'border-[#2E7D32] text-[#2E7D32] bg-white' : 'border-slate-200 text-slate-400 bg-white'
        }`}>
          {state === 'complete' && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          {state === 'active' && <span className="font-extrabold text-[10px]">{pct}%</span>}
          {state === 'idle' && <span className="font-extrabold text-sm">{stepNum}</span>}
        </div>
        <span className={`absolute top-11 text-[9px] font-extrabold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
          state === 'complete' ? 'text-[#2E7D32]' : state === 'active' ? 'text-slate-900' : 'text-slate-400'
        }`}>{label}</span>
      </div>
    );
  };

  const StepLine = ({ percentage }) => (
    <div className="flex-1 flex items-center px-1">
      <div className="h-[3px] w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#2E7D32] transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );

  const getIniciales = () => formData.nombres ? formData.nombres.charAt(0).toUpperCase() : 'A';
  const getNombreCompleto = () => (!formData.nombres && !formData.apellidos) ? 'Perfil de aspirante' : `${formData.nombres} ${formData.apellidos}`;
  const getPreviewCodigo = () => formData.nombres ? `ASP-${new Date().getFullYear()}-XXXX` : `ASP-YYYY-XXXX`;
  const getPreviewEmail = () => (!formData.nombres || !formData.apellidos) ? 'usuario@uma.edu.sv' : `${formData.nombres.trim().charAt(0).toLowerCase()}.${formData.apellidos.trim().split(' ')[0].toLowerCase()}@uma.edu.sv`;
  const getCarreraTexto = () => !formData.idCarreraSede ? '---' : (catalogos.carreras?.find(a => String(a.idCarreraSede) === String(formData.idCarreraSede))?.nombreCarrera || '---');
  const getSedeTexto = () => !formData.idSede ? '---' : (catalogos.sedes?.find(s => String(s.id) === String(formData.idSede))?.nombre || '---');

  const inputClass = "w-full h-[50px] bg-slate-50/50 text-slate-900 border border-slate-200 rounded-xl px-4 text-base focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-400 transition-all shadow-sm disabled:bg-slate-100/50 disabled:text-slate-500 disabled:cursor-not-allowed placeholder-slate-400";
  const labelClass = "block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5 ml-1";
  const sectionTitleClass = "text-[12px] font-extrabold text-slate-900 uppercase tracking-widest mb-5 pb-2 border-b border-slate-200 flex items-center gap-2";

  const opcionesTipoBeca = [
    { id: '1', nombre: 'Ninguna (Alumno Regular)' },
    { id: '2', nombre: 'Franja Becaria (Subsidio Parcial)' },
    { id: '3', nombre: 'Beca Completa Institucional (100%)' },
    { id: '4', nombre: 'Beca de Terceros (Paga entidad externa)' },
  ];

  return (
    <div className="w-full max-w-7xl pb-20 font-sans text-slate-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-inter font-extrabold tracking-tight text-slate-900">Ingreso de aspirantes</h1>
        <p className="text-slate-600 text-sm font-medium">Fase 1: Pre-matrícula y selección académica.</p>
      </div>

      <form onSubmit={handlePreSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-7 xl:col-span-8 space-y-10">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 rounded-l-2xl"></div>
            
            <div className="flex justify-between items-center mb-4">
              <h3 className={sectionTitleClass.replace('mb-5 pb-2 border-b border-slate-200', 'mb-0 border-0')}>Paso 1: Verificación de identidad</h3>
              <button type="button" onClick={handleReset} className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Restablecer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <SelectBuscador label="Tipo doc." value={formData.idTipoDocumento} onChange={handleTipoDocumentoChange} options={catalogos.tiposDocumento} placeholder="-- Seleccione --" disabled={isVerifying} />
              </div>
              <div className="md:col-span-5">
                <div className="h-5 mb-1.5 ml-1 flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest">Número de doc.</label>
                  {documentoFormatoCompleto && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full leading-none ${docValido ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {docValido ? (esTipoDui() ? '✓ DUI auténtico' : esTipoNit() ? '✓ Formato válido' : '✓ Válido') : (esTipoDui() ? '✕ Inválido' : '✕ Formato')}
                    </span>
                  )}
                </div>
                <input type="text" inputMode={esTipoDui() || esTipoNit() ? "numeric" : "text"} value={formData.numeroDocumento} onChange={e => handleNumeroDocumentoChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verificarDocumento(); } }} disabled={!formData.idTipoDocumento || isVerifying || documentoVerificado} className={`${inputClass} ${!formData.idTipoDocumento ? 'bg-slate-100/50 cursor-not-allowed' : ''}`} placeholder={esTipoDui() ? '00000000-0' : esTipoNit() ? '0000-000000-000-0' : 'Ej. A12345678'} />
              </div>
              <div className="md:col-span-3">
                <button type="button" onClick={verificarDocumento} disabled={!formData.numeroDocumento || documentoVerificado || isVerifying} className="w-full h-[50px] bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center gap-2">
                  {isVerifying ? 'Buscando...' : documentoVerificado ? 'Verificado' : 'Verificar'}
                  {!isVerifying && documentoVerificado && <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </button>
              </div>
            </div>

            {documentoVerificado && personaExistente && (
              <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <h4 className="text-sm font-bold text-blue-900 leading-none mb-1">Aspirante en proceso o matriculado</h4>
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">Este estudiante ya se encuentra registrado. No es posible generar una nueva pre-matrícula.</p>
                </div>
              </div>
            )}
          </div>

          <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <h3 className={sectionTitleClass}><div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div> Datos biográficos y de contacto {personaExistente && <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">Bloqueado</span>}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div><label className={labelClass}>Nombres</label><input required type="text" disabled={personaExistente} value={formData.nombres} onChange={e => setFormData(p => ({...p, nombres: formatearMayusculas(e.target.value)}))} className={inputClass} placeholder="Ej. JUAN CARLOS" /></div>
              <div><label className={labelClass}>Apellidos</label><input required type="text" disabled={personaExistente} value={formData.apellidos} onChange={e => setFormData(p => ({...p, apellidos: formatearMayusculas(e.target.value)}))} className={inputClass} placeholder="Ej. PEREZ GARCIA" /></div>
              <div><div className="h-5 mb-1.5 ml-1 flex items-center"><label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest">Fecha nacimiento</label></div><input aria-invalid={Boolean(formData.fechaNacimiento && errorNacimiento)} aria-describedby={formData.fechaNacimiento && errorNacimiento ? "error-nacimiento" : undefined} min={limitesFechaNacimiento().min} required type="date" disabled={personaExistente} max={maxFechaNacimiento} value={formData.fechaNacimiento} onChange={e => setFormData(p => ({...p, fechaNacimiento: e.target.value}))} className={inputClass} />
                    {formData.fechaNacimiento && errorNacimiento && <p id="error-nacimiento" role="alert" className="mt-1.5 text-xs text-red-600">{errorNacimiento}</p>}</div>
              <div><SelectBuscador label="Sexo" value={formData.sexo} onChange={v => setFormData(p => ({...p, sexo: v}))} options={[{id: 'M', nombre: 'Masculino'}, {id: 'F', nombre: 'Femenino'}]} placeholder="-- Seleccione --" disabled={personaExistente} /></div>
              <div><div className="h-5 mb-1.5 ml-1 flex items-center justify-between"><label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest">Teléfono</label>{formData.telefono && !['2', '6', '7'].includes(formData.telefono.charAt(0)) && (<span className="text-[10px] font-bold text-red-600">Debe iniciar con 2, 6 o 7</span>)}</div><input required type="tel" maxLength={9} disabled={personaExistente} value={formData.telefono} onChange={e => handleTelefonoChange(e.target.value)} className={inputClass} placeholder="7000-0000" /></div>
              <div><div className="h-5 mb-1.5 ml-1 flex items-center"><label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest">Correo personal</label></div><input aria-invalid={Boolean(formData.correoPersonal && errorCorreo)} aria-describedby={formData.correoPersonal && errorCorreo ? "error-correo" : undefined} maxLength={254} required type="email" disabled={personaExistente} value={formData.correoPersonal} onChange={e => setFormData(p => ({...p, correoPersonal: e.target.value.toLowerCase().trim()}))} className={inputClass} placeholder="juan@gmail.com" />
                    {formData.correoPersonal && errorCorreo && <p id="error-correo" role="alert" className="mt-1.5 text-xs text-red-600">{errorCorreo}</p>}</div>
            </div>
          </div>

          <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <h3 className={sectionTitleClass}><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Datos de residencia {personaExistente && <span className="ml-2 text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">Bloqueado</span>}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <SelectBuscador label="Departamento" disabled={personaExistente} value={formData.idDepartamento} onChange={v => setFormData(p => ({...p, idDepartamento: v, idDistrito: ''}))} options={catalogos.departamentos} placeholder="-- Seleccione depto. --" />
              <SelectBuscador label="Distrito" disabled={personaExistente || !formData.idDepartamento} value={formData.idDistrito} onChange={v => setFormData(p => ({...p, idDistrito: v}))} options={distritos} placeholder={distritos.length === 0 ? '-- Elija depto. --' : '-- Seleccione distrito --'} />
              <div className="md:col-span-2"><label className={labelClass}>Dirección detallada</label><textarea required disabled={personaExistente} value={formData.direccion} onChange={e => setFormData(p => ({...p, direccion: e.target.value.replace(/[<>]/g, '')}))} rows="2" className={`${inputClass} h-auto py-3 resize-none`} placeholder="Colonia, pasaje, casa..." /></div>
            </div>
          </div>

          <div className={`transition-opacity duration-300 ${(!documentoVerificado || personaExistente) ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <h3 className={sectionTitleClass}><div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div> Proyección académica</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
              <div className="md:col-span-1"><SelectBuscador label="Sede operativa" disabled={true} value={formData.idSede} onChange={v => setFormData(p => ({...p, idSede: v}))} options={catalogos.sedes} placeholder="-- Sede --" /></div>
              <div className="md:col-span-1"><SelectBuscador label="Carrera solicitada" disabled={personaExistente} value={formData.idCarreraSede} onChange={v => setFormData(p => ({...p, idCarreraSede: v}))} options={catalogos.carreras} placeholder="-- Seleccione carrera --" searchPlaceholder="Buscar carrera..." /></div>
              <div className="md:col-span-1"><label className={labelClass}>Pensum vigente</label><div className={`w-full h-[50px] bg-slate-50/50 border border-slate-200 rounded-xl px-4 flex items-center text-base cursor-not-allowed ${pensumVigente ? 'text-slate-900 font-extrabold' : 'text-slate-500 font-medium'}`}>{pensumVigente ? `Plan ${pensumVigente.version}` : '-- Autocompletado --'}</div></div>
            </div>
          </div>

          <div className={`transition-opacity duration-300 ${(!formData.idPensum || personaExistente) ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
             <div className="flex justify-between items-center mb-5 pb-2 border-b border-slate-200">
               <h3 className="text-[12px] font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Selección de horarios {cicloActivoStr ? `— ${cicloActivoStr}` : ''}</h3>
               <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md font-bold">{formData.idGruposSeleccionados.length} materias</span>
             </div>
             
             {cargandoOferta ? (
               <div className="text-center py-8 text-slate-500 font-medium text-sm animate-pulse">Consultando cupos...</div>
             ) : ofertaAcademica.length === 0 && formData.idPensum ? (
               <div className="text-center py-8 text-slate-500 font-medium text-sm">No hay grupos abiertos para esta carrera en esta sede.</div>
             ) : (
               <div className="space-y-6">
                 {ofertaAcademica.map((materia) => (
                   <div key={materia.idMateria} className="border border-slate-200 rounded-xl p-5 bg-slate-50 shadow-sm">
                      <h4 className="font-extrabold text-sm text-slate-900 mb-3">{materia.codigoMateria} — {materia.nombreMateria}</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {materia.gruposDisponibles.map(grupo => {
                         const isSelected = formData.idGruposSeleccionados.includes(grupo.idGrupo);
                         const sinCupo = grupo.cuposDisponibles <= 0;
                         return (
                           <div key={grupo.idGrupo} onClick={() => !sinCupo && !personaExistente && toggleGrupo(grupo.idGrupo, materia.idMateria)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${sinCupo ? 'bg-red-50/50 border-red-100 opacity-60 cursor-not-allowed' : isSelected ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                             <div className="flex justify-between items-start mb-2.5"><span className="font-extrabold text-xs text-slate-900">Grupo {grupo.codigoGrupo}</span><span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${sinCupo ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>{sinCupo ? 'LLENO' : `${grupo.cuposDisponibles} cupos`}</span></div>
                             <p className="text-[11px] font-medium text-slate-600 mb-3 truncate">Catedrático: <span className="font-bold text-slate-800">{grupo.nombreDocente}</span></p>
                             <div className="space-y-1.5">
                               {grupo.horarios.map((h, i) => (
                                 <div key={i} className={`text-[10px] font-bold ${isSelected ? 'bg-emerald-100/50 text-emerald-800' : 'bg-slate-100 text-slate-600'} rounded-md px-2 py-1 flex justify-between`}><span>{h.diaSemana}</span><span>{h.horaInicio} - {h.horaFin} ({h.modalidad})</span></div>
                               ))}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 ))}
               </div>
             )}

             <div className={`mt-8 pt-8 border-t border-slate-200 transition-opacity duration-300 ${personaExistente ? 'opacity-50 pointer-events-none' : ''}`}>
               <h3 className={sectionTitleClass}><div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div> Resumen Financiero</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 <div>
                   <SelectBuscador 
                     label="Tipo de Beca del Alumno" 
                     value={tipoBeca} 
                     onChange={(val) => { setTipoBeca(val); setPromocionSeleccionada(''); }} 
                     options={opcionesTipoBeca} 
                     placeholder="-- Seleccione tipo --" 
                     disabled={personaExistente}
                   />
                 </div>
                 
                 {tipoBeca === '1' && (
                   <div className="animate-in fade-in duration-300">
                     <SelectBuscador 
                       label="Aplicar Promoción Especial (Opcional)" 
                       value={promocionSeleccionada} 
                       onChange={setPromocionSeleccionada} 
                       options={beneficiosDb} 
                       placeholder="-- Sin promoción --" 
                       disabled={personaExistente}
                     />
                   </div>
                 )}
               </div>
               
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded-md">
                    Nivel: {finanzas.nivel === 'POSGRADO' ? 'Posgrado' : 'Pregrado'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                    Arancel {cicloActivoStr || 'del ciclo activo'}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  {tipoBeca === '1' && (
                    <>
                      <FilaResumen etiqueta="Matrícula (sin descuento)" valor={`$${finanzas.matricula.toFixed(2)}`} />
                      <FilaResumen etiqueta={`6 cuotas mensuales de $${finanzas.cuotaBase.toFixed(2)}`} valor={`$${(finanzas.cuotaBase * 6).toFixed(2)}`} />
                      <FilaResumen etiqueta="Subtotal sin beca" valor={`$${finanzas.subtotal.toFixed(2)}`} conBorde />
                      {finanzas.descuento > 0 && (
                        <>
                          <FilaResumen etiqueta="Beneficio aplicado a las 6 cuotas" valor={`-$${finanzas.descuento.toFixed(2)}`} tipo="descuento" />
                          <FilaResumen etiqueta="Total del ciclo" valor={`$${finanzas.total.toFixed(2)}`} tipo="fuerte" />
                        </>
                      )}
                      <FilaResumen etiqueta="Pago inicial para activar (Matrícula + Cuota 1)" valor={`$${finanzas.pagoInicial.toFixed(2)}`} tipo="total" conBorde />
                    </>
                  )}

                  {tipoBeca === '2' && (
                    <>
                      <FilaResumen etiqueta="Matrícula (sin descuento)" valor={`$${finanzas.matricula.toFixed(2)}`} />
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Subsidio aplicado a las 6 mensualidades</p>
                        <p className="text-xs text-emerald-900 font-bold mt-1">
                          ${finanzas.cuotaBase.toFixed(2)} - ${finanzas.subsidioUnitario.toFixed(2)} = ${finanzas.cuotaBecada.toFixed(2)} c/u
                        </p>
                        <div className="flex justify-between items-center mt-2 text-sm">
                          <span className="text-slate-500 font-medium">6 cuotas becadas</span>
                          <span className="font-extrabold text-emerald-700">${(finanzas.cuotaBecada * 6).toFixed(2)}</span>
                        </div>
                      </div>
                      <FilaResumen etiqueta="Subtotal sin beca" valor={`$${finanzas.subtotal.toFixed(2)}`} conBorde />
                      <FilaResumen etiqueta="Descuento Franja Becaria (6 cuotas)" valor={`-$${finanzas.descuento.toFixed(2)}`} tipo="descuento" />
                      <FilaResumen etiqueta="Total del ciclo" valor={`$${finanzas.total.toFixed(2)}`} tipo="fuerte" />
                      <FilaResumen etiqueta={`Pago inicial requerido (Matrícula $${finanzas.matricula.toFixed(2)} + Cuota 1 becada $${finanzas.cuotaBecada.toFixed(2)})`} valor={`$${finanzas.pagoInicial.toFixed(2)}`} tipo="total" conBorde />
                    </>
                  )}

                  {tipoBeca === '3' && (
                    <>
                      <FilaResumen etiqueta="Subtotal sin beca" valor={`$${finanzas.subtotal.toFixed(2)}`} conBorde />
                      <FilaResumen etiqueta="Descuento Beca 100%" valor={`-$${finanzas.descuento.toFixed(2)}`} tipo="descuento" />
                      <FilaResumen etiqueta="Total a pagar" valor={`$${finanzas.total.toFixed(2)}`} tipo="total" conBorde />
                      <p className="text-xs text-emerald-800 font-semibold leading-relaxed bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        El estudiante quedará matriculado de inmediato y recibirá su comprobante PDF de beca y credenciales por correo.
                      </p>
                    </>
                  )}

                  {tipoBeca === '4' && (
                    <>
                      <FilaResumen etiqueta="Monto total cubierto por entidad externa" valor={`$${finanzas.cubiertoTerceros.toFixed(2)}`} tipo="externo" />
                      <FilaResumen etiqueta="Descuento institucional" valor="$0.00" />
                      <FilaResumen etiqueta="Total del ciclo" valor={`$${finanzas.subtotal.toFixed(2)}`} tipo="fuerte" conBorde />
                      <FilaResumen etiqueta="Pago inicial requerido al aspirante" valor={`$${finanzas.pagoInicial.toFixed(2)}`} tipo="total" conBorde />
                      <p className="text-xs text-blue-800 font-semibold leading-relaxed bg-blue-50 border border-blue-200 rounded-lg p-3">
                        El ciclo será cancelado por la entidad externa. El aspirante no realiza este pago en colecturía.
                      </p>
                    </>
                  )}

                  {comprobanteBeca && (
                    <button
                      type="button"
                      onClick={() => window.open(comprobanteBeca.url, '_blank', 'noopener,noreferrer')}
                      className="w-full py-2.5 mt-1 bg-emerald-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Abrir comprobante PDF de beca
                    </button>
                  )}
                </div>

             </div>

             <div className="pt-8 flex justify-end">
               <button type="submit" disabled={isLoading || !isReady || personaExistente} className={`px-8 py-3.5 rounded-xl text-[15px] font-bold transition-all duration-300 flex items-center space-x-2 ${personaExistente ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'}`}>
                 <span>{personaExistente ? 'Registro bloqueado' : 'Generar mandamiento de pago'}</span>
               </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 hidden lg:block relative">
          <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm sticky top-8 transition-all duration-300">
            <div className="mb-10 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{getPreviewCodigo()}</h2>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">{personaExistente ? 'Perfil bloqueado' : 'Nuevo registro de ingreso'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between w-full mb-14 px-2">
              <StepPoint statusObj={st1} label="Personal" stepNum="1" />
              <StepLine percentage={st1.state === 'complete' ? 100 : (st1.pct || 0)} />
              <StepPoint statusObj={st2} label="Contacto" stepNum="2" />
              <StepLine percentage={st2.state === 'complete' ? 100 : (st2.pct || 0)} />
              <StepPoint statusObj={st3} label="Académico" stepNum="3" />
              <StepLine percentage={st3.state === 'complete' ? 100 : (st3.pct || 0)} />
              <StepPoint statusObj={{ state: isReady ? 'complete' : 'idle', pct: 0 }} label="Listo" stepNum="4" />
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold mb-3 shadow-sm transition-colors relative border ${personaExistente ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                {getIniciales()}
                {personaExistente && (<span className="absolute -bottom-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white"></span></span>)}
              </div>
              <h4 className={`text-base font-extrabold text-center leading-tight ${!formData.nombres && !formData.apellidos ? 'text-slate-400' : 'text-slate-900'}`}>{getNombreCompleto()}</h4>
              {formData.idGruposSeleccionados.length > 0 && (<div className="mt-2.5 flex flex-wrap gap-1.5 justify-center"><span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">{formData.idGruposSeleccionados.length} MATERIAS</span></div>)}
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-4">
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Correo</span><span className="font-bold text-slate-800">{getPreviewEmail()}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Documento</span><span className="font-bold text-slate-800 text-right">{formData.numeroDocumento || '----------'}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Sede operativa</span><span className="font-bold text-slate-800 text-right w-1/2 truncate">{getSedeTexto()}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-medium">Carrera</span><span className="font-bold text-slate-800 text-right w-1/2 truncate">{getCarreraTexto()}</span></div>
            </div>

            <div className="mt-8 pt-5 border-t border-dashed border-slate-200">
              <p className={`text-[10px] text-center leading-relaxed font-bold ${personaExistente ? 'text-blue-600' : 'text-slate-400'}`}>{personaExistente ? 'Esta vista está bloqueada porque el aspirante ya se encuentra en el sistema.' : 'Al finalizar se generará la deuda en tesorería, el aspirante será oficial hasta cancelar en colectaduría.'}</p>
            </div>
          </div>
        </div>
      </form>

      {modalConfirmar && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity" onClick={() => !isLoading && setModalConfirmar(false)}></div>
          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-slate-200 text-left my-8 animate-in zoom-in-95 duration-200">
              
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div>
                  <div><h3 className="text-lg font-extrabold text-slate-900">¿Confirmar pre-matrícula?</h3><p className="text-xs text-slate-500 mt-0.5 font-medium">Finaliza el proceso de inscripción.</p></div>
                </div>
                <span className="bg-slate-100 text-slate-800 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0">{formData.numeroDocumento}</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3.5 text-xs my-6">
                <div className="flex justify-between gap-4 border-b border-slate-200/60 pb-2.5"><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Aspirante</span><span className="font-extrabold text-slate-900 text-right">{formData.nombres} {formData.apellidos}</span></div>
                <div className="flex justify-between gap-4 border-b border-slate-200/60 pb-2.5"><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Sede operativa</span><span className="font-semibold text-slate-700 text-right">{getSedeTexto()}</span></div>
                <div className="flex justify-between gap-4 border-b border-slate-200/60 pb-2.5"><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Carrera elegida</span><span className="font-bold text-slate-800 text-right max-w-[200px] truncate">{getCarreraTexto()}</span></div>
                <div className="flex justify-between items-center gap-4 pt-0.5"><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Materias a cursar</span><span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md font-bold text-[11px]">{formData.idGruposSeleccionados.length} seleccionadas</span></div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm"><span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Pago inicial requerido</span><span className="font-black text-xl text-slate-900">${finanzas.pagoInicial.toFixed(2)}</span></div>
                {tipoBeca === '3' && (<div className="flex justify-between items-center text-[11px]"><span className="text-emerald-700 font-semibold">Beca 100% · total del ciclo</span><span className="text-emerald-700 font-bold">${finanzas.total.toFixed(2)}</span></div>)}
                {tipoBeca === '4' && (<div className="flex justify-between items-center text-[11px]"><span className="text-blue-700 font-semibold">Cubierto por entidad externa</span><span className="text-blue-700 font-bold">${finanzas.cubiertoTerceros.toFixed(2)}</span></div>)}
                {tipoBeca !== '3' && tipoBeca !== '4' && finanzas.descuento > 0 && (<div className="flex justify-between items-center text-[11px]"><span className="text-slate-400 font-medium">Subtotal sin descuento</span><span className="text-slate-400 font-medium line-through">${finanzas.subtotal.toFixed(2)}</span></div>)}
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed mb-6">
                {tipoBeca === '3'
                  ? 'El aspirante quedará matriculado de inmediato. El comprobante de beca y las credenciales se enviarán por correo.'
                  : tipoBeca === '4'
                    ? 'La entidad externa cubrirá el ciclo completo; se reservarán los cupos sin generar deuda para el aspirante.'
                    : 'Se reservarán los cupos en los grupos seleccionados y se generará la deuda en el sistema financiero institucional para ser cancelada en colectaduría.'}
              </p>
              
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setModalConfirmar(false)} disabled={isLoading} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
                <button type="button" onClick={handleConfirmar} disabled={isLoading} className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2">{isLoading ? 'Procesando...' : 'Sí, generar pre-matrícula'}</button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}