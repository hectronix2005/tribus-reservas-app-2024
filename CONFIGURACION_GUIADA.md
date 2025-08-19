# 🎯 Guía Visual: Configuración de Google Sheets

## 📋 **Paso 1: Crear Hoja de Cálculo**

### 1.1 Ir a Google Sheets
- Abre tu navegador
- Ve a: https://sheets.google.com
- Inicia sesión con tu cuenta de Google

### 1.2 Crear Nueva Hoja
- Haz clic en el botón "+" para crear una nueva hoja
- Nombra la hoja: **"TRIBUS - Reservas"**

### 1.3 Obtener el ID
- En la URL de tu hoja, busca la parte entre `/d/` y `/edit`
- Ejemplo: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
- **Copia el ID**: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

---

## 🔧 **Paso 2: Configurar Google Cloud Console**

### 2.1 Ir a Google Cloud Console
- Ve a: https://console.cloud.google.com
- Inicia sesión con la misma cuenta de Google

### 2.2 Crear Proyecto
- Haz clic en el selector de proyectos (arriba a la izquierda)
- Haz clic en "Nuevo proyecto"
- Nombre: **"TRIBUS-Sheets-API"**
- Haz clic en "Crear"

### 2.3 Habilitar API
- En el menú lateral, ve a "APIs y servicios" > "Biblioteca"
- Busca "Google Sheets API"
- Haz clic en "Google Sheets API"
- Haz clic en "Habilitar"

### 2.4 Crear Credenciales
- Ve a "APIs y servicios" > "Credenciales"
- Haz clic en "Crear credenciales" > "Clave de API"
- **Copia la clave generada** (será algo como: `AIzaSyB...`)

---

## ⚙️ **Paso 3: Configurar Variables de Entorno**

### 3.1 Usar el Script Automático
```bash
./setup-google-sheets.sh
```

### 3.2 O Configurar Manualmente
```bash
heroku config:set REACT_APP_GOOGLE_SHEETS_ID="tu_id_de_hoja"
heroku config:set REACT_APP_GOOGLE_API_KEY="tu_clave_de_api"
```

---

## 🔗 **Paso 4: Configurar Permisos**

### 4.1 Compartir la Hoja
- Regresa a tu hoja de Google Sheets
- Haz clic en el botón "Compartir" (arriba a la derecha)
- En "Agregar personas y grupos", agrega tu email
- Dale permisos de "Editor"
- Haz clic en "Listo"

### 4.2 Configurar Pantalla de Consentimiento
- Regresa a Google Cloud Console
- Ve a "APIs y servicios" > "Pantalla de consentimiento de OAuth"
- Selecciona "Externo"
- Completa la información básica:
  - Nombre de la aplicación: **"TRIBUS Reservas"**
  - Email de soporte: tu email
  - Dominio autorizado: `tribus-reservas-app-2024-d989e6f9d084.herokuapp.com`
- Haz clic en "Guardar y continuar"

---

## 🚀 **Paso 5: Inicializar la Hoja**

### 5.1 Acceder a la Aplicación
- Ve a: https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/
- Inicia sesión como administrador:
  - Usuario: `admin`
  - Contraseña: `admin123`

### 5.2 Ir al Panel de Administración
- Haz clic en "Administración" en el menú
- Ve a la pestaña "Google Sheets"

### 5.3 Inicializar Estructura
- Haz clic en "Inicializar Hoja"
- Espera a que aparezca el mensaje de éxito

---

## ✅ **Paso 6: Verificar Funcionamiento**

### 6.1 Crear una Reserva de Prueba
- Ve a "Reservas" en el menú
- Crea una nueva reserva
- Completa todos los campos
- Haz clic en "Guardar"

### 6.2 Verificar en Google Sheets
- Regresa a tu hoja de Google Sheets
- Deberías ver la nueva reserva en la primera fila de datos
- Verifica que todos los campos estén correctos

---

## 🎉 **¡Listo!**

Tu sistema TRIBUS ahora está configurado para guardar automáticamente todas las reservas en Google Sheets.

### 📊 **Estructura de la Hoja**
La hoja tendrá las siguientes columnas:
- ID | Fecha | Hora | Duración | Área | Grupo | Asientos | Contacto | Email | Teléfono | Estado | Notas | Fecha Creación

### 🔄 **Funcionamiento Automático**
- Cada reserva creada se guarda automáticamente
- No necesitas hacer nada más
- Los datos están seguros en Google Sheets

### 📈 **Beneficios**
- Respaldo automático de todas las reservas
- Acceso desde cualquier dispositivo
- Análisis y reportes en Google Sheets
- Integración con otras herramientas de Google

---

## 🆘 **Solución de Problemas**

### Error: "Google Sheets no configurado"
- Verifica que las variables de entorno estén configuradas
- Ejecuta: `heroku config | grep GOOGLE`

### Error: "Error al configurar Google Sheets"
- Verifica que la API esté habilitada
- Asegúrate de que la hoja esté compartida
- Verifica que el ID de la hoja sea correcto

### Error: "Error de conexión"
- Verifica tu conexión a internet
- Asegúrate de que no haya límites de cuota excedidos
- Verifica que la clave de API sea válida
