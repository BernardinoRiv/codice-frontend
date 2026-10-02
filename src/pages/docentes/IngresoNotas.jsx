import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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

  useEffect(() => {
    cargarGrupos();
  }, []);

  useEffect(() => {
    if (grupoSeleccionado) {
      setModoEdicionGlobal(false);
      cargarDatosGrupo();
      setTerminoBusqueda('');
    }
  }, [grupoSeleccionado]);

  const cargarGrupos = async () => {
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

  const cargarDatosGrupo = async () => {
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
      setCalificaciones(califsObj);

    } catch (error) {
      toast.error('No se pudieron cargar los datos del grupo seleccionado.');
    } finally {
      setCargando(false);
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

  const getEvaluacionesPorPeriodo = (periodo) => evaluaciones.filter(ev => ev.periodo === periodo);

  const handleNotaChange = (idInscripcion, idEvaluacion, valor) => {
    let val = valor.replace(',', '.');
    if (val !== '') {
      if (!/^\d*\.?\d{0,1}$/.test(val)) return;
      const num = parseFloat(val);
      if (num > 10) val = '10';
      if (num < 0) val = '0';
    }

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

  const guardarCalificaciones = async () => {
    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const calificacionesArray = Object.values(calificaciones)
        .filter(calif => calif.nota !== null && calif.nota !== '' && calif.estadoCalificacion !== 'PUBLICADA')
        .map(calif => ({ ...calif, nota: parseFloat(calif.nota) }));

      if (calificacionesArray.length === 0) {
        toast.info('Sin cambios', { description: 'No hay notas nuevas o editadas para guardar.' });
        setGuardando(false);
        return;
      }

      const promesas = calificacionesArray.map(async (calif) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/calificaciones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(calif)
        });
        if (!response.ok) throw new Error('Error al guardar');
        return response.json();
      });

      await Promise.all(promesas);
      toast.success('¡Guardado exitoso!', { description: 'Borradores actualizados en el sistema.' });
      setModoEdicionGlobal(false);
      cargarDatosGrupo();
    } catch (error) {
      toast.error('Error al guardar', { description: error.message });
    } finally {
      setGuardando(false);
    }
  };

  const publicarCalificacionesActivas = async () => {
    const evaluacionesActivas = evaluaciones.filter(ev => getEstadoEvaluacion(ev).estado === 'activo');
    
    if (evaluacionesActivas.length === 0) {
       toast.error('Acción no permitida', { description: 'No hay periodos de evaluación activos actualmente.'});
       return;
    }

    if (!confirm('¿Estás seguro de publicar las notas de las evaluaciones activas? Los estudiantes podrán ver las modificaciones.')) return;

    setPublicando(true);
    try {
      const token = localStorage.getItem('token');
      const idsEvaluacionesActivas = evaluacionesActivas.map(ev => ev.idEvaluacion);

      const borradores = Object.values(calificaciones)
        .filter(calif => idsEvaluacionesActivas.includes(calif.idEvaluacion) && calif.nota !== null && calif.nota !== '' && calif.estadoCalificacion !== 'PUBLICADA')
        .map(calif => ({ ...calif, nota: parseFloat(calif.nota) }));

      if (borradores.length > 0) {
        await Promise.all(borradores.map(async (calif) => {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/calificaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(calif)
          });
          if (!res.ok) throw new Error('Error en autoguardado preventivo');
        }));
      }

      await Promise.all(idsEvaluacionesActivas.map(async (idEvaluacion) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/evaluaciones/${idEvaluacion}/publicar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error(`Error al publicar la evaluación ${idEvaluacion}`);
      }));

      toast.success('Publicación exitosa', { description: 'Las calificaciones ya son visibles y actualizadas.' });
      setModoEdicionGlobal(false);
      cargarDatosGrupo();
    } catch (error) {
      toast.error('Error al publicar', { description: error.message });
    } finally {
      setPublicando(false);
    }
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

  const handleArchivoSeleccionado = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    const extension = archivo.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
      toast.error('Archivo inválido', { description: 'Solo se permiten archivos .xlsx o .xls' });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const primerHoja = workbook.Sheets[workbook.SheetNames[0]];
        const datosJson = XLSX.utils.sheet_to_json(primerHoja, { header: 1 });

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
          const partes = encabezado.split(' ');
          const tipo = partes[0];
          const numero = partes[1];
          
          if (tipo === 'LAB' || tipo === 'LABORATORIO') {
            mapaEvaluaciones[`LABORATORIO_${numero}`] = i;
          } else if (tipo === 'PAR' || tipo === 'PARCIAL') {
            mapaEvaluaciones[`PARCIAL_${numero}`] = i;
          }
        }

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

        const filasDatos = datosJson.slice(1).filter(fila => fila && fila.length > 0);
        if (filasDatos.length === 0) {
          toast.error('Archivo vacío', { description: 'No se encontraron registros de estudiantes.' });
          e.target.value = '';
          return;
        }

        const columnasConCambios = columnasActivas.filter(col => {
           return filasDatos.some(fila => {
              const carnetStr = fila[0] ? fila[0].toString().trim().toLowerCase() : '';
              const inscripcionEst = inscripciones.find(i => i.carnet.toLowerCase() === carnetStr);
              if (!inscripcionEst) return false;

              const excelVal = fila[col.indiceColumna];
              const tieneValorExcel = excelVal !== undefined && excelVal !== null && excelVal !== '';
              
              const califKey = `${inscripcionEst.idInscripcion}-${col.evaluacion.idEvaluacion}`;
              const califActual = calificaciones[califKey];
              
              if (califActual && califActual.estadoCalificacion === 'PUBLICADA') return false; 

              if (tieneValorExcel) {
                  if (!califActual || califActual.nota === null || califActual.nota === '') return true;
                  if (Number(excelVal).toFixed(1) !== Number(califActual.nota).toFixed(1)) return true;
              }
              return false; 
           });
        });

        if (columnasConCambios.length === 0) {
           toast.info('Sin modificaciones útiles', { description: 'El documento no contiene notas nuevas, y las existentes ya están publicadas o no cambiaron.' });
           e.target.value = '';
           return;
        }

        const previsualizacion = filasDatos.map((fila, idx) => {
          const carnetStr = fila[0] ? fila[0].toString().trim().toLowerCase() : '';
          const inscripcionEst = inscripciones.find(i => i.carnet.toLowerCase() === carnetStr);

          const notasAMostrar = columnasConCambios.map(col => {
            const valor = fila[col.indiceColumna];
            let estado = 'vacio';
            
            if (inscripcionEst) {
               const califKey = `${inscripcionEst.idInscripcion}-${col.evaluacion.idEvaluacion}`;
               const califActual = calificaciones[califKey];
               
               if (califActual && califActual.estadoCalificacion === 'PUBLICADA') {
                  estado = 'publicada';
               } else {
                  const tieneValorExcel = valor !== undefined && valor !== null && valor !== '';
                  if (tieneValorExcel) {
                     if (!califActual || califActual.nota === null || califActual.nota === '') {
                        estado = 'nuevo';
                     } else if (Number(valor).toFixed(1) !== Number(califActual.nota).toFixed(1)) {
                        estado = 'modificado';
                     } else {
                        estado = 'sin_cambio';
                     }
                  }
               }
            }

            return {
              valor: valor !== undefined && valor !== null && valor !== '' ? valor : null,
              estado
            };
          });

          return {
            fila: idx + 2,
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
        toast.error('Error al leer el archivo', { description: 'El archivo está corrupto o tiene un formato inválido.' });
      }
    };
    reader.readAsArrayBuffer(archivo);
    e.target.value = '';
  };

  const confirmarCarga = async () => {
    if (!archivoSeleccionado) return;

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
        throw new Error(errorData.message || 'Error al cargar las notas');
      }

      toast.success('Notas cargadas exitosamente', { description: 'Los registros fueron procesados correctamente.' });
      setMostrarModalCarga(false);
      setArchivoSeleccionado(null);
      setDatosPrevisualizacion([]);
      setEvaluacionesEnPrevisualizacion([]);
      cargarDatosGrupo();
    } catch (error) {
      toast.error('Error al cargar notas', { description: error.message });
    } finally {
      setCargandoArchivo(false);
    }
  };

  const cancelarCarga = () => {
    setMostrarModalCarga(false);
    setArchivoSeleccionado(null);
    setDatosPrevisualizacion([]);
    setEvaluacionesEnPrevisualizacion([]);
  };

  const periodosUnicos = [...new Set(evaluaciones.map(ev => ev.periodo).filter(p => p !== null && p !== undefined))].sort();
  const inscripcionesFiltradas = inscripciones.filter(inscripcion => {
    const termino = terminoBusqueda.toLowerCase();
    const nombreCompleto = `${inscripcion.nombresEstudiante} ${inscripcion.apellidosEstudiante}`.toLowerCase();
    return inscripcion.carnet.toLowerCase().includes(termino) || nombreCompleto.includes(termino);
  });

  const hayEvaluacionesActivas = evaluaciones.some(ev => getEstadoEvaluacion(ev).estado === 'activo');
  const evaluacionesActivas = evaluaciones.filter(ev => getEstadoEvaluacion(ev).estado === 'activo');

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
              onChange={(e) => setGrupoSeleccionado(Number(e.target.value))}
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
                              const estado = getEstadoEvaluacion(evalItem);
                              const key = `${inscripcion.idInscripcion}-${evalItem.idEvaluacion}`;
                              const calif = calificaciones[key];
                              
                              const estaPublicada = calif?.estadoCalificacion === 'PUBLICADA';
                              const estaBloqueado = !estado.puedeEditar || !modoEdicionGlobal || estaPublicada;
                              const tieneNota = calif?.nota !== null && calif?.nota !== undefined && calif?.nota !== '';
                              const esBorrador = tieneNota && !estaPublicada;

                              let colorClass = '';
                              if (estaPublicada) colorClass = 'bg-green-50 text-green-700';
                              else if (esBorrador) colorClass = 'bg-orange-50 text-orange-700';
                              else colorClass = estaBloqueado ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-900';

                              let borderClass = '';
                              if (!estaBloqueado) {
                                borderClass = 'border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-sm cursor-text';
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
                                    title={estaPublicada ? 'Calificación oficial. Solicita permisos para modificar.' : (estaBloqueado ? 'Haz clic en Habilitar Edición abajo' : 'Editando nota')}
                                    className={`w-16 text-center rounded-lg px-2 py-1.5 text-sm font-bold transition-all outline-none border ${colorClass} ${borderClass}`}
                                  />
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
                disabled={guardando || !modoEdicionGlobal}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
              >
                {guardando ? 'Guardando...' : 'Guardar Borrador'}
              </button>

              <button
                type="button"
                onClick={publicarCalificacionesActivas}
                disabled={publicando || !hayEvaluacionesActivas}
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
                    <li>La previsualización <strong>solo muestra columnas que detectan notas nuevas o modificadas</strong>.</li>
                    <li>Las notas marcadas en <span className="text-orange-700 font-bold">naranja</span> se subirán al sistema como borradores.</li>
                    <li>Las notas en <strong>gris oscuro</strong> están publicadas y se ignorarán automáticamente.</li>
                    <li>Las notas en <span className="text-gray-400 font-bold">gris claro</span> coinciden con el borrador actual y no generarán cambios.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button onClick={cancelarCarga} disabled={cargandoArchivo} className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium">
                Cancelar
              </button>
              <button onClick={confirmarCarga} disabled={cargandoArchivo} className="px-5 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors text-sm font-medium shadow-sm flex items-center gap-2">
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
    </div>
  );
};

export default IngresoNotas;