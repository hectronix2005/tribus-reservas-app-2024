# TRIBUS - Sistema de Reservas de Puestos de Trabajo

TRIBUS es una aplicación web moderna para gestionar reservas de puestos de trabajo en empresas, permitiendo a los administradores configurar áreas con capacidad limitada y a los usuarios realizar reservas por grupos según sus necesidades.

## 🚀 Características Principales

### Para Administradores
- **Gestión de Áreas**: Crear, editar y eliminar áreas de trabajo con capacidad configurable
- **Configuración del Sistema**: Ajustar parámetros como días máximos de reserva, horarios de trabajo, etc.
- **Gestión de Reservas**: Ver, confirmar, cancelar y eliminar reservas
- **Reportes**: Análisis de utilización por área y exportación de datos
- **Estadísticas**: Dashboard con métricas del sistema

### Para Usuarios
- **Reservas Intuitivas**: Interfaz fácil de usar para crear reservas
- **Vista en Tiempo Real**: Ver disponibilidad actual de cada área
- **Control de Capacidad**: Sistema automático que previene exceder límites
- **Calendario Visual**: Selección de fechas con indicadores de disponibilidad
- **Información de Contacto**: Gestión completa de datos de contacto

## 🛠️ Tecnologías Utilizadas

- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático para mayor robustez
- **Tailwind CSS** - Framework de CSS utilitario
- **Lucide React** - Iconos modernos
- **date-fns** - Manipulación de fechas
- **Context API** - Gestión de estado global

## 📦 Instalación

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd tribus-reservas
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**
   ```bash
   npm start
   ```

4. **Abrir en el navegador**
   La aplicación estará disponible en `http://localhost:3000`

## 🎯 Uso de la Aplicación

### Modo Usuario (Por Defecto)
1. **Dashboard**: Ver resumen general de disponibilidad
2. **Reservas**: Crear nuevas reservas seleccionando área, fecha y cantidad de puestos
3. **Vista en Tiempo Real**: Ver qué áreas están ocupadas y por qué grupos

### Modo Administrador
1. **Activar Modo Admin**: Hacer clic en el botón "Modo Usuario" en el header
2. **Gestión de Áreas**: Ir a "Áreas" para configurar espacios de trabajo
3. **Administración**: Acceder a configuraciones del sistema y gestión de reservas
4. **Reportes**: Ver estadísticas y exportar datos

## 📋 Configuración Inicial

### Crear Áreas de Trabajo
1. Activar modo administrador
2. Ir a "Áreas" → "Nueva Área"
3. Configurar:
   - Nombre del área
   - Capacidad (número de puestos)
   - Descripción (opcional)
   - Color identificativo

### Configurar Sistema
1. Ir a "Administración" → "Configuración"
2. Ajustar:
   - Días máximos para reservas anticipadas
   - Permitir reservas del mismo día
   - Horarios de trabajo
   - Requerir aprobación (opcional)

## 🔧 Estructura del Proyecto

```
src/
├── components/          # Componentes de React
│   ├── Header.tsx      # Navegación principal
│   ├── Dashboard.tsx   # Vista principal
│   ├── Reservations.tsx # Gestión de reservas
│   ├── Areas.tsx       # Administración de áreas
│   └── Admin.tsx       # Panel de administración
├── context/            # Gestión de estado
│   └── AppContext.tsx  # Contexto global
├── types/              # Definiciones TypeScript
│   └── index.ts        # Interfaces y tipos
├── App.tsx             # Componente principal
├── index.tsx           # Punto de entrada
└── index.css           # Estilos globales
```

## 🎨 Características de Diseño

- **Interfaz Responsiva**: Funciona en dispositivos móviles y desktop
- **Diseño Moderno**: UI limpia y profesional con Tailwind CSS
- **Accesibilidad**: Navegación por teclado y contraste adecuado
- **Feedback Visual**: Indicadores de estado y animaciones suaves
- **Colores Intuitivos**: Sistema de colores para diferentes estados

## 📊 Funcionalidades Avanzadas

### Control de Capacidad
- Validación automática de disponibilidad
- Prevención de reservas que excedan límites
- Indicadores visuales de utilización

### Gestión de Reservas
- Estados: Pendiente, Confirmada, Cancelada
- Información completa de contacto
- Notas y comentarios adicionales
- Exportación a CSV

### Reportes y Análisis
- Utilización por área
- Estadísticas de reservas
- Métricas de ocupación
- Exportación de datos

## 🔒 Seguridad y Validaciones

- Validación de formularios en tiempo real
- Prevención de reservas duplicadas
- Control de acceso por modo administrador
- Validación de fechas y horarios

## 🚀 Despliegue

### Build de Producción
```bash
npm run build
```

### Servir Archivos Estáticos
Los archivos generados en `build/` pueden ser servidos por cualquier servidor web estático.

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Para soporte técnico o preguntas sobre la aplicación, contactar al equipo de desarrollo.

---

**TRIBUS** - Simplificando la gestión de espacios de trabajo colaborativo.
