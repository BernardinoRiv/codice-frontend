export const ROLES = Object.freeze({
  ADMINISTRADOR: 'ADMINISTRADOR',
  REGISTRO_ACADEMICO: 'REGISTRO_ACADEMICO',
  EMPLEADO: 'EMPLEADO',
  ESTUDIANTE: 'ESTUDIANTE',
  DOCENTE: 'DOCENTE',
  FINANZAS: 'FINANZAS',
});

const EVENTO = 'codice:sesion';
const CLAVES = ['token', 'rol', 'roles', 'nombreCompleto', 'ultimoAcceso', 'urlFoto',
  'codigoCiclo', 'idCiclo', 'idCargo', 'nombreCargo', 'idSesionActual', 'idEstudiante', 'carnet'];

export function normalizarRol(valor) {
  const rol = String(valor ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/^ROLE_/, '').replace(/\s+/g, '_');
  return rol === 'REGISTRADOR_ACADEMICO' ? ROLES.REGISTRO_ACADEMICO : rol;
}

export function leerToken(token, ahora = Date.now()) {
  try {
    if (typeof token !== 'string') return null;
    const partes = token.split('.');
    if (partes.length !== 3 || partes.some(p => !/^[A-Za-z0-9_-]+$/.test(p))) return null;
    const segmento = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(segmento.padEnd(Math.ceil(segmento.length / 4) * 4, '=')), c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= ahora) return null;
    if (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || payload.nbf * 1000 > ahora)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function fechaAccesoValida(valor) {
  if (typeof valor !== 'string') return false;
  const texto = valor.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?$/.exec(texto);
  if (!m) return false;
  const [, anio, mes, dia, hora, minuto, segundo, zona] = m;
  const y = Number(anio), mo = Number(mes), d = Number(dia);
  if (y < 1000 || mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return false;
  if (Number(hora) > 23 || Number(minuto) > 59 || Number(segundo) > 59) return false;
  if (zona && zona !== 'Z') {
    const [h, min] = zona.slice(1).split(':').map(Number);
    if (h > 14 || min > 59 || (h === 14 && min !== 0)) return false;
  }
  return true;
}

export function rolesDelToken(payload) {
  const resultado = new Set();
  const agregar = valor => {
    if (Array.isArray(valor)) return valor.forEach(agregar);
    if (valor && typeof valor === 'object') return agregar(valor.authority ?? valor.nombre);
    if (typeof valor !== 'string') return;
    if (valor.trim().startsWith('[')) {
      try { agregar(JSON.parse(valor)); } catch { return; }
      return;
    }
    valor.split(',').forEach(v => {
      const rol = normalizarRol(v);
      if (Object.values(ROLES).includes(rol)) resultado.add(rol);
    });
  };
  agregar(payload?.rol);
  agregar(payload?.roles);
  agregar(payload?.authorities);
  return [...resultado];
}

export function snapshotSesion() {
  try { return JSON.stringify(CLAVES.map(k => localStorage.getItem(k))); }
  catch { return '[]'; }
}

export function leerSesion(snapshot = snapshotSesion()) {
  const valores = JSON.parse(snapshot);
  const datos = Object.fromEntries(CLAVES.map((k, i) => [k, valores[i] ?? null]));
  const payload = leerToken(datos.token);
  const roles = rolesDelToken(payload);
  return {
    token: datos.token,
    payload,
    roles,
    valida: Boolean(payload),
    requiereCambio: !fechaAccesoValida(datos.ultimoAcceso),
    nombreCompleto: datos.nombreCompleto || 'Usuario',
  };
}

export function destinoSesion(sesion) {
  if (!sesion.valida) return '/';
  if (sesion.requiereCambio) return '/forzar-password';
  if (!sesion.roles.length) return '/sin-permisos';
  return '/dashboard/inicio';
}

export function suscribirSesion(callback) {
  const cambio = e => { if (e.key === null || CLAVES.includes(e.key)) callback(); };
  window.addEventListener(EVENTO, callback);
  window.addEventListener('storage', cambio);
  return () => {
    window.removeEventListener(EVENTO, callback);
    window.removeEventListener('storage', cambio);
  };
}

function notificar() { window.dispatchEvent(new Event(EVENTO)); }

export function limpiarSesion() {
  CLAVES.forEach(k => localStorage.removeItem(k));
  notificar();
}

export function guardarSesion(data) {
  const payload = leerToken(data?.token);
  if (data?.exito !== true || !payload) throw new Error('El servidor no devolvió una sesión válida.');
  try {
    CLAVES.forEach(k => localStorage.removeItem(k));
    const valores = {
      token: data.token,
      rol: rolesDelToken(payload)[0] || '',
      nombreCompleto: data.nombreCompleto || 'Usuario',
      ultimoAcceso: fechaAccesoValida(data.ultimoAcceso) ? data.ultimoAcceso.trim() : '',
      codigoCiclo: data.codigoCiclo,
      idCiclo: data.idCiclo,
      idCargo: data.idCargo,
      nombreCargo: data.nombreCargo,
      idSesionActual: payload.idSesion,
      carnet: payload.carnet,
      idEstudiante: payload.idEstudiante,
    };
    Object.entries(valores).forEach(([k, v]) => { if (v !== undefined && v !== null) localStorage.setItem(k, String(v)); });
  } catch {
    limpiarSesion();
    throw new Error('No se pudo guardar la sesión. Comprueba que el navegador permita almacenamiento local.');
  }
  notificar();
  return leerSesion();
}

export function confirmarCambioPassword(data, tokenEsperado) {
  const sesion = leerSesion();
  if (data?.exito !== true) throw new Error('El servidor no confirmó el cambio de contraseña.');
  if (!sesion.valida || sesion.token !== tokenEsperado) throw new Error('La sesión cambió o caducó. Vuelve a iniciar sesión.');
  localStorage.setItem('ultimoAcceso', new Date().toISOString());
  notificar();
}

export function actualizarTokenSesion(nuevoToken) {
  const payload = leerToken(nuevoToken);
  if (!payload) throw new Error('El token de renovación no es válido.');
  try {
    localStorage.setItem('token', nuevoToken);
    if (payload.idSesion !== undefined && payload.idSesion !== null) {
      localStorage.setItem('idSesionActual', String(payload.idSesion));
    }
  } catch {
    throw new Error('No se pudo actualizar la sesión.');
  }
  notificar();
  return leerSesion();
}
