import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const azul = '#133968';
const margen = 15;

function franjas(horarios) {
  return (horarios ?? []).filter(Boolean).map(({ dia, horaInicio, horaFin }) => {
    const inicio = String(horaInicio ?? '').slice(0, 5);
    const fin = String(horaFin ?? '').slice(0, 5);
    return [dia, [inicio, fin].filter(Boolean).join(' - ')].filter(Boolean).join(': ');
  }).filter(Boolean).join('\n') || 'Sin horarios';
}

export function crearInformeOfertaPdf(secciones, ciclo, fecha = new Date()) {
  const pdf = new jsPDF({ orientation: 'landscape', format: 'letter' });
  const ancho = pdf.internal.pageSize.getWidth();
  const alto = pdf.internal.pageSize.getHeight();
  const sedes = [...new Set(secciones.map(seccion => seccion.nombreSede || 'Sin sede registrada'))];
  const centro = sedes.length === 1 ? sedes[0] : 'Varias sedes';
  const estado = ciclo.estadoCiclo === 'PLANIFICADO' ? 'Planificación' : ciclo.estadoCiclo;
  const tituloCiclo = `Ciclo ${ciclo.codigoCiclo}${estado ? ` (${estado})` : ''}`;
  const fechaEmision = new Intl.DateTimeFormat('es-SV', {
    dateStyle: 'long', timeZone: 'America/El_Salvador',
  }).format(fecha);
  pdf.setProperties({ title: `Informe de Oferta Académica - Ciclo ${ciclo.codigoCiclo}` });

  function encabezado() {
    pdf.setFont('helvetica', 'bold').setFontSize(16).setTextColor(azul);
    pdf.text('UNIVERSIDAD MODULAR ABIERTA', margen, 20);
    pdf.setFontSize(11);
    pdf.text(tituloCiclo, ancho - margen, 20, { align: 'right', maxWidth: 72 });
    pdf.setFontSize(11).setTextColor('#334155');
    pdf.text(`${centro} - Dirección Académica`, margen, 27, { maxWidth: 155 });
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor('#0f172a');
    pdf.text('Planificación Semestral de Secciones y Horarios Académicos', margen, 34);
    pdf.text(`Fecha de emisión: ${fechaEmision}`, ancho - margen, 30, { align: 'right' });
    const total = ciclo.estadoCiclo === 'PLANIFICADO' ? 'Total de secciones propuestas' : 'Total de secciones';
    pdf.text(`${total}: ${secciones.length}`, ancho - margen, 35, { align: 'right' });
    pdf.setDrawColor(azul).setLineWidth(0.6).line(margen, 40, ancho - margen, 40);
  }

  autoTable(pdf, {
    theme: 'plain',
    margin: { top: 46, left: margen, right: margen, bottom: 17 },
    head: [['#', 'SECCIÓN', 'CARRERA', 'ASIGNATURA\nOFICIAL', 'CATEDRÁTICO\nTITULAR', 'MODALIDAD / ESPACIO', 'FRANJAS HORARIAS', 'CUPO']],
    body: secciones.map((s, indice) => [
      indice + 1, s.codigoGrupo ?? '', s.nombreCarrera || s.carrera || 'Carrera general',
      [s.nombreMateria, s.codigoMateria].filter(Boolean).join('\n'),
      [s.nombreDocente, sedes.length > 1 ? s.nombreSede || 'Sin sede registrada' : ''].filter(Boolean).join('\n'),
      [s.modalidad, s.aulaOEnlace, s.estadoGrupo].filter(Boolean).join('\n'),
      franjas(Array.isArray(s.horarios) ? s.horarios : []), s.cupoMaximo ?? '',
    ]),
    styles: { font: 'helvetica', fontSize: 9, textColor: '#0f172a', cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { textColor: '#64748b', fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { lineWidth: { bottom: 0.18 }, lineColor: '#cbd5e1' },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: 'bold' }, 1: { cellWidth: 21, fontStyle: 'bold' },
      2: { cellWidth: 46, fontStyle: 'bold' }, 3: { cellWidth: 37 },
      4: { cellWidth: 35 }, 5: { cellWidth: 36 }, 6: { cellWidth: 'auto' },
      7: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
    },
    rowPageBreak: 'avoid',
    willDrawPage: encabezado,
  });

  let yFirma = pdf.lastAutoTable.finalY + 13;
  if (yFirma + 20 > alto - margen) {
    pdf.addPage();
    encabezado();
    yFirma = 56;
  }

  const firmas = [
    ['Coordinación de Registro Académico', 'Responsable de Programación'],
    ['Dirección de Centro Regional', centro],
    ['Dictamen de Junta Directiva', 'Aprobación Institucional de Oferta'],
  ];
  const separacion = 9;
  const anchoFirma = (ancho - 2 * margen - 2 * separacion) / firmas.length;
  firmas.forEach(([cargo, detalle], indice) => {
    const x = margen + indice * (anchoFirma + separacion);
    const medio = x + anchoFirma / 2;
    pdf.setDrawColor(azul).setLineWidth(0.4).line(x, yFirma, x + anchoFirma, yFirma);
    pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor('#0f172a');
    pdf.text('Firma: ________________________', medio, yFirma + 5, { align: 'center' });
    pdf.setFont('helvetica', 'bold').setTextColor(azul);
    pdf.text(cargo, medio, yFirma + 9, { align: 'center', maxWidth: anchoFirma });
    pdf.setFont('helvetica', 'normal').setTextColor('#0f172a');
    pdf.text(detalle, medio, yFirma + 13, { align: 'center', maxWidth: anchoFirma });
  });

  const paginas = pdf.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina++) {
    pdf.setPage(pagina).setFont('helvetica', 'normal').setFontSize(8).setTextColor('#64748b');
    pdf.text(`${pagina} / ${paginas}`, ancho - margen, alto - 8, { align: 'right' });
  }
  return pdf;
}
