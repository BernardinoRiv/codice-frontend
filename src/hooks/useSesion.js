import { useSyncExternalStore } from 'react';
import { leerSesion, snapshotSesion, suscribirSesion } from '../utils/sesion';

export default function useSesion() {
  const snapshot = useSyncExternalStore(suscribirSesion, snapshotSesion, () => '[]');
  return leerSesion(snapshot);
}
