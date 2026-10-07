import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import imagenFondo from '../../IMG_1534.JPG.jpeg';

function RecuperarPassword() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    setValidations({
      length: nuevaContrasena.length >= 8,
      uppercase: /[A-Z]/.test(nuevaContrasena),
      lowercase: /[a-z]/.test(nuevaContrasena),
      number: /[0-9]/.test(nuevaContrasena),
      special: /[\W_]/.test(nuevaContrasena)
    });
  }, [nuevaContrasena]);

  const allValid = Object.values(validations).every(Boolean);

  const generarContrasena = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pswd = '';
    pswd += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    pswd += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    pswd += '0123456789'[Math.floor(Math.random() * 10)];
    pswd += '!@#$%^&*()_+'[Math.floor(Math.random() * 12)];
    
    for (let i = 0; i < 8; i++) {
      pswd += chars[Math.floor(Math.random() * chars.length)];
    }
    
    const finalPswd = pswd.split('').sort(() => 0.5 - Math.random()).join('');
    setNuevaContrasena(finalPswd);
    setConfirmarContrasena(finalPswd);
    setShowPassword(true);
    toast.success('Contraseña segura generada');
  };

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.warning('Ingresa tu correo institucional.');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/solicitar-recuperacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correoInstitucional: email })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.mensaje || 'Error al solicitar el código.');
        setIsLoading(false);
        return;
      }

      toast.success('Código enviado', {
        description: 'Revisa tu bandeja de entrada o la carpeta de Spam.'
      });
      
      setStep(2);
    } catch (err) {
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestablecerClave = async (e) => {
    e.preventDefault();
    
    if (!allValid) {
      toast.error('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/restablecer-clave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correoInstitucional: email,
          codigo: codigo,
          nuevaContrasena: nuevaContrasena,
          confirmarContrasena: confirmarContrasena
        })
      });

      const data = await response.json();

      if (!response.ok || data.exito === false) {
        toast.error(data.mensaje || 'Error al restablecer la contraseña.');
        setIsLoading(false);
        return;
      }

      toast.success('¡Contraseña restablecida!', {
        description: 'Ya puedes iniciar sesión con tu nueva contraseña.'
      });
      
      navigate('/'); 

    } catch (err) {
      toast.error('Error de conexión', {
        description: 'No se pudo conectar con el servidor.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10 transition";

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center p-4 sm:p-8 relative font-sans">
      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
        <h1 className="text-4xl font-inter font-extrabold text-black tracking-tight drop-shadow-sm">
          Codice
        </h1>
      </div>

      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-4xl min-h-[520px] z-20">
        
        <div className="hidden md:flex md:w-5/12 relative">
          <img 
            src={imagenFondo}
            alt="Fondo Institucional UMA" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
          <div className="relative z-10 p-10 w-full h-full flex flex-col justify-end">
            <div className="text-white">
              <h3 className="text-2xl font-semibold tracking-wide mb-2 drop-shadow-md">
                Recuperación Segura
              </h3>
              <p className="text-sm text-gray-200/90 leading-relaxed font-light drop-shadow-sm">
                Sigue los pasos para restablecer el acceso a tu cuenta institucional.
              </p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-7/12 p-8 sm:p-10 md:p-12 flex flex-col justify-center relative z-20 bg-white overflow-hidden">
          
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-4xl font-inder font-normal text-black mb-2">Recuperar acceso</h2>
                <p className="text-gray-400 text-sm mb-8">
                  Ingresa tu correo institucional y te enviaremos un código de seguridad de 6 dígitos.
                </p>

                <form onSubmit={handleSolicitarCodigo} className="space-y-5">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@uma.edu.sv"
                      required
                      className={inputClass}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading || !email}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-black text-white py-3.5 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-2 cursor-pointer flex justify-center items-center disabled:opacity-90 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Enviando código...' : 'Enviar código de recuperación'}
                  </motion.button>
                </form>

                <div className="text-center mt-6">
                  <Link to="/" className="text-sm text-gray-500 hover:text-black transition">
                    ← Volver a iniciar sesión
                  </Link>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl font-inder font-normal text-black mb-2">Crear nueva clave</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Ingresa el código enviado a <b className="text-gray-700">{email}</b> y tu nueva contraseña.
                </p>

                <form onSubmit={handleRestablecerClave} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      maxLength="6"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                      placeholder="Código de 6 dígitos"
                      required
                      className={`${inputClass} ${codigo.length > 0 ? 'text-center tracking-[0.5em] font-bold text-lg' : ''}`}
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                      placeholder="Nueva contraseña"
                      required
                      className={`${inputClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      )}
                    </button>
                  </div>

                  <div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmarContrasena}
                      onChange={(e) => setConfirmarContrasena(e.target.value)}
                      placeholder="Confirmar nueva contraseña"
                      required
                      className={inputClass}
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Seguridad</p>
                      <button 
                        type="button" 
                        onClick={generarContrasena}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Sugerir contraseña fuerte
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex items-center ${validations.length ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        8+ caracteres
                      </div>
                      <div className={`flex items-center ${validations.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Mayúscula
                      </div>
                      <div className={`flex items-center ${validations.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Minúscula
                      </div>
                      <div className={`flex items-center ${validations.number ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Número
                      </div>
                      <div className={`flex items-center ${validations.special ? 'text-green-600' : 'text-gray-400'}`}>
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Especial (@$!%*?)
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading || !codigo || !allValid}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-black text-white py-3.5 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-4 flex justify-center items-center disabled:opacity-90 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Actualizando...' : 'Restablecer contraseña'}
                  </motion.button>
                </form>
                
                <div className="text-center mt-5">
                  <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-black transition">
                    ← Usar otro correo
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

      <div className="absolute bottom-6 text-gray-400 text-sm text-center w-full px-4">
        © 2026 Codice — Portal Académico Institucional
      </div>
    </div>
  );
}

export default RecuperarPassword;