import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correoInstitucional: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Credenciales incorrectas o usuario bloqueado.');
      }

      // Guardamos credenciales del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('nombreCompleto', data.nombreCompleto);
      localStorage.setItem('rol', data.rol);
      
      navigate('/dashboard/inicio');

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center p-4 sm:p-8 relative font-sans">
      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
        <h1 className="text-4xl font-inter font-extrabold text-black tracking-tight drop-shadow-sm">
          Codice
        </h1>
      </div>

      {/* Tarjeta Modal (Corregida sin zoom) */}
<div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-3xl min-h-[480px] z-20">
        
        {/* Banner izquierdo */}
        <div className="hidden md:flex md:w-5/12 relative">
          <img 
            src="https://www.uma.edu.sv/img/sedes/santaana.jpg" 
            alt="Fondo Institucional UMA" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div className="relative z-10 p-10 w-full h-full flex flex-col justify-end">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2 drop-shadow-md">Portal Académico</h3>
              <p className="text-sm opacity-90 leading-relaxed drop-shadow-md">
                Gestiona tus clases, notas y herramientas institucionales en un solo lugar.
              </p>
            </div>
          </div>
        </div>

        {/* Formulario derecho */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 md:p-16 flex flex-col justify-center relative z-20 bg-white">
          <h2 className="text-5xl font-inder font-normal text-black mb-2">Iniciar Sesión</h2>
          <p className="text-gray-400 text-sm mb-8">Ingresa tus credenciales institucionales.</p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mb-6 flex items-center space-x-3 text-red-500 bg-red-50/80 px-4 py-3 rounded-xl text-sm border border-red-100/50 backdrop-blur-sm"
            >
              {/* Icono de advertencia minimalista */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium tracking-wide">{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo Institucional"
                required
                className="w-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10 transition"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-black/10 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>

            {/* Fila ajustada: Solo enlace de olvido de contraseña alineado a la derecha */}
            <div className="flex justify-end text-sm mt-2 mb-6">
              <a href="#" className="text-gray-500 hover:text-black transition">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-2 cursor-pointer flex justify-center items-center disabled:opacity-90 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <motion.path
                      d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
                      initial={{ pathLength: 0, opacity: 0.2 }}
                      animate={{ pathLength: [0, 1, 0], opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.path
                      d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
                      initial={{ pathLength: 0, opacity: 0.2 }}
                      animate={{ pathLength: [0, 1, 0], opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    />
                  </motion.svg>
                  <span className="font-medium tracking-wide">Verificando...</span>
                </div>
              ) : (
                'Ingresar'
              )}
            </motion.button>
          </form>
        </div>
      </div>

      <div className="absolute bottom-6 text-gray-400 text-sm text-center w-full px-4">
        © 2026 Codice — Portal Académico Institucional
      </div>
    </div>
  );
}

export default Login;