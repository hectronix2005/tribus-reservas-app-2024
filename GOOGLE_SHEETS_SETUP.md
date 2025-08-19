# 📊 Configuración de Google Sheets para TRIBUS

## 🎯 Objetivo
Integrar Google Sheets como respaldo automático de todas las reservas creadas en el sistema TRIBUS.

## 📋 Requisitos Previos

### 1. Cuenta de Google
- Tener una cuenta de Google activa
- Acceso a Google Sheets
- Acceso a Google Cloud Console

### 2. Proyecto en Google Cloud Console
- Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
- Habilitar la API de Google Sheets
- Crear credenciales de API

## 🚀 Pasos de Configuración

### Paso 1: Crear la Hoja de Cálculo

1. **Ir a Google Sheets**
   - Ve a [sheets.google.com](https://sheets.google.com)
   - Crea una nueva hoja de cálculo
   - Nómbrala "TRIBUS - Reservas"

2. **Obtener el ID de la hoja**
   - En la URL de tu hoja, copia el ID (parte entre `/d/` y `/edit`)
   - Ejemplo: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
   - El ID es: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### Paso 2: Configurar Google Cloud Console

1. **Crear Proyecto**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/)
   - Crea un nuevo proyecto o selecciona uno existente

2. **Habilitar API**
   - Ve a "APIs y servicios" > "Biblioteca"
   - Busca "Google Sheets API"
   - Haz clic en "Habilitar"

3. **Crear Credenciales**
   - Ve a "APIs y servicios" > "Credenciales"
   - Haz clic en "Crear credenciales" > "Clave de API"
   - Copia la clave generada

### Paso 3: Configurar Variables de Entorno

#### En Heroku:
```bash
heroku config:set REACT_APP_GOOGLE_SHEETS_ID="tu_id_de_hoja"
heroku config:set REACT_APP_GOOGLE_API_KEY="tu_clave_de_api"
```

#### En desarrollo local:
Crea un archivo `.env.local` en la raíz del proyecto:
```env
REACT_APP_GOOGLE_SHEETS_ID=tu_id_de_hoja
REACT_APP_GOOGLE_API_KEY=tu_clave_de_api
```

### Paso 4: Configurar Permisos de la Hoja

1. **Compartir la hoja**
   - En Google Sheets, haz clic en "Compartir"
   - Agrega el email de tu proyecto de Google Cloud
   - Dale permisos de "Editor"

2. **Configurar permisos de API**
   - En Google Cloud Console, ve a "APIs y servicios" > "Pantalla de consentimiento de OAuth"
   - Configura la información básica
   - Agrega tu email como usuario de prueba

### Paso 5: Inicializar la Hoja

1. **Acceder al panel de administración**
   - Inicia sesión como administrador en TRIBUS
   - Ve a "Google Sheets" en el menú

2. **Inicializar estructura**
   - Haz clic en "Inicializar Hoja"
   - Esto creará las columnas necesarias

## 📊 Estructura de la Hoja

La hoja se creará con las siguientes columnas:

| Columna | Descripción |
|---------|-------------|
| ID | Identificador único de la reserva |
| Fecha | Fecha de la reserva |
| Hora | Hora de inicio |
| Duración | Duración en formato legible |
| Área | Nombre del área reservada |
| Grupo | Nombre del grupo |
| Asientos | Número de asientos solicitados |
| Contacto | Persona de contacto |
| Email | Email de contacto |
| Teléfono | Teléfono de contacto |
| Estado | Estado de la reserva |
| Notas | Notas adicionales |
| Fecha Creación | Fecha de creación de la reserva |

## 🔧 Funcionalidades

### ✅ Respaldo Automático
- Cada reserva creada se guarda automáticamente en Google Sheets
- No interfiere con el funcionamiento normal del sistema
- Logs detallados en la consola del navegador

### ✅ Configuración Flexible
- Se puede habilitar/deshabilitar sin afectar el sistema
- Variables de entorno para configuración segura
- Interfaz de administración integrada

### ✅ Acceso Directo
- Enlace directo a la hoja desde el panel de administración
- Visualización en tiempo real de las reservas
- Exportación manual disponible

## 🛠️ Solución de Problemas

### Error: "Google Sheets no configurado"
- Verifica que las variables de entorno estén configuradas
- Asegúrate de que la API esté habilitada en Google Cloud Console
- Verifica que la clave de API sea válida

### Error: "Error al configurar Google Sheets"
- Verifica que la hoja esté compartida con el proyecto
- Asegúrate de que el ID de la hoja sea correcto
- Verifica los permisos de la API

### Error: "Error de conexión"
- Verifica tu conexión a internet
- Asegúrate de que la API de Google Sheets esté habilitada
- Verifica que no haya límites de cuota excedidos

## 📈 Beneficios

### 🔒 Seguridad
- Respaldo automático de todas las reservas
- Acceso controlado a través de Google Cloud
- Datos protegidos por la infraestructura de Google

### 📊 Análisis
- Datos disponibles para análisis en Google Sheets
- Integración con otras herramientas de Google
- Reportes y gráficos automáticos

### 🔄 Sincronización
- Respaldo en tiempo real
- Sin pérdida de datos
- Historial completo de reservas

## 🎉 ¡Listo!

Una vez configurado, cada reserva creada en TRIBUS se guardará automáticamente en Google Sheets, proporcionando un respaldo seguro y accesible de todos los datos del sistema.
