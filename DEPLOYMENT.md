# 🚀 Guía de Despliegue en Heroku - TRIBUS

## 📋 Prerrequisitos

1. **Cuenta de Heroku**: Crear una cuenta en [heroku.com](https://heroku.com)
2. **Git**: Asegúrate de tener Git instalado
3. **Node.js**: Versión 18.x o superior

## 🔧 Instalación de Heroku CLI

### Opción 1: Descarga Directa (Recomendada)
1. Ve a [https://devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
2. Descarga el instalador para macOS
3. Instala y ejecuta el instalador

### Opción 2: Usando npm (si tienes permisos)
```bash
npm install -g heroku
```

## 🚀 Pasos para Desplegar

### 1. Inicializar Git (si no está inicializado)
```bash
git init
git add .
git commit -m "Initial commit for Heroku deployment"
```

### 2. Crear Aplicación en Heroku
```bash
# Iniciar sesión en Heroku
heroku login

# Crear nueva aplicación
heroku create tribus-reservas-app

# O si quieres un nombre específico
heroku create tu-nombre-tribus
```

### 3. Configurar Buildpacks
```bash
# Agregar buildpack de Node.js
heroku buildpacks:add heroku/nodejs

# Agregar buildpack estático
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static
```

### 4. Configurar Variables de Entorno
```bash
# Configurar entorno de producción
heroku config:set NODE_ENV=production
```

### 5. Desplegar la Aplicación
```bash
# Subir código a Heroku
git push heroku main

# O si tu rama principal es master
git push heroku master
```

### 6. Abrir la Aplicación
```bash
# Abrir en el navegador
heroku open
```

## 🔍 Verificar el Despliegue

### Ver Logs
```bash
# Ver logs en tiempo real
heroku logs --tail

# Ver logs recientes
heroku logs
```

### Verificar Estado
```bash
# Ver información de la aplicación
heroku info

# Ver variables de entorno
heroku config
```

## 🛠️ Comandos Útiles

### Reiniciar la Aplicación
```bash
heroku restart
```

### Ejecutar Comandos en Heroku
```bash
# Ejecutar comando en Heroku
heroku run npm run build
```

### Ver Escalado
```bash
# Ver dynos activos
heroku ps
```

## 📝 Notas Importantes

### Plan Gratuito de Heroku
- **Limitaciones**: La aplicación se "duerme" después de 30 minutos de inactividad
- **Primera carga**: Puede tardar unos segundos en "despertar"
- **Uso**: Ideal para pruebas y demostraciones

### Planes de Pago
- **Hobby**: $7/mes - Sin sleep, mejor rendimiento
- **Standard**: $25/mes - Para aplicaciones en producción

## 🔧 Solución de Problemas

### Error de Build
```bash
# Ver logs detallados
heroku logs --tail

# Reconstruir la aplicación
git commit --allow-empty -m "Trigger rebuild"
git push heroku main
```

### Error de Buildpack
```bash
# Ver buildpacks configurados
heroku buildpacks

# Remover y agregar de nuevo
heroku buildpacks:clear
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static
```

### Error de Puerto
- Heroku asigna automáticamente el puerto
- La aplicación debe usar `process.env.PORT`

## 🌐 URLs de la Aplicación

Una vez desplegada, tu aplicación estará disponible en:
- **URL principal**: `https://tu-app-name.herokuapp.com`
- **URL personalizada**: Puedes configurar un dominio personalizado

## 📞 Soporte

Si tienes problemas con el despliegue:
1. Revisa los logs: `heroku logs --tail`
2. Verifica la configuración: `heroku config`
3. Consulta la documentación de Heroku
4. Contacta al equipo de desarrollo

---

**¡Tu aplicación TRIBUS estará lista para ser usada por cualquier persona en internet!** 🌍
