import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import DashboardLayout from './components/DashboardLayout';
import IngresoNotas from './pages/IngresoNotas';

// 1. Creamos el componente "Guardián"
const RutaProtegida = ({ children }) => {
  // Buscamos si el usuario tiene un token de sesión guardado
  const token = localStorage.getItem('token');

  // Si no hay token (no ha iniciado sesión), lo mandamos al Login obligatoriamente
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Si tiene token, lo dejamos pasar a ver la pantalla
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública del Login */}
        <Route path="/" element={<Login />} />

        {/* 2. Envolvemos TODO el Dashboard con el Guardián */}
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
          <Route path="asistencias" element={<div className="p-4 text-2xl font-bold">Vista de Asistencias en construcción</div>} />
        </Route>

        {/* Si escriben cualquier ruta que no existe, los mandamos al login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;