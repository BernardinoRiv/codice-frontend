import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import apiInterceptor from '../services/apiInterceptor';

const Ajustes = () => {
  const [activeTab, setActiveTab] = useState('seguridad');
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (activeTab === 'seguridad') {
      cargarHistorialSesiones();
    }
  }, [activeTab]);

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
          Información personal
        </button>
        <button
          onClick={() => setActiveTab('seguridad')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'seguridad' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Seguridad y sesiones
        </button>
      </div>

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

      {activeTab === 'perfil' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Información personal</h2>
          <p className="text-sm text-gray-500">La configuración del perfil estará disponible próximamente.</p>
        </motion.div>
      )}
    </div>
  );
};

export default Ajustes;