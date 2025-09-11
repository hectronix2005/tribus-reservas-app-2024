# 🏢 Sistema de Reservas Tribus - Aplicación Web

## 📋 Descripción General

Sistema de gestión de reservas de espacios de trabajo desarrollado para Tribus, que permite a los usuarios reservar áreas como Hot Desk y salas de reuniones. La aplicación incluye funcionalidades de administración de usuarios, departamentos, y un calendario de disponibilidad interactivo.

## 🚀 Características Principales

### 👥 Gestión de Usuarios
- **Roles de Usuario**:
  - `admin`: Administrador del sistema con acceso completo
  - `lider`: Líder de equipo que puede crear reservas y gestionar colaboradores
  - `colaborador`: Usuario que solo puede ver reservas donde está incluido
- **Campos de Usuario**:
  - Nombre completo
  - Email
  - Username único
  - Cédula (obligatorio)
  - Departamento
  - Estado activo/inactivo

### 🏢 Gestión de Departamentos
- Creación y edición de departamentos
- Asignación de usuarios a departamentos
- Estado activo/inactivo

### 📅 Sistema de Reservas
- **Tipos de Área**:
  - **Hot Desk**: Reservas de día completo (08:00 - 18:00)
  - **Sala de Reuniones**: Reservas por horas con duración configurable
- **Funcionalidades**:
  - Selección de colaboradores por departamento
  - Validación de disponibilidad en tiempo real
  - Filtros por fecha, área y estado
  - Exportación a CSV
  - Auditoría completa (quién creó, cuándo, etc.)

### 📊 Calendario de Disponibilidad
- Vista tipo Google Calendar
- Muestra 15 días desde la fecha actual
- Filtros: Total, Semana, Día
- **Funcionalidades Interactivas**:
  - Click en área disponible → Abre formulario de nueva reserva
  - Click en "X reserva(s) activa(s)" → Modal con detalles de reservas
  - Indicadores visuales de disponibilidad
  - Ocultación de días no laborales

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** con TypeScript
- **Tailwind CSS** para estilos
- **Lucide React** para iconos
- **Context API** para estado global
- **React Hooks** (useState, useEffect, useCallback, useMemo)

### Backend
- **Node.js** con Express.js
- **MongoDB** con Mongoose
- **JWT** para autenticación
- **bcryptjs** para hash de contraseñas
- **express-rate-limit** para rate limiting
- **helmet** para seguridad

### Herramientas de Desarrollo
- **Webpack** para bundling
- **ESLint** para linting
- **CORS** para comunicación frontend-backend

## 📁 Estructura del Proyecto

```
tribus-reservas-app-2024/
├── public/
│   ├── images/
│   │   └── tribus-logo.svg
│   ├── manifest.json
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Admin.tsx              # Panel de administración
│   │   ├── Availability.tsx       # Calendario de disponibilidad
│   │   ├── ColaboradorView.tsx    # Vista para colaboradores
│   │   ├── DepartmentManagement.tsx # Gestión de departamentos
│   │   ├── Header.tsx             # Header de la aplicación
│   │   ├── Login.tsx              # Formulario de login
│   │   ├── ProtocolNotification.tsx # Notificaciones
│   │   ├── Reservations.tsx       # Gestión de reservas
│   │   ├── UserManagement.tsx     # Gestión de usuarios
│   │   └── UserProfile.tsx        # Perfil de usuario
│   ├── context/
│   │   └── AppContext.tsx         # Contexto global
│   ├── services/
│   │   └── api.ts                 # Servicios de API
│   ├── types/
│   │   └── index.ts               # Definiciones de tipos
│   ├── utils/
│   │   ├── dateUtils.ts           # Utilidades de fecha
│   │   └── officeHoursUtils.ts    # Utilidades de horarios
│   ├── App.tsx                    # Componente principal
│   └── index.tsx                  # Punto de entrada
├── server.js                      # Servidor Express
├── mongodb-config.js              # Configuración de MongoDB
├── package.json
└── README.md
```

## 🔧 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- MongoDB (local o Atlas)
- npm o yarn

### Instalación
1. **Clonar el repositorio**:
   ```bash
   git clone <repository-url>
   cd tribus-reservas-app-2024
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   - Crear archivo `.env` en la raíz del proyecto
   - Configurar `MONGODB_URI` con la URL de tu base de datos MongoDB
   - Configurar `JWT_SECRET` para la autenticación

4. **Iniciar el servidor de desarrollo**:
   ```bash
   # Terminal 1 - Backend
   NODE_ENV=development npm run server
   
   # Terminal 2 - Frontend
   npm start
   ```

5. **Acceder a la aplicación**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm start                    # Inicia el frontend en modo desarrollo
npm run server              # Inicia el servidor backend
npm run build               # Construye la aplicación para producción

# Utilidades
npm run start-dev.sh        # Script para iniciar ambos servidores
npm run stop-dev.sh         # Script para detener todos los procesos
```

## 🔐 Autenticación y Seguridad

### JWT (JSON Web Tokens)
- Tokens con expiración de 24 horas
- Renovación automática en el frontend
- Validación en todas las rutas protegidas

### Rate Limiting
- Límite de 1000 requests por 15 minutos
- Configuración ajustable para desarrollo/producción

### Validaciones
- Validación de roles en frontend y backend
- Sanitización de datos de entrada
- Validación de fechas y horarios

## 📊 Base de Datos

### Colecciones MongoDB

#### Users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  username: String,
  password: String (hashed),
  cedula: String,
  role: String (admin|lider|colaborador),
  department: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Reservations
```javascript
{
  _id: ObjectId,
  area: String,
  date: Date,
  startTime: String,
  endTime: String,
  teamName: String,
  requestedSeats: Number,
  status: String (confirmed|cancelled),
  colaboradores: [ObjectId],
  attendees: [String],
  notes: String,
  createdBy: {
    userId: ObjectId,
    userName: String,
    userEmail: String,
    userRole: String
  },
  createdAt: Date,
  updatedAt: Date,
  debug: Object
}
```

#### Departments
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

#### Areas
```javascript
{
  _id: ObjectId,
  name: String,
  capacity: Number,
  category: String (HOT_DESK|SALA),
  isActive: Boolean
}
```

## 🎯 Funcionalidades Clave Implementadas

### 1. Sistema de Reservas Inteligente
- **Preselección automática**: Click en área disponible preselecciona área y fecha
- **Validación en tiempo real**: Verificación de disponibilidad antes de crear reserva
- **Gestión de colaboradores**: Selección por departamento con validación de cantidad

### 2. Calendario Interactivo
- **Vista Google Calendar**: Interfaz familiar y intuitiva
- **Navegación fluida**: Filtros por período (Total, Semana, Día)
- **Información detallada**: Modal con detalles de reservas activas

### 3. Gestión de Usuarios Avanzada
- **Roles granulares**: Diferentes niveles de acceso
- **Auditoría completa**: Registro de quién creó/modificó cada elemento
- **Validaciones robustas**: Cédula obligatoria, emails únicos, etc.

### 4. Sistema de Notificaciones
- **Feedback visual**: Notificaciones de éxito/error
- **Protocolo de eliminación**: Confirmaciones antes de eliminar elementos
- **Logging detallado**: Registro de todas las operaciones

## 🔧 Configuración de Desarrollo

### Rate Limiting
```javascript
// server.js
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por ventana
  message: {
    error: 'Demasiadas peticiones, intenta de nuevo más tarde',
    retryAfter: '15 minutos'
  }
});
```

### CORS
```javascript
app.use(cors({
  origin: true, // Permitir todas las origenes para desarrollo
  credentials: true
}));
```

## 🐛 Problemas Conocidos y Soluciones

### 1. Error HTTP 429 (Too Many Requests)
**Problema**: Rate limiting muy restrictivo bloqueaba operaciones
**Solución**: Aumentar límite a 1000 requests por ventana de 15 minutos

### 2. Inconsistencias de Fecha
**Problema**: Diferencias entre horario local y UTC
**Solución**: Uso consistente de métodos de fecha local en frontend

### 3. Peticiones Excesivas
**Problema**: useEffect causaba peticiones excesivas al servidor
**Solución**: Implementación de debounce y optimización de dependencias

## 📈 Próximas Mejoras

- [ ] Implementar notificaciones push
- [ ] Agregar reportes avanzados
- [ ] Integración con calendarios externos (Google Calendar, Outlook)
- [ ] Aplicación móvil (React Native)
- [ ] Sistema de notificaciones por email
- [ ] Dashboard con métricas en tiempo real

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo de Desarrollo

- **Desarrollador Principal**: Hector Neira
- **Empresa**: Tribus
- **Año**: 2024

## 📞 Soporte

Para soporte técnico o preguntas sobre el sistema, contactar a:
- Email: hneira@picap.co
- Username: Hneira

---

**Versión**: 1.0.0  
**Última actualización**: Septiembre 2025