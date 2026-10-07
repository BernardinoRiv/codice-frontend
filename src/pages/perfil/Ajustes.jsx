import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiInterceptor from '../../services/apiInterceptor';

const Ajustes = () => {
  const [activeTab, setActiveTab] = useState('seguridad');
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);

  const [contrasenaActual, setContrasenaActual] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarNuevaContrasena, setConfirmarNuevaContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState(false);

  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  useEffect(() => {
    if (activeTab === 'seguridad') {
      cargarHistorialSesiones();
    }
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

  const cargarHistorialSesiones = async () => {
    try {
      const response = await apiInterceptor('/api/v1/sesiones/historial');
      const data = await response.json();
      setSesiones(data);
    } catch (error) {
      toast.error('No se pudo cargar el historial');
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = async (idSesion) => {
    if (!confirm('¿Cerrar esta sesión?')) return;

    try {
      const response = await apiInterceptor(`/api/v1/sesiones/${idSesion}/cerrar`, {
        method: 'POST'
      });

      if (response.ok) {
        const idSesionActual = localStorage.getItem('idSesionActual');

        if (idSesion.toString() === idSesionActual) {
          toast.success('Sesión cerrada correctamente');
          localStorage.clear();
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          toast.success('Sesión cerrada correctamente');
          cargarHistorialSesiones();
        }
      } else {
        toast.error('Error al cerrar la sesión');
      }
    } catch (error) {
      toast.error('No se pudo cerrar la sesión');
    }
  };

  const cerrarTodasLasSesiones = async () => {
    if (!confirm('¿Estás seguro de cerrar todas las sesiones activas? Tendrás que iniciar sesión nuevamente en todos tus dispositivos.')) return;

    setCerrando(true);
    try {
      const response = await apiInterceptor('/api/v1/sesiones/cerrar-todas', {
        method: 'POST'
      });

      if (response.ok) {
        toast.success('Todas las sesiones han sido cerradas');
        localStorage.clear();
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        toast.error('Error al cerrar las sesiones');
      }
    } catch (error) {
      toast.error('No se pudieron cerrar las sesiones');
    } finally {
      setCerrando(false);
    }
  };

  const generarContrasenaFuerte = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pswd = '';
    pswd += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    pswd += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    pswd += '0123456789'[Math.floor(Math.random() * 10)];
    pswd += '!@#$%^&*()_+'[Math.floor(Math.random() * 12)];
    
    for (let i = 0; i < 8; i++) {
      pswd += chars[Math.floor(Math.random() * chars.length)];
    }
    
    const finalPswd = pswd.split('').sort(() => 0.5 - Math.random()).join('');
    setNuevaContrasena(finalPswd);
    setConfirmarNuevaContrasena(finalPswd);
    setShowPassword(true);
    toast.success('Contraseña segura generada');
  };

  const handleCambiarContrasena = async (e) => {
    e.preventDefault();

    if (!allValid) {
      toast.error('La nueva contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    if (nuevaContrasena !== confirmarNuevaContrasena) {
      toast.error('Las contraseñas nuevas no coinciden.');
      return;
    }

    setCambiandoClave(true);
    try {
      const response = await apiInterceptor('/api/v1/auth/cambiar-contrasena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contrasenaActual,
          nuevaContrasena,
          confirmarNuevaContrasena
        })
      });

      const data = await response.json();

      if (response.ok && data.exito) {
        toast.success(data.mensaje || 'Contraseña actualizada correctamente.');
        setContrasenaActual('');
        setNuevaContrasena('');
        setConfirmarNuevaContrasena('');
        setShowPassword(false);
      } else {
        toast.error(data.mensaje || 'Error al cambiar la contraseña.');
      }
    } catch (error) {
      toast.error('Error de conexión con el servidor.');
    } finally {
      setCambiandoClave(false);
    }
  };

  const formatearFecha = (fechaString) => {
    if (!fechaString) return 'En curso';
    const fecha = new Date(fechaString);
    return fecha.toLocaleString('es-SV', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obtenerIconoDispositivo = (agente) => {
    if (!agente) return 'monitor';
    const agenteLower = agente.toLowerCase();
    if (agenteLower.includes('mobile') || agenteLower.includes('android')) return 'mobile';
    if (agenteLower.includes('windows')) return 'windows';
    if (agenteLower.includes('macintosh')) return 'apple';
    if (agenteLower.includes('linux')) return 'linux';
    return 'monitor';
  };

  const inputClass = "w-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10 transition";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-1">Ajustes</h1>
        <p className="text-gray-500 text-sm">Administra la configuración de tu cuenta y la seguridad de tus accesos.</p>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-max mb-6">
        <button
          onClick={() => setActiveTab('perfil')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'perfil' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Perfil y Seguridad
        </button>
        <button
          onClick={() => setActiveTab('seguridad')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'seguridad' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Historial de sesiones
        </button>
      </div>

      {activeTab === 'perfil' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Información personal</h2>
            <p className="text-sm text-gray-500 mb-6">Tus datos generales en el sistema.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nombre Completo</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-800 font-medium">
                  {localStorage.getItem('nombreCompleto') || 'Usuario'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rol en el Sistema</label>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-800 font-medium">
                  {localStorage.getItem('rol') || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Cambiar Contraseña</h2>
            <p className="text-sm text-gray-500 mb-6">Actualiza tus credenciales de acceso de forma segura.</p>
            
            <form onSubmit={handleCambiarContrasena} className="space-y-4">
              <div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  placeholder="Contraseña actual"
                  required
                  className={inputClass}
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  placeholder="Nueva contraseña"
                  required
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  )}
                </button>
              </div>

              <div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmarNuevaContrasena}
                  onChange={(e) => setConfirmarNuevaContrasena(e.target.value)}
                  placeholder="Confirmar nueva contraseña"
                  required
                  className={inputClass}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mt-2">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Seguridad</p>
                  <button 
                    type="button" 
                    onClick={generarContrasenaFuerte}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Sugerir contraseña
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className={`flex items-center ${validations.length ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    8+ caracteres
                  </div>
                  <div className={`flex items-center ${validations.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Mayúscula
                  </div>
                  <div className={`flex items-center ${validations.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Minúscula
                  </div>
                  <div className={`flex items-center ${validations.number ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Número
                  </div>
                  <div className={`flex items-center col-span-2 ${validations.special ? 'text-green-600' : 'text-gray-400'}`}>
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Especial (@, $, !, %, *, ?, &)
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={cambiandoClave || !contrasenaActual || !nuevaContrasena || !allValid}
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cambiandoClave ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </form>
          </div>
        </motion.div>
      )}

      {activeTab === 'seguridad' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Historial de sesiones</h2>
              <p className="text-sm text-gray-500 mt-1">Revisa los dispositivos y ubicaciones desde donde se ha iniciado sesión en tu cuenta.</p>
            </div>
            <button
              onClick={cerrarTodasLasSesiones}
              disabled={cerrando}
              className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {cerrando ? 'Cerrando...' : 'Cerrar todas las sesiones'}
            </button>
          </div>

          <div className="p-6">
            {cargando ? (
              <div className="text-center py-12 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Cargando historial de sesiones...</p>
              </div>
            ) : sesiones.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-3 opacity-50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <p className="text-sm font-medium text-gray-900">No hay sesiones registradas</p>
                <p className="text-xs mt-1">Tu historial de accesos aparecerá aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dispositivo</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha de inicio</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha de fin</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sesiones.map((sesion) => (
                      <tr key={sesion.idSesion} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              {obtenerIconoDispositivo(sesion.dispositivo) === 'mobile' && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                                </svg>
                              )}
                              {obtenerIconoDispositivo(sesion.dispositivo) === 'windows' && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                </svg>
                              )}
                              {obtenerIconoDispositivo(sesion.dispositivo) === 'apple' && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                </svg>
                              )}
                              {obtenerIconoDispositivo(sesion.dispositivo) === 'monitor' && (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{sesion.dispositivo || 'Dispositivo desconocido'}</p>
                              <p className="text-xs text-gray-500">{sesion.rol}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{sesion.direccionIp || 'N/A'}</code>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">
                          {formatearFecha(sesion.fechaInicio)}
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-700">
                          {formatearFecha(sesion.fechaFin)}
                        </td>
                        <td className="py-4 px-4">
                          {sesion.fechaFin ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Finalizada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                              Activa
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {!sesion.fechaFin && (
                            <button
                              onClick={() => cerrarSesion(sesion.idSesion)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium"
                            >
                              Cerrar
                            </button>
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
    </div>
  );
};

export default Ajustes;