import React, { useState, useEffect } from 'react';

// Importamos las vistas modulares
import InicioAdministrador from './InicioAdministrador';
import InicioFinanzas from './InicioFinanzas';
import InicioDocente from './InicioDocente';
import InicioEmpleado from './InicioEmpleado';
import InicioEstudiante from './InicioEstudiante';

export default function Inicio() {
  const [roles, setRoles] = useState([]);
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    const rolGuardado = localStorage.getItem('rol');
    const nombreGuardado = localStorage.getItem('nombreCompleto');

    if (rolGuardado) setRoles([rolGuardado.toUpperCase()]); 
    
    if (nombreGuardado) {
      setNombre(nombreGuardado.split(' ')[0]);
    } else {
      setNombre('Usuario');
    }
  }, []);

  const renderDashboardPorRol = () => {
    if (roles.includes('ADMINISTRADOR')) return <InicioAdministrador />;
    if (roles.includes('FINANZAS')) return <InicioFinanzas />;
    if (roles.includes('DOCENTE')) return <InicioDocente />;
    if (roles.includes('EMPLEADO') || roles.includes('REGISTRO_ACADEMICO')) return <InicioEmpleado />;
    if (roles.includes('ESTUDIANTE')) return <InicioEstudiante />;
    
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-gray-500 mt-6 shadow-sm">
        <p className="font-bold text-gray-700 mb-1">Cargando portal o rol no detectado...</p>
        <p className="text-xs">Rol encontrado: {roles.length > 0 ? roles[0] : 'Ninguno'}</p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl pb-20 font-sans">
      <div className="mb-8 flex items-center justify-between bg-black text-white p-8 rounded-3xl shadow-lg">
        <div>
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-2">¡Hola, {nombre}!</h1>
          <p className="text-gray-300 text-sm">Bienvenido de vuelta al Sistema de Registro Académico.</p>
        </div>
        <div className="hidden md:block">
          <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-widest uppercase">
            {roles[0] || 'CARGANDO...'}
          </span>
        </div>
      </div>

      {renderDashboardPorRol()}
    </div>
  );
}