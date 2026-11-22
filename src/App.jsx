import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import SessionGuard from './components/SessionGuard';
import useSesion from './hooks/useSesion';
import { destinoSesion, limpiarSesion } from './utils/sesion';
import { GRUPOS_RUTAS } from './config/permisos';
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
import MisClasesPensum from './pages/estudiantes/MisClasesPensum';
import Facturas from './pages/finanzas/Facturas';
import GestionCarreras from './pages/academico/GestionCarreras';
import GestionPensum from './pages/academico/GestionPensum';
import AdmisionOnline from './pages/academico/AdmisionOnline';
import DirectorioEstudiantes from './pages/estudiantes/DirectorioEstudiantes'
import InformacionEstudiante from './pages/estudiantes/InformacionEstudiante';


const VISTAS = {
  'inicio': Inicio,
  'registro-empleados': RegistroEmpleado,
  'registro-docente': RegistroDocente,
  'carreras': GestionCarreras,
  'pensum': GestionPensum,
  'directorio-docentes': ListaDocentes,
  'nuevo-ingreso': RegistroNuevoIngreso,
  'oferta-academica': AperturaSeccion,
  'ciclos-planificacion': CiclosPlanificacion,
  'gestion-secciones': GestionSecciones,
  'clases': MisClasesPensum,
  'mis-notas': ConsultaNotas,
  'mi-estado-cuenta': EstadoCuentaEstudiante,
  'escanear-asistencia': EscanearAsistencia,
  'notas': IngresoNotas,
  'asistencias': Asistencias,
  'pagos': VentanillaPagos,
  'aranceles': CatalogoAranceles,
  'facturas': Facturas,
  'directorio-estudiantes': DirectorioEstudiantes,
  'directorio-estudiantes/:idEstudiante': InformacionEstudiante
};

function RutaProtegida({ children }) {
  const sesion = useSesion();
  const destino = destinoSesion(sesion);
  return destino === '/dashboard/inicio' ? children : <Navigate to={destino} replace />;
}

function RutaCambioPassword({ children }) {
  const sesion = useSesion();
  if (!sesion.valida) return <Navigate to="/" replace />;
  if (!sesion.requiereCambio) return <Navigate to={destinoSesion(sesion)} replace />;
  return children;
}

function RutaPorRol({ rolesPermitidos = [], children }) {
  const sesion = useSesion();
  const { pathname } = useLocation();
  const permitido = rolesPermitidos.some(rol => sesion.roles.includes(rol));
  useEffect(() => {
    if (sesion.valida && !sesion.requiereCambio && sesion.roles.length && !permitido) {
      toast.error('Acceso restringido', {
        id: 'acceso-denegado',
        description: 'No tienes permisos asignados para acceder a esa vista.',
      });
    }
  }, [permitido, pathname, sesion.valida, sesion.requiereCambio, sesion.roles.length]);
  const destino = destinoSesion(sesion);
  if (destino !== '/dashboard/inicio') return <Navigate to={destino} replace />;
  return permitido ? children : <Navigate to="/dashboard/inicio" replace />;
}

function CuentaSinPermisos() {
  const sesion = useSesion();
  const destino = destinoSesion(sesion);
  if (destino !== '/sin-permisos') return <Navigate to={destino} replace />;
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <section className="max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900">Cuenta sin permisos asignados</h1>
        <p className="mt-3 text-gray-600">Tu sesión está activa, pero no tiene un rol reconocido. Contacta con el administrador.</p>
        <button type="button" onClick={limpiarSesion} className="mt-6 rounded-lg bg-black px-6 py-3 text-white">Volver al inicio de sesión</button>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" toastOptions={{ className: 'mt-2 sm:mt-4', style: { borderRadius: '16px', padding: '16px' } }} />
      <SessionGuard />
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Login />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/admision-online" element={<AdmisionOnline />} />
        {/* Estado de la sesión */}
        <Route path="/forzar-password" element={<RutaCambioPassword><ForzarPassword /></RutaCambioPassword>} />
        <Route path="/sin-permisos" element={<CuentaSinPermisos />} />
        {/* Privadas: permisos definidos en config/permisos.js */}
        <Route path="/dashboard" element={<RutaProtegida><DashboardLayout /></RutaProtegida>}>
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="ajustes" element={<Ajustes />} />
          {GRUPOS_RUTAS.flatMap(({ roles, rutas }) => rutas.map(path => {
            const Componente = VISTAS[path];
            return <Route key={path} path={path} element={<RutaPorRol rolesPermitidos={roles}><Componente /></RutaPorRol>} />;
          }))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
