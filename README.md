# 🏢 TRIBUS - Sistema de Reservas de Espacios de Trabajo

**TRIBUS** es una aplicación web completa para la gestión inteligente de reservas de espacios de trabajo, salas de reuniones y puestos de trabajo colaborativo. El sistema permite a los administradores configurar áreas con capacidad limitada y a los usuarios realizar reservas eficientemente con validaciones automáticas.

## 📋 Tabla de Contenidos

- [🚀 Características Principales](#-características-principales)
- [🛠️ Stack Tecnológico](#️-stack-tecnológico)
- [📦 Instalación y Configuración](#-instalación-y-configuración)
- [🎯 Funcionalidades del Sistema](#-funcionalidades-del-sistema)
- [👥 Roles de Usuario](#-roles-de-usuario)
- [🔧 Configuración del Sistema](#-configuración-del-sistema)
- [📊 Módulos Principales](#-módulos-principales)
- [🌐 Despliegue](#-despliegue)
- [🔒 Seguridad y Validaciones](#-seguridad-y-validaciones)
- [📱 Interfaz de Usuario](#-interfaz-de-usuario)
- [🔄 Flujos de Trabajo](#-flujos-de-trabajo)
- [📈 Reportes y Analytics](#-reportes-y-analytics)
- [🛠️ Mantenimiento](#️-mantenimiento)
- [🤝 Contribución](#-contribución)

## 🚀 Características Principales

### ✨ Funcionalidades Core
- **Reservas Inteligentes**: Sistema automático de validación de disponibilidad
- **Gestión de Áreas**: Configuración flexible de espacios de trabajo
- **Control de Capacidad**: Prevención automática de sobre-reservas
- **Horarios de Oficina**: Configuración de días y horas laborales
- **Validaciones en Tiempo Real**: Verificación instantánea de conflictos
- **Exportación de Datos**: Reportes en CSV para análisis

### 🎯 Características Avanzadas
- **Plantillas de Reserva**: Creación de plantillas para reservas recurrentes
- **Reservas Recurrentes**: Configuración de reservas diarias, semanales o mensuales
- **Gestión de Usuarios**: Sistema de roles y permisos
- **Dashboard Interactivo**: Vista de disponibilidad en tiempo real
- **Notificaciones**: Alertas de confirmación y cancelación
- **Responsive Design**: Funciona perfectamente en móviles y desktop

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático para robustez
- **Tailwind CSS** - Framework de CSS utilitario
- **Lucide React** - Iconos modernos y consistentes
- **date-fns** - Manipulación avanzada de fechas
- **Context API** - Gestión de estado global

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB
- **CORS** - Configuración de seguridad
- **Helmet** - Headers de seguridad

### Infraestructura
- **Heroku** - Plataforma de despliegue
- **MongoDB Atlas** - Base de datos en la nube
- **Git** - Control de versiones
- **npm** - Gestión de dependencias

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 18.x o superior)
- npm (versión 9.x o superior)
- Git
- Cuenta en MongoDB Atlas (para producción)

### 🚀 Instalación Local

#### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/tribus-reservas-app-2024.git
cd tribus-reservas-app-2024
```

#### 2. Instalar Dependencias
```bash
npm install
```

#### 3. Configurar Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:
```env
# Desarrollo
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/tribus

# Producción
NODE_ENV=production
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/tribus
```

#### 4. Iniciar Servidores de Desarrollo
```bash
# Opción 1: Script automatizado (Recomendado)
./start-dev.sh

# Opción 2: Manual
# Terminal 1 - Backend
NODE_ENV=development PORT=3001 node server.js

# Terminal 2 - Frontend
npm start
```

#### 5. Acceder a la Aplicación
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### 🔧 Scripts Útiles
```bash
# Desarrollo
./start-dev.sh          # Iniciar servidores de desarrollo
./stop-dev.sh           # Detener servidores
npm run dev             # Solo frontend en modo desarrollo

# Producción
npm run build           # Compilar para producción
npm run start           # Iniciar servidor de producción

# Utilidades
npm run test            # Ejecutar tests
npm run lint            # Verificar código
```

## 🎯 Funcionalidades del Sistema

### 📅 Sistema de Reservas

#### Creación de Reservas
1. **Selección de Área**: Elegir entre áreas disponibles
2. **Configuración de Fecha**: Calendario con validación de días laborales
3. **Selección de Horario**: Slots disponibles según configuración
4. **Información de Contacto**: Datos del solicitante y grupo
5. **Validación Automática**: Verificación de conflictos y capacidad

#### Tipos de Reserva
- **Puestos Individuales**: Reserva de puestos específicos
- **Salas Completas**: Reserva de salas de reunión completas
- **Reservas Recurrentes**: Configuración automática de reservas periódicas

#### Estados de Reserva
- **Pendiente**: Reserva creada, esperando confirmación
- **Confirmada**: Reserva aprobada y activa
- **Cancelada**: Reserva cancelada por usuario o admin

### 🏢 Gestión de Áreas

#### Configuración de Áreas
- **Nombre y Descripción**: Identificación clara del espacio
- **Capacidad**: Número máximo de puestos/personas
- **Tipo de Área**: Puestos individuales o salas de reunión
- **Horarios Específicos**: Configuración particular por área
- **Estado**: Activa/Inactiva

#### Tipos de Área
- **Hot Desk**: Puestos de trabajo individuales
- **Sala de Reuniones**: Espacios para reuniones grupales
- **Área Colaborativa**: Espacios de trabajo compartido

### 👥 Gestión de Usuarios

#### Roles del Sistema
- **Administrador**: Acceso completo al sistema
- **Usuario**: Creación y gestión de reservas propias

#### Funcionalidades por Rol
- **Admin**: Gestión completa de usuarios, áreas y reservas
- **Usuario**: Reservas personales y plantillas propias

## 👥 Roles de Usuario

### 🔧 Administrador
**Acceso Completo al Sistema**

#### Funcionalidades Principales
- **Dashboard Administrativo**: Vista general del sistema
- **Gestión de Áreas**: Crear, editar y eliminar espacios
- **Configuración del Sistema**: Horarios, días laborales, políticas
- **Gestión de Reservas**: Ver, confirmar, cancelar todas las reservas
- **Reportes y Analytics**: Estadísticas de utilización
- **Gestión de Usuarios**: Administrar cuentas y permisos
- **Plantillas Globales**: Crear plantillas para toda la organización

#### Módulos Disponibles
1. **Dashboard**: Métricas y estadísticas generales
2. **Administración**: Configuración del sistema
3. **Gestión de Reservas**: Administración de reservas
4. **Áreas**: Gestión de espacios de trabajo
5. **Plantillas**: Plantillas globales del sistema
6. **Usuarios**: Gestión de cuentas de usuario
7. **Reportes**: Análisis y exportación de datos

### 👤 Usuario Regular
**Gestión de Reservas Personales**

#### Funcionalidades Principales
- **Disponibilidad**: Ver espacios disponibles en tiempo real
- **Crear Reservas**: Reservar puestos o salas según necesidades
- **Mis Reservas**: Gestionar reservas propias
- **Plantillas Personales**: Crear plantillas para uso personal
- **Mi Perfil**: Actualizar información personal

#### Módulos Disponibles
1. **Disponibilidad**: Vista de espacios disponibles
2. **Reservas**: Crear y gestionar reservas
3. **Mis Plantillas**: Plantillas personales
4. **Mi Perfil**: Información personal y cambio de contraseña

## 🔧 Configuración del Sistema

### ⚙️ Configuración de Administrador

#### Horarios de Oficina
```javascript
// Configuración de días laborales
officeDays: {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false
}

// Horarios de trabajo
officeHours: {
  start: '08:00',
  end: '18:00'
}
```

#### Políticas de Reserva
- **Días Máximos**: Reservas anticipadas (1-365 días)
- **Reservas Mismo Día**: Permitir/denegar reservas inmediatas
- **Aprobación Requerida**: Sistema de aprobación manual
- **Duración Mínima/Máxima**: Límites de tiempo por reserva

### 🎨 Personalización
- **Colores de Áreas**: Identificación visual por espacio
- **Mensajes Personalizados**: Notificaciones específicas
- **Configuración Regional**: Zona horaria y formato de fechas

## 📊 Módulos Principales

### 🏠 Dashboard
**Vista General del Sistema**

#### Para Administradores
- **Estadísticas Generales**: Total de reservas, áreas, usuarios
- **Utilización por Área**: Porcentaje de ocupación
- **Reservas Recientes**: Últimas reservas creadas
- **Alertas del Sistema**: Notificaciones importantes
- **Acciones Rápidas**: Enlaces directos a funciones principales

#### Para Usuarios
- **Mis Reservas Activas**: Reservas confirmadas y pendientes
- **Disponibilidad Actual**: Estado de áreas en tiempo real
- **Próximas Reservas**: Calendario de reservas futuras

### 📅 Gestión de Reservas

#### Creación de Reserva
1. **Selección de Área**
   - Lista de áreas disponibles
   - Capacidad actual y máxima
   - Indicadores visuales de disponibilidad

2. **Configuración de Fecha y Hora**
   - Calendario con días laborales marcados
   - Slots de tiempo disponibles
   - Validación de conflictos

3. **Información de Contacto**
   - Datos del solicitante
   - Información del grupo/equipo
   - Notas adicionales

4. **Confirmación**
   - Resumen de la reserva
   - Validación final
   - Confirmación del sistema

#### Gestión de Reservas (Admin)
- **Vista de Todas las Reservas**: Lista completa con filtros
- **Filtros Avanzados**: Por fecha, área, estado, usuario
- **Acciones Masivas**: Confirmar/cancelar múltiples reservas
- **Exportación**: Datos en formato CSV
- **Búsqueda**: Búsqueda por texto en todos los campos

### 🏢 Gestión de Áreas

#### Creación de Área
```javascript
{
  name: "Sala de Reuniones A",
  description: "Sala para reuniones de hasta 10 personas",
  capacity: 10,
  isMeetingRoom: true,
  isFullDayReservation: false,
  color: "#3B82F6",
  isActive: true
}
```

#### Configuración de Área
- **Información Básica**: Nombre, descripción, capacidad
- **Tipo de Reserva**: Individual o sala completa
- **Horarios Específicos**: Configuración particular
- **Estado**: Activa/Inactiva
- **Color Identificativo**: Para identificación visual

### 👥 Gestión de Usuarios

#### Creación de Usuario
```javascript
{
  name: "Juan Pérez",
  username: "juan.perez",
  email: "juan.perez@empresa.com",
  role: "user",
  isActive: true,
  createdAt: "2024-01-15T10:00:00Z"
}
```

#### Funcionalidades de Usuario
- **Perfil Personal**: Información y preferencias
- **Cambio de Contraseña**: Actualización segura
- **Historial de Reservas**: Registro de actividad
- **Plantillas Personales**: Configuraciones guardadas

### 📋 Plantillas

#### Plantillas del Sistema (Admin)
- **Plantillas Globales**: Disponibles para todos los usuarios
- **Configuración Estándar**: Datos de contacto y grupos comunes
- **Aprobación Automática**: Reservas basadas en plantillas

#### Plantillas Personales (Usuario)
- **Configuraciones Guardadas**: Datos frecuentemente usados
- **Acceso Rápido**: Creación rápida de reservas
- **Personalización**: Ajustes específicos por usuario

## 🌐 Despliegue

### 🚀 Despliegue en Heroku

#### Configuración Automatizada
```bash
# Ejecutar script de despliegue
./deploy.sh
```

#### Configuración Manual
1. **Crear Aplicación en Heroku**
   ```bash
   heroku create tribus-reservas-app-2024
   ```

2. **Configurar Variables de Entorno**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=mongodb+srv://...
   ```

3. **Desplegar Aplicación**
   ```bash
   git push heroku main
   ```

### 🗄️ Configuración de Base de Datos

#### MongoDB Atlas
1. **Crear Cluster**: Configurar cluster en MongoDB Atlas
2. **Configurar Usuario**: Crear usuario con permisos de lectura/escritura
3. **Configurar IP**: Permitir acceso desde Heroku
4. **Obtener URI**: Copiar string de conexión

#### Estructura de Base de Datos
```javascript
// Colecciones principales
reservations: {
  id: String,
  areaId: String,
  userId: String,
  date: Date,
  startTime: String,
  duration: Number,
  requestedSeats: Number,
  contactPerson: String,
  contactEmail: String,
  contactPhone: String,
  groupName: String,
  notes: String,
  status: String,
  createdAt: Date
}

areas: {
  id: String,
  name: String,
  description: String,
  capacity: Number,
  isMeetingRoom: Boolean,
  isFullDayReservation: Boolean,
  color: String,
  isActive: Boolean
}

users: {
  id: String,
  name: String,
  username: String,
  email: String,
  password: String,
  role: String,
  isActive: Boolean,
  createdAt: Date
}

adminSettings: {
  officeDays: Object,
  officeHours: Object,
  businessHours: Object,
  maxReservationDays: Number,
  allowSameDayReservations: Boolean,
  requireApproval: Boolean
}
```

### 🔧 Configuración de Dominio
- **Dominio Personalizado**: Configurar CNAME en Heroku
- **SSL Automático**: Certificados SSL gratuitos
- **CDN**: Distribución de contenido global

## 🔒 Seguridad y Validaciones

### 🛡️ Medidas de Seguridad

#### Autenticación y Autorización
- **Sesiones Seguras**: Manejo seguro de sesiones de usuario
- **Control de Acceso**: Verificación de roles y permisos
- **Validación de Datos**: Sanitización de entradas
- **Headers de Seguridad**: Configuración de CORS y CSP

#### Validaciones del Sistema
```javascript
// Validaciones de Reserva
- Fecha no en el pasado
- Hora dentro del horario de oficina
- Día de la semana permitido
- Capacidad disponible
- Sin conflictos de horario
- Información de contacto completa

// Validaciones de Usuario
- Email válido y único
- Contraseña segura
- Datos obligatorios completos
- Rol válido

// Validaciones de Área
- Nombre único
- Capacidad positiva
- Configuración válida
```

### 🔍 Prevención de Errores
- **Validación en Tiempo Real**: Verificación instantánea
- **Manejo de Errores**: Captura y reporte de errores
- **Logs de Auditoría**: Registro de acciones importantes
- **Backup Automático**: Respaldo regular de datos

## 📱 Interfaz de Usuario

### 🎨 Diseño y UX

#### Principios de Diseño
- **Responsive Design**: Adaptable a todos los dispositivos
- **Accesibilidad**: Navegación por teclado y lectores de pantalla
- **Consistencia Visual**: Sistema de diseño unificado
- **Feedback Inmediato**: Confirmaciones y errores claros

#### Componentes Principales
```typescript
// Componentes de Navegación
Header: Navegación principal y cambio de rol
Sidebar: Menú lateral (en móviles)

// Componentes de Formularios
ReservationForm: Creación de reservas
AreaForm: Configuración de áreas
UserForm: Gestión de usuarios

// Componentes de Visualización
Calendar: Vista de calendario interactivo
Table: Tablas de datos con filtros
Dashboard: Métricas y estadísticas

// Componentes de Feedback
Notifications: Alertas y confirmaciones
Loading: Indicadores de carga
ErrorBoundary: Manejo de errores
```

### 🎯 Experiencia de Usuario

#### Flujo de Usuario Optimizado
1. **Acceso Rápido**: Login simplificado
2. **Navegación Intuitiva**: Menús claros y accesibles
3. **Creación Eficiente**: Formularios optimizados
4. **Confirmación Clara**: Estados y feedback visual
5. **Gestión Sencilla**: Acciones directas y claras

#### Características de Accesibilidad
- **Contraste Adecuado**: Cumplimiento de estándares WCAG
- **Navegación por Teclado**: Acceso completo sin mouse
- **Textos Alternativos**: Descripciones para imágenes
- **Estructura Semántica**: HTML semántico correcto

## 🔄 Flujos de Trabajo

### 📋 Flujo de Creación de Reserva

#### 1. Selección de Área
```
Usuario → Selecciona área → Sistema valida disponibilidad
```

#### 2. Configuración de Fecha y Hora
```
Usuario → Selecciona fecha → Sistema filtra días laborales
Usuario → Selecciona hora → Sistema valida horario disponible
```

#### 3. Información de Contacto
```
Usuario → Completa datos → Sistema valida formato
```

#### 4. Confirmación
```
Sistema → Valida conflicto → Confirma reserva → Notifica usuario
```

### 🔧 Flujo de Administración

#### 1. Gestión de Áreas
```
Admin → Crea/edita área → Sistema valida configuración → Actualiza base de datos
```

#### 2. Configuración del Sistema
```
Admin → Modifica configuración → Sistema aplica cambios → Notifica usuarios
```

#### 3. Gestión de Reservas
```
Admin → Revisa reservas → Confirma/cancela → Sistema actualiza estado
```

### 👥 Flujo de Usuario

#### 1. Registro/Login
```
Usuario → Ingresa credenciales → Sistema valida → Crea sesión
```

#### 2. Creación de Plantilla
```
Usuario → Crea plantilla → Sistema guarda → Disponible para futuras reservas
```

#### 3. Gestión de Perfil
```
Usuario → Actualiza datos → Sistema valida → Guarda cambios
```

## 📈 Reportes y Analytics

### 📊 Métricas del Sistema

#### Utilización por Área
```javascript
// Cálculo de utilización
const utilization = (reservedSeats / totalCapacity) * 100;

// Para salas de reunión
const timeUtilization = (reservedMinutes / totalBusinessMinutes) * 100;
```

#### Estadísticas de Reservas
- **Total de Reservas**: Por período
- **Reservas Confirmadas**: Tasa de confirmación
- **Reservas Canceladas**: Tasa de cancelación
- **Utilización Promedio**: Por área y período

### 📋 Reportes Disponibles

#### Reporte de Utilización
- **Por Área**: Utilización individual de cada espacio
- **Por Período**: Análisis temporal de uso
- **Por Usuario**: Actividad por usuario
- **Tendencias**: Análisis de patrones de uso

#### Exportación de Datos
```javascript
// Formato CSV
const csvData = [
  ['ID', 'Área', 'Usuario', 'Fecha', 'Hora', 'Estado'],
  // ... datos de reservas
];
```

### 📊 Dashboard Analytics

#### Métricas en Tiempo Real
- **Ocupación Actual**: Estado actual de todas las áreas
- **Reservas Pendientes**: Reservas esperando confirmación
- **Alertas del Sistema**: Notificaciones importantes
- **Tendencias**: Gráficos de utilización

## 🛠️ Mantenimiento

### 🔧 Mantenimiento Preventivo

#### Tareas Regulares
- **Backup de Base de Datos**: Respaldo diario automático
- **Limpieza de Logs**: Rotación de archivos de log
- **Actualización de Dependencias**: Mantener paquetes actualizados
- **Monitoreo de Rendimiento**: Verificar tiempos de respuesta

#### Monitoreo del Sistema
```javascript
// Métricas de rendimiento
- Tiempo de respuesta de API
- Uso de memoria y CPU
- Errores y excepciones
- Disponibilidad del servicio
```

### 🐛 Solución de Problemas

#### Problemas Comunes
1. **Error de Conexión a Base de Datos**
   - Verificar URI de MongoDB
   - Comprobar conectividad de red
   - Revisar credenciales

2. **Error de Validación de Fecha**
   - Verificar zona horaria
   - Comprobar formato de fecha
   - Validar configuración de días laborales

3. **Problema de Carga de Reservas**
   - Verificar permisos de usuario
   - Comprobar estado de la base de datos
   - Revisar logs de error

#### Logs de Debugging
```javascript
// Logs importantes
console.log('🔍 Filtrando reservaciones:', {
  totalReservations: state.reservations.length,
  startDate,
  endDate
});

console.log('✅ Reservaciones cargadas:', reservations);
console.error('❌ Error cargando reservaciones:', error);
```

### 🔄 Actualizaciones

#### Proceso de Actualización
1. **Backup**: Respaldo completo antes de actualizar
2. **Testing**: Pruebas en ambiente de desarrollo
3. **Deployment**: Despliegue gradual
4. **Monitoreo**: Verificación post-actualización

#### Versionado
```json
{
  "version": "1.0.0",
  "changelog": [
    "Nueva funcionalidad de reservas recurrentes",
    "Mejoras en la interfaz de usuario",
    "Corrección de errores de validación"
  ]
}
```

## 🤝 Contribución

### 📝 Guías de Contribución

#### Estándares de Código
- **TypeScript**: Uso obligatorio para tipado
- **ESLint**: Configuración de linting
- **Prettier**: Formateo automático de código
- **Conventional Commits**: Estándar de mensajes de commit

#### Estructura de Commits
```bash
feat: add new reservation recurrence feature
fix: resolve date validation error in admin panel
docs: update README with new functionality
style: improve button styling in reservation form
refactor: optimize reservation filtering logic
test: add unit tests for date utilities
```

### 🔄 Proceso de Desarrollo

#### 1. Configuración del Entorno
```bash
# Fork y clonar repositorio
git clone https://github.com/tu-usuario/tribus-reservas-app-2024.git
cd tribus-reservas-app-2024

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

#### 2. Desarrollo de Features
```bash
# Crear rama para feature
git checkout -b feature/nueva-funcionalidad

# Desarrollo
npm run dev

# Tests
npm test

# Linting
npm run lint
```

#### 3. Pull Request
- **Descripción Clara**: Explicar cambios realizados
- **Tests Incluidos**: Verificar que todo funciona
- **Documentación**: Actualizar README si es necesario
- **Review**: Solicitar revisión del código

### 📚 Documentación

#### Documentación Técnica
- **API Documentation**: Endpoints y parámetros
- **Component Documentation**: Props y métodos
- **Database Schema**: Estructura de datos
- **Deployment Guide**: Guía de despliegue

#### Documentación de Usuario
- **User Manual**: Guía completa de uso
- **Admin Guide**: Manual de administración
- **FAQ**: Preguntas frecuentes
- **Video Tutorials**: Demostraciones en video

---

## 📞 Soporte y Contacto

### 🆘 Canales de Soporte
- **Email**: soporte@tribus-app.com
- **Documentación**: [docs.tribus-app.com](https://docs.tribus-app.com)
- **Issues**: [GitHub Issues](https://github.com/tribus-app/issues)
- **Discord**: [Servidor de la Comunidad](https://discord.gg/tribus)

### 📊 Estado del Sistema
- **Status Page**: [status.tribus-app.com](https://status.tribus-app.com)
- **Uptime**: 99.9%
- **Response Time**: < 200ms promedio

---

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver el archivo [LICENSE](./LICENSE) para más detalles.

---

**🏢 TRIBUS** - Simplificando la gestión de espacios de trabajo colaborativo.

*Desarrollado con ❤️ para mejorar la productividad y colaboración en el trabajo.*
