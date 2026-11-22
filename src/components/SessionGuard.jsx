import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useSesion from '../hooks/useSesion';
import { actualizarTokenSesion, leerSesion, limpiarSesion } from '../utils/sesion';

function describirTiempoRestante(milisegundos) {
  const totalSegundos = Math.max(1, Math.ceil(milisegundos / 1000));
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  const partes = [];
  if (minutos) partes.push(`${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`);
  if (segundos) partes.push(`${segundos} ${segundos === 1 ? 'segundo' : 'segundos'}`);
  return partes.join(' y ');
}

export default function SessionGuard() {
  const { token } = useSesion();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const avisos = useRef({ token: null, mostrados: new Set() });
  const renovandoRef = useRef(false);
  const privada = pathname === '/forzar-password' || pathname === '/sin-permisos' ||
    pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  const extenderSesion = async (expActual) => {
    if (renovandoRef.current) return;
    renovandoRef.current = true;
    try {
      const sesionActual = leerSesion();
      const apiUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
      const fetchOriginal = window[Symbol.for('codice.fetchInterceptor')]?.originalFetch || window.fetch.bind(window);
      const response = await fetchOriginal(`${apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sesionActual.token}`,
          Accept: 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        actualizarTokenSesion(data.token);
        toast.dismiss(`sesion-aviso-${expActual}`);
        toast.success('Sesión extendida', { description: 'Tu sesión se ha renovado correctamente.' });
      } else {
        throw new Error('refresh-failed');
      }
    } catch {
      limpiarSesion();
      navigate('/', { replace: true });
      toast.error('No se pudo renovar la sesión', { description: 'Vuelve a iniciar sesión para continuar.' });
    } finally {
      renovandoRef.current = false;
    }
  };

  useEffect(() => {
    if (!privada) return;
    if (avisos.current.token !== token) avisos.current = { token, mostrados: new Set() };
    let timer;
    const revisar = () => {
      clearTimeout(timer);
      const sesion = leerSesion();
      if (!sesion.valida) {
        limpiarSesion();
        navigate('/', { replace: true });
        if (token) toast.error('Sesión terminada', { id: 'sesion-expirada', description: 'La sesión caducó o no es válida. Vuelve a iniciar sesión.' });
        return;
      }
      const restante = sesion.payload.exp * 1000 - Date.now();
      const umbral = restante <= 10000 ? 10000 : restante <= 60000 ? 60000 : restante <= 300000 ? 300000 : null;
      if (umbral !== null && !avisos.current.mostrados.has(umbral)) {
        [300000, 60000, 10000].filter(valor => valor >= umbral).forEach(valor => avisos.current.mostrados.add(valor));
        const puedeExtender = sesion.roles.includes('ESTUDIANTE') || sesion.roles.includes('DOCENTE');
        toast.warning('Tu sesión está por expirar', {
          id: `sesion-aviso-${sesion.payload.exp}`,
          description: `Tu sesión terminará en ${describirTiempoRestante(restante)}. Guarda tus cambios antes de ese momento.`,
          duration: puedeExtender ? 20000 : 10000,
          ...(puedeExtender ? {
            action: {
              label: 'Extender sesión',
              onClick: () => extenderSesion(sesion.payload.exp),
            },
          } : {}),
        });
      }
      const demora = restante > 300000 ? restante - 300000
        : restante > 60000 ? restante - 60000
        : restante > 10000 ? restante - 10000
        : restante;
      timer = setTimeout(revisar, Math.min(Math.max(demora, 1), 2147483647));
    };
    revisar();
    window.addEventListener('focus', revisar);
    document.addEventListener('visibilitychange', revisar);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', revisar);
      document.removeEventListener('visibilitychange', revisar);
    };
  }, [token, privada, navigate]);
  useEffect(() => {
    if (!privada || !token) return;
    const configuracion = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    if (!configuracion) return;
    let url;
    try {
      url = new URL(`${configuracion}/api/v1/ajustes/perfil`, window.location.origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (window.location.protocol === 'https:' && url.protocol !== 'https:')) return;
    } catch { return; }
    const fetchOriginal = window[Symbol.for('codice.fetchInterceptor')]?.originalFetch || window.fetch.bind(window);
    let vivo = true;
    let pendiente = false;
    let ultimaConsulta = -Infinity;
    let control;
    let limite;
    const comprobar = async () => {
      const sesion = leerSesion();
      if (!vivo || pendiente || document.visibilityState !== 'visible' || !sesion.valida ||
        sesion.requiereCambio || sesion.token !== token || Date.now() - ultimaConsulta < 15000) return;
      pendiente = true;
      ultimaConsulta = Date.now();
      control = new AbortController();
      limite = setTimeout(() => control.abort(), 15000);
      try {
        const respuesta = await fetchOriginal(url.href, {
          method: 'GET', signal: control.signal, cache: 'no-store', credentials: 'omit', redirect: 'error',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (respuesta.status === 401 && vivo && leerSesion().token === token) {
          limpiarSesion();
          navigate('/', { replace: true });
          toast.info('Sesión finalizada', {
            id: 'sesion-remota-cerrada',
            description: 'El servidor ya no acepta esta sesión. Vuelve a iniciar sesión.',
          });
        }
        await respuesta.body?.cancel();
      } catch {
        // Un fallo de red, un 403 o un error del servidor no cierran la sesión.
      } finally {
        clearTimeout(limite);
        pendiente = false;
      }
    };
    comprobar();
    const intervalo = setInterval(comprobar, 60000);
    window.addEventListener('focus', comprobar);
    document.addEventListener('visibilitychange', comprobar);
    return () => {
      vivo = false;
      clearInterval(intervalo);
      clearTimeout(limite);
      control?.abort();
      window.removeEventListener('focus', comprobar);
      document.removeEventListener('visibilitychange', comprobar);
    };
  }, [token, privada, navigate]);
  return null;
}
