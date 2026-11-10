import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export default function SessionGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token'); 
    if (!token) return;

    const payload = parseJwt(token);
    if (!payload || !payload.exp) return;

    const expTime = payload.exp * 1000;
    const currentTime = Date.now();
    
    // Restamos 5 segundos (5000 ms) como margen de seguridad para desincronización
    const timeLeft = expTime - currentTime - 5000;

    const handleLogout = (motivo) => {
      localStorage.clear();
      toast.error('Sesión terminada', { description: motivo });
      navigate('/', { replace: true }); 
    };

    if (timeLeft <= 0) {
      handleLogout('Tu sesión ha expirado por inactividad.');
      return;
    }

    const warningTime = timeLeft - 300000; // 5 minutos exactos
    let warningTimer;
    
    if (warningTime > 0) {
      warningTimer = setTimeout(() => {
        toast.warning('Tu sesión está por expirar', {
          description: 'Por seguridad, tu sesión se cerrará automáticamente en 5 minutos.',
          duration: 10000, 
        });
      }, warningTime);
    }

    const logoutTimer = setTimeout(() => {
      handleLogout('Tu sesión ha caducado. Vuelve a iniciar sesión.');
    }, Math.max(timeLeft, 0));

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };
  }, [navigate]);

  return null; 
}