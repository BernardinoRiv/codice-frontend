import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import Login from './pages/auth/Login';
import ForzarPassword from './pages/auth/ForzarPassword';
import RecuperarPassword from './pages/auth/RecuperarPassword';
import DashboardLayout from './components/DashboardLayout';

import Inicio from './pages/inicio/Inicio'; 

import IngresoNotas from './pages/docentes/IngresoNotas';
import RegistroDocente from './pages/docentes/RegistroDocente';
import ListaDocentes from './pages/docentes/ListaDocentes';
import RegistroEmpleado from './pages/empleados/RegistroEmpleado';
import ConsultaNotas from './pages/estudiantes/ConsultaNotas';
import Ajustes from './pages/perfil/Ajustes';
import AperturaSeccion from './pages/academico/AperturaSeccion'; 
import VentanillaPagos from './pages/finanzas/VentanillaPagos';
import Asistencias from './pages/docentes/Asistencias';
import EscanearAsistencia from './pages/estudiantes/EscanearAsistencia';
import CatalogoAranceles from './pages/finanzas/CatalogoAranceles';
import CiclosPlanificacion from './pages/academico/CiclosPlanificacion';
import EstadoCuentaEstudiante from './pages/estudiantes/EstadoCuentaEstudiante';
import GestionSecciones from './pages/academico/GestionSecciones';
import RegistroNuevoIngreso from './pages/academico/RegistroNuevoIngreso';

import AdmisionOnline from './pages/academico/AdmisionOnline';

// Normaliza textos de roles (quita "ROLE_", tildes y pasa a mayúsculas con guion bajo)
const normalizarRol = (rol = '') => {
  return String(rol || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^ROLE_/, '')
    .trim()
    .replace(/\s+/g, '_');
};

// Extrae los roles activos del usuario desde localStorage y desde el JWT
const obtenerRolesUsuario = () => {
  const rolesDetectados = new Set();

  const agregarValor = (val) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(item => {
        if (typeof item === 'string') rolesDetectados.add(normalizarRol(item));
        else if (item?.authority) rolesDetectados.add(normalizarRol(item.authority));
        else if (item?.nombre) rolesDetectados.add(normalizarRol(item.nombre));
      });
    } else if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          agregarValor(parsed);
          return;
        }
      } catch (e) {}
      val.split(',').forEach(parte => rolesDetectados.add(normalizarRol(parte)));
    }
  };

  agregarValor(localStorage.getItem('rol'));
  agregarValor(localStorage.getItem('roles'));

  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      agregarValor(payload.rol);
      agregarValor(payload.roles);
      agregarValor(payload.authorities);
    } catch (e) {}
  }

  // Equivalencia por si el backend envía REGISTRADOR_ACADEMICO
  if (rolesDetectados.has('REGISTRADOR_ACADEMICO')) {
    rolesDetectados.add('REGISTRO_ACADEMICO');
  }

  return Array.from(rolesDetectados).filter(Boolean);
};

const RutaProtegida = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');
  if (!token) return <Navigate to="/" replace />;
  if (!ultimoAcceso || ultimoAcceso === 'null' || ultimoAcceso === 'undefined') {
    return <Navigate to="/forzar-password" replace />;
  }
  return children;
};

const RutaCambioPassword = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');
  if (!token) return <Navigate to="/" replace />;
  if (ultimoAcceso && ultimoAcceso !== 'null' && ultimoAcceso !== 'undefined') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Guardián de permisos por ruta según el rol
const RutaPorRol = ({ rolesPermitidos = [], children }) => {
  const location = useLocation();
  const rolesUsuario = obtenerRolesUsuario();

  const tienePermiso =
    rolesPermitidos.length === 0 ||
    rolesPermitidos.some(rolPermitido => rolesUsuario.includes(normalizarRol(rolPermitido)));

  useEffect(() => {
    if (!tienePermiso) {
      toast.error('Acceso restringido', {
        id: 'acceso-denegado',
        description: 'No tienes permisos asignados para acceder a esa vista.'
      });
    }
  }, [tienePermiso, location.pathname]);

  if (!tienePermiso) {
    return <Navigate to="/dashboard/inicio" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster
        richColors
        position="top-right"
        toastOptions={{ className: 'mt-2 sm:mt-4', style: { borderRadius: '16px', padding: '16px' } }}
      />

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />

        <Route path="/admision-online" element={<AdmisionOnline />} />

        <Route path="/forzar-password" element={
          <RutaCambioPassword>
            <ForzarPassword />
          </RutaCambioPassword>
        } />

        <Route path="/dashboard" element={
          <RutaProtegida>
            <DashboardLayout />
          </RutaProtegida>
        }>
          <Route index element={<Navigate to="inicio" replace />} />
          
          <Route path="inicio" element={<Inicio />} />
          <Route path="clases" element={<div className="p-4 text-2xl font-bold">Vista de Mis Clases en construcción</div>} />
          <Route path="notas" element={<IngresoNotas />} />
          <Route path="mis-notas" element={<ConsultaNotas />} />
          
          <Route path="registro-docente" element={<RegistroDocente />} />
          <Route path="directorio-docentes" element={<ListaDocentes />} />
          <Route path="registro-empleados" element={<RegistroEmpleado />} />
          
          <Route path="oferta-academica" element={<AperturaSeccion />} />
          <Route path="ciclos-planificacion" element={<CiclosPlanificacion />} />
          <Route path="pagos" element={<VentanillaPagos />} />
          <Route path="aranceles" element={<CatalogoAranceles />} />
          <Route path="mi-estado-cuenta" element={<EstadoCuentaEstudiante />} />
          <Route path="asistencias" element={<Asistencias/>} />
          <Route path="escanear-asistencia" element={<EscanearAsistencia/>} />
          
          {/* Inicio y Ajustes: Accesibles para todos los roles autenticados */}
          <Route path="inicio" element={
            <RutaPorRol rolesPermitidos={['DOCENTE', 'ESTUDIANTE', 'FINANZAS', 'ADMINISTRADOR', 'REGISTRO_ACADEMICO', 'EMPLEADO']}>
              <Inicio />
            </RutaPorRol>
          } />

          <Route path="ajustes" element={<Ajustes />} />

          {/* Administración de Personal */}
          <Route path="registro-empleados" element={
            <RutaPorRol rolesPermitidos={['ADMINISTRADOR']}>
              <RegistroEmpleado />
            </RutaPorRol>
          } />

          <Route path="nuevo-ingreso" element={
          <RutaPorRol rolesPermitidos={['ADMINISTRADOR', 'REGISTRO_ACADEMICO']}>
            <RegistroNuevoIngreso />
          </RutaPorRol>
          } />

          <Route path="registro-docente" element={
            <RutaPorRol rolesPermitidos={['ADMINISTRADOR']}>
              <RegistroDocente />
            </RutaPorRol>
          } />

          <Route path="directorio-docentes" element={
            <RutaPorRol rolesPermitidos={['ADMINISTRADOR', 'REGISTRO_ACADEMICO']}>
              <ListaDocentes />
            </RutaPorRol>
          } />

          {/* Gestión Académica y Ciclos */}
          <Route path="oferta-academica" element={
            <RutaPorRol rolesPermitidos={['REGISTRO_ACADEMICO', 'EMPLEADO']}>
              <AperturaSeccion />
            </RutaPorRol>
          } />

          <Route path="ciclos-planificacion" element={
            <RutaPorRol rolesPermitidos={['ADMINISTRADOR', 'REGISTRO_ACADEMICO', 'EMPLEADO']}>
              <CiclosPlanificacion />
            </RutaPorRol>
          } />

          <Route path="gestion-secciones" element={
            <RutaPorRol rolesPermitidos={['ADMINISTRADOR', 'REGISTRO_ACADEMICO', 'EMPLEADO']}>
              <GestionSecciones />
            </RutaPorRol>
          } />

          {/* Portal Docente y Estudiante */}
          <Route path="clases" element={
            <RutaPorRol rolesPermitidos={['DOCENTE', 'ESTUDIANTE', 'ADMINISTRADOR']}>
              <div className="p-4 text-2xl font-bold">Vista de Mis Clases en construcción</div>
            </RutaPorRol>
          } />

          <Route path="asistencias" element={
            <RutaPorRol rolesPermitidos={['DOCENTE']}>
              <Asistencias />
            </RutaPorRol>
          } />

          <Route path="notas" element={
            <RutaPorRol rolesPermitidos={['DOCENTE']}>
              <IngresoNotas />
            </RutaPorRol>
          } />

          <Route path="escanear-asistencia" element={
            <RutaPorRol rolesPermitidos={['ESTUDIANTE']}>
              <EscanearAsistencia />
            </RutaPorRol>
          } />

          <Route path="mis-notas" element={
            <RutaPorRol rolesPermitidos={['ESTUDIANTE']}>
              <ConsultaNotas />
            </RutaPorRol>
          } />

          {/* Finanzas */}
          <Route path="pagos" element={
            <RutaPorRol rolesPermitidos={['FINANZAS']}>
              <VentanillaPagos />
            </RutaPorRol>
          } />

          <Route path="aranceles" element={
            <RutaPorRol rolesPermitidos={['FINANZAS', 'ADMINISTRADOR']}>
              <CatalogoAranceles />
            </RutaPorRol>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;