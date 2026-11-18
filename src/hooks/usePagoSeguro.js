import { useEffect, useState, useRef, useCallback } from 'react';
import { leerSesion } from '../utils/sesion';

export default function usePagoSeguro() {
  const payload = leerSesion().payload;
  const clave = `codice.pago-pendiente.${payload?.sub ?? payload?.idUsuario ?? 'sesion'}`;
  const leer = useCallback(() => { try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch { return { fecha: '', referencia: 'No se pudo leer el estado local' }; } }, [clave]);
  const [pendiente, setPendiente] = useState(leer);
  const ocupado = useRef(false);
  useEffect(() => {
    const actualizar = () => setPendiente(leer());
    window.addEventListener('storage', actualizar);
    window.addEventListener('codice:pago', actualizar);
    return () => { window.removeEventListener('storage', actualizar); window.removeEventListener('codice:pago', actualizar); };
  }, [leer]);
  const quitar = () => { localStorage.removeItem(clave); setPendiente(null); window.dispatchEvent(new Event('codice:pago')); };
  const verificar = () => {
    if (ocupado.current) return;
    if (window.confirm('Confirma que revisaste el historial y el estado de cuenta con Finanzas. Si el pago ya existe, no debes repetirlo. ¿Terminaste la revisión?')) quitar();
  };
  const enviar = async (url, datos) => {
    if (ocupado.current || leer()) throw new Error('Existe un pago pendiente de verificación. Revisa el historial antes de continuar.');
    ocupado.current = true;
    try {
      const registro = { fecha: new Date().toISOString(), referencia: datos.numeroReferencia, idEstudiante: datos.idEstudiante, monto: datos.montoRecibido };
      localStorage.setItem(clave, JSON.stringify(registro));
      setPendiente(registro); window.dispatchEvent(new Event('codice:pago'));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(url, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        const data = await response.json().catch(() => null);
        if ([400, 401, 403, 404, 422].includes(response.status)) {
          quitar();
          throw new Error(data?.mensaje || data?.message || data?.error || `Solicitud rechazada (${response.status}).`);
        }
        if (!response.ok || !data || data.exito === false || (!data.idPago && !data.factura)) throw new Error('No se pudo confirmar el resultado del pago. Puede haberse registrado: revisa el historial y el estado de cuenta antes de reintentar.');
        quitar();
        return data;
      } finally { clearTimeout(timer); }
    } catch (error) {
      if (leer()) throw new Error('Resultado pendiente de verificación. El pago puede haberse registrado. Revisa el historial y consulta con Finanzas antes de volver a cobrar.', { cause: error });
      throw error;
    } finally { ocupado.current = false; }
  };
  return { pendiente, enviar, verificar };
}
