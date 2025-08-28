# Configuración MongoDB Atlas - TRIBUS

## ✅ Configuración Actual

El sistema TRIBUS está configurado para usar **únicamente MongoDB Atlas** como base de datos remota.

### 🔧 Configuración de Conexión

- **Proveedor**: MongoDB Atlas
- **Cluster**: Cluster0
- **Base de datos**: tribus
- **Host**: ac-8euioba-shard-00-00.o16ucum.mongodb.net
- **Puerto**: 27017

### 📁 Archivos de Configuración

1. **`mongodb-config.js`** - Configuración centralizada de MongoDB Atlas
2. **`server.js`** - Servidor principal que usa la configuración
3. **`verify-mongodb-only.js`** - Script de verificación

### 🚀 Inicio del Servidor

```bash
npm start
```

### 🔍 Verificación de Conexión

```bash
node verify-mongodb-only.js
```

### 📊 Endpoints de Verificación

- **Health Check**: `GET /api/health`
- **Áreas**: `GET /api/areas`
- **Usuarios**: `GET /api/users`

### 🔒 Características de Seguridad

- ✅ Solo conexión remota a MongoDB Atlas
- ✅ Sin conexiones locales
- ✅ Timeouts configurados
- ✅ Pool de conexiones optimizado
- ✅ CORS configurado para desarrollo

### 🌐 Variables de Entorno

```bash
MONGODB_URI=mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0
```

### 📝 Logs del Servidor

Al iniciar el servidor, deberías ver:

```
🚀 Servidor TRIBUS ejecutándose en puerto 3000
📊 API disponible en http://localhost:3000/api
🌐 Frontend disponible en http://localhost:3000
🗄️  Base de datos: MongoDB Atlas (remota)
🔒 Modo: Solo conexión remota a MongoDB Atlas
✅ Conectado exitosamente a MongoDB Atlas
🗄️  Base de datos: tribus
🌐 Cluster: Cluster0
☁️  Proveedor: MongoDB Atlas
```

### ⚠️ Notas Importantes

1. **No hay conexión local**: El sistema solo usa MongoDB Atlas
2. **Requiere internet**: Necesita conexión a internet para funcionar
3. **Credenciales seguras**: Las credenciales están en variables de entorno
4. **Backup automático**: Los datos se respaldan automáticamente en MongoDB Atlas
