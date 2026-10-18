import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const extraerDigitos = (texto = '') => {
  let resultado = '';
  const str = String(texto || '');
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch >= '0' && ch <= '9') {
      resultado += ch;
    }
  }
  return resultado;
};

const extraerAlfanumerico = (texto = '') => {
  let resultado = '';
  const str = String(texto || '').toUpperCase();
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch >= '0' && ch <= '9') || (ch >= 'A' && ch <= 'Z')) {
      resultado += ch;
    }
  }
  return resultado;
};

const formatearDui = (valor = '') => {
  const digitos = extraerDigitos(valor).slice(0, 9);
  if (digitos.length > 8) {
    return `${digitos.slice(0, 8)}-${digitos.slice(8, 9)}`;
  }
  return digitos;
};

const formatearTelefono = (valor = '') => {
  const digitos = extraerDigitos(valor).slice(0, 8);
  if (digitos.length > 4) {
    return `${digitos.slice(0, 4)}-${digitos.slice(4, 8)}`;
  }
  return digitos;
};

const esDuiValido = (dui) => {
  const digitos = extraerDigitos(dui);
  if (digitos.length !== 9) return false;
  if (digitos === '000000000') return false;

  const pesos = [9, 8, 7, 6, 5, 4, 3, 2];
  let suma = 0;
  for (let i = 0; i < 8; i++) {
    suma += Number(digitos[i]) * pesos[i];
  }

  const verificadorCalculado = (10 - (suma % 10)) % 10;
  return verificadorCalculado === Number(digitos[8]);
};

const esPasaporteValido = (pasaporte) => {
  const limpio = extraerAlfanumerico(pasaporte);
  if (limpio.length < 6 || limpio.length > 12) return false;
  const digitos = extraerDigitos(limpio);
  if (digitos.length === 0) return false;
  if (Number(digitos) === 0) return false;
  return true;
};

const esTelefonoValido = (telefono) => {
  const digitos = extraerDigitos(telefono);
  if (digitos.length !== 8) return false;
  const inicial = digitos[0];
  return inicial === '2' || inicial === '6' || inicial === '7';
};

const esCorreoValido = (correo) => {
  const limpio = String(correo || '').trim();
  if (!limpio || limpio.includes(' ')) return false;
  const arroba = limpio.indexOf('@');
  if (arroba <= 0) return false;
  const punto = limpio.lastIndexOf('.');
  return punto > arroba + 1 && punto < limpio.length - 1;
};

function SelectBuscador({
  label,
  loading = false,
  value,
  onChange,
  options = [],
  placeholder = '-- Seleccione --',
  searchPlaceholder = 'Buscar...',
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const filtrados = options.filter(item =>
    (item.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const seleccionado = options.find(
    item => String(item.id) === String(value)
  );

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
      <div className="h-5 mb-1.5 ml-1 flex items-center">
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {label}
          {loading && <span className="animate-pulse text-blue-500 normal-case ml-1">(...)</span>}
        </label>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) setSearch('');
          }
        }}
        className="w-full h-[50px] bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm disabled:bg-gray-50/80 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-between text-left gap-3"
      >
        <span className={`truncate ${seleccionado ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex items-center">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl pl-9 pr-9 py-2 text-xs focus:outline-none focus:border-gray-400"
              />
              {(search || seleccionado) && (
                <button
                  type="button"
                  onClick={handleLimpiar}
                  title={search ? "Limpiar búsqueda" : "Limpiar selección"}
                  className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <div className="px-4 py-4 text-xs text-gray-400 text-center">
                No se encontraron resultados
              </div>
            ) : (
              filtrados.map(item => {
                const activo = String(item.id) === String(value);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      onChange(String(item.id));
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full text-left px-4 py-3 text-[13px] transition-colors flex items-center justify-between gap-3 ${
                      activo ? 'bg-gray-900 text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="leading-snug break-words">{item.nombre}</span>
                    {activo && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
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

function RegistroEmpleado() {
  const [isLoading, setIsLoading] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [maxFechaNacimiento, setMaxFechaNacimiento] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [personaExistente, setPersonaExistente] = useState(false);
  const [rolesActuales, setRolesActuales] = useState([]);

  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(true);
  const [catalogos, setCatalogos] = useState({
    tiposDocumento: [],
    departamentos: [],
    areas: [],
    cargos: []
  });

  const [distritos, setDistritos] = useState([]);
  const [isLoadingDistritos, setIsLoadingDistritos] = useState(false);

  const [formData, setFormData] = useState({
    idPersona: null, 
    idTipoDocumento: '',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    sexo: '',
    telefono: '',
    correoPersonal: '',
    idDepartamento: '',
    idDistrito: '',
    direccion: '',
    idArea: '',
    idCargo: ''
  });

  const esEmpleadoActivo = rolesActuales.some(r => typeof r === 'string' && r.toUpperCase().includes('EMPLEADO'));

  useEffect(() => {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - 18);
    setMaxFechaNacimiento(hoy.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/catalogos?nombres=tipos-documento,departamentos,areas,cargos`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

        const data = await response.json();
        setCatalogos({
          tiposDocumento: data['tipos-documento'] || data['tipos_documento'] || [],
          departamentos: data['departamentos'] || [],
          areas: data['areas'] || [],
          cargos: data['cargos'] || []
        });
      } catch (error) {
        toast.error('Error al cargar catálogos', { description: 'Revisa tu conexión con el servidor.' });
      } finally {
        setIsLoadingCatalogos(false);
      }
    };
    fetchCatalogos();
  }, []);

  useEffect(() => {
    if (!formData.idDepartamento) {
      setDistritos([]);
      return;
    }
    const fetchDistritos = async () => {
      setIsLoadingDistritos(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/catalogos/distritos?padreId=${formData.idDepartamento}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (res.ok) {
          const data = await res.json();
          setDistritos(data);
        }
      } catch (error) {
        toast.error('Error al cargar distritos');
      } finally {
        setIsLoadingDistritos(false);
      }
    };
    fetchDistritos();
  }, [formData.idDepartamento]);

  const esTipoDui = () => {
    if (String(formData.idTipoDocumento) === '1') return true;
    const docOpt = catalogos.tiposDocumento?.find(d => String(d.id) === String(formData.idTipoDocumento));
    return (docOpt?.nombre || '').toUpperCase().includes('DUI');
  };

  const handleReset = () => {
    setDocumentoVerificado(false);
    setPersonaExistente(false);
    setRolesActuales([]);

    setFormData(prev => ({
      idPersona: null, 
      idTipoDocumento: prev.idTipoDocumento, 
      numeroDocumento: '',
      nombres: '',
      apellidos: '',
      fechaNacimiento: '',
      sexo: '',
      telefono: '',
      correoPersonal: '',
      idDepartamento: '',
      idDistrito: '',
      direccion: '',
      idArea: '',
      idCargo: ''
    }));
  };

  const handleTipoDocumentoChange = (val) => {
    setDocumentoVerificado(false);
    setPersonaExistente(false);
    setRolesActuales([]);
    setFormData(prev => ({ ...prev, idTipoDocumento: val, numeroDocumento: '' }));
  };

  const handleNumeroDocumentoChange = (valorInput) => {
    setDocumentoVerificado(false);
    setPersonaExistente(false);
    setRolesActuales([]);

    const nuevoValor = esTipoDui()
      ? formatearDui(valorInput)
      : extraerAlfanumerico(valorInput).slice(0, 12);

    setFormData(prev => ({ ...prev, numeroDocumento: nuevoValor }));
  };

  const handleTelefonoChange = (valorInput) => {
    setFormData(prev => ({ ...prev, telefono: formatearTelefono(valorInput) }));
  };

  const verificarDocumento = async () => {
    if (!formData.idTipoDocumento || !formData.numeroDocumento) {
      toast.error('Datos Incompletos', { description: 'Selecciona el tipo e ingresa el número de documento.' });
      return;
    }

    let docParaEnviar = formData.numeroDocumento.trim();

    if (esTipoDui()) {
      const digitosDui = extraerDigitos(docParaEnviar);
      if (digitosDui.length !== 9) {
        toast.error('DUI Incompleto', { description: 'Ingresa los 9 dígitos del DUI (formato 00000000-0).' });
        return;
      }
      if (!esDuiValido(digitosDui)) {
        toast.error('DUI No Válido', { description: 'El número de DUI ingresado no supera la validación matemática oficial (Módulo 10).' });
        return;
      }
      docParaEnviar = formatearDui(digitosDui);
    } else {
      const alfanum = extraerAlfanumerico(docParaEnviar);
      if (!esPasaporteValido(alfanum)) {
        toast.error('Pasaporte / Documento Inválido', { description: 'Debe contener entre 6 y 12 caracteres alfanuméricos válidos.' });
        return;
      }
      docParaEnviar = alfanum;
    }

    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/personas/buscar-por-documento?numeroDocumento=${encodeURIComponent(docParaEnviar)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 404 || response.status === 204) {
        setPersonaExistente(false);
        setDocumentoVerificado(true);
        setRolesActuales([]);
        setFormData(prev => ({
          ...prev,
          numeroDocumento: docParaEnviar,
          idPersona: null,
          nombres: '',
          apellidos: '',
          fechaNacimiento: '',
          sexo: '',
          telefono: '',
          correoPersonal: '',
          idDepartamento: '',
          idDistrito: '',
          direccion: '',
          idArea: '',
          idCargo: ''
        }));
        toast.success('Documento Verificado y Libre', { description: 'Puedes proceder a registrar al nuevo empleado.' });
        return;
      }

      if (response.ok) {
        const text = await response.text();
        if (!text) {
          setPersonaExistente(false);
          setDocumentoVerificado(true);
          setRolesActuales([]);
          setFormData(prev => ({ ...prev, numeroDocumento: docParaEnviar }));
          toast.success('Documento Verificado y Libre', { description: 'Puedes proceder a registrar al nuevo empleado.' });
          return;
        }

        const data = JSON.parse(text);
        const roles = data.rolesActivos || data.roles || data.perfiles || [];
        const tieneEmpleado = roles.some(r => typeof r === 'string' && r.toUpperCase().includes('EMPLEADO'));

        setFormData(prev => ({
          ...prev,
          numeroDocumento: docParaEnviar,
          idPersona: data.idPersona || data.id || null,
          nombres: data.nombres || data.nombre || '',
          apellidos: data.apellidos || data.apellido || '',
          fechaNacimiento: data.fechaNacimiento || data.fechanacimiento || '',
          sexo: data.sexo || '',
          telefono: formatearTelefono(data.telefono || data.telefonoPersonal || data.celular || ''),
          correoPersonal: data.correoPersonal || data.correo || data.email || '',
          idDepartamento: data.idDepartamento ? String(data.idDepartamento) : '', 
          idDistrito: data.idDistrito ? String(data.idDistrito) : '',
          direccion: data.direccion || '',
          idArea: data.idArea ? String(data.idArea) : '',
          idCargo: data.idCargo ? String(data.idCargo) : ''
        }));

        setPersonaExistente(true);
        setDocumentoVerificado(true);
        setRolesActuales(roles);

        if (tieneEmpleado) {
          toast.error('Empleado ya registrado', { description: 'El documento ingresado ya pertenece a un Empleado activo.' });
        } else {
          toast.success('Persona Encontrada', { description: 'Se autocompletaron los datos personales. Completa la asignación de cargo.' });
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.mensaje || 'Error al verificar el documento');
      }
    } catch (error) {
      toast.error('Error de Verificación', { description: 'Revisa tu conexión con el servidor.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const digitosDocActual = extraerDigitos(formData.numeroDocumento);
  const alfanumDocActual = extraerAlfanumerico(formData.numeroDocumento);

  const documentoFormatoCompleto = esTipoDui()
    ? digitosDocActual.length === 9
    : alfanumDocActual.length >= 6;

  const docValido = documentoFormatoCompleto && (
    esTipoDui() ? esDuiValido(digitosDocActual) : esPasaporteValido(alfanumDocActual)
  );

  const c1 = [
    String(formData.nombres || '').trim() !== '',
    String(formData.apellidos || '').trim() !== '',
    String(formData.idTipoDocumento || '').trim() !== '',
    docValido,
    String(formData.fechaNacimiento || '').trim() !== '',
    String(formData.sexo || '').trim() !== ''
  ].filter(Boolean).length;

  const c2 = [
    esTelefonoValido(formData.telefono),
    esCorreoValido(formData.correoPersonal),
    String(formData.idDepartamento || '').trim() !== '',
    String(formData.idDistrito || '').trim() !== '',
    String(formData.direccion || '').trim() !== ''
  ].filter(Boolean).length;

  const c3 = [
    String(formData.idArea || '').trim() !== '',
    String(formData.idCargo || '').trim() !== ''
  ].filter(Boolean).length;

  const isReady = (c1 === 6 && c2 === 5 && c3 === 2 && documentoVerificado && !esEmpleadoActivo);

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!documentoVerificado || esEmpleadoActivo) return;

    if (!esTelefonoValido(formData.telefono)) {
      toast.warning('Teléfono inválido', { description: 'El número telefónico debe tener 8 dígitos e iniciar con 2, 6 o 7 (ej. 7000-0000).' });
      return;
    }

    if (!isReady) {
      toast.warning('Campos incompletos', { description: 'Por favor completa todos los campos requeridos.' });
      return;
    }

    setModalConfirmar(true);
  };

  const handleConfirmarRegistro = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = `${import.meta.env.VITE_API_URL}/api/v1/empleados`;

      const payload = {
        idTipoDocumento: parseInt(formData.idTipoDocumento, 10),
        numeroDocumento: esTipoDui() ? formatearDui(formData.numeroDocumento) : extraerAlfanumerico(formData.numeroDocumento),
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        fechaNacimiento: formData.fechaNacimiento,
        telefono: formatearTelefono(formData.telefono),
        correoPersonal: formData.correoPersonal.trim(),
        direccion: formData.direccion.trim(),
        sexo: formData.sexo,
        idDistrito: parseInt(formData.idDistrito, 10),
        idArea: parseInt(formData.idArea, 10),
        idCargo: parseInt(formData.idCargo, 10),
        fechaFin: new Date().toISOString().split('T')[0],
        fechasValidas: true
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detalle = data?.detalles
          ? Object.entries(data.detalles).map(([c, m]) => `${c}: ${m}`).join(' | ')
          : data.mensaje;
        throw new Error(detalle || 'Error en la operación.');
      }

      const nombreRegistrado = `${formData.nombres.trim()} ${formData.apellidos.trim()}`;
      setModalConfirmar(false);
      handleReset();

      toast.success(data.mensaje || '¡Empleado registrado con éxito!', {
        description: data.codigoEmpleado || data.correoInstitucional
          ? `Código: ${data.codigoEmpleado || 'Generado'} • Correo: ${data.correoInstitucional || 'Enviado'}`
          : `El perfil administrativo de ${nombreRegistrado} ha sido creado correctamente.`,
        duration: 6000
      });
    } catch (err) {
      toast.error('Error al registrar', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const getIniciales = () => formData.nombres ? formData.nombres.charAt(0).toUpperCase() : 'E';
  const getNombreCompleto = () => (!formData.nombres && !formData.apellidos) ? 'Perfil de Empleado' : `${formData.nombres} ${formData.apellidos}`;
  const getPreviewEmail = () => {
    if (!formData.nombres || !formData.apellidos) return 'usuario@uma.edu.sv';
    return `${formData.nombres.trim().charAt(0).toLowerCase()}.${formData.apellidos.trim().split(' ')[0].toLowerCase()}@uma.edu.sv`;
  };
  const getPreviewCodigo = () => formData.nombres ? `EMP-${new Date().getFullYear()}-XXXX` : `EMP-YYYY-XXXX`;

  const getAreaTexto = () => {
    if (!formData.idArea) return '---';
    const areaEncontrada = catalogos.areas?.find(a => String(a.id) === String(formData.idArea));
    return areaEncontrada ? areaEncontrada.nombre : '---';
  };

  const getCargoTexto = () => {
    if (!formData.idCargo) return '---';
    const cargoEncontrado = catalogos.cargos?.find(c => String(c.id) === String(formData.idCargo));
    return cargoEncontrado ? cargoEncontrado.nombre : '---';
  };

  const getDistritoTexto = () => {
    if (!formData.idDistrito) return '---';
    const distEncontrado = distritos.find(d => String(d.id) === String(formData.idDistrito));
    return distEncontrado ? distEncontrado.nombre : '---';
  };

  const getStatus1 = () => {
    if (c1 === 6 && documentoVerificado) return { state: 'complete' };
    if (c1 < 6 && c1 > 0) return { state: 'active', pct: Math.round((c1 / 6) * 100) };
    return { state: 'idle' };
  };

  const getStatus2 = () => {
    if (c2 === 5 && documentoVerificado) return { state: 'complete' };
    if (c2 > 0 && documentoVerificado) return { state: 'active', pct: Math.round((c2 / 5) * 100) };
    return { state: 'idle' };
  };

  const getStatus3 = () => {
    if (esEmpleadoActivo) return { state: 'idle' }; 
    if (c3 === 2 && documentoVerificado) return { state: 'complete' };
    if (c3 > 0 && documentoVerificado) return { state: 'active', pct: Math.round((c3 / 2) * 100) };
    return { state: 'idle' };
  };

  const st1 = getStatus1();
  const st2 = getStatus2();
  const st3 = getStatus3();

  const StepPoint = ({ statusObj, label, stepNum }) => {
    const { state, pct } = statusObj;
    return (
      <div className="flex flex-col items-center relative z-10 w-10 group cursor-default">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm ${
          state === 'complete' ? 'border-[#2E7D32] bg-[#2E7D32]' : 
          state === 'active' ? 'border-[#2E7D32] text-[#2E7D32] bg-white' : 'border-gray-200 text-gray-300 bg-white'
        }`}>
          {state === 'complete' && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          {state === 'active' && <span className="font-bold text-[10px]">{pct}%</span>}
          {state === 'idle' && <span className="font-bold text-sm">{stepNum}</span>}
        </div>
        <span className={`absolute top-11 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
          state === 'complete' ? 'text-[#2E7D32]' : state === 'active' ? 'text-gray-900' : 'text-gray-400'
        }`}>{label}</span>
      </div>
    );
  };

  const StepLine = ({ percentage }) => (
    <div className="flex-1 flex items-center px-1">
      <div className="h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#2E7D32] transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );

  const inputClassName = "w-full h-[50px] bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400 disabled:bg-gray-50/50 disabled:text-gray-500 disabled:cursor-not-allowed";
  const labelClassName = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";
  const sectionTitleClassName = "text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-5 pb-2 border-b border-gray-100 flex items-center gap-2";

  const opcionesSexo = [
    { id: 'M', nombre: 'Masculino' },
    { id: 'F', nombre: 'Femenino' }
  ];

  const digitosTelefonoActual = extraerDigitos(formData.telefono);

  return (
    <>
      <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

          <div className="lg:col-span-7 xl:col-span-8">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Registro de Empleado</h1>
                <p className="text-gray-500 text-sm">Completa el formulario para generar un nuevo perfil administrativo.</p>
              </div>
            </div>

            <form onSubmit={handlePreSubmit} className="space-y-10">

              <div className="bg-gray-50/50 border border-gray-200/60 p-6 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-black rounded-l-2xl"></div>

                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    Paso 1: Verificación de Identidad
                  </h3>

                  <button 
                    type="button" 
                    onClick={handleReset}
                    className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Restablecer
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4">
                    <SelectBuscador
                      label="Tipo Doc."
                      value={formData.idTipoDocumento}
                      onChange={handleTipoDocumentoChange}
                      options={catalogos.tiposDocumento}
                      placeholder="-- Seleccione --"
                      searchPlaceholder="Buscar tipo..."
                      disabled={isLoadingCatalogos || isVerifying}
                    />
                  </div>

                  <div className="md:col-span-5">
                    <div className="h-5 mb-1.5 ml-1 flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                        Número de Doc.
                      </label>
                      {documentoFormatoCompleto && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full leading-none ${
                          docValido
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {docValido
                            ? (esTipoDui() ? '✓ DUI auténtico' : '✓ Formato válido')
                            : (esTipoDui() ? '✕ Dígito inválido' : '✕ Formato inválido')}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.numeroDocumento}
                      onChange={(e) => handleNumeroDocumentoChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          verificarDocumento();
                        }
                      }}
                      required
                      disabled={!formData.idTipoDocumento || isVerifying}
                      className={`${inputClassName} ${!formData.idTipoDocumento ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
                      placeholder={esTipoDui() ? '00000000-0' : 'Ej. A12345678'}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <button
                      type="button"
                      onClick={verificarDocumento}
                      disabled={isVerifying || !formData.numeroDocumento || documentoVerificado}
                      className="w-full h-[50px] bg-black text-white px-4 rounded-[14px] text-[14px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isVerifying ? 'Buscando...' : documentoVerificado ? 'Verificado' : 'Verificar'}
                      {!isVerifying && documentoVerificado && <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  </div>
                </div>

                {documentoVerificado && esEmpleadoActivo && (
                  <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                      <h4 className="text-sm font-bold text-red-900 leading-none mb-1">Registro Bloqueado</h4>
                      <p className="text-xs text-red-700 leading-relaxed">
                        El perfil de <strong>{formData.nombres} {formData.apellidos}</strong> ya pertenece a un <strong>Empleado Activo</strong>. Desde esta pantalla solo se permiten nuevos registros.
                      </p>
                    </div>
                  </div>
                )}

                {documentoVerificado && personaExistente && !esEmpleadoActivo && (
                  <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900 leading-none mb-1">Perfil Existente Encontrado</h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Esta persona ya está registrada en el sistema como <strong>{rolesActuales.join(', ') || 'Usuario'}</strong>. Sus datos personales han sido bloqueados. Completa los datos institucionales para asignarle un puesto administrativo.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-black"></div> Datos Generales {personaExistente && <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full font-bold">Autocompletado</span>}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className={labelClassName}>Nombres</label>
                    <input
                      type="text"
                      value={formData.nombres}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombres: e.target.value.replace(/[0-9<>]/g, '') }))}
                      required
                      disabled={!documentoVerificado || personaExistente}
                      className={inputClassName}
                      placeholder="Ej. Juan Carlos"
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Apellidos</label>
                    <input
                      type="text"
                      value={formData.apellidos}
                      onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value.replace(/[0-9<>]/g, '') }))}
                      required
                      disabled={!documentoVerificado || personaExistente}
                      className={inputClassName}
                      placeholder="Ej. Pérez García"
                    />
                  </div>
                  <div>
                    <div className="h-5 mb-1.5 ml-1 flex items-center">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">Fecha Nacimiento</label>
                    </div>
                    <input
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, fechaNacimiento: e.target.value }))}
                      required
                      max={maxFechaNacimiento}
                      disabled={!documentoVerificado || personaExistente}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <SelectBuscador
                      label="Sexo"
                      value={formData.sexo}
                      onChange={(val) => setFormData(prev => ({ ...prev, sexo: val }))}
                      options={opcionesSexo}
                      placeholder="-- Seleccione --"
                      searchPlaceholder="Buscar..."
                      disabled={!documentoVerificado || personaExistente}
                    />
                  </div>
                </div>
              </div>

              <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Información de Contacto {personaExistente && <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full font-bold">Bloqueado</span>}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <div className="h-5 mb-1.5 ml-1 flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">Teléfono</label>
                      {digitosTelefonoActual.length > 0 && !['2', '6', '7'].includes(digitosTelefonoActual[0]) && (
                        <span className="text-[10px] font-bold text-red-500">Debe iniciar con 2, 6 o 7</span>
                      )}
                    </div>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => handleTelefonoChange(e.target.value)}
                      required
                      disabled={!documentoVerificado || personaExistente}
                      className={inputClassName}
                      placeholder="7000-0000"
                    />
                  </div>
                  <div>
                    <div className="h-5 mb-1.5 ml-1 flex items-center">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest">Correo Personal</label>
                    </div>
                    <input
                      type="email"
                      value={formData.correoPersonal}
                      onChange={(e) => setFormData(prev => ({ ...prev, correoPersonal: e.target.value.toLowerCase().trim() }))}
                      required
                      disabled={!documentoVerificado || personaExistente}
                      className={inputClassName}
                      placeholder="juan@gmail.com"
                    />
                  </div>

                  <div>
                    <SelectBuscador
                      label="Departamento"
                      value={formData.idDepartamento}
                      onChange={(val) => setFormData(prev => ({ ...prev, idDepartamento: val, idDistrito: '' }))}
                      options={catalogos.departamentos}
                      placeholder="-- Seleccione Departamento --"
                      searchPlaceholder="Buscar departamento..."
                      disabled={!documentoVerificado || isLoadingCatalogos || personaExistente}
                    />
                  </div>

                  <div>
                    <SelectBuscador
                      label="Distrito"
                      loading={isLoadingDistritos}
                      value={formData.idDistrito}
                      onChange={(val) => setFormData(prev => ({ ...prev, idDistrito: val }))}
                      options={distritos}
                      placeholder={distritos.length === 0 ? '-- Elija Depto. --' : '-- Seleccione Distrito --'}
                      searchPlaceholder="Buscar distrito..."
                      disabled={!documentoVerificado || !formData.idDepartamento || distritos.length === 0 || personaExistente}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClassName}>Dirección Detallada</label>
                    <textarea
                      value={formData.direccion}
                      onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value.replace(/[<>]/g, '') }))}
                      required
                      disabled={!documentoVerificado || personaExistente}
                      rows="2"
                      className="w-full bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 py-3 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400 disabled:bg-gray-50/50 disabled:text-gray-500 disabled:cursor-not-allowed resize-none"
                      placeholder="Colonia, pasaje, casa..."
                    />
                  </div>
                </div>
              </div>

              <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Datos Institucionales {esEmpleadoActivo && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Solo Lectura</span>}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <SelectBuscador
                      label="Área Asignada"
                      value={formData.idArea}
                      onChange={(val) => setFormData(prev => ({ ...prev, idArea: val }))}
                      options={catalogos.areas}
                      placeholder="-- Seleccione Área --"
                      searchPlaceholder="Buscar área..."
                      disabled={!documentoVerificado || isLoadingCatalogos || esEmpleadoActivo}
                    />
                  </div>
                  
                  <div>
                    <SelectBuscador
                      label="Puesto / Cargo"
                      value={formData.idCargo}
                      onChange={(val) => setFormData(prev => ({ ...prev, idCargo: val }))}
                      options={catalogos.cargos}
                      placeholder="-- Seleccione Cargo --"
                      searchPlaceholder="Buscar puesto o cargo..."
                      disabled={!documentoVerificado || isLoadingCatalogos || esEmpleadoActivo}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={isLoading || !isReady || esEmpleadoActivo} className={`px-8 py-3.5 rounded-[14px] text-[15px] font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  esEmpleadoActivo ? 'bg-red-50 text-red-400 border border-red-200 cursor-not-allowed' : 'bg-black text-white hover:shadow-lg hover:shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}>
                  <span>{esEmpleadoActivo ? 'Registro Bloqueado' : 'Confirmar e Inscribir'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 hidden lg:block relative">
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-8 transition-all duration-300">
              <div className="mb-10 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">{getPreviewCodigo()}</h2>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">
                    {esEmpleadoActivo ? 'Perfil Bloqueado' : personaExistente ? 'Nuevo Contrato Empleado' : 'Nuevo Registro'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full mb-14 px-2">
                <StepPoint statusObj={st1} label="Personal" stepNum="1" />
                <StepLine percentage={st1.state === 'complete' ? 100 : (st1.pct || 0)} />
                <StepPoint statusObj={st2} label="Contacto" stepNum="2" />
                <StepLine percentage={st2.state === 'complete' ? 100 : (st2.pct || 0)} />
                <StepPoint statusObj={st3} label="Laboral" stepNum="3" />
                <StepLine percentage={st3.state === 'complete' ? 100 : (st3.pct || 0)} />
                <StepPoint statusObj={{ state: isReady ? 'complete' : 'idle', pct: 0 }} label="Listo" stepNum="4" />
              </div>

              <div className="flex flex-col items-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-3 shadow-sm transition-colors relative border ${
                  esEmpleadoActivo ? 'bg-red-50 text-red-500 border-red-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                }`}>
                  {getIniciales()}
                  {esEmpleadoActivo && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                    </span>
                  )}
                  {personaExistente && !esEmpleadoActivo && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
                    </span>
                  )}
                </div>
                <h4 className={`text-base font-bold text-center leading-tight ${!formData.nombres && !formData.apellidos ? 'text-gray-400' : 'text-gray-900'}`}>
                  {getNombreCompleto()}
                </h4>
                
                {rolesActuales.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
                    {rolesActuales.map((rol, idx) => {
                      const isEmpleado = typeof rol === 'string' && rol.toUpperCase().includes('EMPLEADO');
                      return (
                        <span key={idx} className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${isEmpleado ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                          {rol}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-50 pt-5 space-y-4">
                <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Correo</span><span className="font-medium text-gray-900">{getPreviewEmail()}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Documento</span><span className="font-medium text-gray-900 text-right">{formData.numeroDocumento || '----------'}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Área</span><span className="font-medium text-gray-900 text-right w-1/2 truncate">{getAreaTexto()}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Cargo</span><span className="font-medium text-gray-900 text-right w-1/2 truncate">{getCargoTexto()}</span></div>
              </div>

              <div className="mt-8 pt-5 border-t border-dashed border-gray-100">
                <p className={`text-[10px] text-center leading-relaxed font-medium ${esEmpleadoActivo ? 'text-red-400' : 'text-gray-400'}`}>
                  {esEmpleadoActivo 
                    ? 'Esta vista es de solo lectura porque el empleado ya existe en el sistema.' 
                    : personaExistente 
                      ? 'Se creará el perfil administrativo vinculado a este usuario.' 
                      : 'Al guardar, se generarán credenciales basadas en esta vista previa.'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {modalConfirmar && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => !isLoading && setModalConfirmar(false)}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-green-50 text-[#2E7D32] flex items-center justify-center flex-shrink-0 border border-green-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">
                      ¿Confirmar registro de empleado?
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verifica los datos antes de aprovisionar las credenciales.
                    </p>
                  </div>
                </div>
                <span className="bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                  {formData.numeroDocumento}
                </span>
              </div>

              <div className="bg-[#F8FAFC] border border-gray-200/80 rounded-xl p-4 space-y-3 text-xs my-6">
                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Empleado</span>
                  <span className="font-bold text-gray-900 text-right">{formData.nombres} {formData.apellidos}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Contacto Personal</span>
                  <span className="font-medium text-gray-700 text-right">{formData.telefono} &bull; {formData.correoPersonal}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Distrito</span>
                  <span className="font-medium text-gray-700 text-right">{getDistritoTexto()}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Área Asignada</span>
                  <span className="font-semibold text-gray-800 text-right">{getAreaTexto()}</span>
                </div>

                <div className="flex justify-between items-center gap-4 pt-0.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Puesto / Cargo</span>
                  <span className="bg-green-50 text-[#2E7D32] border border-green-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                    {getCargoTexto()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmar(false)}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Revisar Datos
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRegistro}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? 'Procesando...' : 'Sí, Registrar Empleado'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default RegistroEmpleado;