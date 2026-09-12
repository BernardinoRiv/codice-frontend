import React from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
// IMPORTAMOS LA LISTA MAESTRA DESDE TU NUEVA CARPETA CONFIG
import { menuMaestro } from '../config/menuConfig'; 

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Recuperamos los datos dinámicos del Login
  const nombreUsuario = localStorage.getItem('nombreCompleto') || 'Cargando usuario...';
  const idUsuario = localStorage.getItem('token') ? 'ID: Usuario Activo' : 'ID: No disponible';
  const rolUsuario = localStorage.getItem('rol') || 'DOCENTE';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // LA MAGIA DEL FILTRO: Normalizamos el rol y filtramos la lista maestra
  const rolNormalizado = rolUsuario ? rolUsuario.toUpperCase() : '';
  const navItems = menuMaestro.filter(item => 
    item.rolesPermitidos.includes(rolNormalizado)
  );

  // ================= DISEÑO INTACTO =================
  return (
    <div className="flex h-screen bg-white font-sans text-gray-800">
      
      {/* ================= BARRA LATERAL (SIDEBAR) ================= */}
      <aside className="w-64 border-r border-red-500 flex flex-col justify-between h-full bg-white flex-shrink-0">
        
        <div>
          {/* Cabecera del Menú */}
          <div className="p-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-black tracking-tight leading-none">Codice</h1>
              <span className="text-[10px] text-gray-500 tracking-widest uppercase mt-1 block">
                CICLO ACTIVO: 02-2026
              </span>
            </div>
            <button className="text-gray-500 hover:text-black">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          {/* Enlaces de Navegación Dinámicos y Seguros */}
          <nav className="mt-4 flex flex-col space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.includes(item.path);

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-gray-100 text-black border-l-4 border-red-500' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-black border-l-4 border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-black' : 'text-gray-400'}>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Parte Inferior del Menú (Usuario y Ajustes) */}
        <div className="p-6">
          <div className="border-t border-black mb-4"></div>
          
          <div className="mb-4">
            <p className="text-sm font-medium text-black leading-tight">{nombreUsuario}</p>
            <p className="text-xs text-gray-500 mt-1">{idUsuario}</p>
            <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider">
              {rolNormalizado}
            </span>
          </div>

          <div className="flex flex-col space-y-2">
            <button className="flex items-center space-x-3 text-sm text-black font-medium hover:text-gray-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              <span>Ajustes</span>
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-3 text-sm text-black font-medium hover:text-red-600 transition-colors w-full text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden bg-white">
        <div className="flex-1 overflow-y-auto p-10">
           <Outlet />
        </div>
        <footer className="absolute bottom-6 right-10 text-gray-400 text-sm">
          © 2026 Codice — Portal Académico Institucional
        </footer>
      </main>

    </div>
  );
}

export default DashboardLayout;