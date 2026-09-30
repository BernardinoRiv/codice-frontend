# Codice Frontend - Sistema de Registro Académico (SRA)

Interfaz de usuario desarrollada en React para la gestión del Sistema de Registro Académico de la Universidad Modular Abierta (UMA), diseñado por la firma Codice.

## Tecnologías Principales
* **Framework:** React 18
* **Build Tool:** Vite
* **Enrutamiento:** React Router DOM v6
* **Estilos:** Tailwind CSS
* **Animaciones:** Framer Motion
* **Notificaciones:** Sonner
* **HTTP Client:** Fetch API con interceptor global

## Características Implementadas

### 1. Autenticación y Seguridad
* **Login institucional:** Interfaz de autenticación con validación de credenciales
* **Forzar cambio de contraseña:** Flujo obligatorio para primer acceso
* **Manejo de sesiones:** Detección automática de expiración de token
* **Bloqueo de cuenta:** Visualización de mensajes cuando la cuenta está bloqueada por intentos fallidos
* **Logout seguro:** Cierre de sesión con limpieza de almacenamiento local

### 2. Interceptor Global de Peticiones
* **Inyección automática de token:** Todas las peticiones incluyen automáticamente el JWT
* **Manejo de errores 401:** Redirección automática al login cuando la sesión es invalidada desde el backend
* **Prevención de redirecciones múltiples:** Control de estado para evitar bucles de redirección

### 3. Dashboard y Navegación
* **Layout principal:** Estructura responsive con sidebar colapsable
* **Menú dinámico:** Navegación basada en roles de usuario (DOCENTE, ESTUDIANTE, ADMINISTRADOR, FINANZAS, REGISTRO_ACADEMICO)
* **Detección de dispositivo móvil:** Adaptación automática de la interfaz
* **Información de usuario:** Visualización de nombre, rol e iniciales en sidebar
* **Renderizado jerárquico:** Controlador centralizado en la vista de inicio que evalúa múltiples roles del usuario y renderiza dinámicamente el panel correspondiente al cargo.

### 4. Gestión Académica - Docentes
* **Ingreso de notas:** Interfaz para captura individual de calificaciones
* **Carga masiva:** Soporte para importación de notas mediante Excel
* **Consulta de grupos:** Listado de grupos asignados al docente
* **Visualización de estudiantes:** Acceso al récord académico por grupo

### 5. Gestión de Usuarios
* **Registro de docentes:** Formulario completo con validaciones, stepper visual y vista previa en tiempo real
* **Directorio de docentes:** Listado centralizado para la consulta de perfiles y datos de contacto del personal académico.
* **Registro de empleados:** Formulario para personal administrativo con áreas y cargos
* **Validaciones:** Restricción de edad mínima (18 años), máscara para DUI, campos obligatorios

### 6. Estudiantes
* **Consulta de notas:** Visualización de calificaciones por período académico
* **Historial académico:** Acceso a récord de calificaciones

### 7. Configuración y Seguridad
* **Ajustes de usuario:** Sección de configuración personal
* **Historial de sesiones:** Visualización de dispositivos e IPs de acceso
* **Gestión de sesiones activas:** Cierre de sesión individual o todas las sesiones desde cualquier dispositivo
* **Detección de anomalías:** Visualización de accesos desde dispositivos o IPs no habituales

## Estructura del Proyecto

```
src/
├── assets/              # Imágenes y recursos estáticos
├── components/          # Componentes reutilizables
│   └── DashboardLayout.jsx    # Layout principal con navegación
├── config/              # Configuraciones globales
│   └── menuConfig.jsx         # Definición de menú por roles
├── pages/               # Vistas principales
│   ├── academico/       # Tareas de gestión y administración
│   │   └── AperturaSeccion.jsx
│   ├── auth/            # Autenticación
│   │   ├── ForzarPassword.jsx
│   │   └── Login.jsx
│   ├── docentes/        # Módulo docentes
│   │   ├── IngresoNotas.jsx
│   │   ├── ListaDocentes.jsx
│   │   └── RegistroDocente.jsx
│   ├── empleados/       # Módulo empleados
│   │   └── RegistroEmpleado.jsx
│   ├── estudiantes/     # Módulo estudiantes
│   │   └── ConsultaNotas.jsx
│   ├── inicio/          # Módulo de Dashboards por Rol
│   │   ├── Inicio.jsx                 # Controlador jerárquico maestro
│   │   ├── InicioAdministrador.jsx
│   │   ├── InicioDocente.jsx
│   │   ├── InicioEmpleado.jsx
│   │   ├── InicioEstudiante.jsx
│   │   └── InicioFinanzas.jsx
│   └── perfil/          # Configuración de cuenta de usuario
│       └── Ajustes.jsx
├── services/            # Servicios y utilidades HTTP
│   └── apiInterceptor.js      # Interceptor global de peticiones
├── utils/               # Utilidades generales
│   └── fetchInterceptor.js    # Interceptor de bajo nivel
├── App.jsx              # Componente raíz y enrutamiento
├── main.jsx             # Punto de entrada
└── index.css            # Estilos globales
```

## Características Técnicas

### Interceptor Global
El sistema implementa un interceptor global que sobrescribe `window.fetch` para:
- Inyectar automáticamente el token JWT en todas las peticiones a la API
- Manejar respuestas 401 cerrando sesión y redirigiendo al login
- Prevenir múltiples redirecciones simultáneas

### Manejo de Estado
- **LocalStorage:** Almacenamiento de token, nombre de usuario, rol e ID de sesión actual
- **Estado de sesión:** Control de sesiones activas y cierre remoto desde otros dispositivos

### Validaciones de Formulario
- Validación en tiempo real de campos obligatorios
- Máscaras de entrada para documentos (DUI con formato XXXXXXXX-X)
- Restricción de fechas (mínimo 18 años para registro)
- Stepper visual con validación por secciones

### Responsive Design
- Sidebar colapsable en desktop
- Menú hamburguesa en móvil
- Adaptación automática de tablas y formularios
- Detección de viewport con `window.innerWidth`

## Requisitos Previos
* Node.js 18+
* npm o yarn

## Instalación y Ejecución

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno en `.env`:
```
VITE_API_URL=http://localhost:8080/api/v1
```

3. Ejecutar en modo desarrollo:
```bash
npm run dev
```

4. Construir para producción:
```bash
npm run build
```

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| VITE_API_URL | URL base de la API backend | http://localhost:8080/api/v1 |

## Roles de Usuario Soportados

* **DOCENTE:** Acceso a ingreso de notas, registro de docentes, consulta de grupos
* **ESTUDIANTE:** Consulta de calificaciones, visualización de historial académico
* **ADMINISTRADOR:** Acceso completo a registros de docentes y empleados
* **FINANZAS:** Gestión de pagos y aranceles (pendiente de implementación)
* **REGISTRO_ACADEMICO:** Gestión de matrículas y expedientes (pendiente de implementación)

## Próximas Implementaciones

* Visualización de asistencias por grupo
* Panel de finanzas para gestión de pagos
* Módulo de reportes académicos
* Modo oscuro

## Equipo de Desarrollo

Firma Codice - Desarrollo de software a medida para instituciones educativas.

---

**Nota:** Este README documenta las funcionalidades implementadas hasta la fecha. El desarrollador frontend a cargo puede ampliar la información técnica, agregar detalles de componentes específicos y actualizar las secciones pendientes.