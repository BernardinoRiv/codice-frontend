import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarPDFNotas = (datosCiclo, estudiante, horario) => {
  const doc = new jsPDF('landscape', 'mm', 'letter');
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
  doc.text('REPORTE DE CALIFICACIONES - CICLO ACTUAL', pageWidth / 2, 28, { align: 'center' });

  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(15, 32, pageWidth - 15, 32);

  // Datos del estudiante
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const startY = 38;
  const leftX = 15;
  const midX = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.text('Carnet:', leftX, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.carnet || 'SA00000000', leftX + 20, startY);

  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', leftX, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.nombre || '', leftX + 20, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Carrera:', leftX, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.carrera || 'Lic. en Informática', leftX + 20, startY + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Ciclo:', midX, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(datosCiclo.ciclo || '', midX + 15, startY);

  doc.setFont('helvetica', 'bold');
  doc.text('CUM:', midX, startY + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(Number(estudiante.cum).toFixed(1) || '0.0', midX + 15, startY + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('UV Acumuladas:', midX, startY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(estudiante.uv?.toString() || '0', midX + 15, startY + 12);

  // Tabla de calificaciones
  const headers = [['Materia', 'Código', 'Lab 1', 'Par 1', 'Lab 2', 'Par 2', 'Lab 3', 'Par 3', 'Promedio', 'Nota Oficial']];
  
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
      0: { cellWidth: 55, halign: 'left' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 15, halign: 'center' },
      8: { cellWidth: 20, halign: 'center' },
      9: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
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
        0: { cellWidth: 55, halign: 'left' },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' },
        5: { cellWidth: 35, halign: 'center' },
        6: { cellWidth: 35, halign: 'center' }
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
    `Fecha de consulta: ${new Date().toLocaleDateString('es-SV')} ${new Date().toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`,
    pageWidth - 15,
    pageHeight - 10,
    { align: 'right' }
  );

  // Guardar
  doc.save(`calificaciones_${datosCiclo.ciclo}_${estudiante.carnet}.pdf`);
};