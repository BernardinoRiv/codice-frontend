import React from 'react';
import { useNavigate } from 'react-router-dom';

function DashboardLayout() {
  const navigate = useNavigate();

  // Recuperamos los datos dinámicos que el Login guardó desde la API
  const nombreUsuario = localStorage.getItem('nombreCompleto') || 'Usuario de Prueba';
  const rolUsuario = localStorage.getItem('rol') || 'Sin Rol Asignado';

  const handleLogout = () => {
    localStorage.clear(); // Limpiamos todo al salir
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-lg text-center">
        
        <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">Códice</h1>
        <p className="text-gray-500 text-sm mb-8">Panel de pruebas de integración</p>
        
        {/* Tarjeta de validación de datos */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 shadow-sm">
          <span className="text-green-600 font-semibold text-sm tracking-widest uppercase block mb-3">
            ✅ Autenticación Exitosa
          </span>
          <p className="text-2xl font-bold text-gray-900">{nombreUsuario}</p>
          <p className="text-md text-gray-600 mt-1 uppercase tracking-wider">{rolUsuario}</p>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default DashboardLayout;