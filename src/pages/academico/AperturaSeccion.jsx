import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

function SelectBuscador({
  label,
  loading = false,
  value,
  onChange,
  options = [],
  placeholder = '-- Seleccione --',
  searchPlaceholder = 'Buscar...',
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const filtrados = options.filter(item =>
    (item.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const seleccionado = options.find(
    item => String(item.id) === String(value)
  );

  const handleLimpiar = (e) => {
    e.stopPropagation();
    if (search) {
      setSearch('');
      inputRef.current?.focus();
    } else if (value) {
      onChange('');
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={'relative ' + (open ? 'z-40' : 'z-10')}>
      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
        {label}
        {loading && <span className="animate-pulse text-blue-500 normal-case ml-1">(...)</span>}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) setSearch('');
          }
        }}
        className="w-full bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 py-3.5 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm disabled:bg-gray-50/80 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-between text-left gap-3"
      >
        <span className={'leading-snug break-words ' + (seleccionado ? 'text-gray-900 font-medium' : 'text-gray-400')}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        <svg
          className={'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ' + (open ? 'rotate-180' : '')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex items-center">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl pl-9 pr-9 py-2 text-xs focus:outline-none focus:border-gray-400"
              />
              {(search || seleccionado) && (
                <button
                  type="button"
                  onClick={handleLimpiar}
                  title={search ? 'Limpiar búsqueda' : 'Limpiar selección'}
                  className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
            {filtrados.length === 0 ? (
              <div className="px-4 py-4 text-xs text-gray-400 text-center">
                No se encontraron resultados
              </div>
            ) : (
              filtrados.map(item => {
                const activo = String(item.id) === String(value);
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      onChange(String(item.id));
                      setOpen(false);
                      setSearch('');
                    }}
                    className={'w-full text-left px-4 py-3 text-[13px] transition-colors flex items-center justify-between gap-3 ' + (
                      activo ? 'bg-gray-900 text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span className="leading-snug break-words">{item.nombre}</span>
                    {activo && (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const AperturaSeccion = () => {
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [seccionesAperturadas, setSeccionesAperturadas] = useState([]);

  const [usuarioContext, setUsuarioContext] = useState({
    username: '', rol: '', idCargo: null, nombreCargo: '', idSede: null, nombreSede: '', esAdministrador: false
  });

  const [cicloOperativo, setCicloOperativo] = useState(null);
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(true);
  const [catalogos, setCatalogos] = useState({
    sedes: [], modalidades: [], plantillas: []
  });
  
  const [carreras, setCarreras] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [isLoadingCascada, setIsLoadingCascada] = useState({ carreras: false, docentes: false, aulas: false, materias: false });

  const [formData, setFormData] = useState({
    idSede: '', idCarrera: '', idMateria: '', idDocente: '', idModalidad: '',
    idPlantilla: '', idAula: '', enlaceVirtual: '', cupoVirtual: 40
  });

  useEffect(() => {
    const fetchInicial = async () => {
      try {
        const token = localStorage.getItem('token');
        let contextoUser = { ...usuarioContext };

        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const rol = String(payload.rol || payload.roles || 'ADMINISTRADOR').toUpperCase();
            contextoUser = {
              username: payload.sub || 'Usuario',
              rol: rol,
              idCargo: payload.idCargo || null,
              nombreCargo: payload.nombreCargo || '',
              idSede: payload.idSede || null,
              nombreSede: payload.nombreSede || '',
              esAdministrador: rol.includes('ADMINISTRADOR') || rol.includes('ADMIN')
            };
            setUsuarioContext(contextoUser);
          } catch (e) {}
        }

        const headers = { 'Authorization': 'Bearer ' + token };

        const [resPlan, resCicloOp, resCatalogos, resPlantillas] = await Promise.all([
          fetch(import.meta.env.VITE_API_URL + '/api/v1/ciclos/en-planificacion', { headers }).catch(() => null),
          fetch(import.meta.env.VITE_API_URL + '/api/v1/ciclos/operativo-oferta', { headers }).catch(() => null),
          fetch(import.meta.env.VITE_API_URL + '/api/v1/catalogos?nombres=sedes,modalidades', { headers }),
          fetch(import.meta.env.VITE_API_URL + '/api/v1/grupos/catalogos/plantillas', { headers })
        ]);

        const listaPlan = (resPlan && resPlan.ok) ? await resPlan.json() : [];
        const cicloOp = (resCicloOp && resCicloOp.ok) ? await resCicloOp.json() : null;

        let cicloElegido = null;

        if (location.state?.idCiclo && Array.isArray(listaPlan)) {
          cicloElegido = listaPlan.find(c => Number(c.idCiclo) === Number(location.state.idCiclo));
        }

        if (!cicloElegido && Array.isArray(listaPlan) && listaPlan.length > 0) {
          const soloEnPlanificacion = listaPlan.filter(c => {
            const estadoSinTildes = String(c.estadoCiclo || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toUpperCase();
            return estadoSinTildes === 'PLANIFICACION' || estadoSinTildes === 'EN_PLANIFICACION';
          });

          cicloElegido = soloEnPlanificacion.length > 0
            ? soloEnPlanificacion[soloEnPlanificacion.length - 1]
            : listaPlan[listaPlan.length - 1];
        }

        if (!cicloElegido && cicloOp) {
          cicloElegido = cicloOp;
        }

        setCicloOperativo(cicloElegido);
        
        const dataCat = resCatalogos.ok ? await resCatalogos.json() : {};
        const dataPlantillas = resPlantillas.ok ? await resPlantillas.json() : [];

        setCatalogos({
          sedes: dataCat.sedes || [],
          modalidades: dataCat.modalidades || [],
          plantillas: dataPlantillas
        });

        if (!contextoUser.esAdministrador && contextoUser.idSede) {
          setFormData(prev => ({ ...prev, idSede: contextoUser.idSede.toString() }));
        }

      } catch (error) {
        toast.error('Error al inicializar', { description: 'No se pudieron cargar los parámetros base.' });
      } finally {
        setIsLoadingCatalogos(false);
      }
    };
    fetchInicial();
  }, [location.state?.idCiclo]);

  useEffect(() => {
    if (!formData.idSede) {
      setCarreras([]); setDocentes([]); setAulas([]); setMaterias([]);
      setFormData(prev => ({ ...prev, idCarrera: '', idDocente: '', idAula: '', idMateria: '' }));
      return;
    }
    
    const fetchDependenciasSede = async () => {
      setIsLoadingCascada(prev => ({ ...prev, carreras: true, docentes: true, aulas: true }));
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': 'Bearer ' + token };
        
        const [resCarreras, resDocentes, resAulas] = await Promise.all([
          fetch(import.meta.env.VITE_API_URL + '/api/v1/carreras?idSede=' + formData.idSede, { headers }),
          fetch(import.meta.env.VITE_API_URL + '/api/v1/grupos/catalogos/docentes?idSede=' + formData.idSede, { headers }),
          fetch(import.meta.env.VITE_API_URL + '/api/v1/grupos/catalogos/aulas?idSede=' + formData.idSede, { headers })
        ]);

        if (resCarreras.ok) setCarreras(await resCarreras.json());
        if (resDocentes.ok) setDocentes(await resDocentes.json());
        if (resAulas.ok) setAulas(await resAulas.json());

      } catch (error) {
        toast.error('Error al cargar datos de la sede');
      } finally {
        setIsLoadingCascada(prev => ({ ...prev, carreras: false, docentes: false, aulas: false }));
      }
    };
    fetchDependenciasSede();
  }, [formData.idSede]);

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
        const res = await fetch(import.meta.env.VITE_API_URL + '/api/v1/grupos/catalogos/materias?idCarrera=' + formData.idCarrera, { 
          headers: { 'Authorization': 'Bearer ' + token } 
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

  const getModalidadOpt = () => catalogos.modalidades.find(m => m.id.toString() === formData.idModalidad.toString());
  const esVirtual = getModalidadOpt()?.nombre.toUpperCase().includes('VIRTUAL');

  const getAulaOpt = () => aulas.find(a => a.idAula.toString() === formData.idAula.toString());
  const cupoCalculado = esVirtual ? formData.cupoVirtual : (getAulaOpt()?.capacidad || 0);

  const getPlantillaOpt = () => catalogos.plantillas.find(p => p.idPlantilla.toString() === formData.idPlantilla.toString());
  const franjasPlantilla = getPlantillaOpt()?.detalles || [];

  const getSedeOpt = () => catalogos.sedes.find(s => s.id.toString() === formData.idSede.toString());
  const getCarreraOpt = () => carreras.find(c => c.idCarrera.toString() === formData.idCarrera.toString());
  const getMateriaOpt = () => materias.find(m => m.idMateria.toString() === formData.idMateria.toString());
  const getDocenteOpt = () => docentes.find(d => d.idDocente.toString() === formData.idDocente.toString());

  const obtenerNombreCompletoDocente = () => {
    const doc = getDocenteOpt();
    if (!doc) return 'Docente pendiente';
    if (doc.nombres && doc.apellidos) return (doc.nombres + ' ' + doc.apellidos).trim();
    if (doc.label || doc.labelVisual) return String(doc.label || doc.labelVisual).split('(')[0].trim();
    return doc.nombres || 'Docente';
  };

  const codigoGenerado = cicloOperativo ? 'GRP-' + cicloOperativo.codigoCiclo : 'GRP----';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    const mantenerSedeFija = !usuarioContext.esAdministrador && usuarioContext.idSede;
    setFormData({
      idSede: mantenerSedeFija ? usuarioContext.idSede.toString() : '',
      idCarrera: '', idMateria: '', idDocente: '', idModalidad: '',
      idPlantilla: '', idAula: '', enlaceVirtual: '', cupoVirtual: 40
    });
  };

  const isFieldValid = (val) => val && val.toString().trim() !== '';
  const c1 = [cicloOperativo?.idCiclo, formData.idSede, formData.idCarrera].filter(isFieldValid).length;
  const c2 = [formData.idMateria, formData.idDocente].filter(isFieldValid).length;
  
  let c3 = 0;
  if (isFieldValid(formData.idModalidad) && isFieldValid(formData.idPlantilla)) {
      if (esVirtual && isFieldValid(formData.enlaceVirtual) && formData.cupoVirtual > 0) c3 = 2;
      else if (!esVirtual && isFieldValid(formData.idAula)) c3 = 2;
  }
  
  const isReady = (c1 === 3 && c2 === 2 && c3 === 2);

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!cicloOperativo || !cicloOperativo.idCiclo) {
      toast.error('Error', { description: 'No hay un ciclo operativo configurado en el sistema.' });
      return;
    }
    if (!isReady) {
      toast.warning('Formulario incompleto', { description: 'Completa todos los parámetros antes de continuar.' });
      return;
    }
    setModalConfirmar(true);
  };

  const handleConfirmarApertura = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        idCiclo: parseInt(cicloOperativo.idCiclo, 10),
        idSede: parseInt(formData.idSede, 10),
        idMateria: parseInt(formData.idMateria, 10),
        idDocente: parseInt(formData.idDocente, 10),
        idModalidad: parseInt(formData.idModalidad, 10),
        idPlantilla: parseInt(formData.idPlantilla, 10),
        idAula: esVirtual ? null : parseInt(formData.idAula, 10),
        enlaceVirtual: esVirtual ? formData.enlaceVirtual : null,
        cupoVirtual: esVirtual ? parseInt(formData.cupoVirtual, 10) : null
      };

      const response = await fetch(import.meta.env.VITE_API_URL + '/api/v1/grupos/aperturar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.status === 201 || response.ok) {
        const matObj = getMateriaOpt();
        const carObj = getCarreraOpt();
        const sedObj = getSedeOpt();
        const aulObj = getAulaOpt();
        const planObj = getPlantillaOpt();

        const horariosFinales = (Array.isArray(data.horarios) && data.horarios.length > 0)
          ? data.horarios
          : franjasPlantilla;

        const aulaTexto = esVirtual
          ? (formData.enlaceVirtual || 'Plataforma Virtual')
          : ((aulObj?.codigoAula || 'Aula') + (aulObj?.edificio ? ' • ' + aulObj.edificio : ''));

        const nuevaSeccion = {
          codigoGrupo: data.codigoGrupo || planObj?.codigoPlantilla || codigoGenerado,
          codigoCiclo: cicloOperativo?.codigoCiclo || '---',
          plantilla: planObj?.codigoPlantilla || '',
          materia: data.materia || matObj?.nombreMateria || 'Materia',
          codigoMateria: matObj?.codigoMateria || '',
          carrera: carObj?.nombreCarrera || '---',
          docente: data.docente || obtenerNombreCompletoDocente(),
          sede: sedObj?.nombre || '---',
          modalidad: esVirtual ? 'Virtual' : 'Presencial',
          espacio: aulaTexto,
          horarios: horariosFinales,
          cupo: data.cupoMaximo || cupoCalculado,
          estado: data.estado || cicloOperativo?.estadoCiclo || 'ACTIVO'
        };

        setSeccionesAperturadas(prev => [nuevaSeccion, ...prev]);
        setModalConfirmar(false);
        handleReset();

        toast.success('¡Apertura Exitosa!', {
          description: 'Sección ' + nuevaSeccion.codigoGrupo + ' (' + nuevaSeccion.materia + ') registrada en el ciclo ' + nuevaSeccion.codigoCiclo + '.'
        });
      } else if (response.status === 409) {
        toast.error('Conflicto (' + (data.error || 'Error') + ')', { description: data.mensaje });
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
  
  const getStatus = (current, max) => {
    if (current === max) return { state: 'complete' };
    if (current > 0) return { state: 'active', pct: Math.round((current / max) * 100) };
    return { state: 'idle' };
  };
  
  const st1 = getStatus(c1, 3);
  const st2 = getStatus(c2, 2);
  const st3 = getStatus(c3, 2);

  const StepPoint = ({ statusObj, label, stepNum }) => {
    const { state, pct } = statusObj;
    return (
      <div className="flex flex-col items-center relative z-10 w-10 group cursor-default">
        <div className={'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 shadow-sm ' + (
          state === 'complete' ? 'border-[#2E7D32] bg-[#2E7D32]' : state === 'active' ? 'border-[#2E7D32] text-[#2E7D32] bg-white' : 'border-gray-200 text-gray-300 bg-white'
        )}>
          {state === 'complete' && <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          {state === 'active' && <span className="font-bold text-[10px]">{pct}%</span>}
          {state === 'idle' && <span className="font-bold text-sm">{stepNum}</span>}
        </div>
        <span className={'absolute top-11 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-300 ' + (
          state === 'complete' ? 'text-[#2E7D32]' : state === 'active' ? 'text-gray-900' : 'text-gray-400'
        )}>{label}</span>
      </div>
    );
  };

  const StepLine = ({ percentage }) => (
    <div className="flex-1 flex items-center px-1">
      <div className="h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#2E7D32] transition-all duration-500 ease-out" style={{ width: percentage + '%' }}></div>
      </div>
    </div>
  );

  const inputClassName = "w-full bg-white text-gray-900 border border-gray-200/80 rounded-[14px] px-4 py-3.5 text-[14px] focus:outline-none focus:ring-4 focus:ring-black/5 focus:border-gray-300 transition-all shadow-sm placeholder-gray-400 disabled:bg-gray-50/80 disabled:text-gray-500 disabled:cursor-not-allowed";
  const readonlyClassName = "w-full bg-gray-50/80 text-gray-700 font-bold border border-gray-200/80 rounded-[14px] px-4 py-3.5 text-[14px] cursor-not-allowed shadow-sm";
  const labelClassName = "block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";
  const sectionTitleClassName = "text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-5 pb-2 border-b border-gray-100 flex items-center gap-2";

  const estaSedeBloqueada = !usuarioContext.esAdministrador && usuarioContext.idSede !== null;

  const opcionesSedes = catalogos.sedes.map(s => ({ id: s.id, nombre: s.nombre }));
  const opcionesCarreras = carreras.map(c => ({ id: c.idCarrera, nombre: c.nombreCarrera }));
  const opcionesMaterias = materias.map(m => ({ id: m.idMateria, nombre: m.labelVisual || (m.codigoMateria + ' - ' + m.nombreMateria) }));
  const opcionesDocentes = docentes.map(d => ({ id: d.idDocente, nombre: d.label || d.labelVisual || (d.nombres + ' ' + d.apellidos) }));
  const opcionesModalidades = catalogos.modalidades.map(m => ({ id: m.id, nombre: m.nombre }));
  const opcionesPlantillas = catalogos.plantillas.map(p => {
    const resumen = p.detalles?.map(d => d.dia + ' (' + d.horaInicio.substring(0,5) + ' - ' + d.horaFin.substring(0,5) + ')').join(', ') || 'Sin horarios';
    return { id: p.idPlantilla, nombre: p.codigoPlantilla + ': ' + resumen };
  });
  const opcionesAulas = aulas.map(a => ({ id: a.idAula, nombre: a.codigoAula + ' - ' + (a.edificio || 'Edificio') + ' (Cap. ' + a.capacidad + ')' }));

  return (
    <>
      <div className="w-full max-w-7xl pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
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

            <form onSubmit={handlePreSubmit} className="space-y-10">
              
              <div className="bg-white p-7 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-black rounded-l-2xl"></div>
                <h3 className={sectionTitleClassName}>1. Parámetros Base</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className={labelClassName}>Ciclo Lectivo Operativo</label>
                    <input
                      type="text"
                      value={cicloOperativo ? (cicloOperativo.codigoCiclo + ' (' + cicloOperativo.estadoCiclo + ')') : 'Cargando ciclo operativo...'}
                      readOnly
                      className={readonlyClassName}
                    />
                  </div>

                  <div>
                    <SelectBuscador
                      label="Sede Regional"
                      value={formData.idSede}
                      onChange={(val) => handleSelectChange('idSede', val)}
                      options={opcionesSedes}
                      placeholder="-- Seleccione Sede --"
                      searchPlaceholder="Buscar sede..."
                      disabled={isLoadingCatalogos || estaSedeBloqueada}
                    />
                    {estaSedeBloqueada && (
                      <p className="text-[10px] mt-1.5 text-gray-500 font-medium ml-1">
                        <span className="text-[#0f3b6c] font-bold">&bull; Sede asignada:</span> {usuarioContext.nombreSede} ({usuarioContext.nombreCargo})
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <SelectBuscador
                      label="Pensum / Carrera"
                      loading={isLoadingCascada.carreras}
                      value={formData.idCarrera}
                      onChange={(val) => handleSelectChange('idCarrera', val)}
                      options={opcionesCarreras}
                      placeholder={formData.idSede ? (carreras.length === 0 ? '-- Sin carreras registradas --' : '-- Seleccione Carrera --') : '-- Elija una sede primero --'}
                      searchPlaceholder="Buscar carrera o pensum..."
                      disabled={carreras.length === 0}
                    />
                  </div>
                </div>
              </div>

              <div className={'transition-opacity duration-300 ' + (c1 < 3 ? 'opacity-40 pointer-events-none' : 'opacity-100')}>
                <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> 2. Asignación Académica</h3>
                <div className="grid grid-cols-1 gap-y-5">
                  <SelectBuscador
                    label="Materia a Impartir"
                    loading={isLoadingCascada.materias}
                    value={formData.idMateria}
                    onChange={(val) => handleSelectChange('idMateria', val)}
                    options={opcionesMaterias}
                    placeholder={materias.length === 0 ? '-- Elija una carrera primero --' : '-- Seleccione Materia --'}
                    searchPlaceholder="Buscar por código, ciclo o nombre de materia..."
                    disabled={materias.length === 0}
                  />

                  <SelectBuscador
                    label="Docente Asignado"
                    loading={isLoadingCascada.docentes}
                    value={formData.idDocente}
                    onChange={(val) => handleSelectChange('idDocente', val)}
                    options={opcionesDocentes}
                    placeholder={formData.idSede ? (docentes.length === 0 ? '-- Sin docentes disponibles --' : '-- Seleccione Docente --') : '-- Elija una sede primero --'}
                    searchPlaceholder="Buscar docente por nombre o tipo de contrato..."
                    disabled={docentes.length === 0}
                  />
                </div>
              </div>

              <div className={'transition-opacity duration-300 ' + (c2 < 2 ? 'opacity-40 pointer-events-none' : 'opacity-100')}>
                <h3 className={sectionTitleClassName}><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> 3. Horarios y Espacio Físico/Virtual</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-5 mb-5">
                  <div className="md:col-span-5">
                    <SelectBuscador
                      label="Modalidad de la Sección"
                      value={formData.idModalidad}
                      onChange={(val) => handleSelectChange('idModalidad', val)}
                      options={opcionesModalidades}
                      placeholder="-- Seleccione --"
                      searchPlaceholder="Buscar modalidad..."
                    />
                  </div>
                  <div className="md:col-span-7">
                    <SelectBuscador
                      label="Plantilla Horaria"
                      value={formData.idPlantilla}
                      onChange={(val) => handleSelectChange('idPlantilla', val)}
                      options={opcionesPlantillas}
                      placeholder="-- Seleccione Plantilla --"
                      searchPlaceholder="Buscar grupo o día (ej. Lunes, Grupo A)..."
                    />
                  </div>
                </div>

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
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div className="md:col-span-8">
                          <SelectBuscador
                            label="Aula Física Asignada"
                            loading={isLoadingCascada.aulas}
                            value={formData.idAula}
                            onChange={(val) => handleSelectChange('idAula', val)}
                            options={opcionesAulas}
                            placeholder={formData.idSede ? (aulas.length === 0 ? '-- Sin aulas --' : '-- Seleccione Aula --') : '-- Elija una sede --'}
                            searchPlaceholder="Buscar aula o edificio..."
                            disabled={aulas.length === 0}
                          />
                        </div>
                        <div className="md:col-span-4">
                          <label className={labelClassName}>Aforo / Cupo Automático</label>
                          <input type="text" value={cupoCalculado} disabled className={inputClassName + ' font-bold text-center text-gray-700 bg-gray-100/50'} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button type="submit" disabled={isLoading || !isReady} className="bg-black text-white px-8 py-3.5 rounded-[14px] text-[15px] font-semibold hover:shadow-lg hover:shadow-black/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                  <span>Confirmar y Aperturar</span>
                </button>
              </div>
            </form>
          </div>

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
                <h4 className={'text-base font-bold leading-tight ' + (formData.idMateria ? 'text-gray-900' : 'text-gray-400')}>
                  {formData.idMateria ? getMateriaOpt()?.nombreMateria : 'Materia no asignada'}
                </h4>
                <p className="text-[12px] text-gray-500 mt-1 font-medium">
                  {formData.idDocente ? obtenerNombreCompletoDocente() : 'Docente pendiente'}
                </p>
              </div>

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
                <div className="flex justify-between items-center text-sm"><span className="text-gray-400">{esVirtual ? 'Enlace Virtual' : 'Aula'}</span><span className="font-semibold text-gray-900 text-right w-1/2 truncate">{esVirtual ? 'Plataforma Virtual' : (getAulaOpt()?.codigoAula || '---')}</span></div>
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

        {seccionesAperturadas.length > 0 && (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/40 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-widest flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Secciones Aperturadas Hoy
                  <span className="bg-gray-200/80 text-gray-800 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                    {seccionesAperturadas.length} {seccionesAperturadas.length === 1 ? 'Sección' : 'Secciones'}
                  </span>
                </h3>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Sección & Ciclo</th>
                      <th className="px-5 py-3.5">Asignatura & Carrera</th>
                      <th className="px-5 py-3.5">Docente & Sede</th>
                      <th className="px-5 py-3.5">Horarios Asignados</th>
                      <th className="px-5 py-3.5">Modalidad & Aula</th>
                      <th className="px-5 py-3.5 text-center">Cupo</th>
                      <th className="px-5 py-3.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {seccionesAperturadas.map((sec, idx) => {
                      const esModVirtual = sec.modalidad === 'Virtual';
                      return (
                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-4 align-top whitespace-nowrap">
                            <p className="font-extrabold text-gray-900 text-sm">
                              {sec.codigoGrupo}
                            </p>
                            <p className="text-[11px] font-medium text-gray-400 mt-0.5">
                              Ciclo {sec.codigoCiclo}
                            </p>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <p className="font-bold text-gray-900 leading-snug">
                              {sec.materia}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {sec.codigoMateria && (
                                <span className="text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {sec.codigoMateria}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-500">
                                {sec.carrera}
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <p className="font-semibold text-gray-800 leading-snug">
                              {sec.docente}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {sec.sede}
                            </p>
                          </td>

                          <td className="px-5 py-4 align-top whitespace-nowrap">
                            {Array.isArray(sec.horarios) && sec.horarios.length > 0 ? (
                              <div className="space-y-1">
                                {sec.horarios.map((h, i) => (
                                  <div key={i} className="text-xs text-gray-700 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                                    <span className="font-semibold">{h.dia}:</span>
                                    <span className="text-gray-500">
                                      {String(h.horaInicio || '').substring(0, 5)} - {String(h.horaFin || '').substring(0, 5)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Sin horarios</span>
                            )}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <span className={'inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ' + (
                              esModVirtual ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                            )}>
                              {sec.modalidad}
                            </span>
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-[180px]" title={sec.espacio}>
                              {sec.espacio}
                            </p>
                          </td>

                          <td className="px-5 py-4 align-top text-center whitespace-nowrap">
                            <span className="inline-block bg-gray-100 text-gray-800 font-bold text-xs px-2.5 py-1 rounded-lg">
                              {sec.cupo} alumnos
                            </span>
                          </td>

                          <td className="px-5 py-4 align-top text-center whitespace-nowrap">
                            <span className="inline-block bg-green-50 text-[#15803d] border border-green-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {sec.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalConfirmar && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => !isLoading && setModalConfirmar(false)}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-green-50 text-[#2E7D32] flex items-center justify-center flex-shrink-0 border border-green-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">
                      ¿Confirmar apertura de sección?
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Verifica los datos antes de registrar la oferta académica.
                    </p>
                  </div>
                </div>
                <span className="bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                  {codigoGenerado}
                </span>
              </div>

              <div className="bg-[#F8FAFC] border border-gray-200/80 rounded-xl p-4 space-y-3 text-xs my-6">
                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Ciclo Destino</span>
                  <span className="font-bold text-gray-900 text-right">
                    {cicloOperativo ? (cicloOperativo.codigoCiclo + ' (' + cicloOperativo.estadoCiclo + ')') : '---'}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Materia</span>
                  <span className="font-bold text-gray-900 text-right">{getMateriaOpt()?.nombreMateria || '---'}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Carrera</span>
                  <span className="font-medium text-gray-700 text-right">{getCarreraOpt()?.nombreCarrera || '---'}</span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Docente</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {obtenerNombreCompletoDocente()}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Sede & Modalidad</span>
                  <span className="font-medium text-gray-700 text-right">
                    {(getSedeOpt()?.nombre || '---') + ' • ' + (getModalidadOpt()?.nombre || '---')}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b border-gray-200/60 pb-2.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">{esVirtual ? 'Enlace Virtual' : 'Aula'}</span>
                  <span className="font-medium text-gray-700 text-right truncate max-w-[240px]">
                    {esVirtual ? formData.enlaceVirtual : ((getAulaOpt()?.codigoAula || '---') + ' (' + (getAulaOpt()?.edificio || 'Edificio') + ')')}
                  </span>
                </div>

                <div className="flex justify-between items-center gap-4 pt-0.5">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Cupo Máximo</span>
                  <span className="bg-green-50 text-[#2E7D32] border border-green-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                    {cupoCalculado} alumnos
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalConfirmar(false)}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Revisar Datos
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarApertura}
                  disabled={isLoading}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? 'Procesando...' : 'Sí, Aperturar Sección'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AperturaSeccion;