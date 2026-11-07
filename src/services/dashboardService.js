
import apiInterceptor from './apiInterceptor';

export const dashboardService = {

  // Obtener métricas del dashboard por ciclo y sede
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

    return await response.json();
  },

  // Obtener catálogo de ciclos académicos
  obtenerCiclosDisponibles: async () => {
    const response = await apiInterceptor('/api/v1/ciclos');

    if (!response.ok) {
      throw new Error('Error al cargar el catálogo de ciclos');
    }

    return await response.json();
  },

  // Obtener catálogo de sedes
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
