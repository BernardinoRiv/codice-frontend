import apiInterceptor from './apiInterceptor';

export const dashboardService = {
  obtenerMetricasGerenciales: async (codigoCiclo) => {
    const params = new URLSearchParams({ codigoCiclo });
    const response = await apiInterceptor(`/api/v1/dashboard/metricas/ciclo-activo?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensaje || 'Error al obtener las métricas del dashboard');
    }
    
    return await response.json();
  }
};
