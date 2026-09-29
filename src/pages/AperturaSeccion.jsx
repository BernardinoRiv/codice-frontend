import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

function AperturaSeccion() {
  const [isLoading, setIsLoading] = useState(false);
  const [seccionesAperturadas, setSeccionesAperturadas] = useState([]);

  // ==========================================
  // ESTADOS DE CATÁLOGOS BASE Y DINÁMICOS
  // ==========================================
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(true);
  const [catalogos, setCatalogos] = useState({
    ciclos: [], sedes: [], carreras: [], modalidades: [], docentes: [], plantillas: []
  });
  
  // Listas que dependen de una selección previa (Cascada)
  const [materias, setMaterias] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [isLoadingCascada, setIsLoadingCascada] = useState({ materias: false, aulas: false });

  // ==========================================
  // ESTADO DEL FORMULARIO
  // ==========================================
  const [formData, setFormData] = useState({
    idCiclo: '',
    idSede: '',
    idCarrera: '',
    idMateria: '',
    idDocente: '',
    idModalidad: '',
    idPlantilla: '',
    idAula: '',
    enlaceVirtual: '',
    cupoVirtual: 40
  });

  // Carga inicial de todos los catálogos estáticos
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [resGral, resDocentes, resPlantillas] = await Promise.all([
          // AQUÍ ESTÁ LA CORRECCIÓN: /api/v1/catalogos
          fetch(`${import.meta.env.VITE_API_URL}/api/v1/catalogos?nombres=ciclos,sedes,carreras,modalidades`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/catalogos/docentes`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/catalogos/plantillas`, { headers })
        ]);

        const dataGral = resGral.ok ? await resGral.json() : {};
        const dataDocentes = resDocentes.ok ? await resDocentes.json() : [];
        const dataPlantillas = resPlantillas.ok ? await resPlantillas.json() : [];

        setCatalogos({
          ciclos: dataGral.ciclos || [],
          sedes: dataGral.sedes || [],
          carreras: dataGral.carreras || [],
          modalidades: dataGral.modalidades || [],
          docentes: dataDocentes,
          plantillas: dataPlantillas
        });

      } catch (error) {
        toast.error('Error de conexión', { description: 'No se pudieron descargar los catálogos.' });
      } finally {
        setIsLoadingCatalogos(false);
      }
    };
    fetchCatalogos();
  }, []);

  // Efecto Cascada: Sede -> Aulas físicas
  useEffect(() => {
    if (!formData.idSede) {
      setAulas([]);
      setFormData(prev => ({ ...prev, idAula: '' }));
      return;
    }
    const fetchAulas = async () => {
      setIsLoadingCascada(prev => ({ ...prev, aulas: true }));
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/catalogos/aulas?idSede=${formData.idSede}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (res.ok) setAulas(await res.json());
      } catch (error) {
        toast.error('Error al cargar aulas');
      } finally {
        setIsLoadingCascada(prev => ({ ...prev, aulas: false }));
      }
    };
    fetchAulas();
  }, [formData.idSede]);

  // Efecto Cascada: Carrera -> Materias del Pensum
  useEffect(() => {
    if (!formData.idCarrera) {
      setMaterias([]);
      setFormData(prev => ({ ...prev, idMateria: '' }));
      return;
    }
    const fetchMaterias = async () => {
      setIsLoadingCascada(prev => ({ ...prev, materias: true }));
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/catalogos/materias?idCarrera=${formData.idCarrera}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (res.ok) setMaterias(await res.json());
      } catch (error) {
        toast.error('Error al cargar materias');
      } finally {
        setIsLoadingCascada(prev => ({ ...prev, materias: false }));
      }
    };
    fetchMaterias();
  }, [formData.idCarrera]);

  // --- DERIVACIONES LÓGICAS PARA LA INTERFAZ ---
  const getModalidadOpt = () => catalogos.modalidades.find(m => m.id.toString() === formData.idModalidad.toString());
  const esVirtual = getModalidadOpt()?.nombre.toUpperCase().includes('VIRTUAL');

  const getAulaOpt = () => aulas.find(a => a.idAula.toString() === formData.idAula.toString());
  const cupoCalculado = esVirtual ? formData.cupoVirtual : (getAulaOpt()?.capacidad || 0);

  const getPlantillaOpt = () => catalogos.plantillas.find(p => p.idPlantilla.toString() === formData.idPlantilla.toString());
  const franjasPlantilla = getPlantillaOpt()?.detalles || [];

  const getCicloData = () => {
    if (!formData.idCiclo) return { num: '01', anio: new Date().getFullYear() };
    const ciclo = catalogos.ciclos.find(c => c.id.toString() === formData.idCiclo.toString());
    if (!ciclo) return { num: '01', anio: new Date().getFullYear() };
    const num = ciclo.numeroCiclo || (ciclo.nombre.match(/\d+/) ? ciclo.nombre.match(/\d+/)[0] : '01');
    const anio = ciclo.anio || (ciclo.nombre.match(/\d{4}/) ? ciclo.nombre.match(/\d{4}/)[0] : new Date().getFullYear());
    return { num: String(num).padStart(2, '0'), anio };
  };
  const codigoGenerado = `GRP-${getCicloData().num}-${getCicloData().anio}`;

  // --- MANEJADORES DE EVENTOS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData({
      idCiclo: '', idSede: '', idCarrera: '', idMateria: '', idDocente: '',
      idModalidad: '', idPlantilla: '', idAula: '', enlaceVirtual: '', cupoVirtual: 40
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        idCiclo: parseInt(formData.idCiclo),
        idSede: parseInt(formData.idSede),
        idMateria: parseInt(formData.idMateria),
        idDocente: parseInt(formData.idDocente),
        idModalidad: parseInt(formData.idModalidad),
        idPlantilla: parseInt(formData.idPlantilla),
        idAula: esVirtual ? null : parseInt(formData.idAula),
        enlaceVirtual: esVirtual ? formData.enlaceVirtual : null,
        cupoVirtual: esVirtual ? parseInt(formData.cupoVirtual) : null
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/aperturar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.status === 201 || response.ok) {
        toast.success('¡Apertura Exitosa!', { description: `Sección ${data.codigoGrupo || codigoGenerado} guardada correctamente.` });
        
        // Agregar al historial de la tabla inferior
        const nuevaSeccion = {
            codigoGrupo: data.codigoGrupo || codigoGenerado,
            materia: materias.find(m => m.idMateria == formData.idMateria)?.nombreMateria || 'Materia',
            docente: catalogos.docentes.find(d => d.idDocente == formData.idDocente)?.nombres || 'Docente',
            modalidad: esVirtual ? 'Virtual' : 'Presencial',
            cupo: cupoCalculado
        };
        setSeccionesAperturadas(prev => [nuevaSeccion, ...prev]);
        handleReset();
      } else if (response.status === 409) {
        toast.error(`Conflicto (${data.error || 'Error'})`, { description: data.mensaje });
      } else if (response.status === 422) {
        toast.warning('Regla de Negocio', { description: data.mensaje || 'Revisa las validaciones del formulario.' });
      } else {
        throw new Error(data.mensaje || 'Error en la operación.');
      }
    } catch (err) {
      toast.error('Error', { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // --- LÓGICA DE ESTADOS DEL STEPPER ---
  const isFieldValid = (val) => val && val.toString().trim() !== '';
  
  const c1 = [formData.idCiclo, formData.idSede, formData.idCarrera].filter(isFieldValid).length;
  const c2 = [formData.idMateria, formData.idDocente].filter(isFieldValid).length;
  
  let c3 = 0;
  if (isFieldValid(formData.idModalidad) && isFieldValid(formData.idPlantilla)) {
      if (esVirtual && isFieldValid(formData.enlaceVirtual) && formData.cupoVirtual > 0) c3 = 2;
      else if (!esVirtual && isFieldValid(formData.idAula)) c3 = 2;
  }

  const isReady = (c1 === 3 && c2 === 2 && c3 === 2);

  const getStatus = (current, max) => {
    if (current === max) return { state: 'complete' };
    if (current > 0) return { state: 'active', pct: Math.round((current / max) * 100) };
    return { state: 'idle' };
  };

  const st1 = getStatus(c1, 3);
  const st2 = getStatus(c2, 2);
  const st3 = getStatus(c3, 2);

  // --- COMPONENTES VISUALES REUTILIZABLES ---
  const StepPoint = ({ statusObj, label, stepNum }) => {
    const { state, pct } = statusObj;
    return (
      <div className="flex flex-col items-center relative z-10 w-10 group cursor-default">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm ${
          state === 'complete' ? 'border-[#2E7D32] bg-[#2E7D32]' : state === 'active' ? 'border-[#2E7D32] text-[#2E7D32] bg-white' : 'border-gray-200 text-gray-300 bg-white'
        }`}>
          {state === 'complete' && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          {state === 'active' && <span className="font-bold text-[10px]">{pct}%</span>}
          {state === 'idle' && <span className="font-bold text-sm">{stepNum}</span>}
        </div>
        <span className={`absolute top-11 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ${
          state === 'complete' ? 'text-[#2E7D32]' : state === 'active' ? 'text-gray-900' : 'text-gray-400'
        }`}>{label}</span>
      </div>
    );
  };

  const StepLine = ({ percentage }) => (
    <div className="flex-1 flex items-center px-1">
      <div className="h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#2E7D32] transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );

  const inputClassName = "w-full bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 py-3.5 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400 disabled:bg-gray-50/80 disabled:text-gray-500 disabled:cursor-not-allowed";
  const labelClassName = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";
  const sectionTitleClassName = "text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-5 pb-2 border-b border-gray-100 flex items-center gap-2";

  return (
    <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* ======================================= */}
        {/* LADO IZQUIERDO: FORMULARIO PRINCIPAL    */}
        {/* ======================================= */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Apertura de Sección</h1>
              <p className="text-gray-500 text-sm">Gestiona la oferta académica configurando materias, docentes y horarios.</p>
            </div>
            <button type="button" onClick={handleReset} className="text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm whitespace-nowrap">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Limpiar Campos
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* SECCIÓN 1: CONTEXTO ACADÉMICO */}
            <div className="bg-white p-7 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-black"></div>
              <h3 className={sectionTitleClassName}>1. Parámetros Base</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                <div>
                  <label className={labelClassName}>Ciclo Lectivo</label>
                  <select name="idCiclo" value={formData.idCiclo} onChange={handleChange} required disabled={isLoadingCatalogos} className={inputClassName}>
                    <option value="">-- Seleccione --</option>
                    {catalogos.ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Sede Regional</label>
                  <select name="idSede" value={formData.idSede} onChange={handleChange} required disabled={isLoadingCatalogos} className={inputClassName}>
                    <option value="">-- Seleccione --</option>
                    {catalogos.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Pensum / Carrera</label>
                  <select name="idCarrera" value={formData.idCarrera} onChange={handleChange} required disabled={isLoadingCatalogos} className={inputClassName}>
                    <option value="">-- Seleccione --</option>
                    {catalogos.carreras.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: ASIGNACIÓN */}
            <div className={`transition-opacity duration-300 ${c1 < 3 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> 2. Asignación Académica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div>
                  <label className={labelClassName}>Materia a Impartir {isLoadingCascada.materias && <span className="animate-pulse text-blue-500 normal-case ml-2">(Cargando...)</span>}</label>
                  <select name="idMateria" value={formData.idMateria} onChange={handleChange} required disabled={materias.length === 0} className={inputClassName}>
                    <option value="">{materias.length === 0 ? '-- Elija una carrera primero --' : '-- Seleccione Materia --'}</option>
                    {materias.map(m => <option key={m.idMateria} value={m.idMateria}>{m.labelVisual || `${m.codigoMateria} - ${m.nombreMateria}`}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Docente Asignado</label>
                  <select name="idDocente" value={formData.idDocente} onChange={handleChange} required disabled={isLoadingCatalogos} className={inputClassName}>
                    <option value="">-- Seleccione --</option>
                    {catalogos.docentes.map(d => <option key={d.idDocente} value={d.idDocente}>{d.label || `${d.nombres} ${d.apellidos}`}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: HORARIO Y ESPACIO */}
            <div className={`transition-opacity duration-300 ${c2 < 2 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> 3. Horarios y Espacio Físico/Virtual</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
                <div>
                  <label className={labelClassName}>Modalidad de la Sección</label>
                  <select name="idModalidad" value={formData.idModalidad} onChange={handleChange} required className={inputClassName}>
                    <option value="">-- Seleccione --</option>
                    {catalogos.modalidades.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClassName}>Plantilla Horaria</label>
                  <select name="idPlantilla" value={formData.idPlantilla} onChange={handleChange} required className={inputClassName}>
                    <option value="">-- Seleccione --</option>
                    {catalogos.plantillas.map(p => {
                      const resumen = p.detalles?.map(d => `${d.dia} (${d.horaInicio.substring(0,5)})`).join(', ') || 'Sin horarios';
                      return <option key={p.idPlantilla} value={p.idPlantilla}>{p.codigoPlantilla}: {resumen}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Controles dinámicos según Modalidad */}
              {formData.idModalidad && (
                <div className="p-5 bg-gray-50/50 rounded-xl border border-gray-200/60 mt-4 animate-in fade-in zoom-in-95 duration-300">
                  {esVirtual ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClassName}>Enlace de Reunión (Meet/Teams)</label>
                        <input type="url" name="enlaceVirtual" value={formData.enlaceVirtual} onChange={handleChange} required={esVirtual} className={inputClassName} placeholder="https://meet.google.com/..." />
                      </div>
                      <div>
                        <label className={labelClassName}>Cupo Máximo Asignado</label>
                        <input type="number" name="cupoVirtual" value={formData.cupoVirtual} onChange={handleChange} min="1" max="200" required={esVirtual} className={inputClassName} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClassName}>Aula Física Asignada {isLoadingCascada.aulas && <span className="animate-pulse text-blue-500 normal-case ml-2">(Cargando...)</span>}</label>
                        <select name="idAula" value={formData.idAula} onChange={handleChange} required={!esVirtual} disabled={aulas.length === 0} className={inputClassName}>
                          <option value="">{aulas.length === 0 ? '-- Sin aulas en esta sede --' : '-- Seleccione Aula --'}</option>
                          {aulas.map(a => <option key={a.idAula} value={a.idAula}>{a.codigoAula} - {a.edificio || 'Edificio'} (Cap. {a.capacidad})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClassName}>Aforo / Cupo Automático</label>
                        <input type="text" value={cupoCalculado} disabled className={`${inputClassName} font-bold text-center text-gray-700 bg-gray-100/50`} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={isLoading || !isReady} className="bg-black text-white px-8 py-3.5 rounded-[14px] text-[15px] font-semibold hover:shadow-lg hover:shadow-black/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                {isLoading ? <span>Procesando...</span> : <span>Confirmar y Aperturar</span>}
              </button>
            </div>
          </form>

          {/* TABLA DE RESUMEN DE SESIÓN */}
          {seccionesAperturadas.length > 0 && (
            <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Secciones Aperturadas Hoy
              </h3>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600 min-w-[500px]">
                  <thead className="bg-gray-50/50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400 font-bold">
                    <tr>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Docente</th>
                      <th className="px-6 py-4">Modalidad</th>
                      <th className="px-6 py-4 text-center">Cupo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {seccionesAperturadas.map((sec, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{sec.codigoGrupo}</td>
                        <td className="px-6 py-4">{sec.docente}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${sec.modalidad === 'Virtual' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                            {sec.modalidad}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{sec.cupo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ======================================= */}
        {/* LADO DERECHO: TARJETA MÁGICA (PREVIEW)  */}
        {/* ======================================= */}
        <div className="lg:col-span-5 xl:col-span-4 hidden lg:block relative">
          <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sticky top-8 transition-all duration-300">
            
            <div className="mb-10 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900">{codigoGenerado}</h2>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">Vista Previa de Sección</p>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
            </div>

            <div className="flex items-center justify-between w-full mb-10 px-2">
              <StepPoint statusObj={st1} label="Base" stepNum="1" />
              <StepLine percentage={st1.state === 'complete' ? 100 : (st1.pct || 0)} />
              <StepPoint statusObj={st2} label="Asignación" stepNum="2" />
              <StepLine percentage={st2.state === 'complete' ? 100 : (st2.pct || 0)} />
              <StepPoint statusObj={st3} label="Horario" stepNum="3" />
              <StepLine percentage={st3.state === 'complete' ? 100 : (st3.pct || 0)} />
              <StepPoint statusObj={{ state: isReady ? 'complete' : 'idle', pct: 0 }} label="Lista" stepNum="4" />
            </div>

            <div className="bg-gray-50/50 rounded-2xl p-5 mb-6 border border-gray-100 text-center">
              <h4 className={`text-base font-bold leading-tight ${formData.idMateria ? 'text-gray-900' : 'text-gray-400'}`}>
                {formData.idMateria ? materias.find(m => m.idMateria == formData.idMateria)?.nombreMateria : 'Materia no asignada'}
              </h4>
              <p className="text-[12px] text-gray-500 mt-1 font-medium">
                {formData.idDocente ? catalogos.docentes.find(d => d.idDocente == formData.idDocente)?.nombres : 'Docente pendiente'}
              </p>
            </div>

            {/* Chips de Horarios */}
            {franjasPlantilla.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2 justify-center">
                {franjasPlantilla.map((d, i) => (
                  <span key={i} className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[11px] font-semibold shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    {d.dia} {d.horaInicio.substring(0,5)}
                  </span>
                ))}
              </div>
            )}

            <div className="border-t border-gray-50 pt-5 space-y-4">
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Modalidad</span><span className="font-semibold text-gray-900">{getModalidadOpt()?.nombre || '---'}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Ubicación</span><span className="font-semibold text-gray-900 text-right w-1/2 truncate">{esVirtual ? 'Plataforma Virtual' : (getAulaOpt()?.codigoAula || '---')}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-gray-400">Cupo Configurado</span><span className="font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-3 py-0.5 rounded-full">{cupoCalculado || 0} alumnos</span></div>
            </div>

            <div className="mt-8 pt-5 border-t border-dashed border-gray-100">
              <p className="text-[10px] text-gray-400 text-center leading-relaxed font-medium">
                Esta sección se habilitará inmediatamente en el portal de inscripción estudiantil tras ser confirmada.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AperturaSeccion;