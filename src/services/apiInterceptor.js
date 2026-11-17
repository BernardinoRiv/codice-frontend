const API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');

export default async function apiInterceptor(url, options = {}) {
  if (!API_URL) throw new Error('No se configuró la dirección de la API.');
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    throw new Error('La ruta de la API no es válida.');
  }
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_URL}${url}`, { ...options, headers });
  if (response.status === 403) {
    throw Object.assign(new Error('No tienes permisos para esta acción.'), { status: 403 });
  }
  return response;
}
