const RAW_API_URL = import.meta.env.VITE_API_URL || "";
const API_URL = RAW_API_URL.trim().replace(/\/+$/, "");

export class AdmisionError extends Error {
  constructor(message, { status = 0, data = null, kind = "http" } = {}) {
    super(message);
    this.name = "AdmisionError";
    this.status = status;
    this.data = data;
    this.kind = kind;
  }
}
function mensajeError(data, status) {
  if (data?.detalles && typeof data.detalles === "object") {
    const values = Object.values(data.detalles)
      .flat()
      .filter((v) => typeof v === "string");
    if (values.length) return values.join(" ");
  }
  return (
    [data?.mensaje, data?.message, data?.error].find(
      (x) => typeof x === "string" && x.trim(),
    ) || `No se pudo completar la solicitud (HTTP ${status}).`
  );
}
export async function request(endpoint, options = {}) {
  if (!API_URL)
    throw new AdmisionError(
      "Falta configurar VITE_API_URL. Contacta al administrador.",
      { kind: "configuration" },
    );
  let base;
  try {
    base = new URL(API_URL);
  } catch {
    throw new AdmisionError(
      "La dirección de la API no está configurada correctamente.",
      { kind: "configuration" },
    );
  }
  if (
    !["https:", "http:"].includes(base.protocol) ||
    (globalThis.location?.protocol === "https:" && base.protocol !== "https:")
  ) {
    throw new AdmisionError(
      "La conexión con la API debe usar una dirección HTTP(S) compatible con el portal.",
      { kind: "configuration" },
    );
  }
  const { timeoutMs = 25000, signal: externalSignal, ...init } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body != null) headers.set("Content-Type", "application/json");
    // Estas operaciones son públicas. El interceptor previamente compartido conserva
    // fetch nativo aquí: no adjuntamos la sesión privada a admisiones ni la cerramos.
    const fetchPublico =
      globalThis.window?.[Symbol.for("codice.fetchInterceptor")]
        ?.originalFetch || globalThis.fetch.bind(globalThis);
    const response = await fetchPublico(
      `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
      {
        ...init,
        headers,
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
      },
    );
    const raw = response.status === 204 ? "" : await response.text();
    let data = null;
    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch {
        /* Clasificado abajo sin mostrar HTML. */
      }
    }
    if (!response.ok)
      throw new AdmisionError(mensajeError(data, response.status), {
        status: response.status,
        data,
      });
    if (
      response.status !== 204 &&
      (data === null || typeof data !== "object")
    ) {
      throw new AdmisionError(
        "El servidor devolvió una respuesta incompleta. No repitas una reserva o pago sin comprobar su resultado.",
        { status: response.status, kind: "invalid-response" },
      );
    }
    return data;
  } catch (error) {
    if (externalSignal?.aborted)
      throw new DOMException("Consulta cancelada", "AbortError");
    if (error instanceof AdmisionError) throw error;
    throw new AdmisionError(
      timedOut
        ? "El servidor tardó demasiado en responder. El resultado de la operación puede estar pendiente."
        : "No se pudo contactar con el servidor. Revisa tu conexión.",
      { kind: timedOut ? "timeout" : "network" },
    );
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}
const query = (values) =>
  new URLSearchParams(
    Object.entries(values).map(([k, v]) => [k, String(v)]),
  ).toString();
export const admisionService = {
  getCatalogos: (options) =>
    request(
      "/api/v1/catalogos?nombres=tipos_documento,sedes,departamentos,carreras",
      options,
    ),
  getDistritos: (idDepartamento, options) =>
    request(
      `/api/v1/catalogos/distritos?${query({ padreId: idDepartamento })}`,
      options,
    ),
  // El catálogo carreras debe entregar IDs de carrera_sede, como espera la vista original.
  // Si entrega idCarrera, el backend debe proporcionar la relación; nunca se inventa.
  getPensumVigente: (idCarreraSede, options) =>
    request(
      `/api/v1/oferta-academica/pensum-vigente?${query({ idCarreraSede })}`,
      options,
    ),
  getOfertaNuevoIngreso: (idPensum, idSede, options) =>
    request(
      `/api/v1/oferta-academica/nuevo-ingreso?${query({ idPensum, idSede })}`,
      options,
    ),
  verificarIdentidad: (idTipoDocumento, numeroDocumento, options) =>
    request(
      `/api/v1/public/admision-online/verificar-identidad?${query({ idTipoDocumento, numeroDocumento: numeroDocumento.trim() })}`,
      options,
    ),
  solicitarCodigoAdmision: (idTipoDocumento, numeroDocumento) =>
    request("/api/v1/public/admision-online/solicitar-codigo", {
      method: "POST",
      body: JSON.stringify({
        idTipoDocumento: String(idTipoDocumento),
        numeroDocumento: numeroDocumento.trim(),
      }),
    }),
  verificarCodigoAdmision: (idTipoDocumento, numeroDocumento, codigo) =>
    request("/api/v1/public/admision-online/verificar-codigo", {
      method: "POST",
      body: JSON.stringify({
        idTipoDocumento: String(idTipoDocumento),
        numeroDocumento: numeroDocumento.trim(),
        codigo,
      }),
    }),
  procesarPreMatricula: (payload) =>
    request("/api/v1/public/admision-online/pre-matricular", {
      method: "POST",
      body: JSON.stringify(payload),
      timeoutMs: 45000,
    }),
  generarBoletaNpe: (id) =>
    request(
      `/api/v1/public/admision-online/${encodeURIComponent(id)}/generar-boleta-npe`,
      { method: "POST", timeoutMs: 45000 },
    ),
  cancelarPreMatricula: (id) =>
    request(
      `/api/v1/public/admision-online/cancelar/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  liquidarPagoOnline: (payload, key) => {
    if (!key)
      throw new AdmisionError("No se pudo identificar el intento de pago.", {
        kind: "configuration",
      });
    return request("/api/v1/public/admision-online/pagar-orden", {
      method: "POST",
      timeoutMs: 45000,
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({
        idMatricula: Number(payload.idMatricula),
        cuotasAPagar: Number(payload.cuotasAPagar ?? 1),
        numeroTarjeta: String(payload.numeroTarjeta).replace(/\s/g, ""),
        titularTarjeta: String(payload.titular).trim().toUpperCase(),
        fechaExpiracion: String(payload.fechaExpiracion).trim(),
        cvv: String(payload.cvv).trim(),
      }),
    });
  },
};
