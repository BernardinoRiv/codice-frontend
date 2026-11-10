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
    // Al usar fetch, pasará por el fetchInterceptor global automáticamente
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers
    });

    if (response.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true;
        localStorage.clear();
        window.location.replace('/');
        throw new Error('Sesion cerrada');
      }
    }

    if (response.status === 403) {
      throw new Error('No tiene permisos para esta accion');
    }

    return response;
  } catch (error) {
    if (error.message === 'Sesion cerrada') {
      if (!isRedirecting) {
        isRedirecting = true;
        localStorage.clear();
        window.location.replace('/');
      }
    }
    // NOTA: Eliminamos la regla que borraba la sesión al recibir 'Failed to fetch'.
    // Ahora el usuario puede recargar la página (F5) sin ser expulsado.
    throw error;
  }
};

export default apiInterceptor;