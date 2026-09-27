const API_URL = import.meta.env.VITE_API_URL;

let isRedirecting = false;

const apiInterceptor = async (url, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true;
        localStorage.clear();
        
        // Forzar redirección inmediata
        window.location.replace('/');
        
        // Lanzar error para detener cualquier procesamiento adicional
        throw new Error('Sesion cerrada');
      }
    }

    if (response.status === 403) {
      throw new Error('No tiene permisos para esta accion');
    }

    return response;
  } catch (error) {
    // Si es error de red o sesión, asegurar redirección
    if (error.message === 'Sesion cerrada' || error.message === 'Failed to fetch') {
      if (!isRedirecting) {
        isRedirecting = true;
        localStorage.clear();
        window.location.replace('/');
      }
    }
    throw error;
  }
};

export default apiInterceptor;