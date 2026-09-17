import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

function RegistroEmpleado() {
  const [isLoading, setIsLoading] = useState(false);
  const [maxFechaNacimiento, setMaxFechaNacimiento] = useState('');
  
  // Estado adaptado al esquema de Swagger para Empleados
  const [formData, setFormData] = useState({
    idTipoDocumento: '',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    telefono: '',
    correoPersonal: '',
    direccion: '',
    idArea: '',
    idCargo: ''
  });

  // 1. RESTRICCIÓN DE 18 AÑOS
  useEffect(() => {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - 18);
    setMaxFechaNacimiento(hoy.toISOString().split('T')[0]);
  }, []);

  // 2. MANEJADOR Y MÁSCARA DEL DUI
  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'idTipoDocumento') {
      setFormData((prev) => ({ ...prev, [name]: value, numeroDocumento: '' }));
      return;
    }

    if (name === 'numeroDocumento') {
      if (formData.idTipoDocumento === '1') {
        let val = value.replace(/\D/g, ''); 
        if (val.length > 8) {
          newValue = val.substring(0, 8) + '-' + val.substring(8, 9);
        } else {
          newValue = val;
        }
      } else {
        newValue = value.substring(0, 15);
      }
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        ...formData,
        idTipoDocumento: parseInt(formData.idTipoDocumento),
        idArea: parseInt(formData.idArea),
        idCargo: parseInt(formData.idCargo)
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/empleados`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.mensaje || 'Error al registrar.');

      toast.success('Empleado registrado con éxito', { description: `Código asignado: ${data.codigoEmpleado}` });
      
      setFormData({ 
        idTipoDocumento: '', numeroDocumento: '', nombres: '', apellidos: '', 
        fechaNacimiento: '', telefono: '', correoPersonal: '', direccion: '', 
        idArea: '', idCargo: '' 
      });
    } catch (err) {
      toast.error('No se pudo registrar', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // --- LÓGICA VISTA PREVIA ---
  const getIniciales = () => formData.nombres ? formData.nombres.charAt(0).toUpperCase() : 'E';
  const getNombreCompleto = () => (!formData.nombres && !formData.apellidos) ? 'Perfil del Empleado' : `${formData.nombres} ${formData.apellidos}`;
  
  // Correo dinámico basado en las iniciales de los nombres y el primer apellido
  const getPreviewEmail = () => {
    if (!formData.nombres || !formData.apellidos) return 'usuario@empleado.uma.edu.sv';
    const inicialesNombres = formData.nombres
      .trim()
      .split(/\s+/)
      .map(nombre => nombre.charAt(0).toLowerCase())
      .join('');
    const primerApellido = formData.apellidos
      .trim()
      .split(/\s+/)[0]
      .toLowerCase();
    return `${inicialesNombres}.${primerApellido}@empleado.uma.edu.sv`;
  };

  const getPreviewCodigo = () => formData.nombres ? `EMP-${new Date().getFullYear()}-XXXX` : `EMP-YYYY-XXXX`;
  
  // Textos para la vista previa
  const getAreaTexto = () => {
    if (formData.idArea === '1') return 'Administración';
    if (formData.idArea === '2') return 'Recursos Humanos';
    if (formData.idArea === '3') return 'Tecnología (TI)';
    return '---';
  };

  const getCargoTexto = () => {
    if (formData.idCargo === '1') return 'Director Regional';
    if (formData.idCargo === '2') return 'Coordinador Académico';
    if (formData.idCargo === '3') return 'Registrador Académico';
    if (formData.idCargo === '4') return 'Cajero';
    if (formData.idCargo === '5') return 'Asistente Financiero';
    if (formData.idCargo === '6') return 'Analista Financiero';
    if (formData.idCargo === '7') return 'Soporte Informático';
    return '---';
  };

  // --- 3. LÓGICA DE ESTADOS DEL STEPPER CON VALIDACIÓN ESTRICTA ---
  const isFieldValid = (key) => {
    const val = formData[key];
    if (!val || val.toString().trim() === '') return false;
    
    // Validación estricta para el DUI (debe tener exactamente 10 caracteres)
    if (key === 'numeroDocumento' && formData.idTipoDocumento === '1') {
      return val.length === 10; 
    }
    return true;
  };

  const countFilled = (keys) => keys.filter(isFieldValid).length;
  
  const c1 = countFilled(['nombres', 'apellidos', 'idTipoDocumento', 'numeroDocumento', 'fechaNacimiento']); // Max 5
  const c2 = countFilled(['telefono', 'correoPersonal', 'direccion']); // Max 3
  const c3 = countFilled(['idArea', 'idCargo']); // Max 2 para empleados
  
  const isReady = (c1 === 5 && c2 === 3 && c3 === 2);

  // Evaluamos el estado exacto de cada sección
  const getStatus1 = () => {
    if (c1 === 5) return { state: 'complete' };
    if (c1 < 5 && (c2 > 0 || c3 > 0)) return { state: 'warning' };
    if (c1 > 0) return { state: 'active', pct: Math.round((c1 / 5) * 100) };
    return { state: 'idle' };
  };

  const getStatus2 = () => {
    if (c2 === 3) return { state: 'complete' };
    if (c2 < 3 && c3 > 0) return { state: 'warning' };
    if (c2 > 0) return { state: 'active', pct: Math.round((c2 / 3) * 100) };
    return { state: 'idle' };
  };

  const getStatus3 = () => {
    if (c3 === 2) return { state: 'complete' };
    if (c3 > 0) return { state: 'active', pct: Math.round((c3 / 2) * 100) };
    return { state: 'idle' };
  };

  const st1 = getStatus1();
  const st2 = getStatus2();
  const st3 = getStatus3();

  // Componente Punto del Stepper
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
          {state === 'complete' && (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {state === 'warning' && <span className="font-bold text-lg leading-none mb-0.5">!</span>}
          {state === 'active' && <span className="font-bold text-[10px]">{pct}%</span>}
          {state === 'idle' && <span className="font-bold text-sm">{stepNum}</span>}
        </div>
        
        <span className={`absolute top-11 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
          state === 'complete' ? 'text-[#2E7D32]' : state === 'warning' ? 'text-amber-500' : state === 'active' ? 'text-gray-900' : 'text-gray-400'
        }`}>
          {label}
        </span>
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

  // Clases CSS
  const inputClassName = "w-full bg-[#F4F4F5] text-gray-900 border border-transparent rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-black transition-all hover:border-gray-200 placeholder-gray-400";
  const labelClassName = "block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1";
  const sectionTitleClassName = "text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-5 pb-2 border-b border-gray-100 flex items-center gap-2";

  return (
    <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* === LADO IZQUIERDO: Formulario === */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="mb-10">
            <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Registro de Empleado</h1>
            <p className="text-gray-500 text-sm">Completa el formulario para generar el perfil del empleado.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* SECCIÓN 1 */}
            <div>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-black"></div> Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div><label className={labelClassName}>Nombres</label><input type="text" name="nombres" value={formData.nombres} onChange={handleChange} required className={inputClassName} placeholder="Ej. Ana Lucía" /></div>
                <div><label className={labelClassName}>Apellidos</label><input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} required className={inputClassName} placeholder="Ej. Mendoza" /></div>
                <div>
                  <label className={labelClassName}>Tipo de Documento</label>
                  <div className="relative">
                    <select name="idTipoDocumento" value={formData.idTipoDocumento} onChange={handleChange} required className={`${inputClassName} appearance-none cursor-pointer`}><option value="">Seleccione...</option><option value="1">DUI</option><option value="2">Pasaporte</option></select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>Número de Doc.</label>
                  <input type="text" name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} required disabled={!formData.idTipoDocumento} className={`${inputClassName} ${!formData.idTipoDocumento ? 'opacity-50 cursor-not-allowed' : ''}`} placeholder={formData.idTipoDocumento === '1' ? '00000000-0' : 'Escriba aquí...'} />
                </div>
                <div><label className={labelClassName}>Fecha Nacimiento (Mín. 18 años)</label><input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} required max={maxFechaNacimiento} className={inputClassName} /></div>
              </div>
            </div>

            {/* SECCIÓN 2 */}
            <div>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Información de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div><label className={labelClassName}>Teléfono</label><input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} required className={inputClassName} placeholder="7000-0000" /></div>
                <div><label className={labelClassName}>Correo Personal</label><input type="email" name="correoPersonal" value={formData.correoPersonal} onChange={handleChange} required className={inputClassName} placeholder="ana@gmail.com" /></div>
                <div className="md:col-span-2"><label className={labelClassName}>Dirección</label><input type="text" name="direccion" value={formData.direccion} onChange={handleChange} required className={inputClassName} placeholder="Dirección completa..." /></div>
              </div>
            </div>

            {/* SECCIÓN 3: Datos Laborales */}
            <div>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Datos Laborales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={labelClassName}>Área Asignada</label>
                  <div className="relative">
                    <select name="idArea" value={formData.idArea} onChange={handleChange} required className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">Seleccione un área...</option>
                      <option value="1">Administración</option>
                      <option value="2">Recursos Humanos</option>
                      <option value="3">Tecnología (TI)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>Cargo a Desempeñar</label>
                  <div className="relative">
                    <select name="idCargo" value={formData.idCargo} onChange={handleChange} required className={`${inputClassName} appearance-none cursor-pointer`}>
                      <option value="">Seleccione un cargo...</option>
                      <option value="1">Director Regional</option>
                      <option value="2">Coordinador Académico</option>
                      <option value="3">Registrador Académico</option>
                      <option value="4">Cajero</option>
                      <option value="5">Asistente Financiero</option>
                      <option value="6">Analista Financiero</option>
                      <option value="7">Soporte Informático</option>
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg></div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÓN */}
            <div className="pt-2 flex justify-end">
              <button type="submit" disabled={isLoading || !isReady} className="bg-black text-white px-8 py-3.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center space-x-2 shadow-sm">
                {isLoading ? <span>Procesando...</span> : <span>Registrar Empleado</span>}
              </button>
            </div>
          </form>
        </div>

        {/* === LADO DERECHO: Tarjeta Mágica === */}
        <div className="lg:col-span-5 xl:col-span-4 hidden lg:block relative">
          <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-8 transition-all duration-300">
            
            <div className="mb-10">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">{getPreviewCodigo()}</h2>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">Nuevo Registro</p>
            </div>

            {/* BARRA DE PASOS (STEPPER) */}
            <div className="flex items-center justify-between w-full mb-14 px-2">
              <StepPoint statusObj={st1} label="Personal" stepNum="1" />
              <StepLine percentage={st1.state === 'complete' ? 100 : (st1.pct || 0)} />
              
              <StepPoint statusObj={st2} label="Contacto" stepNum="2" />
              <StepLine percentage={st2.state === 'complete' ? 100 : (st2.pct || 0)} />
              
              <StepPoint statusObj={st3} label="Laboral" stepNum="3" />
              <StepLine percentage={st3.state === 'complete' ? 100 : (st3.pct || 0)} />
              
              <StepPoint statusObj={{ state: isReady ? 'complete' : 'idle', pct: 0 }} label="Listo" stepNum="4" />
            </div>

            {/* Perfil Preview */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400 mb-3 shadow-sm transition-colors">
                {getIniciales()}
              </div>
              <h4 className={`text-base font-bold text-center leading-tight ${!formData.nombres && !formData.apellidos ? 'text-gray-400' : 'text-gray-900'}`}>
                {getNombreCompleto()}
              </h4>
            </div>

            {/* Lista de Datos */}
            <div className="border-t border-gray-50 pt-5 space-y-4">
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Correo</span><span className="font-medium text-gray-900">{getPreviewEmail()}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Documento</span><span className="font-medium text-gray-900 text-right">{formData.numeroDocumento || '----------'}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Área</span><span className="font-medium text-gray-900 text-right w-1/2 truncate">{getAreaTexto()}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Cargo</span><span className="font-medium text-gray-900 text-right">{getCargoTexto()}</span></div>
            </div>

            <div className="mt-8 pt-5 border-t border-dashed border-gray-100">
              <p className="text-[10px] text-gray-400 text-center leading-relaxed font-medium">
                Al guardar, el sistema generará credenciales definitivas basadas en esta vista previa.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default RegistroEmpleado;