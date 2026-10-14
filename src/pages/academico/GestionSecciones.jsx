import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
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
    <div ref={containerRef} className={`relative ${open ? 'z-40' : 'z-10'}`}>
      {label && (
        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
          {label}
          {loading && <span className="animate-pulse text-blue-500 normal-case ml-1">(...)</span>}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) setSearch('');
          }
        }}
        className="w-full bg-[#F8FAFC] text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-between text-left gap-3"
      >
        <span className={`truncate ${seleccionado ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {seleccionado ? seleccionado.nombre : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
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
                  title={search ? "Limpiar búsqueda" : "Limpiar selección"}
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
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center justify-between gap-3 ${
                      activo ? 'bg-gray-900 text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
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

const GestionSecciones = ({ idCicloProp }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [cicloMeta, setCicloMeta] = useState({
    idCiclo: null,
    codigoCiclo: '---',
    estadoCiclo: 'PLANIFICACIÓN',
    fechaInicio: null,
    fechaFin: null
  });

  const [secciones, setSecciones] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroCarrera, setFiltroCarrera] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const cacheCatalogosSede = useRef({ docentes: {}, aulas: {} });

  const [modalEditar, setModalEditar] = useState({
    open: false,
    seccion: null
  });
  const [docentesSede, setDocentesSede] = useState([]);
  const [aulasSede, setAulasSede] = useState([]);
  const [loadingCatalogosEdit, setLoadingCatalogosEdit] = useState(false);

  const [formEdit, setFormEdit] = useState({
    idDocente: '',
    idAula: '',
    enlaceVirtual: '',
    cupoMaximo: 0
  });

  const [modalEliminar, setModalEliminar] = useState({
    open: false,
    seccion: null
  });

  const cargarSecciones = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      let idObjetivo = idCicloProp || location.state?.idCiclo || cicloMeta.idCiclo;
      let infoCiclo = location.state || null;

      const [resPlan, resOp] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/en-planificacion`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/v1/ciclos/operativo-oferta`, { headers })
      ]);

      const listaPlan = resPlan.ok ? await resPlan.json() : [];
      const cicloOp = resOp.ok ? await resOp.json() : null;

      if (idObjetivo && Array.isArray(listaPlan)) {
        const encontrado = listaPlan.find(c => Number(c.idCiclo) === Number(idObjetivo));
        if (encontrado) infoCiclo = encontrado;
      }

      if (!idObjetivo) {
        if (Array.isArray(listaPlan) && listaPlan.length > 0) {
          idObjetivo = listaPlan[0].idCiclo;
          infoCiclo = listaPlan[0];
        } else if (cicloOp?.idCiclo) {
          idObjetivo = cicloOp.idCiclo;
          infoCiclo = cicloOp;
        }
      }

      if (!idObjetivo) {
        setSecciones([]);
        setIsLoading(false);
        return;
      }

      const resGrupos = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/por-ciclo/${idObjetivo}`, { headers });
      if (!resGrupos.ok) throw new Error(`HTTP ${resGrupos.status}`);

      const dataSecciones = await resGrupos.json();
      setSecciones(Array.isArray(dataSecciones) ? dataSecciones : []);

      setCicloMeta({
        idCiclo: Number(idObjetivo),
        codigoCiclo: infoCiclo?.codigoCiclo || cicloOp?.codigoCiclo || '---',
        estadoCiclo: (infoCiclo?.estadoCiclo || cicloOp?.estadoCiclo || 'PLANIFICACIÓN').toString().trim().toUpperCase(),
        fechaInicio: infoCiclo?.fechaInicio || cicloOp?.fechaInicio || null,
        fechaFin: infoCiclo?.fechaFin || cicloOp?.fechaFin || null
      });
    } catch (err) {
      toast.error(`Fallo al consultar secciones: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarSecciones();
  }, [idCicloProp, location.state?.idCiclo]);

  const kpis = useMemo(() => {
    const mapaCarreras = {};
    let aforoTotal = 0;

    secciones.forEach(s => {
      aforoTotal += (s.cupoMaximo || 0);
      const cName = s.nombreCarrera || s.carrera || 'Carrera General';
      mapaCarreras[cName] = (mapaCarreras[cName] || 0) + 1;
    });

    return {
      totalSecciones: secciones.length,
      aforoTotal,
      totalCarreras: Object.keys(mapaCarreras).length,
      mapaCarreras
    };
  }, [secciones]);

  const seccionesFiltradas = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    const carrera = filtroCarrera.trim().toLowerCase();

    return secciones.filter(s => {
      const cName = (s.nombreCarrera || s.carrera || 'Carrera General').toLowerCase();
      const materia = (s.nombreMateria || '').toLowerCase();
      const codMateria = (s.codigoMateria || '').toLowerCase();
      const codGrupo = (s.codigoGrupo || '').toLowerCase();
      const docente = (s.nombreDocente || '').toLowerCase();

      const matchCarrera = !carrera || cName === carrera;
      const matchTexto = !texto || (
        materia.includes(texto) ||
        codMateria.includes(texto) ||
        codGrupo.includes(texto) ||
        docente.includes(texto)
      );

      return matchCarrera && matchTexto;
    });
  }, [secciones, filtroTexto, filtroCarrera]);

  const abrirModalEdicionSeccion = async (seccion) => {
    const esVirtual = (seccion.modalidad || '').toUpperCase().includes('VIRTUAL');

    setModalEditar({ open: true, seccion });
    setFormEdit({
      idDocente: seccion.idDocente ? String(seccion.idDocente) : '',
      idAula: seccion.idAula ? String(seccion.idAula) : '',
      enlaceVirtual: esVirtual && seccion.aulaOEnlace && seccion.aulaOEnlace !== 'N/A' ? seccion.aulaOEnlace : '',
      cupoMaximo: seccion.cupoMaximo || 0
    });

    const idSede = seccion.idSede;
    setLoadingCatalogosEdit(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      let listaDocentes = cacheCatalogosSede.current.docentes[idSede];
      if (!listaDocentes) {
        const resDoc = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/catalogos/docentes?idSede=${idSede}`, { headers });
        listaDocentes = resDoc.ok ? await resDoc.json() : [];
        cacheCatalogosSede.current.docentes[idSede] = listaDocentes;
      }
      setDocentesSede(listaDocentes);

      if (!esVirtual) {
        let listaAulas = cacheCatalogosSede.current.aulas[idSede];
        if (!listaAulas) {
          const resAul = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/catalogos/aulas?idSede=${idSede}`, { headers });
          listaAulas = resAul.ok ? await resAul.json() : [];
          cacheCatalogosSede.current.aulas[idSede] = listaAulas;
        }
        setAulasSede(listaAulas);

        const aulaCoincidente = listaAulas.find(a => a.codigoAula === seccion.aulaOEnlace || String(a.idAula) === String(seccion.idAula));
        if (aulaCoincidente) {
          setFormEdit(prev => ({ ...prev, idAula: String(aulaCoincidente.idAula) }));
        }
      }
    } catch (err) {
      toast.error('Error al cargar catálogos de la sede');
    } finally {
      setLoadingCatalogosEdit(false);
    }
  };

  const ejecutarEdicionSeccion = async (e) => {
    e.preventDefault();
    const seccion = modalEditar.seccion;
    if (!seccion) return;

    const esVirtual = (seccion.modalidad || '').toUpperCase().includes('VIRTUAL');
    const cupo = parseInt(formEdit.cupoMaximo, 10);

    if (!formEdit.idDocente || isNaN(cupo) || cupo <= 0) {
      toast.error('Validación: Verifique que el docente y el cupo sean válidos.');
      return;
    }

    if (!esVirtual && !formEdit.idAula) {
      toast.error('Validación: Seleccione un aula física.');
      return;
    }

    if (esVirtual && !formEdit.enlaceVirtual.trim()) {
      toast.error('Validación: Ingrese el enlace de conexión virtual.');
      return;
    }

    const payload = {
      idDocente: parseInt(formEdit.idDocente, 10),
      idAula: esVirtual ? null : parseInt(formEdit.idAula, 10),
      enlaceVirtual: esVirtual ? formEdit.enlaceVirtual.trim() : null,
      cupoMaximo: cupo
    };

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/${seccion.idGrupo}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalEditar({ open: false, seccion: null });
        toast.success(`Sección ${seccion.codigoGrupo} actualizada con éxito.`);
        await cargarSecciones();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.mensaje || `Fallo en actualización (HTTP ${res.status})`);
      }
    } catch (err) {
      toast.error('Error de comunicación: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const ejecutarEliminacionSeccion = async () => {
    const seccion = modalEliminar.seccion;
    if (!seccion) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/grupos/${seccion.idGrupo}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 204 || res.ok) {
        setModalEliminar({ open: false, seccion: null });
        toast.success(`Sección ${seccion.codigoGrupo} eliminada satisfactoriamente.`);
        await cargarSecciones();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.mensaje || `Error al eliminar la sección (HTTP ${res.status})`);
      }
    } catch (err) {
      toast.error('Error de comunicación al eliminar sección: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportarOfertaPdfActual = () => {
    if (seccionesFiltradas.length === 0) {
      toast.warning('No hay secciones en pantalla para exportar.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Habilita las ventanas emergentes para exportar el informe PDF.');
      return;
    }

    const filasHtml = seccionesFiltradas.map((s, idx) => {
      const franjas = (s.horarios && s.horarios.length > 0)
        ? s.horarios.map(h => `${h.dia}: ${h.horaInicio.substring(0, 5)} - ${h.horaFin.substring(0, 5)}`).join('<br>')
        : 'Sin horarios';

      return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td><strong>${s.codigoGrupo}</strong></td>
          <td>${s.nombreCarrera || s.carrera || 'Carrera Oficial'}</td>
          <td><strong>${s.nombreMateria}</strong><br><small style="color: #64748b;">${s.codigoMateria}</small></td>
          <td>${s.nombreDocente}</td>
          <td>${s.nombreSede}</td>
          <td>${s.modalidad}<br><small style="color: #64748b;">${s.aulaOEnlace || 'N/A'}</small></td>
          <td style="font-size: 8.5pt;">${franjas}</td>
          <td style="text-align: center; font-weight: bold;">${s.cupoMaximo}</td>
          <td>${s.estadoGrupo}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Oferta Académica - Ciclo ${cicloMeta.codigoCiclo}</title>
          <style>
            @page { size: landscape; margin: 14mm; }
            body { font-family: system-ui, -apple-system, sans-serif; font-size: 9pt; color: #0f172a; margin: 0; padding: 16px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f3b6c; padding-bottom: 10px; margin-bottom: 16px; }
            .header h1 { font-size: 14pt; color: #0f3b6c; margin: 0; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
            th { background: #0f3b6c; color: #ffffff; padding: 8px; text-align: left; text-transform: uppercase; }
            td { border-bottom: 1px solid #cbd5e1; padding: 7px; vertical-align: top; }
            .no-print { background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <span>Vista previa de impresión — Ciclo ${cicloMeta.codigoCiclo}</span>
            <button onclick="window.print()" style="background:#0f3b6c;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:bold;">Imprimir / Guardar PDF</button>
          </div>
          <div class="header">
            <div>
              <h1>Universidad Modular Abierta</h1>
              <p style="margin:4px 0 0;color:#64748b;">Matriz Consolidada de Secciones — Ciclo ${cicloMeta.codigoCiclo} (${cicloMeta.estadoCiclo})</p>
            </div>
            <div style="text-align:right;font-size:8.5pt;color:#64748b;">
              Total Secciones: <strong>${seccionesFiltradas.length}</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Carrera</th>
                <th>Asignatura</th>
                <th>Catedrático</th>
                <th>Sede</th>
                <th>Modalidad / Espacio</th>
                <th>Horarios</th>
                <th>Cupo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>${filasHtml}</tbody>
          </table>
        </body>
      </html>
    `);
  };

  const opcionesFiltroCarreras = Object.entries(kpis.mapaCarreras).map(([nombre, cant]) => ({
    id: nombre,
    nombre: `${nombre} (${cant})`
  }));

  const opcionesDocentesModal = docentesSede.map(d => ({
    id: d.idDocente,
    nombre: d.label || d.labelVisual || `${d.nombres} ${d.apellidos}`
  }));

  const opcionesAulasModal = aulasSede.map(a => ({
    id: a.idAula,
    nombre: `${a.codigoAula} - ${a.edificio || 'Edificio'} (Capacidad: ${a.capacidad})`
  }));

  const estadoNormalizado = cicloMeta.estadoCiclo;
  const esPlanificado = estadoNormalizado === 'PLANIFICADO';
  const esActivo = estadoNormalizado === 'ACTIVO';

  return (
    <>
      <div className="w-full pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <button
                type="button"
                onClick={() => navigate('/dashboard/ciclos-planificacion')}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
              >
                &larr; Volver a Ciclos
              </button>

              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                Oferta Académica &mdash; Ciclo <span>{cicloMeta.codigoCiclo}</span>
              </h1>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                esActivo
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : esPlanificado
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  esActivo ? 'bg-green-600' : esPlanificado ? 'bg-indigo-600' : 'bg-amber-500'
                }`}></span>
                {estadoNormalizado}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Administración de secciones creadas para dictamen institucional.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportarOfertaPdfActual}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Informe (PDF)
            </button>

            <button
              type="button"
              onClick={() => navigate('/dashboard/oferta-academica')}
              className="bg-black text-white hover:bg-gray-800 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
            >
              + Aperturar Nueva Sección
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Secciones Aperturadas
            </span>
            <span className="text-2xl font-extrabold text-[#0f3b6c]">
              {kpis.totalSecciones}
            </span>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Capacidad de Alumnos Proyectada
            </span>
            <span className="text-2xl font-extrabold text-[#15803d]">
              {kpis.aforoTotal}
            </span>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Carreras Involucradas
            </span>
            <span className="text-2xl font-extrabold text-blue-600">
              {kpis.totalCarreras}
            </span>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Vigencia Oficial
            </span>
            <span className="text-sm font-bold text-gray-900 mt-1.5">
              {cicloMeta.fechaInicio && cicloMeta.fechaFin
                ? `${cicloMeta.fechaInicio} al ${cicloMeta.fechaFin}`
                : 'Vigencia por definir'}
            </span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 flex flex-wrap items-center gap-2.5 shadow-sm">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Conteo por Carrera:
          </span>
          <div className="flex flex-wrap gap-2 flex-1">
            {kpis.totalCarreras === 0 ? (
              <span className="text-xs text-gray-400">
                No hay secciones aperturadas para este periodo.
              </span>
            ) : (
              Object.entries(kpis.mapaCarreras).map(([nombre, cant]) => (
                <span
                  key={nombre}
                  className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold"
                >
                  {nombre}: <strong>{cant}</strong>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center shadow-sm">
          <div className="md:col-span-7 relative flex items-center">
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por código, asignatura o catedrático..."
              className="w-full bg-[#F8FAFC] text-gray-900 border border-gray-200 rounded-xl pl-10 pr-9 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
            />
            {filtroTexto && (
              <button
                type="button"
                onClick={() => setFiltroTexto('')}
                className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="md:col-span-5">
            <SelectBuscador
              value={filtroCarrera}
              onChange={(val) => setFiltroCarrera(val)}
              options={opcionesFiltroCarreras}
              placeholder="Todas las carreras"
              searchPlaceholder="Buscar carrera..."
            />
          </div>
        </div>

        <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="p-5 border-b border-gray-100 bg-gray-50/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                Matriz Consolidada de Secciones
              </h2>
              <span className="bg-gray-200/80 text-gray-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                {seccionesFiltradas.length} Secciones
              </span>
            </div>

            <button
              type="button"
              onClick={cargarSecciones}
              disabled={isLoading}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refrescar Secciones
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                <tr>
                  <th className="px-4 py-3.5">Código</th>
                  <th className="px-4 py-3.5">Carrera</th>
                  <th className="px-4 py-3.5">Asignatura</th>
                  <th className="px-4 py-3.5">Catedrático</th>
                  <th className="px-4 py-3.5">Sede</th>
                  <th className="px-4 py-3.5">Modalidad / Espacio</th>
                  <th className="px-4 py-3.5">Horarios</th>
                  <th className="px-4 py-3.5 text-center">Cupo</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                      Consultando secciones en base de datos...
                    </td>
                  </tr>
                ) : seccionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                      No se encontraron secciones con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  seccionesFiltradas.map((s) => {
                    const carrera = s.nombreCarrera || s.carrera || 'Carrera Oficial';
                    const espacio = s.aulaOEnlace || 'N/A';

                    return (
                      <tr key={s.idGrupo} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <strong className="text-[#0f3b6c] font-extrabold">
                            {s.codigoGrupo}
                          </strong>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md text-[11px] font-bold leading-snug">
                            {carrera}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <div className="font-bold text-gray-900 leading-snug">
                            {s.nombreMateria}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                            {s.codigoMateria}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top font-medium text-gray-800">
                          {s.nombreDocente}
                        </td>

                        <td className="px-4 py-3.5 align-top text-xs text-gray-600">
                          {s.nombreSede}
                        </td>

                        <td className="px-4 py-3.5 align-top">
                          <span className="inline-block bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {s.modalidad}
                          </span>
                          <div className="text-[11px] text-gray-500 mt-1 truncate max-w-[160px]" title={espacio}>
                            {espacio}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 align-top text-xs text-gray-600 whitespace-nowrap leading-relaxed">
                          {s.horarios && s.horarios.length > 0 ? (
                            s.horarios.map((h, i) => (
                              <div key={i}>
                                {h.dia}: {h.horaInicio.substring(0, 5)} - {h.horaFin.substring(0, 5)}
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-400">Sin horarios</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 align-top text-center whitespace-nowrap">
                          <span className="inline-block bg-green-50 text-[#15803d] border border-green-200 px-2.5 py-0.5 rounded-md font-bold text-xs">
                            {s.cupoMaximo}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <span className="inline-block bg-green-50 text-[#15803d] px-2.5 py-0.5 rounded text-[11px] font-bold">
                            {s.estadoGrupo}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => abrirModalEdicionSeccion(s)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setModalEliminar({ open: true, seccion: s })}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                            >
                              Borrar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalEditar.open && modalEditar.seccion && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !isSaving && setModalEditar({ open: false, seccion: null })}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-xl p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    Editar Parámetros de Sección
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Actualiza el catedrático titular, la asignación de espacio o el aforo máximo permitido.
                  </p>
                </div>
                <span className="bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                  {modalEditar.seccion.codigoGrupo}
                </span>
              </div>

              <form onSubmit={ejecutarEdicionSeccion} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Asignatura
                    </label>
                    <input
                      type="text"
                      value={`${modalEditar.seccion.nombreMateria} (${modalEditar.seccion.codigoMateria})`}
                      readOnly
                      className="w-full bg-gray-50 text-gray-700 font-bold border border-gray-200 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Carrera
                    </label>
                    <input
                      type="text"
                      value={modalEditar.seccion.nombreCarrera || modalEditar.seccion.carrera || 'Carrera Oficial'}
                      readOnly
                      className="w-full bg-gray-50 text-gray-700 font-bold border border-gray-200 rounded-xl px-4 py-3 text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <SelectBuscador
                    label="Catedrático Titular (*)"
                    loading={loadingCatalogosEdit}
                    value={formEdit.idDocente}
                    onChange={(val) => setFormEdit(prev => ({ ...prev, idDocente: val }))}
                    options={opcionesDocentesModal}
                    placeholder="Seleccione docente..."
                    searchPlaceholder="Buscar catedrático..."
                  />
                </div>

                {(modalEditar.seccion.modalidad || '').toUpperCase().includes('VIRTUAL') ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Enlace de Conexión Virtual (*)
                      </label>
                      <input
                        type="url"
                        value={formEdit.enlaceVirtual}
                        onChange={(e) => setFormEdit(prev => ({ ...prev, enlaceVirtual: e.target.value }))}
                        placeholder="https://meet.google.com/xyz-abc-def"
                        required
                        className="w-full bg-[#F8FAFC] text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Cupo Máximo (*)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="150"
                        value={formEdit.cupoMaximo}
                        onChange={(e) => setFormEdit(prev => ({ ...prev, cupoMaximo: e.target.value }))}
                        required
                        className="w-full bg-[#F8FAFC] text-gray-900 font-bold text-center border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8">
                      <SelectBuscador
                        label="Aula Física (*)"
                        loading={loadingCatalogosEdit}
                        value={formEdit.idAula}
                        onChange={(val) => {
                          const aulaSeleccionada = aulasSede.find(a => String(a.idAula) === String(val));
                          setFormEdit(prev => ({
                            ...prev,
                            idAula: val,
                            cupoMaximo: aulaSeleccionada?.capacidad ?? prev.cupoMaximo
                          }));
                        }}
                        options={opcionesAulasModal}
                        placeholder="Seleccione aula..."
                        searchPlaceholder="Buscar aula o edificio..."
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Cupo Máximo (*)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="150"
                        value={formEdit.cupoMaximo}
                        onChange={(e) => setFormEdit(prev => ({ ...prev, cupoMaximo: e.target.value }))}
                        required
                        className="w-full bg-[#F8FAFC] text-gray-900 font-bold text-center border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:border-gray-400"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setModalEditar({ open: false, seccion: null })}
                    disabled={isSaving}
                    className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando cambios...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {modalEliminar.open && modalEliminar.seccion && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto font-sans">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => !isSaving && setModalEliminar({ open: false, seccion: null })}
          ></div>

          <div className="flex min-h-screen items-center justify-center p-4 text-center">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-gray-100 text-left my-8 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mb-4">
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>

              <h3 className="text-lg font-extrabold text-gray-900 mb-1.5">
                ¿Eliminar la sección {modalEliminar.seccion.codigoGrupo}?
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                ¿Confirmas la eliminación permanente de la sección <strong>{modalEliminar.seccion.codigoGrupo}</strong> ({modalEliminar.seccion.nombreMateria})? Se purgarán sus horarios asociados.
              </p>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setModalEliminar({ open: false, seccion: null })}
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarEliminacionSeccion}
                  disabled={isSaving}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Eliminando...' : 'Confirmar Eliminación'}
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

export default GestionSecciones;