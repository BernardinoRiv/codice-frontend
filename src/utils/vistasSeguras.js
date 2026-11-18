export function numeroMonetario(valor) {
  if (valor === null || valor === undefined || (typeof valor === 'string' && !valor.trim()) || typeof valor === 'boolean') throw new Error('Falta un importe en la respuesta del servidor.');
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) throw new Error('El servidor devolvió un importe inválido.');
  return Math.round((numero + Number.EPSILON) * 100) / 100;
}

export function normalizarCuenta(data) {
  if (!data || !data.estudiante || !Array.isArray(data.cargosPendientes)) throw new Error('El estado de cuenta recibido no es válido.');
  const convertir = objeto => Object.fromEntries(Object.entries(objeto).map(([clave, valor]) =>
    /^(monto|deuda|saldo|totalPagado)/.test(clave) ? [clave, numeroMonetario(valor)] : [clave, valor]));
  return {
    ...data,
    estudiante: { ...data.estudiante, nombreCompleto: String(data.estudiante.nombreCompleto ?? 'Estudiante') },
    resumen: data.resumen ? convertir(data.resumen) : data.resumen,
    cargosPendientes: data.cargosPendientes.map(cargo => {
      const normalizado = convertir(cargo);
      const total = numeroMonetario(cargo.montoTotal ?? cargo.monto);
      return { ...normalizado, concepto: String(cargo.concepto ?? ''), monto: total, montoTotal: total };
    }),
    historialPagos: Array.isArray(data.historialPagos) ? data.historialPagos.map(convertir) : [],
  };
}

export async function descargarPdf(response, nombre) {
  if (!response.ok) throw new Error(`No se pudo obtener el documento (${response.status}).`);
  const blob = await response.blob();
  if (!(await blob.slice(0, 5).text()).startsWith('%PDF-')) throw new Error('El servidor no devolvió un PDF válido.');
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function generarClave() {
  const grupos = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789', '!@#$%^&*()_+'];
  const indice = max => {
    const limite = 256 - (256 % max);
    const bytes = new Uint8Array(1);
    do { crypto.getRandomValues(bytes); } while (bytes[0] >= limite);
    return bytes[0] % max;
  };
  const caracteres = grupos.join('');
  const clave = grupos.map(grupo => grupo[indice(grupo.length)]);
  while (clave.length < 16) clave.push(caracteres[indice(caracteres.length)]);
  for (let i = clave.length - 1; i > 0; i--) {
    const j = indice(i + 1);
    [clave[i], clave[j]] = [clave[j], clave[i]];
  }
  return clave.join('');
}

export function notaValida(valor) {
  return /^(?:[0-9](?:\.[0-9])?|10(?:\.0)?)$/.test(String(valor));
}
