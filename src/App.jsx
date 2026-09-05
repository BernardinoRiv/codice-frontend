import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import DashboardLayout from './components/DashboardLayout';
import IngresoNotas from './pages/IngresoNotas';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública del Login */}
        <Route path="/" element={<Login />} />

        {/* Rutas protegidas dentro del Layout */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Vista por defecto o sub-rutas */}
          <Route path="notas" element={<IngresoNotas />} />
          {/* Puedes agregar más vistas aquí: <Route path="clases" element={<MisClases />} /> */}
        </Route>

        {/* Si escriben cualquier otra cosa, redirige al login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;