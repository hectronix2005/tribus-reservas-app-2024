# 🔑 Crear Nueva API Key para Google Sheets

## 🚨 Problema: Error 403 - Permisos Denegados

Si el error 403 persiste después de configurar los permisos, necesitamos crear una nueva API Key sin restricciones.

## 📋 Pasos para Crear Nueva API Key:

### 1. Ir a Google Cloud Console
- Ve a: https://console.cloud.google.com/
- Inicia sesión con tu cuenta de Google

### 2. Seleccionar Proyecto
- Asegúrate de que el proyecto "TRIBUS-Sheets-API" esté seleccionado
- Si no existe, créalo primero

### 3. Ir a Credenciales
- En el menú lateral, ve a "APIs y servicios" > "Credenciales"
- Haz clic en "Crear credenciales" > "Clave de API"

### 4. Configurar la Nueva API Key
- **IMPORTANTE**: No agregues restricciones de dominio
- **IMPORTANTE**: No agregues restricciones de aplicación
- Deja la API Key completamente abierta para pruebas

### 5. Copiar la Nueva Clave
- Copia la nueva clave generada (será algo como: `AIzaSyB...`)

### 6. Actualizar Variables de Entorno
```bash
heroku config:set REACT_APP_GOOGLE_API_KEY="tu_nueva_clave_aqui"
```

### 7. Verificar Configuración
```bash
heroku config | grep GOOGLE
```

### 8. Probar Conexión
- Ve a la aplicación
- Inicia sesión como administrador
- Ve a "Google Sheets" en el panel de administración
- Haz clic en "Probar Conexión"

## ⚠️ Notas Importantes:

### Para Desarrollo/Pruebas:
- La API Key sin restricciones es segura para desarrollo
- Google tiene límites de cuota que protegen contra abuso
- Puedes agregar restricciones más tarde cuando todo funcione

### Para Producción:
- Una vez que funcione, puedes agregar restricciones
- Restringe por dominio: `tribus-reservas-app-2024-d989e6f9d084.herokuapp.com`
- Restringe por IP si es necesario

## 🔍 Verificar que Funcione:

1. **Probar conexión** desde el panel de administración
2. **Inicializar hoja** si la conexión es exitosa
3. **Crear reserva de prueba** para verificar que se guarde
4. **Verificar en Google Sheets** que aparezca la reserva

## 📞 Si Aún Hay Problemas:

1. **Verificar que la API esté habilitada**:
   - Ve a "APIs y servicios" > "Biblioteca"
   - Busca "Google Sheets API"
   - Asegúrate de que esté habilitada

2. **Verificar permisos de la hoja**:
   - La hoja debe estar compartida con permisos de "Editor"
   - Tu email debe tener acceso

3. **Revisar logs de la consola**:
   - Abre la consola del navegador (F12)
   - Revisa los logs detallados
   - Busca errores específicos
