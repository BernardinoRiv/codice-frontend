import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  // 1. Estados para guardar los datos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Estado extra para el icono de mostrar/ocultar contraseña
  const [showPassword, setShowPassword] = useState(false);

  // Hook para redirigir entre rutas
  const navigate = useNavigate();

  // 2. Función que se ejecuta al presionar "Ingresar"
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Conexión dinámica a la API de Render usando la variable de entorno
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

      console.log("Token de sesión:", data.token);
      
      // Guardamos toda la información que trae la base de datos para mostrarla en el layout
      localStorage.setItem('token', data.token);
      localStorage.setItem('nombreCompleto', data.nombreCompleto);
      localStorage.setItem('rol', data.rol);
      
      // Redirigimos al layout del dashboard
      navigate('/dashboard/notas');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    // Contenedor principal
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center p-4 sm:p-8 relative font-sans">

      {/* Logo "Codice" flotando en la esquina superior izquierda de la pantalla */}
      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10">
        <h1 className="text-4xl font-inter font-extrabold text-black tracking-tight drop-shadow-sm">
          Codice
        </h1>
      </div>

      {/* Tarjeta Modal */}
      <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-3xl min-h-[480px] md:scale-110 transition-transform duration-300 z-20">

        {/* Lado Izquierdo: Imagen de fondo completo */}
        <div className="hidden md:flex md:w-5/12 relative">
          
          {/* Imagen ocupando TODO el fondo del div */}
          <img 
            src="https://www.uma.edu.sv/img/sedes/santaana.jpg" 
            alt="Fondo Institucional UMA" 
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Gradiente oscuro abajo para que la descripción resalte */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Contenedor del texto (alineado hacia abajo) */}
          <div className="relative z-10 p-10 w-full h-full flex flex-col justify-end">
            
            {/* Descripción breve en la esquina inferior izquierda */}
            <div className="text-white">
              <h3 className="text-xl font-bold mb-2 drop-shadow-md">Portal Académico</h3>
              <p className="text-sm opacity-90 leading-relaxed drop-shadow-md">
                Gestiona tus clases, notas y herramientas institucionales en un solo lugar.
              </p>
            </div>
            
          </div>
          
        </div>

        {/* Lado Derecho: Formulario */}
        <div className="w-full md:w-7/12 p-8 sm:p-10 md:p-16 flex flex-col justify-center relative z-20 bg-white">

          <h2 className="text-5xl font-inder font-normal text-black mb-2">Iniciar Sesión</h2>
          <p className="text-gray-400 text-sm mb-8">Ingresa tus credenciales institucionales.</p>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Input: Correo Institucional */}
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

            {/* Input: Contraseña */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full bg-[#F3F4F6] text-gray-800 placeholder-gray-400 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-black/10 transition"
              />
              {/* Icono del ojito */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  // Icono Ojo abierto
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                ) : (
                  // Icono Ojo tachado
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>

            {/* Fila de Recordarme & Olvidaste contraseña */}
            <div className="flex justify-between items-center text-sm mt-2 mb-6">
              <label className="flex items-center space-x-2 cursor-pointer text-gray-500 hover:text-gray-700">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-black focus:ring-black/20 w-4 h-4 cursor-pointer"
                />
                <span>Recordarme</span>
              </label>
              <a href="#" className="text-gray-500 hover:text-black transition">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Botón de Submit */}
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition duration-200 mt-2"
            >
              Ingresar
            </button>

          </form>
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-6 text-gray-400 text-sm text-center w-full px-4">
        © 2026 Codice — Portal Académico Institucional
      </div>

    </div>
  );
}

export default Login;