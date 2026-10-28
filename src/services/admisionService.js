const API_URL = import.meta.env.VITE_API_URL;

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detalles 
      ? Object.values(data.detalles).join(' ') 
      : (data?.mensaje || data?.error || `Error HTTP ${response.status}`);
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const admisionService = {
  // 1. Obtener catálogos públicos para admisión
  getCatalogos: async () => {
    return await request('/api/v1/catalogos?nombres=tipos_documento,sedes,departamentos,carreras');
  },

  // 2. Obtener distritos por departamento
  getDistritos: async (idDepartamento) => {
    return await request(`/api/v1/catalogos/distritos?padreId=${idDepartamento}`);
  },

  // 3. Obtener pensum vigente de la carrera
  getPensumVigente: async (idCarreraSede) => {
    return await request(`/api/v1/oferta-academica/pensum-vigente?idCarreraSede=${idCarreraSede}`);
  },

  // 4. Obtener oferta de grupos y cupos para nuevo ingreso
  getOfertaNuevoIngreso: async (idPensum, idSede) => {
    return await request(`/api/v1/oferta-academica/nuevo-ingreso?idPensum=${idPensum}&idSede=${idSede}`);
  },

  // 5. Verificar si la persona ya existe en la base de datos
  buscarPersonaPorDocumento: async (documento) => {
    const res = await fetch(`${API_URL}/api/v1/personas/buscar-por-documento?numeroDocumento=${encodeURIComponent(documento)}`);
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) throw new Error('Error al verificar documento');
    return await res.json();
  },

  // 6. Pre-matrícula Online (Regla 1+1: Matrícula + Cuota 1 = $140.00)
  procesarPreMatricula: async (payload) => {
    return await request('/api/v1/public/admision-online/pre-matricular', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 7. Liquidación de Pago en Línea (Idempotente)
  liquidarPagoOnline: async (idMatricula, datosTarjeta, idempotencyKey = crypto.randomUUID()) => {
    return await request('/api/v1/public/admision-online/pagar-orden', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        idMatricula,
        numeroTarjeta: datosTarjeta.numeroTarjeta.replace(/\s+/g, ''),
        titularTarjeta: datosTarjeta.titularTarjeta.trim().toUpperCase(),
        fechaExpiracion: datosTarjeta.fechaExpiracion,
        cvv: datosTarjeta.cvv,
        cuotasAPagar: 1 // Regla 1+1
      })
    });
  }
};