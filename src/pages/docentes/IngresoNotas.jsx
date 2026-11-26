import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { notaValida } from '../../utils/vistasSeguras';
import { leerExcelNotas } from '../../utils/leerExcelNotas';

const MIN_CARACTERES = 15;
const MAX_CARACTERES = 250;

const IngresoNotas = () => {
  const [grupos, setGrupos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [calificaciones, setCalificaciones] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [modoEdicionGlobal, setModoEdicionGlobal] = useState(false);

  const [mostrarModalCarga, setMostrarModalCarga] = useState(false);
  const [datosPrevisualizacion, setDatosPrevisualizacion] = useState([]);
  const [evaluacionesEnPrevisualizacion, setEvaluacionesEnPrevisualizacion] = useState([]);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [cargandoArchivo, setCargandoArchivo] = useState(false);
  const [descargandoDocumento, setDescargandoDocumento] = useState(false);
  const inputArchivoRef = useRef(null);
  const cargaRef = useRef(0);
  const escrituraRef = useRef(false);
  const archivoRef = useRef(0);
  const originalesRef = useRef({});
  const [hayCambios, setHayCambios] = useState(false);
  const [solicitudEvaluacion, setSolicitudEvaluacion] = useState(null);
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState([]);
  const [todosLosAlumnos, setTodosLosAlumnos] = useState(false);
  const [motivoSolicitud, setMotivoSolicitud] = useState('');
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [ahora] = useState(() => Date.now());

  useEffect(() => () => { cargaRef.current++; archivoRef.current++; }, []);
  useEffect(() => {
    const advertir = event => { event.preventDefault(); event.returnValue = ''; };
    if (hayCambios) window.addEventListener('beforeunload', advertir);
    return () => window.removeEventListener('beforeunload', advertir);
  }, [hayCambios]);

  const cambiarGrupo = valor => {
    if (escrituraRef.current) return;
    if (hayCambios && !window.confirm('Tienes notas sin guardar. ¿Descartar los cambios y cambiar de grupo?')) return;
    cargaRef.current++;
    archivoRef.current++;
    setInscripciones([]); setEvaluaciones([]); setCalificaciones({});
    setMostrarModalCarga(false); setArchivoSeleccionado(null); setHayCambios(false);
    setModoEdicionGlobal(false); setTerminoBusqueda('');
    setGrupoSeleccionado(valor ? Number(valor) : null);
  };

  useEffect(() => {
    cargarGrupos();
  }, []);

  useEffect(() => {
    if (grupoSeleccionado) {
      cargarDatosGrupo();
    }
  }, [grupoSeleccionado]);

  async function cargarGrupos() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes/grupos`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Error ${response.status} del servidor`);
      }
      
      setGrupos(await response.json());
    } catch (error) {
      toast.error('No se pudieron cargar los grupos', { description: error.message });
    }
  };

  async function cargarDatosGrupo() {
    const carga = ++cargaRef.current;
    setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = `${import.meta.env.VITE_API_URL}/api/v1`;
      
      const fetchJson = async (url) => {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Error en: ${url}`);
        return res.json();
      };
      
      const [inscripcionesData, evaluacionesData, calificacionesData] = await Promise.all([
        fetchJson(`${baseUrl}/grupos/${grupoSeleccionado}/inscripciones`),
        fetchJson(`${baseUrl}/grupos/${grupoSeleccionado}/evaluaciones`),
        fetchJson(`${baseUrl}/grupos/${grupoSeleccionado}/calificaciones`)
      ]);

      if (carga !== cargaRef.current) return;
      if (![inscripcionesData, evaluacionesData, calificacionesData].every(Array.isArray)) throw new Error('Respuesta inválida');
      setInscripciones(inscripcionesData);
      setEvaluaciones(evaluacionesData);
      
      const califsObj = {};
      calificacionesData.forEach(calif => {
        const key = `${calif.idInscripcion}-${calif.idEvaluacion}`;
        califsObj[key] = {
          ...calif,
          nota: calif.nota !== null ? calif.nota.toString() : ''
        };
      });
      originalesRef.current = califsObj;
      setCalificaciones(califsObj);
      setHayCambios(false);

    } catch {
      if (carga === cargaRef.current) toast.error('No se pudieron cargar los datos del grupo seleccionado.');
    } finally {
      if (carga === cargaRef.current) setCargando(false);
    }
  };

  const parseDate = (dateData) => {
    if (!dateData) return new Date('');
    if (dateData instanceof Date) return dateData;
    if (Array.isArray(dateData)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateData;
      return new Date(year, month - 1, day, hour, minute, second);
    }
    if (typeof dateData === 'string') {
      let str = dateData.trim();
      if (str.includes(' ') && !str.includes('T')) str = str.replace(' ', 'T');
      if (str.endsWith('+00')) str = str.replace('+00', 'Z');
      
      let parsed = new Date(str);
      if (isNaN(parsed.getTime())) {
        const match = dateData.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
        if (match) return new Date(`${match[1]}T${match[2]}Z`);
      } else {
        return parsed;
      }
    }
    return new Date(dateData);
  };

  const getEstadoEvaluacion = (evalItem) => {
    if (!evalItem) return { estado: 'no_configurada', mensaje: 'No configurada', puedeEditar: false, puedePublicar: false };
    
    const ahora = new Date();
    const inicio = parseDate(evalItem.fechaInicio);
    const fin = parseDate(evalItem.fechaFin);
    
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return { estado: 'error', mensaje: 'FECHA INVÁLIDA', puedeEditar: false, puedePublicar: false };
    }
    
    if (ahora < inicio) {
      return { estado: 'no_iniciado', mensaje: `Inicia ${inicio.toLocaleDateString('es-ES')}`, puedeEditar: false, puedePublicar: false };
    }
    if (ahora > fin) {
      return { estado: 'finalizado', mensaje: 'Plazo vencido', puedeEditar: false, puedePublicar: true };
    }
    
    const diasRestantes = Math.ceil((fin - ahora) / (1000 * 60 * 60 * 24));
    return { estado: 'activo', mensaje: diasRestantes > 0 ? `Vence en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}` : 'Vence hoy', puedeEditar: true, puedePublicar: true };
  };

  const formatearFechaHora = (valor) => {
    if (!valor) return '';
    if (Array.isArray(valor)) {
      const [anio, mes, dia, hora = 0, minuto = 0] = valor;
      return `${dia}/${mes}/${anio} ${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
    }
    const texto = String(valor).trim();
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(texto);
    if (coincidencia) {
      const [, anio, mes, dia, hora, minuto] = coincidencia;
      return `${dia}/${mes}/${anio} ${hora}:${minuto}`;
    }
    const fecha = parseDate(valor);
    return isNaN(fecha.getTime()) ? '' : fecha.toLocaleString('es-ES');
  };

  const estaHabilitadaPorSolicitud = (calif) => {
    if (!calif?.habilitadaPorSolicitudHasta) return false;
    const limite = parseDate(calif.habilitadaPorSolicitudHasta);
    return !isNaN(limite.getTime()) && limite.getTime() > ahora;
  };

  const tieneSolicitudPendiente = (calif) => calif?.estadoSolicitudActual === 'PENDIENTE';

  const puedeEditarCalificacion = (evalItem, calif) => getEstadoEvaluacion(evalItem).puedeEditar || estaHabilitadaPorSolicitud(calif);

  const evaluacionesPublicables = evaluaciones.filter(evalItem => {
    if (getEstadoEvaluacion(evalItem).estado === 'activo') return true;
    return Object.values(calificaciones).some(calif =>
      calif?.idEvaluacion === evalItem.idEvaluacion && estaHabilitadaPorSolicitud(calif)
    );
  });

  const getEvaluacionesPorPeriodo = (periodo) => evaluaciones.filter(ev => ev.periodo === periodo);

  const handleNotaChange = (idInscripcion, idEvaluacion, valor) => {
    let val = valor.replace(',', '.');
    if (val !== '') {
      if (!/^\d{1,2}(?:\.\d?)?$/.test(val)) return;
      const num = parseFloat(val);
      if (num > 10) val = '10';
      if (num < 0) val = '0';
    }

    if (escrituraRef.current) return;
    const clave = `${idInscripcion}-${idEvaluacion}`;
    if (!puedeEditarCalificacion(evaluaciones.find(ev => ev.idEvaluacion === idEvaluacion), calificaciones[clave])) return;
    setHayCambios(true);
    const key = `${idInscripcion}-${idEvaluacion}`;
    setCalificaciones(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        idInscripcion,
        idEvaluacion,
        nota: val,
        estadoCalificacion: 'BORRADOR' 
      }
    }));
  };

  const calcularPromedioActual = (idInscripcion) => {
    let notaFinal = 0;
    let tieneNotas = false;

    const getNotaNum = (tipo, numero) => {
      const evalObj = evaluaciones.find(e => e.tipoEvaluacion === tipo && e.numeroEvaluacion === numero);
      if (!evalObj) return null;
      const calif = calificaciones[`${idInscripcion}-${evalObj.idEvaluacion}`];
      if (calif && calif.nota !== null && calif.nota !== '') return parseFloat(calif.nota);
      return null;
    };

    const procesarPeriodo = (numPeriodo, pesoPeriodo) => {
      const lab = getNotaNum('LABORATORIO', numPeriodo);
      const par = getNotaNum('PARCIAL', numPeriodo);
      if (lab !== null || par !== null) {
        const valLab = lab !== null ? lab : 0;
        const valPar = par !== null ? par : 0;
        notaFinal += ((valLab * 0.40) + (valPar * 0.60)) * pesoPeriodo;
        tieneNotas = true;
      }
    };

    procesarPeriodo(1, 0.30);
    procesarPeriodo(2, 0.30);
    procesarPeriodo(3, 0.40);

    return tieneNotas ? notaFinal.toFixed(1) : '-';
  };

  const pendientes = () => Object.values(calificaciones).filter(calif => {
    const original = originalesRef.current[`${calif.idInscripcion}-${calif.idEvaluacion}`];
    return calif.estadoCalificacion !== 'PUBLICADA' && String(calif.nota ?? '') !== String(original?.nota ?? '');
  });

  const guardarPendientes = async () => {
    const cambios = pendientes();
    if (cambios.some(calif => !notaValida(calif.nota))) throw new Error('Cada nota editada debe tener un valor de 0 a 10 con máximo un decimal. No se puede borrar una nota guardada desde esta vista.');
    if (cambios.some(calif => !puedeEditarCalificacion(evaluaciones.find(ev => ev.idEvaluacion === calif.idEvaluacion), calif))) throw new Error('Una evaluación editada ya cerró su plazo y no tiene autorización vigente. Revisa las fechas antes de guardar.');
    let guardadas = 0;
    for (const calif of cambios) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/calificaciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idInscripcion: calif.idInscripcion, idEvaluacion: calif.idEvaluacion, nota: Number(calif.nota) })
        });
        const resultado = await response.text();
        const data = resultado ? JSON.parse(resultado) : {};
        if (!response.ok || data.exito === false) throw new Error(data.mensaje || 'El servidor no confirmó el guardado.');
        originalesRef.current = { ...originalesRef.current, [`${calif.idInscripcion}-${calif.idEvaluacion}`]: { ...calif } };
        guardadas++;
      } catch {
        throw new Error(`Se confirmaron ${guardadas} de ${cambios.length} notas. Se conservaron tus cambios. La última solicitud puede haberse procesado: verifica el registro antes de reintentar. No se publicó ninguna evaluación nueva.`);
      }
    }
    setHayCambios(false);
    return guardadas;
  };

  const guardarCalificaciones = async () => {
    if (escrituraRef.current || cargando) return;
    escrituraRef.current = true; setGuardando(true);
    try {
      const cantidad = await guardarPendientes();
      toast.success(cantidad ? `${cantidad} notas guardadas` : 'Sin cambios pendientes');
      setModoEdicionGlobal(false);
    } catch (error) { toast.error('Revisa el guardado', { description: error.message, duration: 12000 }); }
    finally { escrituraRef.current = false; setGuardando(false); }
  };

  const publicarCalificacionesActivas = async () => {
    if (escrituraRef.current || cargando) return;
    const publicables = evaluacionesPublicables;
    if (!publicables.length) return toast.error('No hay evaluaciones activas ni autorizaciones vigentes para publicar.');
    if (!window.confirm('¿Guardar los cambios y publicar las evaluaciones habilitadas? Los estudiantes podrán ver las notas.')) return;
    escrituraRef.current = true; setPublicando(true);
    let publicadas = 0;
    try {
      await guardarPendientes();
      for (const ev of publicables) {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/evaluaciones/${ev.idEvaluacion}/publicar`, { method: 'POST' });
        const texto = await response.text();
        const data = texto ? JSON.parse(texto) : {};
        if (!response.ok || data.exito === false) throw new Error('El servidor no confirmó la publicación.');
        publicadas++;
      }
      toast.success('Evaluaciones publicadas');
      setModoEdicionGlobal(false);
      await cargarDatosGrupo();
    } catch (error) {
      toast.error(`Publicación incompleta: ${publicadas} de ${publicables.length} confirmadas`, { description: `${error.message} Revisa las notas antes de reintentar.`, duration: 12000 });
    } finally { escrituraRef.current = false; setPublicando(false); }
  };

  const descargarDocumentoNotas = async () => {
    if (!grupoSeleccionado) return toast.error('Selecciona un grupo primero');
    
    setDescargandoDocumento(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/calificaciones/plantilla/${grupoSeleccionado}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al descargar el documento');

      const disposition = response.headers.get('Content-Disposition');
      let filename = `Documento_Notas_Grupo_${grupoSeleccionado}.xlsx`;
      
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Documento descargado', { description: 'Completa las notas y súbelo cuando esté listo.' });
    } catch (error) {
      toast.error('Error al descargar', { description: error.message });
    } finally {
      setDescargandoDocumento(false);
    }
  };

  const cargarNotas = () => {
    if (!grupoSeleccionado) return toast.error('Selecciona un grupo primero');
    inputArchivoRef.current?.click();
  };

  // Valida la celda cruda de SheetJS para detectar fórmulas, texto o rangos inválidos
  const inspeccionarCeldaExcel = (hoja, rowIndex0Based, colIndex0Based) => {
    let columna = '';
    for (let n = colIndex0Based + 1; n > 0; n = Math.floor((n - 1) / 26)) columna = String.fromCharCode(65 + (n - 1) % 26) + columna;
    const address = `${columna}${rowIndex0Based + 1}`;
    const rawCell = hoja[address];

    if (!rawCell || rawCell.t === 'z' || rawCell.v === undefined || rawCell.v === null || String(rawCell.v).trim() === '') {
      return { tipo: 'vacio', valorMostrar: null, motivoError: null };
    }

    if (rawCell.f) {
      return {
        tipo: 'invalido',
        valorMostrar: `=${rawCell.f}`,
        motivoError: 'No se permiten fórmulas en las celdas de notas.'
      };
    }

    if (rawCell.t !== 'n') {
      return {
        tipo: 'invalido',
        valorMostrar: String(rawCell.w || rawCell.v),
        motivoError: 'El valor debe ser numérico (no texto ni fecha).'
      };
    }

    const numVal = Number(rawCell.v);
    if (isNaN(numVal) || numVal < 0 || numVal > 10) {
      return {
        tipo: 'invalido',
        valorMostrar: String(numVal),
        motivoError: 'La nota debe estar entre 0.0 y 10.0.'
      };
    }

    if (Math.abs(Math.round(numVal * 10) - numVal * 10) > 1e-6) {
      return {
        tipo: 'invalido',
        valorMostrar: String(numVal),
        motivoError: 'Solo se permite máximo 1 decimal.'
      };
    }

    return { tipo: 'valido', valorNumerico: numVal, valorMostrar: numVal.toFixed(1), motivoError: null };
  };

  const handleArchivoSeleccionado = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo || escrituraRef.current) return;
    if (hayCambios) { toast.warning('Guarda tus notas antes de importar un archivo.'); e.target.value = ''; return; }
    if (archivo.size > 2 * 1024 * 1024) { toast.error('El archivo debe pesar como máximo 2 MB.'); e.target.value = ''; return; }

    const extension = archivo.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
      toast.error('Archivo inválido', { description: 'Solo se permiten archivos .xlsx o .xls' });
      e.target.value = '';
      return;
    }

    const lectura = ++archivoRef.current;
    e.target.value = '';
    setCargandoArchivo(true);
    try {
        const { hoja: primerHoja, filas: datosJson } = await leerExcelNotas(archivo);
        if (lectura !== archivoRef.current) return;
        if (datosJson.length === 0) {
          toast.error('Archivo vacío', { description: 'El archivo no contiene datos.' });
          e.target.value = '';
          return;
        }

        const primeraFila = datosJson[0];
        const esDocumentoValido = 
          primeraFila[0]?.toString().toUpperCase().includes('CARNET') &&
          primeraFila[1]?.toString().toUpperCase().includes('ESTUDIANTE');

        if (!esDocumentoValido) {
          toast.error('Estructura inválida', { description: 'El archivo no corresponde a un documento oficial. Descarga el documento desde el sistema.' });
          e.target.value = '';
          return;
        }

        const columnasEsperadas = 2 + evaluaciones.length;
        if (primeraFila.length !== columnasEsperadas) {
          toast.error('Documento incorrecto', { description: `Se esperaban ${columnasEsperadas} columnas, pero el archivo tiene ${primeraFila.length}. Descarga el documento actualizado.` });
          e.target.value = '';
          return;
        }

        const mapaEvaluaciones = {};
        for (let i = 2; i < primeraFila.length; i++) {
          const encabezado = primeraFila[i]?.toString().toUpperCase().trim() || '';
          const partes = encabezado.split(/\s+/);
          const tipo = partes[0];
          const numero = partes[1];
          
          if (tipo === 'LAB' || tipo === 'LABORATORIO') {
            mapaEvaluaciones[`LABORATORIO_${numero}`] = i;
          } else if (tipo === 'PAR' || tipo === 'PARCIAL') {
            mapaEvaluaciones[`PARCIAL_${numero}`] = i;
          }
        }

        if (Object.keys(mapaEvaluaciones).length !== evaluaciones.length || evaluaciones.some(ev => mapaEvaluaciones[`${ev.tipoEvaluacion}_${ev.numeroEvaluacion}`] === undefined)) throw new Error('Hay encabezados repetidos o evaluaciones que no corresponden al grupo.');
        const evaluacionesActivas = evaluaciones.filter(ev => getEstadoEvaluacion(ev).estado === 'activo');
        const columnasActivas = evaluacionesActivas.map(ev => {
          const key = `${ev.tipoEvaluacion}_${ev.numeroEvaluacion}`;
          return {
            evaluacion: ev,
            indiceColumna: mapaEvaluaciones[key]
          };
        }).filter(col => col.indiceColumna !== undefined);

        if (columnasActivas.length === 0) {
          toast.error('Sin columnas válidas', { description: 'No se encontraron columnas para las evaluaciones activas en el archivo.' });
          e.target.value = '';
          return;
        }

        // Conservamos el índice real de fila en Excel (r = idx + 1)
        const filasConIndice = [];
        for (let r = 1; r < datosJson.length; r++) {
          const fila = datosJson[r];
          if (fila && fila.length > 0 && fila[0] !== undefined && fila[0] !== null && String(fila[0]).trim() !== '') {
            filasConIndice.push({ r, fila });
          }
        }

        if (filasConIndice.length === 0) {
          toast.error('Archivo vacío', { description: 'No se encontraron registros de estudiantes.' });
          e.target.value = '';
          return;
        }

        const carnets = new Set();
        const inscritos = new Set(inscripciones.map(i => String(i.carnet).trim().toLowerCase()));
        filasConIndice.forEach(({ fila, r }) => {
          const carnet = String(fila[0]).trim().toLowerCase();
          if (carnets.has(carnet)) throw new Error(`Carnet duplicado en la fila ${r + 1}.`);
          if (!inscritos.has(carnet)) throw new Error(`El carnet de la fila ${r + 1} no pertenece al grupo.`);
          carnets.add(carnet);
          for (let c = 2; c < primeraFila.length; c++) {
            const resultado = inspeccionarCeldaExcel(primerHoja, r, c);
            if (resultado.tipo === 'invalido') throw new Error(`Fila ${r + 1}: ${resultado.motivoError}`);
          }
        });
        const columnasConCambios = columnasActivas.filter(col => {
          return filasConIndice.some(({ r, fila }) => {
            const carnetStr = fila[0] ? fila[0].toString().trim().toLowerCase() : '';
            const inscripcionEst = inscripciones.find(i => i.carnet.toLowerCase() === carnetStr);
            if (!inscripcionEst) return false;

            const inspeccion = inspeccionarCeldaExcel(primerHoja, r, col.indiceColumna);
            if (inspeccion.tipo === 'invalido') return true;

            const califKey = `${inscripcionEst.idInscripcion}-${col.evaluacion.idEvaluacion}`;
            const califActual = calificaciones[califKey];
            if (califActual && califActual.estadoCalificacion === 'PUBLICADA') return false;

            if (inspeccion.tipo === 'valido') {
              if (!califActual || califActual.nota === null || califActual.nota === '') return true;
              if (inspeccion.valorNumerico.toFixed(1) !== Number(califActual.nota).toFixed(1)) return true;
            }
            return false;
          });
        });

        if (columnasConCambios.length === 0) {
          toast.info('Sin modificaciones útiles', { description: 'El documento no contiene notas nuevas, y las existentes ya están publicadas o no cambiaron.' });
          e.target.value = '';
          return;
        }

        const previsualizacion = filasConIndice.map(({ r, fila }) => {
          const carnetStr = fila[0] ? fila[0].toString().trim().toLowerCase() : '';
          const inscripcionEst = inscripciones.find(i => i.carnet.toLowerCase() === carnetStr);

          const notasAMostrar = columnasConCambios.map(col => {
            const inspeccion = inspeccionarCeldaExcel(primerHoja, r, col.indiceColumna);

            if (inspeccion.tipo === 'invalido') {
              return {
                valor: inspeccion.valorMostrar,
                estado: 'invalido',
                motivoError: inspeccion.motivoError
              };
            }

            let estado = 'vacio';
            if (inscripcionEst) {
              const califKey = `${inscripcionEst.idInscripcion}-${col.evaluacion.idEvaluacion}`;
              const califActual = calificaciones[califKey];

              if (califActual && califActual.estadoCalificacion === 'PUBLICADA') {
                estado = 'publicada';
              } else if (inspeccion.tipo === 'valido') {
                if (!califActual || califActual.nota === null || califActual.nota === '') {
                  estado = 'nuevo';
                } else if (inspeccion.valorNumerico.toFixed(1) !== Number(califActual.nota).toFixed(1)) {
                  estado = 'modificado';
                } else {
                  estado = 'sin_cambio';
                }
              }
            }

            return {
              valor: inspeccion.tipo === 'valido' ? inspeccion.valorNumerico : null,
              estado,
              motivoError: null
            };
          });

          return {
            fila: r + 1,
            carnet: fila[0] || '',
            estudiante: fila[1] || '',
            notas: notasAMostrar
          };
        });

        setArchivoSeleccionado(archivo);
        setDatosPrevisualizacion(previsualizacion);
        setEvaluacionesEnPrevisualizacion(columnasConCambios.map(c => c.evaluacion));
        setMostrarModalCarga(true);
    } catch (error) {
      if (lectura === archivoRef.current) toast.error('No se pudo importar el archivo', { description: error.message });
    } finally { if (lectura === archivoRef.current) setCargandoArchivo(false); }
  };

  const hayErroresEnPrevisualizacion = datosPrevisualizacion.some(fila =>
    fila.notas.some(n => n.estado === 'invalido')
  );

  const confirmarCarga = async () => {
    if (!archivoSeleccionado || hayErroresEnPrevisualizacion || escrituraRef.current) return;
    escrituraRef.current = true;

    setCargandoArchivo(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('archivo', archivoSeleccionado);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/calificaciones/carga-masiva/${grupoSeleccionado}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Error al cargar las notas');
      }

      const texto = await response.text();
      const resultado = texto ? JSON.parse(texto) : {};
      if (resultado.exito === false) throw new Error(resultado.mensaje || 'El servidor rechazó la carga.');
      toast.success('Notas cargadas exitosamente', { description: 'Los registros fueron procesados correctamente.' });
      setMostrarModalCarga(false);
      setArchivoSeleccionado(null);
      setDatosPrevisualizacion([]);
      setEvaluacionesEnPrevisualizacion([]);
      await cargarDatosGrupo();
    } catch (error) {
      toast.error('Carga no confirmada', { description: `${error.message}. Verifica las notas antes de volver a enviar el archivo.`, duration: 12000 });
    } finally {
      escrituraRef.current = false;
      setCargandoArchivo(false);
    }
  };

  const cancelarCarga = () => {
    if (escrituraRef.current) return;
    setMostrarModalCarga(false);
    setArchivoSeleccionado(null);
    setDatosPrevisualizacion([]);
    setEvaluacionesEnPrevisualizacion([]);
  };

  const abrirModalSolicitud = (evalItem) => {
    setSolicitudEvaluacion(evalItem);
    setAlumnosSeleccionados([]);
    setTodosLosAlumnos(false);
    setMotivoSolicitud('');
  };

  const cerrarModalSolicitud = () => {
    if (enviandoSolicitud) return;
    setSolicitudEvaluacion(null);
    setAlumnosSeleccionados([]);
    setTodosLosAlumnos(false);
    setMotivoSolicitud('');
  };

  const alternarTodosAlumnos = (marcado) => {
    setTodosLosAlumnos(marcado);
    setAlumnosSeleccionados(marcado ? inscripciones.map(inscripcion => inscripcion.idInscripcion) : []);
  };

  const alternarAlumnoSeleccionado = (idInscripcion) => {
    setTodosLosAlumnos(false);
    setAlumnosSeleccionados(anterior => anterior.includes(idInscripcion)
      ? anterior.filter(id => id !== idInscripcion)
      : [...anterior, idInscripcion]);
  };

  const enviarSolicitudModificacion = async () => {
    if (!solicitudEvaluacion || enviandoSolicitud) return;
    if (!alumnosSeleccionados.length) return toast.error('Selecciona al menos un alumno.');
    if (motivoSolicitud.trim().length < MIN_CARACTERES) {
      return toast.error(`El justificante debe tener al menos ${MIN_CARACTERES} caracteres.`);
    }

    const tipo = solicitudEvaluacion.tipoEvaluacion || (Number(solicitudEvaluacion.idTipoEvaluacion) === 1 ? 'LABORATORIO' : 'PARCIAL');
    const cuerpo = {
      idGrupo: grupoSeleccionado,
      idTipoEvaluacion: solicitudEvaluacion.idTipoEvaluacion ?? null,
      tipoEvaluacion: String(tipo).toUpperCase(),
      numeroEvaluacion: solicitudEvaluacion.numeroEvaluacion,
      idsInscripcion: alumnosSeleccionados,
      todosLosAlumnos,
      motivo: motivoSolicitud.trim(),
    };

    setEnviandoSolicitud(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docente/notas/solicitudes-modificacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cuerpo)
      });
      const texto = await response.text();
      const data = texto ? JSON.parse(texto) : {};
      if (!response.ok || data.exito === false) throw new Error(data.mensaje || data.message || `Error ${response.status}`);
      toast.success('Solicitud enviada', { description: 'El registro académico revisará la modificación.' });
      cerrarModalSolicitud();
      await cargarDatosGrupo();
    } catch (error) {
      toast.error('No se pudo enviar la solicitud', { description: error.message });
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const periodosUnicos = [...new Set(evaluaciones.map(ev => ev.periodo).filter(p => p !== null && p !== undefined))].sort();
  const inscripcionesFiltradas = inscripciones.filter(inscripcion => {
    const termino = terminoBusqueda.toLowerCase();
    const nombreCompleto = `${inscripcion.nombresEstudiante} ${inscripcion.apellidosEstudiante}`.toLowerCase();
    return inscripcion.carnet.toLowerCase().includes(termino) || nombreCompleto.includes(termino);
  });

  const hayEvaluacionesActivas = evaluaciones.some(ev => getEstadoEvaluacion(ev).estado === 'activo');
  const evaluacionesCerradasSolicitables = evaluaciones.filter(ev => ev.vencida === true && ev.puedeSolicitarModificacion === true);
  const hayCalificacionesAutorizadas = Object.values(calificaciones).some(calif => estaHabilitadaPorSolicitud(calif));

  if (cargando && grupos.length === 0) return (
    <div className="flex flex-col items-center justify-center pt-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
      <p className="text-gray-400 text-sm font-medium tracking-wide">Cargando información...</p>
    </div>
  );

  return (
    <div className="w-full pb-20 font-sans text-gray-900">
      <div className="max-w-7xl">
        
        <div className="mb-8">
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Ingreso de notas</h1>
          <p className="text-gray-500 text-sm">Selecciona una materia e ingresa o modifica las calificaciones.</p>
        </div>

        <div className="mb-8 max-w-md">
          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Materia y Grupo</label>
          <div className="relative">
            <select
              className="w-full bg-[#F4F4F5] text-gray-900 rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-black/10 transition-all cursor-pointer font-medium text-sm border border-transparent hover:border-gray-200"
              value={grupoSeleccionado || ''}
              disabled={guardando || publicando || cargandoArchivo}
              onChange={(e) => cambiarGrupo(e.target.value)}
            >
              <option value="">-- Selecciona un grupo --</option>
              {grupos.map(grupo => (
                <option key={grupo.idGrupo} value={grupo.idGrupo}>
                  {grupo.nombreMateria} - {grupo.codigoGrupo}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
            </div>
          </div>
        </div>

        {grupoSeleccionado && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar por carnet o nombre..."
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F4F4F5] border border-transparent rounded-xl text-sm focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div className="flex gap-3 w-full sm:w-auto justify-end">
                <button 
                  type="button" 
                  onClick={cargarNotas} 
                  disabled={!hayEvaluacionesActivas}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium border shadow-sm ${
                    !hayEvaluacionesActivas 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Importar Notas
                </button>
                
                <button 
                  type="button" 
                  onClick={descargarDocumentoNotas} 
                  disabled={descargandoDocumento}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-70 disabled:cursor-wait transition-colors text-sm font-medium border border-gray-200 shadow-sm"
                >
                  {descargandoDocumento ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-700 border-t-transparent"></div>
                      Preparando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Exportar Documento
                    </>
                  )}
                </button>
              </div>
            </div>

            <input ref={inputArchivoRef} type="file" accept=".xlsx,.xls" onChange={handleArchivoSeleccionado} className="hidden" />

            {evaluacionesCerradasSolicitables.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-amber-900">Evaluaciones cerradas con plazo de solicitud abierto</p>
                  <p className="text-xs text-amber-800 mt-0.5">Puedes pedir autorización para modificar notas dentro de los 7 días posteriores al cierre.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {evaluacionesCerradasSolicitables.map(evalItem => (
                    <button
                      key={evalItem.idEvaluacion}
                      type="button"
                      onClick={() => abrirModalSolicitud(evalItem)}
                      className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold shadow-sm hover:bg-gray-800 transition-colors"
                    >
                      Solicitar modificación · {evalItem.tipoEvaluacion === 'LABORATORIO' ? 'LAB' : evalItem.tipoEvaluacion} {evalItem.numeroEvaluacion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider w-32 border-r border-gray-200">Carnet</th>
                      <th className="px-6 py-4 text-left text-gray-500 font-semibold uppercase tracking-wider border-r border-gray-200">Estudiante</th>
                      {periodosUnicos.map(periodo => {
                        const evaluacionesPeriodo = getEvaluacionesPorPeriodo(periodo);
                        return (
                          <th key={periodo} colSpan={evaluacionesPeriodo.length} className="px-4 py-3 text-center text-black font-bold tracking-wide border-r border-gray-200">
                            PERÍODO {periodo}
                          </th>
                        );
                      })}
                      <th className="px-6 py-4 text-center text-gray-500 font-semibold uppercase tracking-wider">Promedio</th>
                    </tr>
                    
                    <tr className="bg-white border-b border-gray-200">
                      <th className="border-r border-gray-200"></th>
                      <th className="border-r border-gray-200"></th>
                      {periodosUnicos.map(periodo => {
                        const evaluacionesPeriodo = getEvaluacionesPorPeriodo(periodo);
                        return evaluacionesPeriodo.map((evalItem, idx) => {
                          const estado = getEstadoEvaluacion(evalItem);
                          return (
                            <th key={idx} className="px-3 py-3 text-center border-r border-gray-200 last:border-r-0">
                              <div className="font-bold text-gray-900 text-[11px] uppercase tracking-wider">
                                {evalItem.tipoEvaluacion === 'LABORATORIO' ? 'LAB' : evalItem.tipoEvaluacion} {evalItem.numeroEvaluacion}
                              </div>
                              <div className={`text-[10px] mt-1 uppercase font-medium ${
                                estado.estado === 'finalizado' ? 'text-red-500' : 
                                estado.estado === 'no_iniciado' ? 'text-gray-400' : 
                                'text-green-600'
                              }`}>
                                {estado.mensaje}
                              </div>
                              {evalItem.vencida === true && evalItem.puedeSolicitarModificacion === true && (
                                <button
                                  type="button"
                                  onClick={() => abrirModalSolicitud(evalItem)}
                                  className="mt-2 px-2 py-1 rounded-full bg-gray-900 text-white text-[9px] font-bold hover:bg-gray-800 transition-colors"
                                >
                                  Solicitar modificación
                                </button>
                              )}
                            </th>
                          );
                        });
                      })}
                      <th></th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-gray-100">
                    {inscripcionesFiltradas.map((inscripcion) => {
                      const promedio = calcularPromedioActual(inscripcion.idInscripcion);
                      return (
                        <tr key={inscripcion.idInscripcion} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 border-r border-gray-100">
                            <span className="font-mono text-xs font-medium text-gray-600">{inscripcion.carnet}</span>
                          </td>
                          <td className="px-6 py-4 border-r border-gray-100 font-medium text-gray-900">
                            {inscripcion.nombresEstudiante} {inscripcion.apellidosEstudiante}
                          </td>
                          {periodosUnicos.map(periodo => {
                            const evaluacionesPeriodo = getEvaluacionesPorPeriodo(periodo);
                            return evaluacionesPeriodo.map((evalItem, idx) => {
                              const key = `${inscripcion.idInscripcion}-${evalItem.idEvaluacion}`;
                              const calif = calificaciones[key];
                              
                              const autorizada = estaHabilitadaPorSolicitud(calif);
                              const pendiente = tieneSolicitudPendiente(calif);
                              const estaPublicada = calif?.estadoCalificacion === 'PUBLICADA' && !autorizada;
                              const estaBloqueado = guardando || publicando || cargandoArchivo || !puedeEditarCalificacion(evalItem, calif) || (!modoEdicionGlobal && !autorizada) || estaPublicada;
                              const tieneNota = calif?.nota !== null && calif?.nota !== undefined && calif?.nota !== '';
                              const esBorrador = tieneNota && !estaPublicada;

                              let colorClass;
                              if (autorizada) colorClass = 'bg-amber-50 text-amber-800';
                              else if (estaPublicada) colorClass = 'bg-green-50 text-green-700';
                              else if (esBorrador) colorClass = 'bg-orange-50 text-orange-700';
                              else colorClass = estaBloqueado ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-900';

                              let borderClass;
                              if (!estaBloqueado) {
                                borderClass = autorizada
                                  ? 'border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 shadow-sm cursor-text'
                                  : 'border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-sm cursor-text';
                              } else {
                                if (estaPublicada) borderClass = 'border-green-200 cursor-default';
                                else if (esBorrador) borderClass = 'border-orange-200 cursor-default';
                                else borderClass = 'border-gray-200 cursor-not-allowed';
                              }
                              
                              return (
                                <td key={idx} className="px-4 py-4 text-center border-r border-gray-100">
                                  <input
                                    type="text" 
                                    value={calif?.nota ?? ''}
                                    onChange={(e) => handleNotaChange(inscripcion.idInscripcion, evalItem.idEvaluacion, e.target.value)}
                                    disabled={estaBloqueado}
                                    title={autorizada ? `Habilitada por solicitud hasta ${formatearFechaHora(calif.habilitadaPorSolicitudHasta)}` : (estaPublicada ? 'Calificación oficial. Solicita permisos para modificar.' : (estaBloqueado ? 'Haz clic en Habilitar Edición abajo' : 'Editando nota'))}
                                    className={`w-16 text-center rounded-lg px-2 py-1.5 text-sm font-bold transition-all outline-none border ${colorClass} ${borderClass}`}
                                  />
                                  {(autorizada || pendiente) && (
                                    <div className="mt-2 flex flex-col items-center gap-1">
                                      {autorizada && (
                                        <span
                                          title={`Habilitada por solicitud hasta ${formatearFechaHora(calif.habilitadaPorSolicitudHasta)}`}
                                          className="max-w-[7.5rem] truncate rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-800"
                                        >
                                          Habilitada por solicitud hasta {formatearFechaHora(calif.habilitadaPorSolicitudHasta)}
                                        </span>
                                      )}
                                      {pendiente && (
                                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                                          Solicitud pendiente de revisión
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            });
                          })}
                          
                          <td className="px-4 py-4 text-center bg-gray-50/50">
                             <div className="inline-flex w-14 h-8 items-center justify-center bg-gray-200/60 rounded-lg font-bold text-gray-900 shadow-inner text-sm">
                               {promedio}
                             </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-start pt-4">
              <button
                type="button"
                onClick={() => {
                   if (hayEvaluacionesActivas) {
                      setModoEdicionGlobal(!modoEdicionGlobal);
                      if (!modoEdicionGlobal) toast.info('Edición habilitada para periodos activos.');
                   } else {
                      toast.error('Sin periodos activos', { description: 'Debe solicitar modificación al administrador.'});
                   }
                }}
                className={`px-6 py-3 rounded-xl transition-colors text-sm font-medium shadow-sm border w-full sm:w-auto ${
                  modoEdicionGlobal 
                    ? 'bg-blue-50 text-blue-700 border-blue-300' 
                    : hayEvaluacionesActivas 
                        ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                        : 'bg-white text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                {modoEdicionGlobal ? 'Bloquear Edición' : 'Habilitar Edición'}
              </button>

              <button
                type="button"
                onClick={guardarCalificaciones}
                disabled={guardando || publicando || cargandoArchivo || (!modoEdicionGlobal && !hayCalificacionesAutorizadas)}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
              >
                {guardando ? 'Guardando...' : 'Guardar Borrador'}
              </button>

              <button
                type="button"
                onClick={publicarCalificacionesActivas}
                disabled={publicando || guardando || cargandoArchivo || (!hayEvaluacionesActivas && !hayCalificacionesAutorizadas)}
                className="px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
              >
                {publicando ? 'Publicando...' : 'Publicar Activas'}
              </button>
            </div>

            <div className="pt-4 flex flex-wrap gap-6 text-[11px] text-gray-500 uppercase tracking-wider font-medium">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Editando Columna</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Borrador sin publicar</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> Publicada / Oficial</div>
            </div>
          </div>
        )}
      </div>

      {mostrarModalCarga && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Previsualización de carga masiva</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Archivo: <span className="font-medium text-gray-700">{archivoSeleccionado?.name}</span>
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {datosPrevisualizacion.length} registros
                    </span>
                  </p>
                  {evaluacionesEnPrevisualizacion.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      Columnas con cambios detectados: {evaluacionesEnPrevisualizacion.map(ev => `${ev.tipoEvaluacion === 'LABORATORIO' ? 'LAB' : ev.tipoEvaluacion} ${ev.numeroEvaluacion}`).join(', ')}
                    </p>
                  )}
                </div>
                <button onClick={cancelarCarga} className="text-gray-400 hover:text-gray-600 transition-colors" disabled={cargandoArchivo}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              {hayErroresEnPrevisualizacion && (
                <div className="mb-4 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-xs text-red-800">
                    <p className="font-bold text-red-900">Se detectaron celdas inválidas en el Excel (marcadas en rojo)</p>
                    <p className="mt-0.5">No se permiten fórmulas (ej. <code>=SUMA</code>), notas menores a 0.0 o mayores a 10.0, ni valores con más de 1 decimal. Corrige el archivo en Excel y vuelve a importarlo.</p>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 w-16">Fila</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 w-32">Carnet</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200">Estudiante</th>
                      {evaluacionesEnPrevisualizacion.map((ev, idx) => (
                        <th key={idx} className="px-4 py-3 text-center text-xs font-bold text-blue-600 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          {ev.tipoEvaluacion === 'LABORATORIO' ? 'LAB' : ev.tipoEvaluacion} {ev.numeroEvaluacion}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {datosPrevisualizacion.map((fila, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="font-mono text-xs text-gray-500">{fila.fila}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100">
                          <span className="font-mono text-xs font-medium text-gray-700">{fila.carnet}</span>
                        </td>
                        <td className="px-4 py-3 border-r border-gray-100 font-medium text-gray-900">
                          {fila.estudiante || <span className="text-gray-400 italic">Sin nombre</span>}
                        </td>
                        {fila.notas.map((notaObj, nIdx) => {
                          if (notaObj.estado === 'invalido') {
                            return (
                              <td key={nIdx} className="px-4 py-3 text-center border-r border-gray-100 last:border-r-0 bg-red-50/40">
                                <span
                                  className="inline-flex flex-col items-center px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-300"
                                  title={notaObj.motivoError}
                                >
                                  <span>{notaObj.valor}</span>
                                  <span className="text-[10px] font-medium text-red-600 mt-0.5">{notaObj.motivoError}</span>
                                </span>
                              </td>
                            );
                          }
                          if (notaObj.estado === 'publicada') {
                             return (
                               <td key={nIdx} className="px-4 py-3 text-center border-r border-gray-100 last:border-r-0 bg-gray-50/50">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-200 text-gray-500 border border-gray-300" title="Nota oficial (se omitirá)">
                                    {notaObj.valor !== null ? Number(notaObj.valor).toFixed(1) : '-'}
                                  </span>
                               </td>
                             );
                          }
                          if (notaObj.estado === 'sin_cambio') {
                             return (
                               <td key={nIdx} className="px-4 py-3 text-center border-r border-gray-100 last:border-r-0">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-400 border border-gray-100" title="Sin cambios respecto al borrador actual">
                                    {Number(notaObj.valor).toFixed(1)}
                                  </span>
                               </td>
                             );
                          }
                          if (notaObj.estado === 'vacio') {
                             return (
                               <td key={nIdx} className="px-4 py-3 text-center border-r border-gray-100 last:border-r-0">
                                  <span className="text-gray-300 text-xs font-medium">-</span>
                               </td>
                             );
                          }
                          return (
                            <td key={nIdx} className="px-4 py-3 text-center border-r border-gray-100 last:border-r-0">
                               <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200" title={notaObj.estado === 'nuevo' ? "Se guardará como borrador nuevo" : "Modificará un borrador existente"}>
                                 {Number(notaObj.valor).toFixed(1)}
                               </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="text-xs text-blue-800">
                  <p className="font-semibold">Filtro Inteligente Activo:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>La previsualización <strong>solo muestra columnas que detectan notas nuevas, modificadas o con errores</strong>.</li>
                    <li>Las notas marcadas en <span className="text-orange-700 font-bold">naranja</span> se subirán al sistema como borradores.</li>
                    <li>Las celdas marcadas en <span className="text-red-700 font-bold">rojo</span> bloquean la carga hasta ser corregidas en Excel.</li>
                    <li>Las notas en <strong>gris oscuro</strong> están publicadas y se ignorarán automáticamente.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={cancelarCarga} disabled={cargandoArchivo} className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button
                onClick={confirmarCarga}
                disabled={cargandoArchivo || hayErroresEnPrevisualizacion}
                className="px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
              >
                {cargandoArchivo ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Cargando...</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Cargar Notas
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {solicitudEvaluacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Solicitar modificación de nota</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Evaluación: <span className="font-semibold text-gray-700">
                    {solicitudEvaluacion.tipoEvaluacion === 'LABORATORIO' ? 'LAB' : solicitudEvaluacion.tipoEvaluacion} {solicitudEvaluacion.numeroEvaluacion}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarModalSolicitud}
                disabled={enviandoSolicitud}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                aria-label="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-5">
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={todosLosAlumnos}
                  disabled={enviandoSolicitud}
                  onChange={(e) => alternarTodosAlumnos(e.target.checked)}
                  className="h-4 w-4 accent-gray-900"
                />
                <span className="text-sm font-bold text-gray-900">Seleccionar todos los alumnos del grupo</span>
              </label>

              <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-3 py-3" />
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Carnet</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Estudiante</th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">Nota actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inscripciones.map(inscripcion => {
                      const idInscripcion = inscripcion.idInscripcion;
                      const notaActual = calificaciones[`${idInscripcion}-${solicitudEvaluacion.idEvaluacion}`]?.nota;
                      return (
                        <tr key={idInscripcion} className="hover:bg-gray-50/50">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={todosLosAlumnos || alumnosSeleccionados.includes(idInscripcion)}
                              disabled={todosLosAlumnos || enviandoSolicitud}
                              onChange={() => alternarAlumnoSeleccionado(idInscripcion)}
                              className="h-4 w-4 accent-gray-900"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{inscripcion.carnet}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {inscripcion.nombresEstudiante} {inscripcion.apellidosEstudiante}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-gray-900">
                            {notaActual === null || notaActual === undefined || notaActual === '' ? 'Sin nota' : notaActual}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <label className="block mt-5">
                <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Justificante *</span>
                <textarea
                  rows={4}
                  maxLength={MAX_CARACTERES}
                  value={motivoSolicitud}
                  onChange={(e) => setMotivoSolicitud(e.target.value)}
                  placeholder="Describe detalladamente por qué necesitas modificar estas notas..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
                <span className="mt-2 block text-right text-[11px] font-normal normal-case tracking-normal text-gray-400">
                  {motivoSolicitud.trim().length}/{MAX_CARACTERES} caracteres (mínimo {MIN_CARACTERES})
                </span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={cerrarModalSolicitud}
                disabled={enviandoSolicitud}
                className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviarSolicitudModificacion}
                disabled={enviandoSolicitud || alumnosSeleccionados.length === 0 || motivoSolicitud.trim().length < MIN_CARACTERES}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm"
              >
                {enviandoSolicitud ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngresoNotas;
