# 🏢 Sistema de Reservas Tribus - 2024

Sistema completo de gestión de reservas para espacios de trabajo, salas de reuniones y hot desks con administración de usuarios, áreas y configuraciones avanzadas.

## 🚀 Características Principales

### 📅 Gestión de Reservas
- **Reservas por área**: Salas de reuniones, hot desks, espacios colaborativos
- **Validación de fechas**: Sistema unificado de fechas locales sin problemas de timezone
- **Horarios de oficina**: Configuración flexible de días y horarios laborales
- **Estados automáticos**: Actualización automática de estados (activa → completada)
- **Filtros avanzados**: Por fecha, área, estado, equipo
- **Exportación CSV**: Descarga de reportes de reservas

### 👥 Gestión de Usuarios
- **Roles de usuario**: Administrador, Colaborador
- **Autenticación segura**: JWT con bcrypt para contraseñas
- **Perfiles de usuario**: Información personal y preferencias
- **Gestión de departamentos**: Organización por equipos

### 🏢 Administración de Áreas
- **Configuración de espacios**: Capacidad, tipo de reserva, horarios
- **Salas de reuniones**: Reservas por tiempo específico
- **Hot desks**: Reservas por día completo
- **Espacios colaborativos**: Configuración flexible

### ⚙️ Configuración del Sistema
- **Días de oficina**: Configuración de días laborales
- **Horarios de trabajo**: Horarios de inicio y fin
- **Configuración de administrador**: Panel de control completo

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** con TypeScript
- **React Router** para navegación
- **Context API** para estado global
- **Lucide React** para iconos
- **CSS Modules** para estilos

### Backend
- **Node.js** con Express
- **MongoDB** con Mongoose ODM
- **JWT** para autenticación
- **bcryptjs** para hash de contraseñas
- **Helmet** para seguridad
- **CORS** para cross-origin requests
- **Express Rate Limit** para protección contra abuso

### Despliegue
- **Heroku** para hosting
- **MongoDB Atlas** para base de datos
- **Git** para control de versiones

## 📁 Estructura del Proyecto

```
tribus-reservas-app-2024/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Admin.tsx       # Panel de administración
│   │   ├── Availability.tsx # Vista de disponibilidad
│   │   ├── Login.tsx       # Autenticación
│   │   ├── Reservations.tsx # Gestión de reservas
│   │   └── ...
│   ├── context/            # Context API
│   │   └── AppContext.tsx  # Estado global
│   ├── services/           # Servicios API
│   │   └── api.ts         # Cliente HTTP
│   ├── types/             # Tipos TypeScript
│   │   └── index.ts       # Definiciones de tipos
│   ├── utils/             # Utilidades
│   │   ├── unifiedDateUtils.ts # Sistema unificado de fechas
│   │   └── officeHoursUtils.ts # Utilidades de horarios
│   └── App.tsx            # Componente principal
├── server.js              # Servidor Express
├── package.json           # Dependencias y scripts
├── Procfile              # Configuración Heroku
└── README.md             # Este archivo
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18.x o superior
- npm 9.x o superior
- MongoDB Atlas (para producción) o MongoDB local

### Instalación Local

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd tribus-reservas-app-2024
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

4. **Ejecutar en desarrollo**
```bash
npm start
```

5. **Construir para producción**
```bash
npm run build
```

### Variables de Entorno

```env
# Base de datos
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tribus-reservas

# JWT
JWT_SECRET=tu-jwt-secret-super-seguro

# Servidor
PORT=3000
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://tu-dominio.herokuapp.com
```

## 🌐 Despliegue

### Heroku + MongoDB Atlas

1. **Crear aplicación en Heroku**
```bash
heroku create tu-app-name
```

2. **Configurar variables de entorno**
```bash
heroku config:set MONGODB_URI="tu-mongodb-uri"
heroku config:set JWT_SECRET="tu-jwt-secret"
heroku config:set NODE_ENV="production"
```

3. **Desplegar**
```bash
git push heroku main
```

### URLs de Producción
- **Aplicación**: https://tribus-reservas-2024-6b783eae459c.herokuapp.com
- **Base de datos**: MongoDB Atlas (remota)

## 🔧 Funcionalidades Técnicas

### Sistema de Fechas Unificado
- **Problema resuelto**: Inconsistencias entre UTC y horarios locales
- **Solución**: Sistema centralizado en `unifiedDateUtils.ts`
- **Funciones clave**:
  - `createLocalDate()`: Creación de fechas en zona local
  - `formatDateToString()`: Formateo consistente
  - `isOfficeDay()`: Validación de días laborales
  - `isWithinOfficeHours()`: Validación de horarios

### Seguridad
- **Autenticación JWT**: Tokens seguros con expiración
- **Hash de contraseñas**: bcryptjs con salt
- **Headers de seguridad**: Helmet con CSP
- **Rate limiting**: Protección contra abuso de API
- **CORS configurado**: Orígenes permitidos específicos

### Validaciones
- **Fechas pasadas**: No se permiten reservas en fechas anteriores
- **Días de oficina**: Solo días laborales configurados
- **Horarios de oficina**: Solo dentro del horario laboral
- **Capacidad**: Validación de asientos disponibles
- **Datos requeridos**: Validación de campos obligatorios

## 📊 Estados de Reservas

- **`active`**: Reserva activa y vigente
- **`completed`**: Reserva completada (automático al finalizar)
- **`cancelled`**: Reserva cancelada por el usuario
- **`no_show`**: Usuario no se presentó

## 🎯 Usuarios por Defecto

### Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **Acceso**: Panel completo de administración

### Colaboradores
- **Usuario**: `daniel.r`
- **Contraseña**: `daniel123`
- **Usuario**: `maria.g`
- **Contraseña**: `maria123`

## 🔍 Monitoreo y Debug

### Logs de Debug
El sistema incluye logs detallados para:
- Validación de fechas
- Carga de configuraciones
- Procesamiento de reservas
- Errores de autenticación

### Herramientas de Diagnóstico
- Scripts de prueba de fechas
- Validación de configuraciones
- Verificación de conexiones
- Análisis de capacidad

## 🚨 Problemas Conocidos y Soluciones

### ✅ Problemas Resueltos
1. **Inconsistencias de timezone**: Sistema unificado de fechas
2. **Errores de validación**: Corrección de `new Date()` problemático
3. **Conexión con servidor**: Configuración correcta de URLs
4. **Autenticación**: Gestión correcta de contraseñas
5. **Estados de reservas**: Actualización automática

### 🔧 Mantenimiento
- **Actualización de estados**: Automática cada 5 minutos
- **Limpieza de datos**: Scripts de mantenimiento disponibles
- **Backup**: MongoDB Atlas con respaldos automáticos

## 📈 Próximas Mejoras

- [ ] Notificaciones por email
- [ ] Integración con calendarios externos
- [ ] Reportes avanzados
- [ ] API REST completa
- [ ] Aplicación móvil
- [ ] Integración con sistemas de acceso

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- **Email**: soporte@tribus.com
- **Documentación**: Ver `CHECKPOINT.md` para detalles técnicos
- **Issues**: Usar el sistema de issues de GitHub

---

**Desarrollado con ❤️ para Tribus - 2024**