import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

// --- Funciones Auxiliares ---
const extraerDigitos = (t = '') => String(t || '').replace(/\D/g, '');
const extraerAlfanumerico = (t = '') => String(t || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const formatearDui = (v = '') => { const d = extraerDigitos(v).slice(0, 9); return d.length > 8 ? `${d.slice(0, 8)}-${d.slice(8, 9)}` : d; };
const formatearTelefono = (v = '') => { const d = extraerDigitos(v).slice(0, 8); return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4, 8)}` : d; };
const formatearNombrePropio = (t = '') => {
  return t.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

// Decodifica el JWT sin librerías externas para extraer los claims
const obtenerSedeDesdeToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return '';
    const payloadBase64 = token.split('.')[1];
    const decodedJson = JSON.parse(atob(payloadBase64));
    // Ajusta 'idSede' por el nombre exacto de la variable que guardas en tu JWT
    return decodedJson.idSede || decodedJson.sedeId || ''; 
  } catch (e) {
    console.error('Error al decodificar el token', e);
    return '';
  }
};

// --- SelectBuscador ---
function SelectBuscador({ label, value, onChange, options = [], placeholder, disabled }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        disabled={disabled}
        className="w-full h-[50px] bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm disabled:bg-gray-50/50 disabled:text-gray-500 cursor-pointer disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.id || o.idCarreraSede} value={o.id || o.idCarreraSede}>{o.nombre || o.nombreCarrera || o.nombreSede}</option>)}
      </select>
    </div>
  );
}

export default function RegistroNuevoIngreso() {
  const [isLoading, setIsLoading] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  
  // Estados de Búsqueda y Verificación
  const [isVerifying, setIsVerifying] = useState(false);
  const [documentoVerificado, setDocumentoVerificado] = useState(false);
  const [personaExistente, setPersonaExistente] = useState(false);
  
  // Catálogos y Estados Académicos
  const [catalogos, setCatalogos] = useState({ tiposDocumento: [], sedes: [], departamentos: [], carreras: [] });
  const [distritos, setDistritos] = useState([]);
  const [pensumVigente, setPensumVigente] = useState(null); 
  const [ofertaAcademica, setOfertaAcademica] = useState([]);
  const [cargandoOferta, setCargandoOferta] = useState(false);
  const [cicloActivoStr, setCicloActivoStr] = useState('');

  const [formData, setFormData] = useState({
    idPersona: null, idTipoDocumento: '', numeroDocumento: '', nombres: '', apellidos: '',
    fechaNacimiento: '', sexo: '', telefono: '', correoPersonal: '', idDepartamento: '', idDistrito: '', direccion: '',
    idSede: obtenerSedeDesdeToken(), // Se inicializa automáticamente con la sede del usuario logueado
    idCarreraSede: '', idPensum: '', idGruposSeleccionados: []
  });

  const fechaHoy = new Date().toISOString().split('T')[0];

  // 1. Carga inicial de catálogos (Ya no necesitamos cargar 'sedes' completo si no queremos, pero lo dejamos por si se ocupa mostrar el nombre)
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
            tiposDocumento: data['tipos_documento'] || [], 
            sedes: data['sedes'] || [], 
            departamentos: data['departamentos'] || [],
            carreras: data['carreras'] || []
          });
        }
      } catch (error) { toast.error('Error al cargar catálogos.'); }
    };
    fetchCatalogos();
  }, []);

  // 1.1 Obtener Ciclo Activo
  useEffect(() => {
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
        }
      } catch (error) {
        console.error('No se pudo cargar el ciclo activo');
      }
    };
    fetchCicloActivo();
  }, []);

  // 2. Carga Distritos
  useEffect(() => {
    if (!formData.idDepartamento) {
      setDistritos([]);
      return;
    }
    const fetchDistritos = async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/catalogos/distritos?padreId=${formData.idDepartamento}`, { headers: { 'Authorization': `Bearer ${token}` }});
      if (res.ok) setDistritos(await res.json());
    };
    fetchDistritos();
  }, [formData.idDepartamento]);

  // 3. CARGA AUTOMÁTICA DEL PENSUM
  useEffect(() => {
    if (!formData.idCarreraSede) {
      setPensumVigente(null);
      setFormData(p => ({ ...p, idPensum: '' }));
      return;
    }
    const fetchPensum = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/oferta-academica/pensum-vigente?idCarreraSede=${formData.idCarreraSede}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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

  // 4. CARGA OFERTA ACADÉMICA
  useEffect(() => {
    if (!formData.idPensum || !formData.idSede) {
      setOfertaAcademica([]);
      return;
    }
    const fetchOferta = async () => {
      setCargandoOferta(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/oferta-academica/nuevo-ingreso?idPensum=${formData.idPensum}&idSede=${formData.idSede}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (res.ok) {
          const data = await res.json();
          setOfertaAcademica(data);
          setFormData(prev => ({ ...prev, idGruposSeleccionados: [] }));
        }
      } catch (error) {
        toast.error('Error al cargar horarios.');
      } finally {
        setCargandoOferta(false);
      }
    };
    fetchOferta();
  }, [formData.idPensum, formData.idSede]);

  // Validadores y Handlers
  const esTipoDui = () => String(formData.idTipoDocumento) === '1';
  const handleNumeroDocumentoChange = (v) => setFormData(p => ({ ...p, numeroDocumento: esTipoDui() ? formatearDui(v) : extraerAlfanumerico(v).slice(0, 12) }));
  
  const verificarDocumento = async () => {
    setIsVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/personas/buscar-por-documento?numeroDocumento=${formData.numeroDocumento}`, { headers: { 'Authorization': `Bearer ${token}` }});
      
      if (res.status === 404 || res.status === 204) {
        setDocumentoVerificado(true);
        setPersonaExistente(false);
        toast.success('Aspirante Nuevo', { description: 'Documento disponible. Completa el formulario.' });
      } else if (res.ok) {
        const data = await res.json();
        setFormData(p => ({
          ...p, idPersona: data.idPersona || data.id, 
          nombres: formatearNombrePropio(data.nombres), 
          apellidos: formatearNombrePropio(data.apellidos), 
          fechaNacimiento: data.fechaNacimiento,
          sexo: data.sexo, 
          telefono: formatearTelefono(data.telefono), 
          correoPersonal: data.correoPersonal,
          idDepartamento: data.idDepartamento, 
          idDistrito: data.idDistrito, 
          direccion: data.direccion
        }));
        setDocumentoVerificado(true);
        setPersonaExistente(true);
        toast.info('Registro Existente', { description: 'El estudiante ya se encuentra en el sistema.' });
      }
    } catch (e) { 
        toast.error('Error de verificación'); 
    } finally { 
        setIsVerifying(false); 
    }
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

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (formData.idGruposSeleccionados.length === 0) {
      toast.warning('Selección Académica vacía', { description: 'Debe elegir al menos una materia para pre-matricular.' });
      return;
    }
    setModalConfirmar(true);
  };

  const handleConfirmar = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/nuevo-ingreso/pre-matricula`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          idTipoDocumento: Number(formData.idTipoDocumento),
          idDistrito: Number(formData.idDistrito),
          idSede: Number(formData.idSede),
          idCarreraSede: Number(formData.idCarreraSede),
          idPensum: Number(formData.idPensum)
        })
      });

      if (!res.ok) throw new Error('Error al generar pre-matrícula. Verifique los datos.');
      const data = await res.json();
      
      setModalConfirmar(false);
      toast.success(data.mensaje, { description: data.instrucciones, duration: 10000 });
      
    } catch (err) {
      toast.error('Error', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 font-sans text-gray-900 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Ingreso de Aspirantes</h1>
        <p className="text-gray-500 text-sm">Fase 1: Pre-Matrícula y Selección Académica.</p>
      </div>

      {personaExistente && (
        <div className="mb-8 p-5 bg-blue-50/80 border-l-4 border-blue-500 rounded-r-xl shadow-sm">
          <h3 className="text-blue-900 font-bold text-lg mb-1">Aspirante en proceso o matriculado</h3>
          <p className="text-sm text-blue-800 font-medium">Este estudiante ya se encuentra registrado en el sistema. Ya sea que esté activo o tenga un mandamiento de pago pendiente en colectaduría, no es posible generar una nueva pre-matrícula desde este módulo para evitar duplicidades de cargos.</p>
        </div>
      )}

      <form onSubmit={handlePreSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. IDENTIDAD */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-4">1. Identidad</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <SelectBuscador label="Tipo Doc." value={formData.idTipoDocumento} onChange={v => setFormData(p => ({...p, idTipoDocumento: v}))} options={catalogos.tiposDocumento} placeholder="-- Seleccione --" />
              </div>
              <div className="md:col-span-5">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Número</label>
                <input type="text" value={formData.numeroDocumento} onChange={e => handleNumeroDocumentoChange(e.target.value)} disabled={!formData.idTipoDocumento || isVerifying || documentoVerificado} className="w-full h-[50px] bg-white border border-gray-200 rounded-[14px] px-4 focus:ring-4 focus:ring-black/5 disabled:bg-gray-50 disabled:text-gray-500" />
              </div>
              <div className="md:col-span-3">
                <button type="button" onClick={verificarDocumento} disabled={!formData.numeroDocumento || documentoVerificado || isVerifying} className="w-full h-[50px] bg-black text-white rounded-[14px] font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center">
                  {isVerifying ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Buscando...
                    </span>
                  ) : documentoVerificado ? 'Verificado ✓' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. DATOS BIOGRÁFICOS Y CONTACTO */}
          <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-opacity duration-300 ${!documentoVerificado ? 'opacity-50 pointer-events-none' : ''}`}>
             <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-4">2. Datos Biográficos y Contacto</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Nombres</label>
                  <input required type="text" disabled={personaExistente} value={formData.nombres} onChange={e => setFormData(p => ({...p, nombres: formatearNombrePropio(e.target.value)}))} className="w-full h-[50px] border border-gray-200 rounded-[14px] px-4 disabled:bg-gray-50/50 disabled:text-gray-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Apellidos</label>
                  <input required type="text" disabled={personaExistente} value={formData.apellidos} onChange={e => setFormData(p => ({...p, apellidos: formatearNombrePropio(e.target.value)}))} className="w-full h-[50px] border border-gray-200 rounded-[14px] px-4 disabled:bg-gray-50/50 disabled:text-gray-500" />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Fecha de Nacimiento</label>
                  <input required type="date" disabled={personaExistente} max={fechaHoy} value={formData.fechaNacimiento} onChange={e => setFormData(p => ({...p, fechaNacimiento: e.target.value}))} className="w-full h-[50px] border border-gray-200 rounded-[14px] px-4 text-gray-700 disabled:bg-gray-50/50 disabled:text-gray-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Sexo</label>
                  <select required disabled={personaExistente} value={formData.sexo} onChange={e => setFormData(p => ({...p, sexo: e.target.value}))} className="w-full h-[50px] border border-gray-200 rounded-[14px] px-4 bg-white text-gray-900 disabled:bg-gray-50/50 disabled:text-gray-500 cursor-pointer disabled:cursor-not-allowed">
                    <option value="">-- Seleccione --</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Teléfono</label>
                  <input required type="text" maxLength={9} disabled={personaExistente} value={formData.telefono} onChange={e => setFormData(p => ({...p, telefono: e.target.value}))} className="w-full h-[50px] border border-gray-200 rounded-[14px] px-4 disabled:bg-gray-50/50 disabled:text-gray-500" placeholder="0000-0000" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Correo Personal</label>
                  <input required type="email" disabled={personaExistente} value={formData.correoPersonal} onChange={e => setFormData(p => ({...p, correoPersonal: e.target.value}))} className="w-full h-[50px] border border-gray-200 rounded-[14px] px-4 disabled:bg-gray-50/50 disabled:text-gray-500" />
                </div>
             </div>
          </div>

          {/* 3. RESIDENCIA */}
          <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-opacity duration-300 ${!documentoVerificado ? 'opacity-50 pointer-events-none' : ''}`}>
             <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-4">3. Residencia</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectBuscador label="Departamento" disabled={personaExistente} value={formData.idDepartamento} onChange={v => setFormData(p => ({...p, idDepartamento: v, idDistrito: ''}))} options={catalogos.departamentos} placeholder="-- Seleccione --" />
                <SelectBuscador label="Distrito" disabled={personaExistente || !formData.idDepartamento} value={formData.idDistrito} onChange={v => setFormData(p => ({...p, idDistrito: v}))} options={distritos} placeholder="-- Seleccione --" />
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Dirección Exacta</label>
                  <input required type="text" disabled={personaExistente} value={formData.direccion} onChange={e => setFormData(p => ({...p, direccion: e.target.value}))} className="w-full h-[50px] border border-gray-200 rounded-[14px] px-4 disabled:bg-gray-50/50 disabled:text-gray-500" placeholder="Ej. Colonia Centro, Avenida..." />
                </div>
             </div>
          </div>

          {/* 4. PROYECCIÓN ACADÉMICA */}
          <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-opacity duration-300 ${(!documentoVerificado || personaExistente) ? 'opacity-50 pointer-events-none' : ''}`}>
             <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest mb-4">4. Proyección Académica</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* LA SEDE SE BLOQUEA EN TRUE PARA QUE NADIE LA PUEDA EDITAR, YA QUE VIENE DEL TOKEN */}
                <SelectBuscador label="Sede" disabled={true} value={formData.idSede} onChange={v => setFormData(p => ({...p, idSede: v}))} options={catalogos.sedes} placeholder="-- Sede --" />
                <SelectBuscador label="Carrera" disabled={personaExistente} value={formData.idCarreraSede} onChange={v => setFormData(p => ({...p, idCarreraSede: v}))} options={catalogos.carreras} placeholder="-- Carrera --" />
                
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pensum Vigente</label>
                  <div className={`w-full h-[50px] bg-gray-50 border border-gray-200/80 rounded-[14px] px-4 flex items-center shadow-sm cursor-not-allowed text-[14px] ${pensumVigente ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                    {pensumVigente ? `Plan ${pensumVigente.version}` : '-- Autocompletado --'}
                  </div>
                </div>
             </div>
          </div>

          {/* 5. OFERTA ACADÉMICA */}
          <div className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-opacity duration-300 ${(!formData.idPensum || personaExistente) ? 'opacity-50 pointer-events-none' : ''}`}>
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest">
                 5. Selección de Horarios {cicloActivoStr ? `• ${cicloActivoStr}` : ''}
               </h3>
               <span className="text-xs bg-gray-100 px-2 py-1 rounded-md font-bold">{formData.idGruposSeleccionados.length} materias seleccionadas</span>
             </div>
             
             {cargandoOferta ? (
               <div className="text-center py-8 text-gray-400 text-sm animate-pulse">Cargando cupos y horarios...</div>
             ) : ofertaAcademica.length === 0 && formData.idPensum ? (
               <div className="text-center py-8 text-gray-400 text-sm">No hay grupos abiertos para el ciclo actual de esta carrera en esta sede.</div>
             ) : (
               <div className="space-y-6">
                 {ofertaAcademica.map((materia) => (
                   <div key={materia.idMateria} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                      <h4 className="font-bold text-sm text-gray-900 mb-3">{materia.codigoMateria} - {materia.nombreMateria}</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       {materia.gruposDisponibles.map(grupo => {
                         const isSelected = formData.idGruposSeleccionados.includes(grupo.idGrupo);
                         const sinCupo = grupo.cuposDisponibles <= 0;
                         return (
                           <div 
                             key={grupo.idGrupo} 
                             onClick={() => !sinCupo && !personaExistente && toggleGrupo(grupo.idGrupo, materia.idMateria)}
                             className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${sinCupo ? 'bg-red-50 border-red-100 opacity-60 cursor-not-allowed' : isSelected ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                           >
                             <div className="flex justify-between items-start mb-2">
                               <span className="font-bold text-xs">Grupo {grupo.codigoGrupo}</span>
                               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sinCupo ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                 {sinCupo ? 'LLENO' : `${grupo.cuposDisponibles} cupos`}
                               </span>
                             </div>
                             <p className="text-[11px] text-gray-500 mb-2 truncate">Docente: {grupo.nombreDocente}</p>
                             <div className="space-y-1">
                               {grupo.horarios.map((h, i) => (
                                 <div key={i} className="text-[10px] font-medium text-gray-600 bg-gray-100/50 rounded px-1.5 py-0.5">
                                    {h.diaSemana} - {h.horaInicio} a {h.horaFin} - {h.modalidad}
                                 </div>
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
          </div>

        </div>

        {/* RESUMEN LATERAL */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm sticky top-8">
            <h2 className="text-lg font-bold mb-6">Resumen de Pre-Matrícula</h2>
            <div className="space-y-4 text-sm mb-8 border-b border-gray-100 pb-6">
              <div className="flex justify-between"><span className="text-gray-500">Aspirante</span><span className="font-medium text-right">{formData.nombres || '-'} {formData.apellidos || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Documento</span><span className="font-medium">{formData.numeroDocumento || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Materias a cursar</span><span className="font-bold text-blue-600">{formData.idGruposSeleccionados.length}</span></div>
            </div>
            
            <button type="submit" disabled={!documentoVerificado || formData.idGruposSeleccionados.length === 0 || personaExistente} className="w-full h-[50px] bg-black text-white rounded-[14px] font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
              Generar Mandamiento de Pago
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">El aspirante no será considerado estudiante oficial hasta que colectaduría procese el pago en ventanilla.</p>
          </div>
        </div>
      </form>

      {/* MODAL DE CONFIRMACIÓN */}
      {modalConfirmar && createPortal(
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-2 text-gray-900">¿Confirmar Pre-Matrícula?</h3>
            <p className="text-sm text-gray-500 mb-6">Se reservarán los cupos en los {formData.idGruposSeleccionados.length} grupos seleccionados y se generará la deuda en tesorería para ser cancelada de forma presencial.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModalConfirmar(false)} className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button type="button" onClick={handleConfirmar} disabled={isLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors shadow-sm">
                {isLoading ? 'Procesando...' : 'Sí, Generar Pre-Matrícula'}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}