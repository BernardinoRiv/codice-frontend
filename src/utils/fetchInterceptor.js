const API_BASE_URL = import.meta.env.VITE_API_URL;
let isRedirecting = false;

// Guardamos la función fetch original del navegador
const originalFetch = window.fetch;

// Sobrescribimos el fetch global
window.fetch = async function (url, options = {}) {
  // 1. Verificar si la petición es hacia nuestra API (para no interceptar APIs externas)
  const isInternalRequest = typeof url === 'string' && url.startsWith(API_BASE_URL);

  if (isInternalRequest) {
    // 2. Inyección automática del Token (Tus compañeros ya no necesitan escribir esto)
    const token = localStorage.getItem('token');
    if (token) {
      options.headers = options.headers || {};
      
      // Manejar tanto objetos planos como instancias de Headers
      if (options.headers instanceof Headers) {
        options.headers.set('Authorization', `Bearer ${token}`);
      } else {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }
  }

  // 3. Ejecutar la petición original
  try {
    const response = await originalFetch.apply(this, [url, options]);

    // 4. Validación Global de Sesión (401)
    if (response.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true;
        console.warn('Sesión expirada o cerrada. Redirigiendo al login...');
        
        localStorage.clear();
        
        // Usamos replace para que el usuario no pueda volver atrás con el botón del navegador
        window.location.replace('/');
      }
      
      // Lanzamos error para detener la ejecución del .then() en el componente que hizo la llamada
      throw new Error('Sesion cerrada o expirada');
    }

    return response;
  } catch (error) {
    // Si la red falla completamente, también podemos limpiar si es necesario, 
    // pero generalmente solo manejamos el 401.
    throw error;
  }
};