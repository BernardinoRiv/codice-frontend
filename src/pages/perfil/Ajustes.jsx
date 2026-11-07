import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import apiInterceptor from '../../services/apiInterceptor';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Ajustes = () => {
  const [activeTab, setActiveTab] = useState('perfil');
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  
  const [perfil, setPerfil] = useState({
    nombres: '', apellidos: '', numeroDocumento: '', 
    nombreCompleto: '', carnet: '', correoInstitucional: '', 
    correoPersonal: '', telefono: '', direccion: '', urlFoto: '', esEstudiante: false
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ correoPersonal: '', telefono: '', direccion: '' });
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  
  // Estados para la foto
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoPrevia, setFotoPrevia] = useState(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const fileInputRef = useRef(null);

  // Estados para Modales
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhotoPolicyModal, setShowPhotoPolicyModal] = useState(false);

  // Estados para Contraseña
  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarNuevaContrasena, setConfirmarNuevaContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const [validations, setValidations] = useState({
    length: false, uppercase: false, lowercase: false, number: false, special: false
  });

  useEffect(() => {
    cargarPerfil();
    if (activeTab === 'sesiones') cargarHistorialSesiones();
  }, [activeTab]);

  useEffect(() => {
    setValidations({
      length: nuevaContrasena.length >= 8,
      uppercase: /[A-Z]/.test(nuevaContrasena),
      lowercase: /[a-z]/.test(nuevaContrasena),
      number: /[0-9]/.test(nuevaContrasena),
      special: /[\W_]/.test(nuevaContrasena)
    });
  }, [nuevaContrasena]);

  const allValid = Object.values(validations).every(Boolean);

  const cargarPerfil = async () => {
    try {
      const response = await apiInterceptor('/api/v1/ajustes/perfil');
      if (response.ok) {
        const data = await response.json();
        setPerfil(data);
        setEditForm({
          correoPersonal: data.correoPersonal || '',
          telefono: data.telefono || '',
          direccion: data.direccion || ''
        });
        if (data.urlFoto) localStorage.setItem('urlFoto', data.urlFoto);
      }
    } catch (error) { toast.error('Error al cargar la información del perfil'); }
  };

  const cargarHistorialSesiones = async () => {
    try {
      setCargando(true);
      const response = await apiInterceptor('/api/v1/sesiones/historial');
      const data = await response.json();
      setSesiones(data);
    } catch (error) { toast.error('No se pudo cargar el historial'); } 
    finally { setCargando(false); }
  };

  // Previsualizar la foto antes de subir
  const handleSeleccionarFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('La fotografía no debe superar los 2MB');
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) return toast.error('Solo se permiten imágenes JPG o PNG');

    setArchivoSeleccionado(file);
    setFotoPrevia(URL.createObjectURL(file));
    setShowPhotoPolicyModal(false);
  };

  // Ejecutar la subida real
  const confirmarSubidaFoto = async () => {
    if (!archivoSeleccionado) return;
    setSubiendoFoto(true);

    const formData = new FormData();
    formData.append('foto', archivoSeleccionado);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/ajustes/foto`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.mensaje);
        setPerfil({ ...perfil, urlFoto: data.urlFoto });
        localStorage.setItem('urlFoto', data.urlFoto);
        
        // Disparar evento global para actualizar la barra lateral al instante
        window.dispatchEvent(new CustomEvent('fotoActualizada', { detail: data.urlFoto }));

        setFotoPrevia(null);
        setArchivoSeleccionado(null);
      } else { 
        toast.error(data.mensaje || 'Error al subir la fotografía'); 
      }
    } catch (error) { 
      toast.error('Error de conexión al servidor'); 
    } finally { 
      setSubiendoFoto(false); 
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  const handleActualizarPerfil = async (e) => {
    e.preventDefault();
    setGuardandoPerfil(true);
    try {
      const response = await apiInterceptor('/api/v1/ajustes/perfil', {
        method: 'PUT', body: JSON.stringify(editForm)
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.mensaje);
        setPerfil({ ...perfil, ...editForm });
        setIsEditing(false);
      } else { toast.error(data.mensaje); }
    } catch (error) { toast.error('Error de conexión'); } 
    finally { setGuardandoPerfil(false); }
  };

  const handleCambiarContrasena = async (e) => {
    e.preventDefault();
    if (!allValid) return toast.error('La nueva contraseña no cumple con los requisitos.');
    if (nuevaContrasena !== confirmarNuevaContrasena) return toast.error('Las contraseñas no coinciden.');
    
    setCambiandoClave(true);
    try {
      const response = await apiInterceptor('/api/v1/ajustes/password', {
        method: 'PUT', body: JSON.stringify({ contrasenaActual, nuevaContrasena, confirmarNuevaContrasena })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.mensaje);
        setShowPasswordModal(false);
        setContrasenaActual(''); setNuevaContrasena(''); setConfirmarNuevaContrasena('');
      } else { toast.error(data.mensaje); }
    } catch (error) { toast.error('Error de conexión'); } 
    finally { setCambiandoClave(false); }
  };

  const generarCarnetDigital = async () => {
    if (!perfil.urlFoto) return toast.error('Necesitas subir una fotografía para generar tu carnet');
    toast.success('Generando carnet digital...');
    
    const carnetContainer = document.createElement('div');
    carnetContainer.style.position = 'absolute';
    carnetContainer.style.left = '-9999px';
    carnetContainer.style.width = '350px';
    carnetContainer.style.height = '550px';
    carnetContainer.style.background = 'linear-gradient(135deg, #111827 0%, #000000 100%)';
    carnetContainer.style.color = 'white';
    carnetContainer.style.borderRadius = '16px';
    carnetContainer.style.padding = '24px';
    carnetContainer.style.fontFamily = 'Inter, sans-serif';
    carnetContainer.style.display = 'flex';
    carnetContainer.style.flexDirection = 'column';
    carnetContainer.style.alignItems = 'center';
    
    const imageUrl = `${import.meta.env.VITE_API_URL}${perfil.urlFoto}`;
    carnetContainer.innerHTML = `
      <div style="width: 100%; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 16px; margin-bottom: 24px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: 1px;">UNIVERSIDAD MODULAR ABIERTA</h2>
        <p style="margin: 4px 0 0; font-size: 10px; color: #9CA3AF; letter-spacing: 2px;">CARNET DIGITAL</p>
      </div>
      <div style="width: 150px; height: 150px; border-radius: 50%; overflow: hidden; border: 4px solid white; margin-bottom: 24px; background: white;">
         <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />
      </div>
      <div style="text-align: center; width: 100%;">
        <h3 style="margin: 0 0 8px; font-size: 20px; font-weight: 700;">${perfil.nombreCompleto}</h3>
        <p style="margin: 0 0 16px; font-size: 12px; color: #9CA3AF;">ESTUDIANTE</p>
        <div style="background: white; color: black; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0; font-size: 10px; font-weight: 700; color: #6B7280; margin-bottom: 4px;">CARNET</p>
          <p style="margin: 0; font-size: 18px; font-weight: 800; font-family: monospace;">${perfil.carnet}</p>
        </div>
      </div>
    `;
    document.body.appendChild(carnetContainer);
    
    try {
        const canvas = await html2canvas(carnetContainer, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', [54, 86]);
        pdf.addImage(imgData, 'PNG', 0, 0, 54, 86);
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
    } catch (error) { toast.error('Error al generar el carnet'); } 
    finally { document.body.removeChild(carnetContainer); }
  };

  const cerrarSesion = async (idSesion) => {
    if (!confirm('¿Cerrar esta sesión?')) return;
    try {
      const response = await apiInterceptor(`/api/v1/sesiones/${idSesion}/cerrar`, { method: 'POST' });
      if (response.ok) {
        const idSesionActual = localStorage.getItem('idSesionActual');
        if (idSesion.toString() === idSesionActual) {
          localStorage.clear();
          window.location.href = '/';
        } else {
          toast.success('Sesión cerrada correctamente');
          cargarHistorialSesiones();
        }
      }
    } catch (error) { toast.error('Error al cerrar sesión'); }
  };

  const cerrarTodasLasSesiones = async () => {
    if (!confirm('¿Estás seguro de cerrar todas las sesiones activas?')) return;
    setCerrando(true);
    try {
      const response = await apiInterceptor('/api/v1/sesiones/cerrar-todas', { method: 'POST' });
      if (response.ok) {
        localStorage.clear();
        window.location.href = '/';
      }
    } catch (error) { toast.error('Error al cerrar sesiones'); } 
    finally { setCerrando(false); }
  };

  const inputClass = "w-full bg-[#F9FAFB] border border-gray-200 text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 transition";
  const labelClass = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";
  const readOnlyValue = "text-sm text-gray-900 font-medium bg-gray-50 border border-gray-100 rounded-lg p-3";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-gray-900">Ajustes</h1>
        <p className="text-gray-500 text-sm">Administra la configuración de tu cuenta y la seguridad de tus accesos.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex space-x-2">
          <button onClick={() => setActiveTab('perfil')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'perfil' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 bg-transparent border border-transparent'}`}>
            Perfil y seguridad
          </button>
          <button onClick={() => setActiveTab('sesiones')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'sesiones' ? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 bg-transparent border border-transparent'}`}>
            Historial de sesiones
          </button>
        </div>
        
        <div className="flex gap-2">
           {activeTab === 'perfil' && perfil.esEstudiante && (
            <button 
                onClick={generarCarnetDigital} 
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:bg-gray-800 transition"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                Carnet digital
            </button>
          )}
          {activeTab === 'perfil' && (
            <button 
              onClick={() => setShowPasswordModal(true)} 
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm shadow-sm hover:bg-gray-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              Cambiar contraseña
            </button>
          )}
        </div>
      </div>

      {activeTab === 'perfil' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Información personal</h2>
                <p className="text-sm text-gray-500">Tus datos generales y de contacto en el sistema.</p>
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-gray-600 hover:text-black">
                  Editar
                </button>
              ) : (
                <button onClick={() => {setIsEditing(false); setEditForm({correoPersonal: perfil.correoPersonal || '', telefono: perfil.telefono || '', direccion: perfil.direccion || ''})}} className="text-sm font-medium text-gray-500 hover:text-gray-700">
                  Cancelar
                </button>
              )}
            </div>

            <div className="flex items-start gap-6 mb-8 pb-6 border-b border-gray-100">
              <div>
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-4 border-white shadow-sm overflow-hidden flex items-center justify-center">
                    {fotoPrevia ? (
                      <img src={fotoPrevia} alt="Previa" className="w-full h-full object-cover" />
                    ) : perfil.urlFoto ? (
                      <img src={`${import.meta.env.VITE_API_URL}${perfil.urlFoto}`} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-gray-400">{perfil.nombreCompleto?.charAt(0)}</span>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleSeleccionarFoto} accept="image/jpeg, image/png" className="hidden" />
                  {!fotoPrevia && (
                    <button 
                      onClick={() => setShowPhotoPolicyModal(true)} 
                      className="absolute bottom-0 right-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-800 transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                    </button>
                  )}
                </div>
                {fotoPrevia && (
                  <div className="flex flex-col gap-2 mt-3 w-24">
                    <button onClick={confirmarSubidaFoto} disabled={subiendoFoto} className="text-[10px] uppercase tracking-wider font-bold bg-black text-white px-2 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50">
                      {subiendoFoto ? 'Subiendo...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setFotoPrevia(null); setArchivoSeleccionado(null); }} disabled={subiendoFoto} className="text-[10px] uppercase tracking-wider font-bold bg-gray-100 text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-50">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
              <div className="pt-2">
                <h3 className="text-lg font-bold text-gray-900">{perfil.nombreCompleto}</h3>
                {perfil.esEstudiante && <p className="text-sm font-mono text-gray-500 mt-1">{perfil.carnet}</p>}
              </div>
            </div>

            {!isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className={labelClass}>Nombres</label>
                      <p className={readOnlyValue}>{perfil.nombres || '-'}</p>
                  </div>
                  <div>
                      <label className={labelClass}>Apellidos</label>
                      <p className={readOnlyValue}>{perfil.apellidos || '-'}</p>
                  </div>
                </div>
                <div>
                    <label className={labelClass}>Documento (DUI)</label>
                    <p className={readOnlyValue}>{perfil.numeroDocumento || '-'}</p>
                </div>
                <div>
                  <label className={labelClass}>Correo institucional</label>
                  <p className={readOnlyValue}>{perfil.correoInstitucional || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                  <div>
                      <label className={labelClass}>Correo personal</label>
                      <p className="text-sm text-gray-900">{perfil.correoPersonal || '-'}</p>
                  </div>
                  <div>
                      <label className={labelClass}>Teléfono</label>
                      <p className="text-sm text-gray-900">{perfil.telefono || '-'}</p>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <p className="text-sm text-gray-900">{perfil.direccion || '-'}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleActualizarPerfil} className="space-y-4">
                <div className="grid grid-cols-2 gap-4 opacity-70">
                  <div><label className={labelClass}>Nombres</label><input type="text" value={perfil.nombres || ''} disabled className={inputClass} /></div>
                  <div><label className={labelClass}>Apellidos</label><input type="text" value={perfil.apellidos || ''} disabled className={inputClass} /></div>
                </div>
                <div className="opacity-70 mb-4 pb-4 border-b border-gray-100">
                  <label className={labelClass}>Correo institucional</label>
                  <input type="text" value={perfil.correoInstitucional || ''} disabled className={inputClass} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className={labelClass}>Correo personal</label>
                      <input type="email" value={editForm.correoPersonal || ''} onChange={e => setEditForm({...editForm, correoPersonal: e.target.value})} className={inputClass} required />
                  </div>
                  <div>
                      <label className={labelClass}>Teléfono</label>
                      <input type="text" value={editForm.telefono || ''} onChange={e => setEditForm({...editForm, telefono: e.target.value})} className={inputClass} required />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Dirección</label>
                  <textarea value={editForm.direccion || ''} onChange={e => setEditForm({...editForm, direccion: e.target.value})} className={inputClass} rows="2" required></textarea>
                </div>
                <button type="submit" disabled={guardandoPerfil} className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition text-sm mt-4">
                  {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'sesiones' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden w-full max-w-4xl mx-auto">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historial de sesiones</h2>
              <p className="text-sm text-gray-500 mt-1">Revisa los dispositivos y ubicaciones desde donde se ha iniciado sesión en tu cuenta.</p>
            </div>
            <button onClick={cerrarTodasLasSesiones} disabled={cerrando} className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {cerrando ? 'Cerrando...' : 'Cerrar todas las sesiones'}
            </button>
          </div>
          <div className="p-6">
            {cargando ? (
               <p className="text-center py-12 text-sm text-gray-400">Cargando...</p>
            ) : sesiones.length === 0 ? (
               <p className="text-center py-12 text-sm text-gray-400">No hay sesiones registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dispositivo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inicio</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sesiones.map((sesion) => (
                      <tr key={sesion.idSesion} className="hover:bg-gray-50">
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">{sesion.agenteUsuario || 'Desconocido'}</td>
                        <td className="py-4 px-4"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{sesion.direccionIp}</code></td>
                        <td className="py-4 px-4 text-sm text-gray-700">{new Date(sesion.fechaInicio).toLocaleDateString('es-SV')}</td>
                        <td className="py-4 px-4">
                          {!sesion.fechaFin ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activa</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Finalizada</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {!sesion.fechaFin && (
                            <button onClick={() => cerrarSesion(sesion.idSesion)} className="text-xs text-red-600 hover:text-red-700 font-medium">Cerrar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Modal Políticas de Fotografía */}
      <AnimatePresence>
        {showPhotoPolicyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Políticas de fotografía</h3>
              <p className="text-sm text-gray-500 mb-4">Para garantizar la validez de tu fotografía de perfil, asegúrate de cumplir con lo siguiente:</p>
              <ul className="space-y-3 mb-6 text-sm text-gray-700">
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Debe ser una foto clara de tu rostro.</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Fondo completamente liso (preferiblemente claro).</li>
                <li className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Formato JPG o PNG y no debe superar los 2MB.</li>
              </ul>
              <div className="flex gap-3">
                <button onClick={() => setShowPhotoPolicyModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition text-sm">Cancelar</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition text-sm">Entendido y seleccionar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Cambiar Contraseña */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Cambiar contraseña</h3>
                <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
              </div>
              <form onSubmit={handleCambiarContrasena} className="space-y-4">
                <input type={showPassword ? "text" : "password"} value={contrasenaActual} onChange={(e) => setContrasenaActual(e.target.value)} placeholder="Contraseña actual" required className={inputClass} />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={nuevaContrasena} onChange={(e) => setNuevaContrasena(e.target.value)} placeholder="Nueva contraseña" required className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /></svg>
                  </button>
                </div>
                <input type={showPassword ? "text" : "password"} value={confirmarNuevaContrasena} onChange={(e) => setConfirmarNuevaContrasena(e.target.value)} placeholder="Confirmar nueva contraseña" required className={inputClass} />
                
                <div className="bg-[#F9FAFB] p-4 rounded-lg border border-gray-100 mt-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Requisitos de seguridad</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className={`flex items-center ${validations.length ? 'text-green-600' : 'text-gray-400'}`}>✓ 8+ caracteres</div>
                    <div className={`flex items-center ${validations.uppercase ? 'text-green-600' : 'text-gray-400'}`}>✓ Mayúscula</div>
                    <div className={`flex items-center ${validations.lowercase ? 'text-green-600' : 'text-gray-400'}`}>✓ Minúscula</div>
                    <div className={`flex items-center ${validations.number ? 'text-green-600' : 'text-gray-400'}`}>✓ Número</div>
                    <div className={`flex items-center col-span-2 ${validations.special ? 'text-green-600' : 'text-gray-400'}`}>✓ Especial (@, $, !, %, *, ?, &)</div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition text-sm">Cancelar</button>
                    <button type="submit" disabled={cambiandoClave || !contrasenaActual || !nuevaContrasena || !allValid} className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition text-sm disabled:opacity-50">
                        {cambiandoClave ? 'Guardando...' : 'Actualizar'}
                    </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Ajustes;