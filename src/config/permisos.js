import { ROLES } from '../utils/sesion.js';

export const GRUPOS_RUTAS = [
  { nombre: 'Inicio', roles: [ROLES.DOCENTE, ROLES.ESTUDIANTE, ROLES.FINANZAS, ROLES.ADMINISTRADOR, ROLES.REGISTRO_ACADEMICO, ROLES.EMPLEADO], rutas: ['inicio'] },
  { nombre: 'Administración', roles: [ROLES.ADMINISTRADOR], rutas: ['registro-empleados', 'registro-docente', 'carreras', 'pensum', 'materias'] },
  { nombre: 'Directorio académico', roles: [ROLES.ADMINISTRADOR, ROLES.REGISTRO_ACADEMICO], rutas: ['directorio-docentes'] },
  { nombre: 'Gestión académica', roles: [ROLES.ADMINISTRADOR, ROLES.REGISTRO_ACADEMICO, ROLES.EMPLEADO], rutas: ['nuevo-ingreso', 'oferta-academica', 'ciclos-planificacion', 'gestion-secciones', 'directorio-estudiantes', 'directorio-estudiantes/:idEstudiante', 'directorio-empleados', 'directorio-empleados/:idEmpleado'] },
  { nombre: 'Estudiantes', roles: [ROLES.ESTUDIANTE], rutas: ['clases', 'mis-notas', 'mi-estado-cuenta', 'escanear-asistencia', 'matricula'] },
  { nombre: 'Docentes', roles: [ROLES.DOCENTE], rutas: ['notas', 'asistencias'] },
  { nombre: 'Finanzas', roles: [ROLES.FINANZAS, ROLES.ADMINISTRADOR], rutas: ['pagos', 'aranceles', 'facturas'] },
];

export const PERMISOS_RUTAS = Object.fromEntries(
  GRUPOS_RUTAS.flatMap(({ roles, rutas }) => rutas.map(path => [`/dashboard/${path}`, roles]))
);