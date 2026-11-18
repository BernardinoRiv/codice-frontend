import * as XLSX from 'xlsx';
self.onmessage = ({ data }) => {
  try {
    const libro = XLSX.read(data, { type: 'array', cellFormula: true, sheetRows: 1002, sheets: 0 });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    if (!hoja?.['!ref']) throw new Error('El archivo está vacío.');
    const rango = XLSX.utils.decode_range(hoja['!fullref'] || hoja['!ref']);
    if (rango.e.r > 1000 || rango.e.c > 31) throw new Error('La plantilla admite hasta 1000 estudiantes y 32 columnas.');
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: true });
    self.postMessage({ hoja, filas });
  } catch (error) { self.postMessage({ error: error.message || 'Archivo inválido.' }); }
};
