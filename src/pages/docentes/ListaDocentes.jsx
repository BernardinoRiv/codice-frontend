import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

function ListaDocentes() {
  const [docentes, setDocentes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchDocentes = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/docentes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const data = await response.json();
      setDocentes(data);
    } catch (error) {
      toast.error('Error al cargar docentes', { description: 'Revisa tu conexión o asegúrate de que el servidor esté encendido.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocentes();
  }, []);

  const handleDarDeBaja = (idDocente) => {
    toast.info('Opción en desarrollo', { 
      description: `Próximamente se podrá desactivar al docente con ID: ${idDocente}` 
    });
  };

  const docentesFiltrados = docentes.filter(docente => {
    const busqueda = searchTerm.toLowerCase();
    const nombreCompleto = `${docente.nombres} ${docente.apellidos}`.toLowerCase();
    return (
      nombreCompleto.includes(busqueda) ||
      (docente.codigoDocente && docente.codigoDocente.toLowerCase().includes(busqueda)) ||
      (docente.correoInstitucional && docente.correoInstitucional.toLowerCase().includes(busqueda)) ||
      (docente.especialidad && docente.especialidad.toLowerCase().includes(busqueda))
    );
  });

  return (
    // SE ELIMINÓ max-w-7xl PARA QUE EXPANTA FLUIDAMENTE
    <div className="w-full pb-20 font-sans text-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-inter font-extrabold tracking-tight mb-1">Directorio de Docentes</h1>
          <p className="text-gray-500 text-sm">Gestiona y consulta la plantilla académica de la institución.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchDocentes} disabled={isLoading} className="p-2.5 text-gray-400 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-all">
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <button 
            onClick={() => navigate('/dashboard/registro-docente')} 
            className="bg-black text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nuevo Docente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        
        {/* CORRECCIÓN MÓVIL: flex-col en pantallas pequeñas, flex-row en sm en adelante */}
        <div className="p-5 border-b border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Buscar docente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-2.5 text-[13px] focus:outline-none focus:ring-4 focus:ring-gray-100 focus:border-gray-300 transition-all shadow-sm"
            />
          </div>
          <div className="text-[12px] font-bold text-gray-400 tracking-wider">
            {docentesFiltrados.length} REGISTROS
          </div>
        </div>

        {/* CORRECCIÓN DE TABLA MÓVIL: overflow-x-auto + min-w-[900px] para forzar scroll elegante */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-[13px] min-w-[950px] whitespace-nowrap">
            <thead className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
              <tr>
                <th className="px-6 py-4 font-bold">Docente</th>
                <th className="px-6 py-4 font-bold">Contacto Institucional</th>
                <th className="px-6 py-4 font-bold">Especialidad & Sede</th>
                <th className="px-6 py-4 font-bold">Contrato</th>
                <th className="px-6 py-4 font-bold text-center">Estado</th>
                <th className="px-6 py-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80">
              
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <svg className="w-8 h-8 animate-spin text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span className="text-[11px] font-bold uppercase tracking-widest">Cargando directorio...</span>
                    </div>
                  </td>
                </tr>
              ) : docentesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-8 h-8 text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                      <span className="text-[12px] font-bold uppercase tracking-widest text-gray-500">No se encontraron docentes</span>
                      <p className="text-[11px] font-normal mt-1">Intenta con otros términos de búsqueda o registra uno nuevo.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                docentesFiltrados.map((docente) => (
                  <tr key={docente.idDocente} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-black transition-colors">
                          {docente.nombres} {docente.apellidos}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {docente.codigoDocente || 'SIN CÓDIGO'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        {docente.correoInstitucional || <span className="text-gray-400 italic">Pendiente</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 font-medium truncate max-w-[200px]">{docente.especialidad || '---'}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{docente.nombreSede || '---'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200">
                        {docente.tipoContratacion || 'NO DEFINIDO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                        docente.estadoDocente === 'ACTIVO' ? 'bg-green-50 text-green-700 border-green-200' :
                        docente.estadoDocente === 'INACTIVO' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {docente.estadoDocente || 'DESCONOCIDO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón Editar (Lápiz) */}
                        <button 
                          title="Editar Docente"
                          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors p-2 rounded-lg border border-transparent hover:border-blue-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>

                        {/* Botón Dar de Baja (Icono User-Minus) */}
                        <button 
                          onClick={() => handleDarDeBaja(docente.idDocente)}
                          title="Dar de Baja (Desactivar)"
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors p-2 rounded-lg border border-transparent hover:border-red-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM17 11h6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ListaDocentes;