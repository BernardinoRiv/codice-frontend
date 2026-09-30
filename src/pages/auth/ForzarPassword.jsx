import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import imagenFondo from '../../IMG_1534.JPG.jpeg';

function ForzarPassword() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); 
  const [showPassword, setShowPassword] = useState(false);
  const [primerNombre, setPrimerNombre] = useState('Usuario');
  
  const [formData, setFormData] = useState({
    contrasenaActual: '',
    nuevaContrasena: '',
    confirmarNuevaContrasena: ''
  });

  useEffect(() => {
    const nombreCompleto = localStorage.getItem('nombreCompleto');
    if (nombreCompleto) {
      setPrimerNombre(nombreCompleto.split(' ')[0]);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generarContrasena = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*+?";
    let pass = "U" + "m" + "4" + "$"; 
    for(let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    pass = pass.split('').sort(() => 0.5 - Math.random()).join('');

    setFormData(prev => ({ ...prev, nuevaContrasena: pass, confirmarNuevaContrasena: pass }));
    setShowPassword(true);
    navigator.clipboard.writeText(pass);
    toast.success('Contraseña Generada', { description: 'Copiada al portapapeles para que no la pierdas.' });
  };

  const evaluarFuerzaContrasena = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Regular', color: 'bg-amber-400' };
    if (score === 3) return { score: 3, label: 'Buena', color: 'bg-emerald-400' };
    return { score: 4, label: 'Fuerte', color: 'bg-emerald-600' };
  };

  const fuerza = evaluarFuerzaContrasena(formData.nuevaContrasena);
  const cumpleLongitud = formData.nuevaContrasena.length >= 8;
  const contrasenasCoinciden = formData.nuevaContrasena.length > 0 && formData.nuevaContrasena === formData.confirmarNuevaContrasena;
  const isFormValid = formData.contrasenaActual.length > 0 && cumpleLongitud && contrasenasCoinciden;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/cambiar-contrasena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (!response.ok || data.exito === false) {
        toast.error('Validación fallida', { description: data.mensaje || 'Verifica tu contraseña temporal.' });
        setIsLoading(false);
        return; 
      }

      localStorage.setItem('ultimoAcceso', new Date().toISOString());
      setIsSuccess(true); 
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (err) {
      toast.error('Error de conexión', { description: 'Verifica tu conexión a internet.' });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex justify-center items-center relative overflow-y-auto overflow-x-hidden font-sans selection:bg-black/10 py-10">
      
      {/* FONDO ORGÁNICO VIVO */}
      <div className="fixed inset-0 z-0 bg-[#E8EAEF]">
        <img src={imagenFondo} alt="Fondo" className="w-full h-full object-cover scale-105 blur-[40px] sm:blur-[50px] opacity-40 mix-blend-multiply" />
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/4 -left-10 sm:left-1/4 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-red-400/20 rounded-full blur-[60px] sm:blur-[80px]" />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-1/4 -right-10 sm:right-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-white/60 rounded-full blur-[80px] sm:blur-[100px]" />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[10px]"></div>
      </div>

      <motion.div 
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
        className="relative z-10 w-[calc(100%-2rem)] sm:w-full max-w-[480px] mx-auto bg-white/70 backdrop-blur-3xl rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/80 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {!isSuccess ? (
            <motion.div key="form" exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }} transition={{ duration: 0.4 }}>
              
              <motion.div layout className="flex items-center space-x-4 sm:space-x-5 mb-6 sm:mb-8">
                <motion.div layout className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] sm:rounded-2xl flex items-center justify-center shadow-sm border transition-colors duration-500 ${isFormValid ? 'bg-green-50 border-green-200' : 'bg-gradient-to-b from-white to-gray-50 border-white'}`}>
                  <AnimatePresence mode="wait">
                    {isFormValid ? (
                      <motion.svg key="open" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.6 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 sm:w-7 sm:h-7 text-green-600"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></motion.svg>
                    ) : (
                      <motion.svg key="closed" initial={{ scale: 0 }} animate={{ scale: 1 }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 sm:w-7 sm:h-7 text-gray-700"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></motion.svg>
                    )}
                  </AnimatePresence>
                </motion.div>
                <div>
                  <h1 className="text-[20px] sm:text-[22px] font-extrabold text-gray-900 tracking-tight leading-tight">Hola, {primerNombre}</h1>
                  <p className="text-[12px] sm:text-[13px] text-gray-500 leading-snug mt-1 sm:mt-0.5">Protejamos tu cuenta con una nueva contraseña antes de iniciar.</p>
                </div>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div layout className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} name="contrasenaActual" value={formData.contrasenaActual} onChange={handleChange} required 
                    className="w-full bg-white/60 text-gray-900 border border-gray-200/80 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-[16px] sm:text-[14px] focus:outline-none focus:bg-white focus:ring-4 focus:ring-black/5 transition-all placeholder-gray-400 font-medium" 
                    placeholder="Contraseña Temporal" 
                  />
                </motion.div>

                <motion.div layout className="bg-white/40 p-3 sm:p-4 rounded-[20px] sm:rounded-[24px] border border-white shadow-[inset_0_2px_10px_rgba(255,255,255,0.5)] relative">
                  
                  <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nueva Contraseña</label>
                    {/* ¡AQUÍ ESTÁ LA MANITA MAGICA (cursor-pointer)! */}
                    <button type="button" onClick={generarContrasena} className="cursor-pointer flex items-center text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100/50">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
                      Generar Segura
                    </button>
                  </div>

                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} name="nuevaContrasena" value={formData.nuevaContrasena} onChange={handleChange} required 
                      className="w-full bg-white text-gray-900 border border-gray-100 rounded-xl sm:rounded-[16px] px-4 py-3 sm:px-5 sm:py-3.5 pr-12 text-[16px] sm:text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 transition-all placeholder-gray-300 font-medium shadow-sm" 
                      placeholder="Crea una clave fuerte" 
                    />
                    {/* ¡TAMBIÉN LE AGREGUÉ cursor-pointer AL OJO! */}
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-black transition-colors p-2 -mr-2">
                      {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>}
                    </button>
                  </div>

                  <AnimatePresence>
                    {formData.nuevaContrasena.length > 0 && (
                      <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-3 mb-1.5">
                        <div className="flex gap-1.5 w-full h-1.5 px-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div key={level} className={`flex-1 rounded-full transition-colors duration-500 ${fuerza.score >= level ? fuerza.color : 'bg-gray-200/60'}`} />
                          ))}
                        </div>
                        <p className={`text-[9px] font-extrabold uppercase tracking-widest mt-2 px-1 text-right ${fuerza.color.replace('bg-', 'text-')}`}>{fuerza.label}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div layout className="relative mt-2">
                    <input 
                      type={showPassword ? "text" : "password"} name="confirmarNuevaContrasena" value={formData.confirmarNuevaContrasena} onChange={handleChange} required 
                      className={`w-full bg-white text-gray-900 border rounded-xl sm:rounded-[16px] px-4 py-3 sm:px-5 sm:py-3.5 text-[16px] sm:text-[14px] focus:outline-none transition-all placeholder-gray-300 font-medium shadow-sm
                        ${formData.confirmarNuevaContrasena.length > 0 ? (contrasenasCoinciden ? 'border-green-500 focus:ring-4 focus:ring-green-500/20' : 'border-red-400 focus:ring-4 focus:ring-red-400/20') : 'border-gray-100 focus:ring-4 focus:ring-black/5'}
                      `} 
                      placeholder="Repite la contraseña" 
                    />
                  </motion.div>
                </motion.div>

                <motion.div layout className="pt-2 sm:pt-3">
                  <motion.button
                    whileHover={isFormValid && !isLoading ? { scale: 1.02 } : {}}
                    whileTap={isFormValid && !isLoading ? { scale: 0.98 } : {}}
                    type="submit"
                    disabled={isLoading || !isFormValid}
                    className={`w-full py-3.5 sm:py-4 rounded-[14px] sm:rounded-[18px] text-[15px] font-bold tracking-wide flex justify-center items-center transition-all duration-300
                      ${isFormValid ? 'bg-black text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_25px_rgba(0,0,0,0.3)] cursor-pointer' : 'bg-gray-200/50 text-gray-400 cursor-not-allowed border border-gray-200/50'}
                    `}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Protegiendo...</span>
                      </div>
                    ) : "Guardar y Acceder"}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 sm:py-12 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.2 }} className="w-20 h-20 sm:w-24 sm:h-24 bg-green-500 rounded-full flex items-center justify-center mb-5 sm:mb-6 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-xl sm:text-2xl font-extrabold text-gray-900">
                ¡Todo listo, {primerNombre}!
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-[13px] sm:text-[14px] text-gray-500 mt-2 font-medium px-4">
                Tu cuenta está protegida. Redirigiendo al portal...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="fixed bottom-6 text-gray-400/80 text-[10px] sm:text-[11px] font-bold tracking-widest uppercase z-10 text-center w-full">Seguridad de Acceso • UMA</div>
    </div>
  );
}

export default ForzarPassword;