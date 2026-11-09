const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const API_URL = RAW_API_URL.replace(/\/+$/, '');

async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}${cleanEndpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
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
  // 1. Catálogos públicos y oferta académica
  getCatalogos: async () => request('/api/v1/catalogos?nombres=tipos_documento,sedes,departamentos,carreras'),
  getDistritos: async (idDepartamento) => request(`/api/v1/catalogos/distritos?padreId=${idDepartamento}`),
  getPensumVigente: async (idCarreraSede) => request(`/api/v1/oferta-academica/pensum-vigente?idCarreraSede=${encodeURIComponent(idCarreraSede)}`),
  getOfertaNuevoIngreso: async (idPensum, idSede) => request(`/api/v1/oferta-academica/nuevo-ingreso?idPensum=${encodeURIComponent(idPensum)}&idSede=${encodeURIComponent(idSede)}`),

  // 2. Fail-Fast en Paso 1: Valida restricciones institucionales
  verificarIdentidad: async (idTipoDocumento = 1, numeroDocumento) => {
    const params = new URLSearchParams({ idTipoDocumento: String(idTipoDocumento), numeroDocumento: numeroDocumento.trim() });
    return await request(`/api/v1/public/admision-online/verificar-identidad?${params.toString()}`);
  },

  // 3. Fase 1: Reserva de cupos (Ya no envía modalidadPago)
  procesarPreMatricula: async (payload) => {
    return await request('/api/v1/public/admision-online/pre-matricular', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 4. Fase 1.5: Desacoplamiento NPE (Ejecutado solo si elige Ventanilla)
  generarBoletaNpe: async (idMatricula) => {
    return await request(`/api/v1/public/admision-online/${encodeURIComponent(idMatricula)}/generar-boleta-npe`, {
      method: 'POST'
    });
  },

  // 5. Fase 2: Liquidación Online Segura (Idempotente)
  liquidarPagoOnline: async (payloadPago, idempotencyKey) => {
    const key = idempotencyKey || (window.crypto?.randomUUID ? window.crypto.randomUUID() : `IDEMP-${Date.now()}`);
    return await request('/api/v1/public/admision-online/pagar-orden', {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify({
        idMatricula: Number(payloadPago.idMatricula),
        cuotasAPagar: Number(payloadPago.cuotasAPagar || 1),
        numeroTarjeta: String(payloadPago.numeroTarjeta).replace(/\s+/g, ''),
        
        // CORRECCIÓN DE CONTRATO AQUÍ: El DTO de Java espera "titularTarjeta", no "titular"
        titularTarjeta: String(payloadPago.titular).trim().toUpperCase(),
        
        fechaExpiracion: String(payloadPago.fechaExpiracion).trim(),
        cvv: String(payloadPago.cvv).trim()
      })
    });
  },

  // 6. Rollback Explícito: Requerido para el botón "Atrás" del Paso 3
  cancelarPreMatricula: async (idMatricula) => {
    return await request(`/api/v1/public/admision-online/cancelar/${encodeURIComponent(idMatricula)}`, {
      method: 'DELETE'
    });
  },

  solicitarCodigoAdmision: (idTipoDocumento, numeroDocumento) =>
  request('/api/v1/public/admision-online/solicitar-codigo', {
    method: 'POST',
    body: JSON.stringify({
      idTipoDocumento: String(idTipoDocumento),
      numeroDocumento
    })
  }),

  verificarCodigoAdmision: (idTipoDocumento, numeroDocumento, codigo) =>
    request('/api/v1/public/admision-online/verificar-codigo', {
      method: 'POST',
      body: JSON.stringify({
        idTipoDocumento: String(idTipoDocumento),
        numeroDocumento,
        codigo
      })
    })
};