import { toast } from 'sonner';

const registro = Symbol.for('codice.fetchInterceptor');
const estado = window[registro] || {
  originalFetch: window.fetch.bind(window),
  redirigiendo: false,
  ultimoAviso: 0,
};
window[registro] = estado;

const configuracion = import.meta.env.VITE_API_URL;
let baseAPI = null;
try {
  if (configuracion) baseAPI = new URL(configuracion, window.location.origin);
} catch {
  baseAPI = null;
}

const esInterna = url => {
  if (!baseAPI) return false;
  const prefijo = baseAPI.pathname.replace(/\/+$/, '');
  return url.origin === baseAPI.origin &&
    (!prefijo || url.pathname === prefijo || url.pathname.startsWith(`${prefijo}/`));
};

const tokenVigente = token => {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return false;
    const segmento = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const base64 = segmento.padEnd(Math.ceil(segmento.length / 4) * 4, '=');
    const bytes = Uint8Array.from(window.atob(base64), c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload && (payload.exp === undefined ||
      (typeof payload.exp === 'number' && Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now()));
  } catch {
    return false;
  }
};

const cerrarSesion = () => {
  if (estado.redirigiendo) return;
  estado.redirigiendo = true;
  ['token', 'rol', 'nombreCompleto', 'urlFoto'].forEach(key => localStorage.removeItem(key));
  window.location.replace('/');
};

window.fetch = async (input, opciones) => {
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
  if (!esInterna(url)) return estado.originalFetch(input, opciones);
  const token = localStorage.getItem('token');
  if (token && !tokenVigente(token)) {
    cerrarSesion();
    throw new Error('Sesión expirada o token ilegible.');
  }
  const solicitud = new Request(input instanceof Request ? input : url.href, opciones);
  const headers = new Headers(solicitud.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    const respuesta = await estado.originalFetch(new Request(solicitud, { headers }));
    if (respuesta.status === 401 && token) {
      cerrarSesion();
      throw new Error('Sesión rechazada por el servidor.');
    }
    return respuesta;
  } catch (error) {
    if (error.name === 'TypeError' && Date.now() - estado.ultimoAviso > 8000) {
      estado.ultimoAviso = Date.now();
      toast.error('Error de conexión', {
        description: 'No se pudo contactar con el servidor. Revisa la conexión y vuelve a intentarlo.',
        duration: 8000,
      });
    }
    throw error;
  }
};
