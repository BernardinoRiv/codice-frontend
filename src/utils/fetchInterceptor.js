import { toast } from 'sonner';
import { leerSesion, limpiarSesion } from './sesion.js';

const PUBLICAS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/solicitar-recuperacion',
  '/api/v1/auth/restablecer-clave',
]);

export function crearFetchSeguro(originalFetch, apiUrl) {
  let base;
  try { base = new URL(apiUrl, window.location.origin); } catch { base = null; }
  let ultimoAviso = 0;
  return async (input, opciones) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    const prefijo = base?.pathname.replace(/\/+$/, '') || '';
    if (!apiUrl || !base || url.origin !== base.origin ||
      (prefijo && url.pathname !== prefijo && !url.pathname.startsWith(`${prefijo}/`))) {
      return originalFetch(input, opciones);
    }
    const path = (url.pathname.slice(prefijo.length) || '/').replace(/\/+$/, '');
    const publica = PUBLICAS.has(path) || path.startsWith('/api/v1/public/');
    const solicitud = new Request(input instanceof Request ? input : url.href, opciones);
    const headers = new Headers(solicitud.headers);
    const sesion = leerSesion();
    if (publica) {
      headers.delete('Authorization');
    } else {
      if (!sesion.valida) {
        limpiarSesion();
        throw Object.assign(new Error('Sesión caducada o inválida. Vuelve a iniciar sesión.'), { status: 401 });
      }
      const permitidaDuranteCambio = path === '/api/v1/auth/cambiar-contrasena' ||
        path === '/api/v1/sesiones/cerrar-todas' || /^\/api\/v1\/sesiones\/[^/]+\/cerrar$/.test(path);
      if (sesion.requiereCambio && !permitidaDuranteCambio) {
        throw Object.assign(new Error('Debes cambiar tu contraseña antes de continuar.'), { status: 403 });
      }
      headers.set('Authorization', `Bearer ${sesion.token}`);
    }
    try {
      const respuesta = await originalFetch(new Request(solicitud, { headers }));
      if (!publica && respuesta.status === 401) {
        if (leerSesion().token === sesion.token) limpiarSesion();
        throw Object.assign(new Error('El servidor rechazó la sesión. Vuelve a iniciar sesión.'), { status: 401 });
      }
      return respuesta;
    } catch (error) {
      if (error.name === 'TypeError' && Date.now() - ultimoAviso > 8000) {
        ultimoAviso = Date.now();
        toast.error('Error de conexión', {
          description: 'No se pudo contactar con el servidor. Revisa tu conexión e inténtalo nuevamente.',
          duration: 8000,
        });
      }
      throw error;
    }
  };
}

const registro = Symbol.for('codice.fetchInterceptor');
const estado = window[registro] || { originalFetch: window.fetch.bind(window) };
window[registro] = estado;
window.fetch = crearFetchSeguro(estado.originalFetch, import.meta.env?.VITE_API_URL);
