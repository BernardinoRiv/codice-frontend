import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useSesion from '../hooks/useSesion';
import { leerSesion, limpiarSesion } from '../utils/sesion';

export default function SessionGuard() {
  const { token } = useSesion();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const privada = pathname === '/forzar-password' || pathname === '/sin-permisos' ||
    pathname === '/dashboard' || pathname.startsWith('/dashboard/');

  useEffect(() => {
    if (!privada) return;
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
      if (restante <= 300000) {
        toast.warning('Tu sesión está por expirar', { id: `sesion-aviso-${sesion.payload.exp}`, description: 'Guarda tu trabajo antes de que termine la sesión.' });
      }
      const demora = restante > 300000 ? restante - 300000 : restante;
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
  return null;
}
