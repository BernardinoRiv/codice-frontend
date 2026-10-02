import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarPDFNotas = (datosCiclo, estudiante, horario) => {
  // Configuración en orientación Vertical (Portrait)
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header institucional
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('UNIVERSIDAD MODULAR ABIERTA', pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('ADMINISTRACIÓN ACADÉMICA', pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(11);
  doc.text('BOLETA DE CALIFICACIONES', pageWidth / 2, 28, { align: 'center' });

  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(15, 32, pageWidth - 15, 32);

  // Datos del estudiante estructurados en 2 columnas para evitar solapamientos
  doc.setFontSize(9);
  const startY = 38;
  const col1X = 15;
  const col2X = pageWidth / 2 + 10; // Columna derecha

  doc.setFont('helvetica', 'bold');
  doc.text('Carnet:', col1X, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.carnet || 'SA00000000', col1X + 16, startY);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', col1X, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.nombre || '', col1X + 16, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Carrera:', col1X, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.carrera || 'No asignada', col1X + 16, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Ciclo:', col2X, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(datosCiclo.ciclo || '', col2X + 28, startY);

  doc.setFont('helvetica', 'bold');
  doc.text('CUM:', col2X, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(Number(estudiante.cum).toFixed(1) || '0.0', col2X + 28, startY + 6);

  // Ajuste de offset X para evitar que se monte encima del número
  doc.setFont('helvetica', 'bold');
  doc.text('UV Acumuladas:', col2X, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.uv?.toString() || '0', col2X + 28, startY + 12);

  // Tabla de calificaciones abreviada para ajustarse al formato Portrait
  const headers = [['Materia', 'Cód.', 'L1', 'P1', 'L2', 'P2', 'L3', 'P3', 'Promedio', 'Oficial']];
  
  const body = datosCiclo.materias.map(m => [
    m.nombre,
    m.codigo,
    m.notas?.lab1?.toFixed(2) || '-',
    m.notas?.par1?.toFixed(2) || '-',
    m.notas?.lab2?.toFixed(2) || '-',
    m.notas?.par2?.toFixed(2) || '-',
    m.notas?.lab3?.toFixed(2) || '-',
    m.notas?.par3?.toFixed(2) || '-',
    m.promedioSinRedondear?.toFixed(3) || '-',
    m.promedioOficial?.toFixed(1) || '-'
  ]);

  autoTable(doc, {
    startY: 58,
    head: headers,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 50, halign: 'left' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 12, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 19, halign: 'center' },
      9: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 }
  });

  // Horario (si existe)
  let finalY = doc.lastAutoTable.finalY + 10;

  if (horario && horario.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('HORARIO DE CLASES', 15, finalY);
    finalY += 4;

    const horarioHeaders = [['Materia', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']];
    
    const horarioBody = horario.map(h => [
      h.materia,
      h.lunes || '-',
      h.martes || '-',
      h.miercoles || '-',
      h.jueves || '-',
      h.viernes || '-',
      h.sabado || '-'
    ]);

    autoTable(doc, {
      startY: finalY,
      head: horarioHeaders,
      body: horarioBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 30, 30],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [40, 40, 40]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 45, halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' }
      },
      margin: { left: 15, right: 15 }
    });

    finalY = doc.lastAutoTable.finalY + 10;
  }

  // Footer con fecha
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Boleta generada el: ${new Date().toLocaleDateString('es-SV')} ${new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - 15,
    pageHeight - 10,
    { align: 'right' }
  );

  // Nombre de archivo limpio y estructurado (Ej: Boleta_Notas_Carlos_Estrada_INF001.pdf)
  const nombreLimpio = (estudiante.nombre || 'Estudiante').replace(/\s+/g, '_');
  doc.save(`Boleta_Notas_${nombreLimpio}_${estudiante.carnet}.pdf`);
};