
import apiInterceptor from './apiInterceptor';

export const dashboardService = {

  // Métricas generales por ciclo y sede
  obtenerMetricasGerenciales: async (codigoCiclo, idSede) => {
    const params = new URLSearchParams();

    if (codigoCiclo) {
      params.append('codigoCiclo', codigoCiclo);
    }

    if (idSede !== null && idSede !== undefined && idSede !== '') {
      params.append('idSede', String(idSede));
    }

    const response = await apiInterceptor(
      `/api/v1/dashboard/metricas/ciclo-activo?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.mensaje ||
        errorData.message ||
        'Error al obtener las métricas del dashboard'
      );
    }

    return response.json();
  },

  // Métricas de docentes
  obtenerMetricasDocentes: async (codigoCiclo, idSede) => {
    const params = new URLSearchParams();

    if (codigoCiclo) {
      params.append('codigoCiclo', codigoCiclo);
    }

    if (idSede !== null && idSede !== undefined && idSede !== '') {
      params.append('idSede', String(idSede));
    }

    const response = await apiInterceptor(
      `/api/v1/dashboard/metricas/docentes?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.mensaje ||
        errorData.message ||
        'Error al obtener las métricas de docentes'
      );
    }

    return response.json();
  },

  // Métricas de secciones
  obtenerMetricasSecciones: async (codigoCiclo, idSede) => {
    const params = new URLSearchParams();

    if (codigoCiclo) {
      params.append('codigoCiclo', codigoCiclo);
    }

    if (idSede !== null && idSede !== undefined && idSede !== '') {
      params.append('idSede', String(idSede));
    }

    const response = await apiInterceptor(
      `/api/v1/dashboard/metricas/secciones?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.mensaje ||
        errorData.message ||
        'Error al obtener las métricas de secciones'
      );
    }

    return response.json();
  },

  // Las siete secciones del dashboard financiero
  obtenerMetricasCobros: async (codigoCiclo, idSede) => {
    const params = new URLSearchParams();

    if (codigoCiclo) {
      params.append('codigoCiclo', codigoCiclo);
    }

    if (idSede !== null && idSede !== undefined && idSede !== '') {
      params.append('idSede', String(idSede));
    }

    const response = await apiInterceptor(
      `/api/v1/dashboard/metricas/cobros?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.mensaje ||
        errorData.message ||
        'No fue posible obtener las métricas de cobros.'
      );
    }

    return response.json();
  },

  // Catálogo de ciclos académicos
  obtenerCiclosDisponibles: async () => {
    const response = await apiInterceptor('/api/v1/ciclos');

    if (!response.ok) {
      throw new Error('Error al cargar el catálogo de ciclos');
    }

    return response.json();
  },

  // Catálogo de sedes
  obtenerSedesDisponibles: async () => {
    const response = await apiInterceptor(
      '/api/v1/catalogos?nombres=sedes'
    );

    if (!response.ok) {
      throw new Error('Error al cargar las sedes');
    }

    const data = await response.json();

    return data.sedes || [];
  }

};
