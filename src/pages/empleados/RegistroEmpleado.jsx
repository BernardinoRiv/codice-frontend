import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

function RegistroEmpleado() {
  const [isLoading, setIsLoading] = useState(false);
  const [maxFechaNacimiento, setMaxFechaNacimiento] = useState('');

  // ESTADOS DE VERIFICACIÓN
  const [isVerifying, setIsVerifying] = useState(false);
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [personaExistente, setPersonaExistente] = useState(false);
  const [rolesActuales, setRolesActuales] = useState([]);

  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(true);
  const [catalogos, setCatalogos] = useState({
    'tipos-documento': [],
    'departamentos': [],
    'areas': [],
    'cargos': []
  });

  // ESTADO EN CASCADA PARA DISTRITOS
  const [distritos, setDistritos] = useState([]);
  const [isLoadingDistritos, setIsLoadingDistritos] = useState(false);

  // FORMULARIO EXACTO SEGÚN SWAGGER
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

  // 1. CARGA INICIAL DE CATÁLOGOS BASE 
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
            'tipos-documento': data['tipos-documento'] || [],
            'departamentos': data['departamentos'] || [],
            'areas': data['areas'] || [],
            'cargos': data['cargos'] || []
        });

      } catch (error) {
        toast.error('Error al cargar catálogos', { description: 'Revisa si los catálogos "areas" y "cargos" existen en el backend.' });
      } finally {
        setIsLoadingCatalogos(false);
      }
    };
    fetchCatalogos();
  }, []);

  // 2. EFECTO EN CASCADA: DEPARTAMENTO -> DISTRITOS
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

  const verificarDocumento = async () => {
    if (!formData.idTipoDocumento || !formData.numeroDocumento) {
      toast.error('Datos Incompletos', { description: 'Selecciona el tipo e ingresa el número de documento.' });
      return;
    }

    if (formData.idTipoDocumento === '1' && !/^\d{8}-\d$/.test(formData.numeroDocumento)) {
      toast.error('DUI Inválido', { description: 'El formato debe ser 00000000-0' });
      return;
    }

    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/personas/buscar-por-documento?numeroDocumento=${formData.numeroDocumento}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();

        const roles = data.rolesActivos || data.roles || data.perfiles || [];
        const tieneEmpleado = roles.some(r => typeof r === 'string' && r.toUpperCase().includes('EMPLEADO'));

        let datosInstitucionales = { idArea: '', idCargo: '' };

        if (tieneEmpleado) {
          try {
            const idEmpleadoBuscar = data.idPersona || data.id;
            const resEmpleado = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/empleados/${idEmpleadoBuscar}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resEmpleado.ok) {
              const dataEmp = await resEmpleado.json();
              datosInstitucionales.idArea = dataEmp.idArea || (dataEmp.area && dataEmp.area.id) || '';
              datosInstitucionales.idCargo = dataEmp.idCargo || (dataEmp.cargo && dataEmp.cargo.id) || '';
            }
          } catch (err) {
            console.warn("No se pudo extraer el detalle del empleado.", err);
          }
        }

        setFormData(prev => ({
          ...prev,
          idPersona: data.idPersona || data.id || null,
          nombres: data.nombres || data.nombre || '',
          apellidos: data.apellidos || data.apellido || '',
          fechaNacimiento: data.fechaNacimiento || data.fechanacimiento || '',
          sexo: data.sexo || '',
          telefono: data.telefono || data.telefonoPersonal || data.celular || '',
          correoPersonal: data.correoPersonal || data.correo || data.email || '',
          idDepartamento: data.idDepartamento || '', 
          idDistrito: data.idDistrito || '',
          direccion: data.direccion || '',
          idArea: data.idArea || datosInstitucionales.idArea,
          idCargo: data.idCargo || datosInstitucionales.idCargo
        }));

        setPersonaExistente(true);
        setDocumentoVerificado(true);
        setRolesActuales(roles);

        if (tieneEmpleado) {
          toast.error('Empleado ya registrado', { description: 'El documento ingresado ya pertenece a un Empleado activo.' });
        } else {
          toast.success('Persona Encontrada', { description: 'Se bloquearon los datos personales. Completa la asignación de cargo.' });
        }

      } else if (response.status === 404 || response.status === 204) {
        setPersonaExistente(false);
        setDocumentoVerificado(true);
        setRolesActuales([]);
        setFormData(prev => ({ ...prev, idPersona: null, nombres: '', apellidos: '', fechaNacimiento: '', sexo: '', telefono: '', correoPersonal: '', idDepartamento: '', idDistrito: '', direccion: '', idArea: '', idCargo: '' }));
        toast.info('Documento Libre', { description: 'Puedes proceder a registrar al nuevo empleado.' });
      } else {
        throw new Error('Error en el servidor al buscar el documento.');
      }
    } catch (error) {
      toast.error('Error de Verificación', { description: 'Revisa tu conexión o la consola.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'idTipoDocumento' || name === 'numeroDocumento') {
      setDocumentoVerificado(false);
      setPersonaExistente(false);
      setRolesActuales([]);
    }

    if (name === 'nombres' || name === 'apellidos') {
      newValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    }
    if (name === 'correoPersonal') {
      newValue = value.toLowerCase().replace(/\s/g, '');
    }
    if (name === 'direccion') {
      newValue = value.replace(/[<>]/g, '');
    }

    if (name === 'idTipoDocumento') {
      setFormData((prev) => ({ ...prev, [name]: value, numeroDocumento: '' }));
      return;
    }

    if (name === 'idDepartamento') {
      setFormData((prev) => ({ ...prev, [name]: value, idDistrito: '' }));
      return;
    }

    if (name === 'numeroDocumento') {
      if (formData.idTipoDocumento === '1') {
        let val = value.replace(/\D/g, ''); 
        if (val.length > 8) newValue = val.substring(0, 8) + '-' + val.substring(8, 9);
        else newValue = val;
      } else {
        newValue = value.substring(0, 15);
      }
    }

    if (name === 'telefono') {
      let val = value.replace(/\D/g, ''); 
      if (val.length > 8) val = val.substring(0, 8); 
      if (val.length > 4) newValue = val.substring(0, 4) + '-' + val.substring(4);
      else newValue = val;
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentoVerificado || esEmpleadoActivo) return; 

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = `${import.meta.env.VITE_API_URL}/api/v1/empleados`;

      // PAYLOAD EXACTO SEGÚN SWAGGER
      const payload = {
        idTipoDocumento: parseInt(formData.idTipoDocumento),
        numeroDocumento: formData.numeroDocumento,
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        fechaNacimiento: formData.fechaNacimiento,
        telefono: formData.telefono,
        correoPersonal: formData.correoPersonal,
        direccion: formData.direccion.trim(),
        sexo: formData.sexo,
        idDistrito: parseInt(formData.idDistrito),
        idArea: parseInt(formData.idArea),
        idCargo: parseInt(formData.idCargo),
        fechaFin: new Date().toISOString().split('T')[0],
        fechasValidas: true
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.mensaje || 'Error en la operación.');

      toast.success('Empleado registrado con éxito', { description: `El registro de ${formData.nombres} ha sido completado.` });
      handleReset(); 
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
    const areaEncontrada = catalogos['areas']?.find(a => a.id.toString() === formData.idArea);
    return areaEncontrada ? areaEncontrada.nombre : '---';
  };

  const isFieldValid = (key) => {
    const val = formData[key];
    if (!val || val.toString().trim() === '') return false;
    if (key === 'numeroDocumento' && formData.idTipoDocumento === '1') return /^\d{8}-\d$/.test(val);
    if (key === 'telefono') return /^\d{4}-\d{4}$/.test(val);
    if (key === 'correoPersonal') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    return true;
  };

  const countFilled = (keys) => keys.filter(isFieldValid).length;
  const c1 = countFilled(['nombres', 'apellidos', 'idTipoDocumento', 'numeroDocumento', 'fechaNacimiento', 'sexo']);
  const c2 = countFilled(['telefono', 'correoPersonal', 'idDepartamento', 'idDistrito', 'direccion']); 
  const c3 = countFilled(['idArea', 'idCargo']);

  const isReady = (c1 === 6 && c2 === 5 && c3 === 2 && documentoVerificado && !esEmpleadoActivo);

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
        {state === 'warning' && (
          <div className="absolute -top-10 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-50">
            Revisa los campos de esta sección
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
          </div>
        )}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm ${
          state === 'complete' ? 'border-[#2E7D32] bg-[#2E7D32]' : 
          state === 'warning' ? 'border-amber-500 text-amber-500 bg-amber-50 cursor-help' : 
          state === 'active' ? 'border-[#2E7D32] text-[#2E7D32] bg-white' : 'border-gray-200 text-gray-300 bg-white'
        }`}>
          {state === 'complete' && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          {state === 'warning' && <span className="font-bold text-lg leading-none mb-0.5">!</span>}
          {state === 'active' && <span className="font-bold text-[10px]">{pct}%</span>}
          {state === 'idle' && <span className="font-bold text-sm">{stepNum}</span>}
        </div>
        <span className={`absolute top-11 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
          state === 'complete' ? 'text-[#2E7D32]' : state === 'warning' ? 'text-amber-500' : state === 'active' ? 'text-gray-900' : 'text-gray-400'
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

  const inputClassName = "w-full bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 py-3.5 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400 disabled:bg-gray-50/50 disabled:text-gray-500 disabled:cursor-not-allowed";
  const labelClassName = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";
  const sectionTitleClassName = "text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-5 pb-2 border-b border-gray-100 flex items-center gap-2";

  return (
    <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        <div className="lg:col-span-7 xl:col-span-8">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Registro de Empleado</h1>
              <p className="text-gray-500 text-sm">Completa el formulario para generar un nuevo perfil administrativo.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* SECCIÓN 0: INPUT MAESTRO */}
            <div className="bg-gray-50/50 border border-gray-200/60 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-black"></div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  Paso 1: Verificación de Identidad
                </h3>

                <button 
                  type="button" 
                  onClick={handleReset}
                  className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Restablecer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4">
                  <label className={labelClassName}>Tipo Doc.</label>
                  <div className="relative">
                    <select name="idTipoDocumento" value={formData.idTipoDocumento} onChange={handleChange} required disabled={isLoadingCatalogos || isVerifying} className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">-- Seleccione --</option>
                      {catalogos['tipos-documento']?.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
                <div className="md:col-span-5">
                  <label className={labelClassName}>Número de Doc.</label>
                  <input type="text" name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} required disabled={!formData.idTipoDocumento || isVerifying} className={`${inputClassName} ${!formData.idTipoDocumento ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`} placeholder={formData.idTipoDocumento === '1' ? '00000000-0' : 'Escriba aquí...'} />
                </div>
                <div className="md:col-span-3">
                  <button type="button" onClick={verificarDocumento} disabled={isVerifying || !formData.numeroDocumento || documentoVerificado} className="w-full bg-black text-white px-4 py-3.5 rounded-[14px] text-[14px] font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">
                    {isVerifying ? 'Buscando...' : documentoVerificado ? 'Verificado' : 'Verificar'}
                    {!isVerifying && documentoVerificado && <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                </div>
              </div>

              {/* MENSAJES DINÁMICOS */}
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

              {/* MENSAJE AZUL ACTUALIZADO PARA MOSTRAR LOS ROLES */}
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

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-black"></div> Datos Generales {personaExistente && <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full font-bold">Autocompletado</span>}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div><label className={labelClassName}>Nombres</label><input type="text" name="nombres" value={formData.nombres} onChange={handleChange} required disabled={!documentoVerificado || personaExistente} className={inputClassName} placeholder="Ej. Juan Carlos" /></div>
                <div><label className={labelClassName}>Apellidos</label><input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} required disabled={!documentoVerificado || personaExistente} className={inputClassName} placeholder="Ej. Pérez García" /></div>
                <div><label className={labelClassName}>Fecha Nacimiento</label><input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required max={maxFechaNacimiento} disabled={!documentoVerificado || personaExistente} className={inputClassName} /></div>
                <div>
                  <label className={labelClassName}>Sexo</label>
                  <div className="relative">
                    <select name="sexo" value={formData.sexo} onChange={handleChange} required disabled={!documentoVerificado || personaExistente} className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">-- Seleccione --</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: CONTACTO */}
            <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Información de Contacto {personaExistente && <span className="ml-2 text-[10px] bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full font-bold">Bloqueado</span>}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div><label className={labelClassName}>Teléfono</label><input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required disabled={!documentoVerificado || personaExistente} className={inputClassName} placeholder="7000-0000" /></div>
                <div><label className={labelClassName}>Correo Personal</label><input type="email" name="correoPersonal" value={formData.correoPersonal} onChange={handleChange} required disabled={!documentoVerificado || personaExistente} className={inputClassName} placeholder="juan@gmail.com" /></div>

                {/* SELECTORES EN CASCADA */}
                <div>
                  <label className={labelClassName}>Departamento</label>
                  <div className="relative">
                    <select name="idDepartamento" value={formData.idDepartamento} onChange={handleChange} required disabled={!documentoVerificado || isLoadingCatalogos || personaExistente} className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">-- Seleccione --</option>
                      {catalogos['departamentos']?.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>Distrito {isLoadingDistritos && <span className="animate-pulse text-blue-500 normal-case ml-2">(Cargando...)</span>}</label>
                  <div className="relative">
                    <select name="idDistrito" value={formData.idDistrito} onChange={handleChange} required disabled={!documentoVerificado || !formData.idDepartamento || distritos.length === 0 || personaExistente} className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">{distritos.length === 0 ? '-- Elija Depto. --' : '-- Seleccione --'}</option>
                      {distritos.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClassName}>Dirección Detallada</label>
                  <textarea name="direccion" value={formData.direccion} onChange={handleChange} required disabled={!documentoVerificado || personaExistente} rows="2" className={`${inputClassName} resize-none`} placeholder="Colonia, pasaje, casa..." />
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: INSTITUCIONALES */}
            <div className={`transition-opacity duration-300 ${!documentoVerificado ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Datos Institucionales {esEmpleadoActivo && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Solo Lectura</span>}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={labelClassName}>Área Asignada</label>
                  <div className="relative">
                    <select name="idArea" value={formData.idArea} onChange={handleChange} required disabled={!documentoVerificado || isLoadingCatalogos || esEmpleadoActivo} className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">-- Seleccione --</option>
                      {catalogos['areas']?.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
                
                <div>
                  <label className={labelClassName}>Puesto / Cargo</label>
                  <div className="relative">
                    <select name="idCargo" value={formData.idCargo} onChange={handleChange} required disabled={!documentoVerificado || isLoadingCatalogos || esEmpleadoActivo} className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">-- Seleccione --</option>
                      {catalogos['cargos']?.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={isLoading || !isReady || esEmpleadoActivo} className={`px-8 py-3.5 rounded-[14px] text-[15px] font-semibold transition-all duration-300 flex items-center space-x-2 ${
                esEmpleadoActivo ? 'bg-red-50 text-red-400 border border-red-200 cursor-not-allowed' : 'bg-black text-white hover:shadow-lg hover:shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}>
                {isLoading ? <span>Procesando...</span> : <span>{esEmpleadoActivo ? 'Registro Bloqueado' : 'Confirmar e Inscribir'}</span>}
              </button>
            </div>
          </form>
        </div>

        {/* LADO DERECHO: Tarjeta Mágica */}
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
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-50 pt-5 space-y-4">
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Correo</span><span className="font-medium text-gray-900">{getPreviewEmail()}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Documento</span><span className="font-medium text-gray-900 text-right">{formData.numeroDocumento || '----------'}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Área</span><span className="font-medium text-gray-900 text-right w-1/2 truncate">{getAreaTexto()}</span></div>
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
  );
}

export default RegistroEmpleado;