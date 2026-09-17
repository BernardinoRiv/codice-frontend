import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner'; 
import Login from './pages/auth/Login';
import ForzarPassword from './pages/auth/ForzarPassword'; // <-- Importamos la nueva vista
import DashboardLayout from './components/DashboardLayout';
import IngresoNotas from './pages/IngresoNotas';
import RegistroDocente from './pages/docentes/RegistroDocente';
import RegistroEmpleado from './pages/empleados/RegistroEmpleado';

// 1. Guardián del Dashboard (Solo entras si tienes token Y ya cambiaste la contraseña)
const RutaProtegida = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');

  // Si no hay token (no ha iniciado sesión), lo mandamos al Login obligatoriamente
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si es su primera vez (ultimoAcceso es null o viene vacío), lo atrapamos en forzar-password
  if (!ultimoAcceso || ultimoAcceso === 'null') {
    return <Navigate to="/forzar-password" replace />;
  }

  // Si tiene token y ya tiene acceso previo, lo dejamos pasar a ver la pantalla
  return children;
};

// 2. Guardián de la pantalla de Forzar Contraseña
const RutaCambioPassword = ({ children }) => {
  const token = localStorage.getItem('token');
  const ultimoAcceso = localStorage.getItem('ultimoAcceso');

  // Si no hay token, al Login
  if (!token) {
    return <Navigate to="/" replace />;
  }
  
  // Si ya tiene un último acceso válido, no tiene nada que hacer aquí, se va al dashboard
  if (ultimoAcceso && ultimoAcceso !== 'null') {
    return <Navigate to="/dashboard" replace />;
  }

  // Si tiene token y es su primera vez, lo dejamos ver la vista de cambio de password
  return children;
};

function App() {
  return (
    <BrowserRouter>
      {/* Configuración de Toaster */}
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          className: 'mt-2 sm:mt-4', // Margen superior para que no choque con la cámara del cel
          style: {
            borderRadius: '16px',
            padding: '16px',
          },
        }}
      />

      <Routes>
        {/* Ruta pública del Login */}
        <Route path="/" element={<Login />} />

        {/* <-- NUEVA RUTA: Prisión de seguridad --> */}
        <Route 
          path="/forzar-password" 
          element={
            <RutaCambioPassword>
              <ForzarPassword />
            </RutaCambioPassword>
          } 
        />

        {/* Envolvemos TODO el Dashboard con el Guardián Principal */}
        <Route
          path="/dashboard"
          element={
            <RutaProtegida>
              <DashboardLayout />
            </RutaProtegida>
          }
        >
          <Route index element={<Navigate to="inicio" replace />} />
          <Route path="inicio" element={<div className="p-4 text-2xl font-bold">Vista de Inicio en construcción</div>} />
          <Route path="clases" element={<div className="p-4 text-2xl font-bold">Vista de Mis Clases en construcción</div>} />
          <Route path="notas" element={<IngresoNotas />} />
          <Route path="registro-docente" element={<RegistroDocente />} />
          <Route path="registro-empleados" element={<RegistroEmpleado/>} />
          <Route path="asistencias" element={<div className="p-4 text-2xl font-bold">Vista de Asistencias en construcción</div>} />
        </Route>

        {/* Si escriben cualquier ruta que no existe, los mandamos al login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;