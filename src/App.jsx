import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Login from './pages/auth/Login';
import ForzarPassword from './pages/auth/ForzarPassword';
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

const RutaProtegida = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');
  if (!token) return <Navigate to="/" replace />;
  if (!ultimoAcceso || ultimoAcceso === 'null') return <Navigate to="/forzar-password" replace />;
  return children;
};

const RutaCambioPassword = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');
  if (!token) return <Navigate to="/" replace />;
  if (ultimoAcceso && ultimoAcceso !== 'null') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" toastOptions={{ className: 'mt-2 sm:mt-4', style: { borderRadius: '16px', padding: '16px' } }} />

      <Routes>
        <Route path="/" element={<Login />} />

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
          
          {/*  2. Reemplazamos el div por nuestro componente <Inicio /> */}
          <Route path="inicio" element={<Inicio />} />
          
          <Route path="clases" element={<div className="p-4 text-2xl font-bold">Vista de Mis Clases en construcción</div>} />
          <Route path="notas" element={<IngresoNotas />} />
          <Route path="mis-notas" element={<ConsultaNotas />} />
          
          {/* <-- RUTAS DE DOCENTES Y EMPLEADOS --> */}
          <Route path="registro-docente" element={<RegistroDocente />} />
          <Route path="directorio-docentes" element={<ListaDocentes />} />
          <Route path="registro-empleados" element={<RegistroEmpleado />} />
          
          <Route path="oferta-academica" element={<AperturaSeccion />} />
          {/*  Agrega esta línea para el módulo de Finanzas */}
          <Route path="pagos" element={<VentanillaPagos />} />
          
          <Route path="asistencias" element={<div className="p-4 text-2xl font-bold">Vista de Asistencias en construcción</div>} />
          <Route path="ajustes" element={<Ajustes />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;