# 🚀 Guía de Despliegue - Sistema de Reservas Tribus

## 📋 Prerrequisitos

### Heroku CLI
```bash
# Instalar Heroku CLI
brew install heroku/brew/heroku

# Verificar instalación
heroku --version
```

### Git
```bash
# Verificar que Git esté configurado
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

## 🔧 Configuración de Heroku

### 1. Crear Aplicación en Heroku
```bash
# Login en Heroku
heroku login

# Crear aplicación
heroku create tribus-reservas-app

# Verificar aplicación creada
heroku apps
```

### 2. Configurar Variables de Entorno
```bash
# Configurar MongoDB Atlas
heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/tribus-reservas"

# Configurar JWT Secret
heroku config:set JWT_SECRET="tu-jwt-secret-super-seguro"

# Configurar puerto (Heroku lo asigna automáticamente)
heroku config:set PORT=3001

# Verificar variables
heroku config
```

### 3. Configurar Buildpacks
```bash
# Agregar buildpack de Node.js
heroku buildpacks:set heroku/nodejs

# Verificar buildpacks
heroku buildpacks
```

## 📦 Preparación para Despliegue

### 1. Actualizar package.json
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "npm run build:client",
    "build:client": "cd client && npm run build",
    "heroku-postbuild": "npm install && npm run build"
  },
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

### 2. Crear Procfile
```bash
# Crear archivo Procfile en la raíz
echo "web: node server.js" > Procfile
```

### 3. Configurar Servidor para Producción
```javascript
// server.js - Agregar al final
const PORT = process.env.PORT || 3001;

// Servir archivos estáticos en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
```

## 🚀 Proceso de Despliegue

### 1. Preparar Repositorio
```bash
# Inicializar git si no existe
git init

# Agregar archivos
git add .

# Commit inicial
git commit -m "Initial commit - Sistema de Reservas Tribus"

# Agregar remote de Heroku
heroku git:remote -a tribus-reservas-app
```

### 2. Desplegar a Heroku
```bash
# Desplegar
git push heroku main

# Ver logs
heroku logs --tail

# Abrir aplicación
heroku open
```

### 3. Verificar Despliegue
```bash
# Verificar estado
heroku ps

# Ver logs en tiempo real
heroku logs --tail

# Abrir aplicación
heroku open
```

## 🔧 Configuración de MongoDB Atlas

### 1. Crear Cluster
1. Ir a [MongoDB Atlas](https://cloud.mongodb.com)
2. Crear nuevo cluster
3. Configurar región (us-east-1 para Heroku)
4. Crear usuario de base de datos

### 2. Configurar Acceso de Red
```bash
# Agregar IP de Heroku (0.0.0.0/0 para desarrollo)
# En MongoDB Atlas > Network Access > Add IP Address
```

### 3. Obtener Connection String
```bash
# Formato de connection string
mongodb+srv://username:password@cluster.mongodb.net/tribus-reservas?retryWrites=true&w=majority
```

## 📊 Monitoreo y Mantenimiento

### 1. Logs de Heroku
```bash
# Ver logs recientes
heroku logs

# Ver logs en tiempo real
heroku logs --tail

# Ver logs de una app específica
heroku logs --app tribus-reservas-app
```

### 2. Métricas de la Aplicación
```bash
# Ver métricas
heroku ps

# Ver uso de recursos
heroku ps:scale web=1

# Reiniciar aplicación
heroku restart
```

### 3. Base de Datos
```bash
# Conectar a MongoDB Atlas
# Usar MongoDB Compass o mongo shell
# Connection string: MONGODB_URI de Heroku
```

## 🔒 Configuración de Seguridad

### 1. Variables de Entorno Sensibles
```bash
# JWT Secret (generar uno seguro)
openssl rand -base64 32

# MongoDB URI (con credenciales seguras)
# Usar usuario con permisos mínimos necesarios
```

### 2. Rate Limiting en Producción
```javascript
// Ajustar para producción
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana (ajustar según necesidad)
  message: {
    error: 'Demasiadas peticiones, intenta de nuevo más tarde'
  }
});
```

### 3. CORS para Producción
```javascript
// Configurar CORS para dominio específico
app.use(cors({
  origin: ['https://tribus-reservas-app.herokuapp.com'],
  credentials: true
}));
```

## 🧪 Testing en Producción

### 1. Verificar Endpoints
```bash
# Probar endpoint principal
curl https://tribus-reservas-app.herokuapp.com/api/users

# Probar autenticación
curl -X POST https://tribus-reservas-app.herokuapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### 2. Verificar Base de Datos
```bash
# Conectar a MongoDB Atlas
# Verificar que las colecciones se crearon correctamente
# Probar operaciones CRUD
```

## 📋 Checklist de Despliegue

### Pre-Despliegue
- [ ] Variables de entorno configuradas
- [ ] MongoDB Atlas configurado
- [ ] Buildpacks configurados
- [ ] Procfile creado
- [ ] Código committeado

### Despliegue
- [ ] Aplicación desplegada en Heroku
- [ ] Variables de entorno configuradas en Heroku
- [ ] Aplicación accesible via URL
- [ ] Logs sin errores críticos

### Post-Despliegue
- [ ] Login funcionando
- [ ] Creación de usuarios funcionando
- [ ] Creación de reservas funcionando
- [ ] Calendario de disponibilidad funcionando
- [ ] Todas las funcionalidades operativas

## 🚨 Troubleshooting

### Error: "Cannot find module"
```bash
# Verificar que todas las dependencias estén en package.json
npm install --save <missing-module>
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push heroku main
```

### Error: "MongoDB connection failed"
```bash
# Verificar MONGODB_URI
heroku config:get MONGODB_URI

# Verificar que la IP esté en whitelist de MongoDB Atlas
# Verificar credenciales de usuario
```

### Error: "Port already in use"
```bash
# Verificar que el servidor use process.env.PORT
const PORT = process.env.PORT || 3001;
```

## 📞 Soporte

**Desarrollador**: Hector Neira  
**Email**: hneira@picap.co  
**Aplicación**: https://tribus-reservas-app.herokuapp.com

---

**Última actualización**: Septiembre 11, 2025