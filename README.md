# 🏢 Sistema de Reservas Tribus - 2024

Sistema completo de gestión de reservas para espacios de trabajo, salas de reuniones y hot desks con administración de usuarios, áreas y configuraciones avanzadas.

[![Heroku](https://img.shields.io/badge/heroku-deployed-430098?logo=heroku)](https://tribus-reservas-2024-6b783eae459c.herokuapp.com)
[![MongoDB](https://img.shields.io/badge/mongodb-atlas-47A248?logo=mongodb)](https://www.mongodb.com/cloud/atlas)
[![Node.js](https://img.shields.io/badge/node.js-18.x-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.x-61DAFB?logo=react)](https://reactjs.org/)

## 🚀 Características Principales

### 📅 Gestión de Reservas
- **Reservas por área**: Salas de reuniones (SALA) y hot desks (HOT_DESK)
- **Validación de fechas**: Sistema unificado de fechas locales sin problemas de timezone
- **Validación de solapamientos**: Detección precisa de conflictos de horarios usando `$expr`
- **Horarios de oficina**: Configuración flexible de días y horarios laborales
- **Estados automáticos**: confirmed → active → completed
- **Filtros avanzados**: Por fecha, área, estado, equipo (con opción de limpiar filtros)
- **Exportación CSV**: Descarga de reportes de reservas
- **IDs únicos legibles**: RES-YYYYMMDD-HHMMSS-XXXX

### 👥 Gestión de Usuarios
- **Roles de usuario**: 
  - **Admin**: Acceso completo, gestión de usuarios, áreas y configuraciones
  - **Líder**: Creación de reservas, gestión de equipo
  - **Colaborador**: Visualización de reservas asignadas
- **Autenticación segura**: JWT con bcrypt para contraseñas
- **Campos de usuario**: Nombre, email, username, cédula, ID de empleado, rol, departamento
- **Perfiles de usuario**: Información personal y preferencias
- **Gestión de departamentos**: Organización por equipos

### 🏢 Administración de Áreas
- **Configuración de espacios**: Capacidad, tipo de reserva, horarios
- **Salas de reuniones (SALA)**: 
  - Reservas por tiempo específico (30 min - 8 horas)
  - Capacidad completa reservada por defecto
  - No requiere especificar colaboradores
- **Hot desks (HOT_DESK)**: 
  - Reservas por día completo
  - Gestión de puestos individuales
  - Requiere especificar número de colaboradores
- **Espacios colaborativos**: Configuración flexible

### ⚙️ Configuración del Sistema
- **Días de oficina**: Configuración de días laborales
- **Horarios de trabajo**: Horarios de inicio y fin
- **Configuración de administrador**: Panel de control completo
- **Debug detallado**: Información completa de cada reserva para auditoría

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18.2.0** con TypeScript
- **React Router 6.28.0** para navegación
- **Context API** para estado global
- **Lucide React** para iconos
- **CSS Modules** para estilos
- **date-fns** para manejo de fechas

### Backend
- **Node.js 18.x** con Express 4.21.2
- **MongoDB** con Mongoose 8.9.3 ODM
- **JWT (jsonwebtoken)** para autenticación
- **bcryptjs** para hash de contraseñas
- **Helmet** para seguridad (CSP configurado)
- **CORS** para cross-origin requests
- **Express Rate Limit** para protección contra abuso

### Despliegue
- **Heroku** para hosting (v26)
- **MongoDB Atlas** para base de datos en la nube
- **Git** para control de versiones

## 📁 Estructura del Proyecto

```
tribus-reservas-app-2024/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Admin.tsx       # Panel de administración
│   │   ├── Availability.tsx # Vista de disponibilidad
│   │   ├── Login.tsx       # Autenticación (sin debug de usuarios)
│   │   ├── Reservations.tsx # Gestión de reservas
│   │   ├── ReservationFilters.tsx # Filtros de reservas
│   │   ├── UserManagement.tsx # Gestión de usuarios (con employeeId)
│   │   ├── Header.tsx      # Navegación
│   │   └── ...
│   ├── context/            # Context API
│   │   └── AppContext.tsx  # Estado global
│   ├── services/           # Servicios API
│   │   └── api.ts         # Cliente HTTP
│   ├── types/             # Tipos TypeScript
│   │   └── index.ts       # Definiciones de tipos (User, Reservation, etc.)
│   ├── utils/             # Utilidades
│   │   ├── unifiedDateUtils.ts # Sistema unificado de fechas
│   │   └── officeHoursUtils.ts # Utilidades de horarios
│   └── App.tsx            # Componente principal
├── server.js              # Servidor Express (backend completo)
├── package.json           # Dependencias y scripts
├── Procfile              # Configuración Heroku
├── README.md             # Este archivo
├── CHECKPOINT.md         # Documentación técnica detallada
└── CREDENCIALES_REALES.md # Credenciales de usuarios
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18.x o superior
- npm 9.x o superior
- MongoDB Atlas (para producción) o MongoDB local

### Instalación Local

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/tribus-reservas-app-2024.git
cd tribus-reservas-app-2024
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
# Crear archivo .env con:
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tribus
JWT_SECRET=tu-jwt-secret-super-seguro
PORT=3000
NODE_ENV=development
```

4. **Ejecutar en desarrollo**
```bash
# Terminal 1: Backend
NODE_ENV=development npm run server

# Terminal 2: Frontend
npm start
```

5. **Construir para producción**
```bash
npm run build
```

### Variables de Entorno

```env
# Base de datos
MONGODB_URI=mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0

# JWT
JWT_SECRET=tribus-secret-key-2024

# Servidor
PORT=3000
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://tribus-reservas-2024-6b783eae459c.herokuapp.com
```

## 🌐 Despliegue

### Heroku + MongoDB Atlas

1. **Crear aplicación en Heroku**
```bash
heroku create tribus-reservas-2024
```

2. **Configurar variables de entorno**
```bash
heroku config:set MONGODB_URI="mongodb+srv://..."
heroku config:set JWT_SECRET="tribus-secret-key-2024"
heroku config:set NODE_ENV="production"
```

3. **Desplegar**
```bash
git push heroku main
```

### URLs de Producción
- **Aplicación**: https://tribus-reservas-2024-6b783eae459c.herokuapp.com
- **Base de datos**: MongoDB Atlas Cluster0 (remota)
- **Versión actual**: v26

## 🔧 Funcionalidades Técnicas

### Sistema de Fechas Unificado
- **Problema resuelto**: Inconsistencias entre UTC y horarios locales
- **Solución**: Sistema centralizado en `unifiedDateUtils.ts`
- **Funciones clave**:
  - `createLocalDate(dateString)`: Creación de fechas en zona local sin desplazamiento UTC
  - `formatDateToString(date)`: Formateo consistente YYYY-MM-DD
  - `isOfficeDay(date, officeDays)`: Validación de días laborales
  - `isWithinOfficeHours(time, officeHours)`: Validación de horarios

### Sistema de Validación de Solapamientos
- **Algoritmo**: `start1 < end2 AND start2 < end1`
- **Implementación MongoDB**: Uso de `$expr` para comparaciones de strings de tiempo
- **Estados considerados**: `confirmed` y `active`
- **Prevención**: Bloqueo automático de reservas duplicadas

### Seguridad
- **Autenticación JWT**: Tokens seguros con expiración de 24 horas
- **Hash de contraseñas**: bcryptjs con salt de 10 rounds
- **Headers de seguridad**: Helmet con CSP configurado
  - `connect-src`: Incluye URL de Heroku para evitar errores ETIMEDOUT
- **Rate limiting**: 1000 requests por 15 minutos
- **CORS configurado**: Orígenes permitidos específicos con credentials

### Validaciones
- **Fechas pasadas**: No se permiten reservas en fechas anteriores
- **Días de oficina**: Solo días laborales configurados (lunes-viernes por defecto)
- **Horarios de oficina**: Solo dentro del horario laboral (08:00-18:00)
- **Capacidad**: Validación de asientos disponibles
- **Solapamientos**: Detección precisa usando `$expr`
- **Datos requeridos**: userId, userName, area, date, startTime, endTime, teamName
- **Roles válidos**: admin, lider, colaborador (en esquemas y validaciones)

## 📊 Estados de Reservas

El sistema actualiza automáticamente los estados basándose en la fecha y hora:

- **`confirmed`**: Reserva confirmada (estado inicial)
- **`active`**: Reserva activa (cuando el tiempo actual está dentro del rango)
- **`completed`**: Reserva completada (automático al finalizar el horario)
- **`cancelled`**: Reserva cancelada manualmente por el usuario

## 🎯 Usuarios Reales del Sistema

### Administradores
| Nombre | Username | Contraseña | Departamento |
|--------|----------|-----------|--------------|
| Hector Neira | `Hneira` | `Hector2024` | Gerencia |
| Diana Coronado | `Dcoronado` | `Diana2024` | Talento Humano |
| Omaira Gonzalez | `Ogonzalezr` | `Omaira2024` | Administrativo y Financiero |
| Carolina Sierra | `Csierra` | `Carolina2024` | Gerencia |

### Líderes
| Nombre | Username | Contraseña | Departamento |
|--------|----------|-----------|--------------|
| David Neira | `Dneira` | `Hector2024` | Tesoreria |
| Daniel R | `Drodriguez` | `Daniel2024` | Gerencia |
| Monica Beltran | `Mbeltran` | `Monica2024` | Talento Humano |
| Diego Romero | `Dromero` | `Diego2024` | Administrativo y Financiero |
| Liliana Peña | `Lpena` | `Liliana2024` | Comercial |
| Emanuel Ospina | `Eospina` | `Emanuel2024` | Tesoreria |
| Prueba | `prueba` | `Prueba2024` | Comercial |

### Colaboradores
| Nombre | Username | Contraseña | Departamento |
|--------|----------|-----------|--------------|
| Paula Carrillo | `Pcarrillo` | `Paula2024` | Comercial |
| (Ver CREDENCIALES_REALES.md para lista completa) |

**Nota**: Todas las contraseñas siguen el patrón `[Nombre]2024`

## 🔍 Monitoreo y Debug

### Logs de Debug
El sistema incluye logs detallados para:
- Validación de fechas y timezone
- Validación de solapamientos de reservas
- Carga de configuraciones de oficina
- Procesamiento de reservas con información completa
- Errores de autenticación y validación
- Conversión de roles (user → lider para compatibilidad)

### Información de Debug en Reservas
Cada reserva incluye un objeto `debug` con:
- **systemInfo**: Información del sistema y timestamp
- **inputData**: Datos raw y procesados
- **userInfo**: Información del creador y colaboradores
- **dateProcessing**: Validación completa de fechas
- **areaInfo**: Información del área y capacidad
- **validations**: Estado de todas las validaciones
- **reservationInfo**: Duración y participantes
- **metadata**: IP, referer, user agent, etc.

## 🚨 Problemas Resueltos

### ✅ Correcciones Recientes (Septiembre 2025)

1. **Solapamientos de reservas**
   - **Problema**: Reservas duplicadas para misma sala, fecha y hora
   - **Causa**: Query MongoDB incorrecta (`$and` vs `$expr`)
   - **Solución**: Implementación correcta con `$expr` para comparación de strings
   - **Estado**: ✅ Resuelto completamente

2. **Error con usuarios líder**
   - **Problema**: Error interno del servidor al crear reservas con rol 'lider'
   - **Causa**: Esquema de `createdBy.userRole` no incluía 'lider' en el enum
   - **Solución**: Agregado 'lider' al enum `['admin', 'lider', 'colaborador']`
   - **Estado**: ✅ Resuelto completamente

3. **Contraseñas de usuarios líder**
   - **Problema**: Contraseñas sobrescritas con 'admin123'
   - **Solución**: Restauración de contraseñas originales personalizadas
   - **Estado**: ✅ Resuelto completamente

4. **Inconsistencias de timezone**
   - **Problema**: Fechas interpretadas incorrectamente (UTC vs local)
   - **Solución**: Sistema unificado de fechas en `unifiedDateUtils.ts`
   - **Estado**: ✅ Resuelto completamente

5. **Validación de colaboradores para SALA**
   - **Problema**: Se requería colaboradores para salas de reuniones
   - **Solución**: Validación solo para HOT_DESK, no para SALA
   - **Estado**: ✅ Resuelto completamente

6. **Campo employeeId no guardado**
   - **Problema**: ID de empleado no se guardaba en creación/edición
   - **Solución**: Agregado employeeId como campo required en esquema y endpoints
   - **Estado**: ✅ Resuelto completamente

7. **Filtros de reservas**
   - **Problema**: Filtros aplicados por defecto, no mostraba todas las reservas
   - **Solución**: Estado inicial en "Limpiar filtros", muestra todas las reservas
   - **Estado**: ✅ Resuelto completamente

## 📈 Próximas Mejoras

- [ ] Notificaciones por email
- [ ] Integración con calendarios externos (Google Calendar, Outlook)
- [ ] Reportes avanzados con gráficos
- [ ] API REST completamente documentada
- [ ] Aplicación móvil (React Native)
- [ ] Integración con sistemas de acceso físico
- [ ] Panel de métricas y analytics
- [ ] Recordatorios automáticos de reservas

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de uso interno para Tribus.

## 📞 Soporte

Para soporte técnico o preguntas:
- **Documentación técnica**: Ver `CHECKPOINT.md` para detalles completos
- **Credenciales**: Ver `CREDENCIALES_REALES.md` para usuarios del sistema
- **Heroku Logs**: `heroku logs --tail --app tribus-reservas-2024`

## 🏆 Métricas del Sistema

- **Usuarios totales**: 23 (4 admin, 7 líderes, 12 colaboradores)
- **Áreas configuradas**: 4 (1 HOT_DESK, 3 SALAS)
- **Reservas activas**: ~20
- **Versión desplegada**: v26
- **Uptime**: 99.9% (Heroku)
- **Base de datos**: MongoDB Atlas (Cluster0)

---

**Desarrollado con ❤️ para Tribus - 2024**
**Última actualización**: Septiembre 30, 2025