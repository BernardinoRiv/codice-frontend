// --- util/admisionValidaciones.js ---

export const esId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export const normalizarTexto = (value) =>
  String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const extraerDigitos = (texto = "") => String(texto || "").replace(/\D/g, "");
export const extraerAlfanumerico = (texto = "") => String(texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Cálculo real matemático Módulo 10 para DUI
export const validarDUI = (dui) => {
  if (!/^\d{8}-\d$/.test(dui)) return false;
  const digitos = dui.replace("-", "").split("").map(Number);
  if (digitos.every((n) => n === 0)) return false;
  const verificador = digitos.pop();
  const suma = digitos.reduce((acc, n, i) => acc + n * (9 - i), 0);
  return verificador === (10 - (suma % 10)) % 10;
};

// Validación básica de NIT (formato y no todos ceros)
export const validarNIT = (nit) => {
  if (!/^\d{4}-\d{6}-\d{3}-\d$/.test(nit)) return false;
  return !/^0{14}$/.test(nit.replace(/-/g, ""));
};

// Auto-formato en tiempo real
export const formatoDocumento = (tipo, valor) => {
  const tipoStr = String(tipo);
  if (tipoStr === "1") { // DUI
    const n = extraerDigitos(valor).slice(0, 9);
    return n.length <= 8 ? n : `${n.slice(0, 8)}-${n.slice(8)}`;
  }
  if (tipoStr === "3") { // NIT
    const n = extraerDigitos(valor).slice(0, 14);
    if (n.length <= 4) return n;
    if (n.length <= 10) return `${n.slice(0, 4)}-${n.slice(4)}`;
    if (n.length <= 13) return `${n.slice(0, 4)}-${n.slice(4, 10)}-${n.slice(10)}`;
    return `${n.slice(0, 4)}-${n.slice(4, 10)}-${n.slice(10, 13)}-${n.slice(13)}`;
  }
  // Pasaporte u otros (solo letras y números)
  return extraerAlfanumerico(valor).slice(0, 15);
};

export const errorDocumento = (tipo, numero) => {
  if (!esId(tipo)) return "Selecciona un tipo de documento.";
  const tipoStr = String(tipo);
  
  if (tipoStr === "1") return validarDUI(numero) ? "" : "DUI inválido: No supera la validación.";
  if (tipoStr === "3") return validarNIT(numero) ? "" : "NIT inválido: Formato incorrecto.";
  
  return /^[0-9A-Z]{5,15}$/.test(numero)
    ? ""
    : "El pasaporte debe tener entre 5 y 15 caracteres alfanuméricos.";
};

export const formatoTelefono = (valor) => {
  const n = extraerDigitos(valor).slice(0, 8);
  return n.length <= 4 ? n : `${n.slice(0, 4)}-${n.slice(4)}`;
};

// Calcula la fecha máxima según edad mínima requerida
export const calcularFechaMaxima = (edadMinima) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - edadMinima);
  return date.toISOString().split("T")[0];
};

export function validarDatosPersonales(data, distritos, maxFechaStr) {
  const errors = {};
  
  const documentError = errorDocumento(data.idTipoDocumento, data.numeroDocumento);
  if (documentError) errors.numeroDocumento = documentError;
  
  for (const field of ["nombres", "apellidos"]) {
    const text = data[field]?.trim() || "";
    if (!text || text.length > 100 || !/^[A-ZÁÉÍÓÚÑ ]+$/.test(text))
      errors[field] = "Solo se permiten letras mayúsculas.";
  }
  
  const date = data.fechaNacimiento;
  if (!date || date > maxFechaStr) {
    errors.fechaNacimiento = "Fecha inválida o no cumples con la edad mínima.";
  }
  
  if (!["M", "F"].includes(data.sexo)) errors.sexo = "Selecciona una opción.";
  
  const mail = data.correoPersonal?.trim() || "";
  if (mail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
    errors.correoPersonal = "Introduce un correo válido.";
    
  if (!/^[267]\d{3}-\d{4}$/.test(data.telefono))
    errors.telefono = "Debe iniciar con 2, 6 o 7 (Ej. 7000-0000).";
    
  if (!esId(data.idDepartamento)) errors.idDepartamento = "Requerido.";
  if (!esId(data.idDistrito) || !distritos.some((d) => String(d.id ?? d.idDistrito) === String(data.idDistrito)))
    errors.idDistrito = "Selecciona un distrito válido.";
    
  if (!data.direccion?.trim() || data.direccion.trim().length > 255)
    errors.direccion = "Introduce una dirección de hasta 255 caracteres.";
    
  return errors;
}

export function clasificarErrorOferta(error) {
  const message = normalizarTexto(error?.data?.mensaje || error?.message);
  const closed =
    error?.status === 422 &&
    (/supero el plazo/.test(message) ||
      /no existe ciclo/.test(message) ||
      /(?:periodo|plazo).*cerrado|finalizado/.test(message));
  return closed ? "cerrada" : "error";
}

export function validarSeleccion(oferta, seleccion) {
  if (!Array.isArray(oferta) || !seleccion.length) return false;
  const materias = new Set();
  return seleccion.every((id) => {
    const materia = oferta.find((m) =>
      m.gruposDisponibles?.some((g) => String(g.idGrupo) === String(id) && Number(g.cuposDisponibles) > 0),
    );
    if (!materia || materias.has(String(materia.idMateria))) return false;
    materias.add(String(materia.idMateria));
    return true;
  });
}

export function validarTarjeta(card, now = new Date()) {
  const errors = {};
  if (!/^\d{13,19}$/.test(card.numero.replace(/\s/g, ""))) errors.numero = "Introduce entre 13 y 19 dígitos.";
  if (!card.titular.trim() || card.titular.trim().length > 150) errors.titular = "Requerido (máximo 150 caracteres).";
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(card.expiracion);
  if (!match || 2000 + Number(match[2]) < now.getFullYear() || (2000 + Number(match[2]) === now.getFullYear() && Number(match[1]) < now.getMonth() + 1))
    errors.expiracion = "Expiración MM/AA no válida o vencida.";
  if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = "Introduce 3 o 4 dígitos.";
  return errors;
}

export const errorIncierto = (error) =>
  error?.kind !== "configuration" && (!error?.status || error.status >= 500 || [408, 409].includes(error.status) || error.kind === "invalid-response");