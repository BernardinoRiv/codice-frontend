import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; 
import { menuMaestro } from '../config/menuConfig'; 

function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMinimized, setIsMinimized] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false); 
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ==============================================================
  // LÓGICA INTELIGENTE DE NOMBRES
  // ==============================================================
  const nombreCompletoRaw = localStorage.getItem('nombreCompleto') || 'Cargando...';

  const obtenerNombreCorto = (nombre) => {
    if (nombre === 'Cargando...') return nombre;
    const partes = nombre.trim().split(/\s+/);
    if (partes.length <= 2) return nombre; 
    
    // Si tiene 4 o más palabras (Ej: Cindy Carolina Bernardino Rivas) -> Toma la 1ra y la 3ra
    if (partes.length >= 4) return `${partes[0]} ${partes[2]}`; 
    
    // Si tiene 3 palabras (Ej: Luis Ruiz Lopez) -> Toma la 1ra y la 2da
    return `${partes[0]} ${partes[1]}`; 
  };

  const nombreUsuario = obtenerNombreCorto(nombreCompletoRaw);
  const rolUsuario = localStorage.getItem('rol') || 'DOCENTE';
  const idUsuario = localStorage.getItem('token') ? 'ID: Usuario Activo' : 'ID: No disponible';
  const inicialUsuario = nombreUsuario.charAt(0).toUpperCase();
  // ==============================================================

  const confirmLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const rolNormalizado = rolUsuario ? rolUsuario.toUpperCase() : '';
  const navItems = menuMaestro.filter(item => item.rolesPermitidos.includes(rolNormalizado));

  const handleSidebarAction = () => {
    if (isMobile) {
      setIsMobileOpen(false);
    } else {
      if (isAnimating) return; 
      setIsAnimating(true);
      setIsMinimized(!isMinimized);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const sidebarVariants = {
    desktopOpen: { width: 260, x: 0 },
    desktopClosed: { width: 92, x: 0 },
    mobileOpen: { width: 280, x: 0 },
    mobileClosed: { width: 280, x: "-100%" }
  };

  const currentVariant = isMobile ? (isMobileOpen ? "mobileOpen" : "mobileClosed") : (isMinimized ? "desktopClosed" : "desktopOpen");
  const visuallyMinimized = !isMobile && isMinimized;

  return (
    <div className="flex h-[100dvh] bg-[#F4F5F7] font-sans text-gray-900 overflow-hidden relative">
      
      {/* ================= FONDO OSCURO (SOLO MÓVIL) ================= */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-[4px] z-40"
          />
        )}
      </AnimatePresence>

      {/* ================= BARRA LATERAL (SIDEBAR) ================= */}
      <motion.aside 
        initial={false}
        animate={currentVariant}
        variants={sidebarVariants}
        transition={{ duration: 0.4, type: "spring", bounce: 0.15 }}
        className={`bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col justify-between h-full flex-shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] overflow-hidden z-50
          ${isMobile ? 'fixed top-0 left-0 bottom-0' : 'relative'}
        `}
      >
        <div className="overflow-y-auto overflow-x-hidden no-scrollbar flex-1 flex flex-col">
          
          {/* --- Cabecera del Menú --- */}
          <div className={`pt-8 pb-6 px-6 flex items-center ${visuallyMinimized ? 'justify-center px-0' : 'justify-between'}`}>
            <AnimatePresence mode="wait">
              {!visuallyMinimized && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                  className="whitespace-nowrap flex flex-col"
                >
                  <h1 className="text-2xl font-extrabold text-black tracking-tight leading-none">Codice</h1>
                  <span className="inline-flex items-center mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 text-[9px] font-bold rounded-full tracking-widest uppercase w-max">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                    Ciclo 02-2026
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={handleSidebarAction}
              disabled={isAnimating && !isMobile}
              className={`cursor-pointer text-gray-400 hover:text-black hover:bg-gray-100 flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center transition-colors ${(isAnimating && !isMobile) ? 'opacity-50' : ''}`}
            >
              <AnimatePresence mode="wait">
                {isMobile ? (
                  <motion.div key="close" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </motion.div>
                ) : visuallyMinimized ? (
                  <motion.div key="arrow" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" /></svg>
                  </motion.div>
                ) : (
                  <motion.div key="hamburger" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* --- Enlaces de Navegación --- */}
          <nav className={`mt-2 flex flex-col space-y-1.5 ${visuallyMinimized ? 'px-3' : 'px-4'}`}>
            {navItems.map((item) => {
              const isActive = location.pathname.includes(item.path);
              return (
                <Link key={item.name} to={item.path} onClick={() => isMobile && setIsMobileOpen(false)}>
                  <motion.div
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center py-2.5 font-medium transition-all duration-200 cursor-pointer
                      ${isActive ? 'bg-black text-white shadow-md shadow-black/10' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                      ${visuallyMinimized ? 'justify-center px-0 rounded-xl mx-auto w-12' : 'px-4 rounded-[14px]'}
                    `}
                    title={visuallyMinimized ? item.name : ""} 
                  >
                    <span className={`flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`}>
                      {item.icon}
                    </span>
                    <AnimatePresence>
                      {!visuallyMinimized && (
                        <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} className="whitespace-nowrap ml-3 text-[14px]">
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* --- Tarjeta Inferior de Perfil --- */}
        <div className="p-4">
          <div className={`bg-gray-50 border border-gray-100/80 rounded-[20px] transition-all duration-300 ${visuallyMinimized ? 'p-2' : 'p-4'}`}>
            
            <div className={`flex items-center ${visuallyMinimized ? 'justify-center' : 'space-x-3 mb-4'}`}>
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-50 border border-white shadow-sm flex items-center justify-center font-bold text-gray-700 text-lg">
                {inicialUsuario}
              </div>
              
              {!visuallyMinimized && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden flex-1">
                  {/* Aquí usamos nuestro nombre acortado inteligente */}
                  <p className="text-[13px] font-bold text-gray-900 leading-tight truncate" title={nombreCompletoRaw}>
                    {nombreUsuario}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5 truncate">{rolNormalizado}</p>
                </motion.div>
              )}
            </div>

            {!visuallyMinimized && <div className="h-[1px] w-full bg-gray-200/60 mb-3"></div>}

            <div className={`flex flex-col space-y-1 ${visuallyMinimized ? 'items-center mt-3' : ''}`}>
              <button title={visuallyMinimized ? "Ajustes" : ""} className={`flex items-center text-[13px] font-medium text-gray-500 hover:text-black hover:bg-gray-200/50 rounded-xl transition-colors cursor-pointer ${visuallyMinimized ? 'justify-center w-10 h-10 p-0' : 'px-3 py-2 space-x-3 w-full text-left'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                {!visuallyMinimized && <span>Ajustes</span>}
              </button>

              <button onClick={() => setShowLogoutModal(true)} title={visuallyMinimized ? "Cerrar Sesión" : ""} className={`group flex items-center text-[13px] font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer ${visuallyMinimized ? 'justify-center w-10 h-10 p-0' : 'px-3 py-2 space-x-3 w-full text-left'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 group-hover:stroke-red-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
                {!visuallyMinimized && <span>Cerrar Sesión</span>}
              </button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        
        {/* --- Cabecera Glassmorphism Móvil --- */}
        {isMobile && (
          <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-gray-200/50 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-black"></div>
              <h1 className="text-xl font-extrabold text-black tracking-tight leading-none">Codice</h1>
            </div>
            <button onClick={() => setIsMobileOpen(true)} className="text-gray-600 hover:text-black p-2 -mr-2 rounded-full bg-white/50 hover:bg-white shadow-sm border border-gray-100 transition-all active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            </button>
          </header>
        )}

        {/* --- Contenedor de Rutas --- */}
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4 pb-20' : 'p-8 pb-10'}`}>
           <motion.div
             key={location.pathname}
             initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
             animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
             transition={{ duration: 0.3, ease: "easeOut" }}
             className="h-full max-w-[1400px] mx-auto"
           >
             <Outlet />
           </motion.div>
        </div>
        
      </main>

      {/* ================= MODAL TIPO APPLE / iOS ================= */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
            
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => setShowLogoutModal(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-[6px] cursor-pointer"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 1.05, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-[280px] bg-white/90 backdrop-blur-2xl rounded-[18px] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden border border-white/50"
            >
              <div className="pt-6 pb-5 px-5 text-center">
                <h3 className="text-[17px] font-bold text-gray-900 leading-tight mb-1.5">
                  ¿Cerrar Sesión?
                </h3>
                <p className="text-[13px] text-gray-500 leading-snug font-medium">
                  Tendrás que volver a ingresar tus credenciales para acceder.
                </p>
              </div>

              <div className="flex border-t border-gray-200/80 bg-gray-50/50">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3.5 text-[16px] text-[#007AFF] font-medium border-r border-gray-200/80 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-3.5 text-[16px] text-[#FF3B30] font-bold hover:bg-red-50 transition-colors"
                >
                  Salir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardLayout;