export const EDAD_MAXIMA_REGISTRO = 120;

export function normalizarBusqueda(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

const DOMINIOS_A_REVISAR = new Map([
  ['gmil.com', 'gmail.com'], ['gamil.com', 'gmail.com'], ['gmai.com', 'gmail.com'],
  ['gmail.con', 'gmail.com'], ['gmail.cmo', 'gmail.com'], ['gnail.com', 'gmail.com'],
  ['hotmal.com', 'hotmail.com'], ['hotmial.com', 'hotmail.com'], ['hotmail.con', 'hotmail.com'],
  ['outlok.com', 'outlook.com'], ['outllook.com', 'outlook.com'], ['outlook.con', 'outlook.com'],
  ['yaho.com', 'yahoo.com'], ['yahoo.con', 'yahoo.com'],
]);

export function validarCorreoRegistro(correo) {
  const valor = String(correo ?? '').trim();
  if (!valor) return 'Ingresa el correo personal.';
  if (valor.length > 254 || /\s/.test(valor)) return 'El correo no debe contener espacios ni superar 254 caracteres.';
  const partes = valor.split('@');
  if (partes.length !== 2) return 'Ingresa un correo válido, por ejemplo: nombre@gmail.com.';
  const [usuario, dominioOriginal] = partes;
  const dominio = dominioOriginal.toLowerCase();
  if (!usuario || usuario.length > 64 || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(usuario) ||
      usuario.startsWith('.') || usuario.endsWith('.') || usuario.includes('..')) {
    return 'Revisa la parte del correo anterior a @.';
  }
  const etiquetas = dominio.split('.');
  if (etiquetas.length < 2 || etiquetas.some(etiqueta => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(etiqueta)) ||
      !/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(etiquetas.at(-1))) {
    return 'El dominio tiene un formato inválido. Ejemplo: gmail.com o uma.edu.sv.';
  }
  const sugerencia = DOMINIOS_A_REVISAR.get(dominio);
  if (sugerencia) return `Revisa el dominio «${dominio}». ¿Quisiste escribir «${sugerencia}»?`;
  return '';
}

function fechaHoy(ahora) {
  const partes = new Intl.DateTimeFormat('en', {
    timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(ahora);
  const obtener = tipo => Number(partes.find(parte => parte.type === tipo).value);
  return { anio: obtener('year'), mes: obtener('month'), dia: obtener('day') };
}

function restarAnios(hoy, anios) {
  const anio = hoy.anio - anios;
  const ultimoDia = new Date(Date.UTC(anio, hoy.mes, 0)).getUTCDate();
  return `${anio}-${String(hoy.mes).padStart(2, '0')}-${String(Math.min(hoy.dia, ultimoDia)).padStart(2, '0')}`;
}

export function limitesFechaNacimiento(edadMinima = 15, ahora = new Date()) {
  const hoy = fechaHoy(ahora);
  return { min: restarAnios(hoy, EDAD_MAXIMA_REGISTRO), max: restarAnios(hoy, edadMinima) };
}

export function validarNacimientoRegistro(valor, edadMinima = 15, ahora = new Date()) {
  if (!valor) return 'Ingresa la fecha de nacimiento.';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor));
  if (!match) return 'Ingresa una fecha completa y válida.';
  const [, a, m, d] = match;
  const anio = Number(a), mes = Number(m), dia = Number(d);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (anio < 1000 || fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() + 1 !== mes || fecha.getUTCDate() !== dia) {
    return 'La fecha de nacimiento no existe. Revisa el día, mes y año.';
  }
  const limites = limitesFechaNacimiento(edadMinima, ahora);
  if (valor < limites.min) return `La fecha no puede ser anterior a ${limites.min}; el límite configurado es de ${EDAD_MAXIMA_REGISTRO} años.`;
  if (valor > restarAnios(fechaHoy(ahora), 0)) return 'La fecha de nacimiento no puede estar en el futuro.';
  if (valor > limites.max) return `Debe tener al menos ${edadMinima} años para este tipo de documento.`;
  return '';
}
