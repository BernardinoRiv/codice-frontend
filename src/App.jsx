import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
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

const RutaProtegida = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');
  if (!token) return <Navigate to="/" replace />;
  // 👇 AQUÍ ESTÁ LA CORRECCIÓN: Agregamos la validación de 'undefined'
  if (!ultimoAcceso || ultimoAcceso === 'null' || ultimoAcceso === 'undefined') return <Navigate to="/forzar-password" replace />;
  return children;
};

const RutaCambioPassword = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');
  if (!token) return <Navigate to="/" replace />;
  // 👇 AQUÍ ESTÁ LA CORRECCIÓN: Agregamos la validación de 'undefined'
  if (ultimoAcceso && ultimoAcceso !== 'null' && ultimoAcceso !== 'undefined') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" toastOptions={{ className: 'mt-2 sm:mt-4', style: { borderRadius: '16px', padding: '16px' } }} />

      <Routes>
        {/* === RUTAS PÚBLICAS === */}
        <Route path="/" element={<Login />} />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />

        {/* === RUTA SEMI-PROTEGIDA === */}
        <Route path="/forzar-password" element={
          <RutaCambioPassword>
            <ForzarPassword />
          </RutaCambioPassword>
        } />

        {/* === RUTAS PROTEGIDAS (DASHBOARD) === */}
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
          <Route path="pagos" element={<VentanillaPagos />} />
          
          <Route path="asistencias" element={<Asistencias/>} />
          <Route path="escanear-asistencia" element={<EscanearAsistencia/>} />
          <Route path="ajustes" element={<Ajustes />} />
        </Route>

        {/* RUTAS NO ENCONTRADAS */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;