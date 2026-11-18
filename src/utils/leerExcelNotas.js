export async function leerExcelNotas(archivo) {
  const datos = await archivo.arrayBuffer();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/excelNotas.worker.js', import.meta.url), { type: 'module' });
    const terminar = (error, valor) => { clearTimeout(timer); worker.terminate(); error ? reject(error) : resolve(valor); };
    const timer = setTimeout(() => terminar(new Error('La lectura superó 10 segundos. Revisa la plantilla.')), 10000);
    worker.onerror = () => terminar(new Error('No se pudo leer el archivo.'));
    worker.onmessage = ({ data }) => terminar(data.error ? new Error(data.error) : null, data);
    worker.postMessage(datos, [datos]);
  });
}
