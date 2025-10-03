# 🚀 Información de Deployment

## 📍 URL de la Aplicación
**Producción:** https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/

## 🔧 Configuración de Heroku

### App Principal
- **Nombre:** `tribus-reservas-app-2024`
- **Región:** US
- **Stack:** heroku-24
- **Owner:** hectorn.personal@gmail.com

### Variables de Entorno Configuradas
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://tribus_admin:Tribus2024@cluster0.o16ucum.mongodb.net/tribus?retryWrites=true&w=majority&appName=Cluster0
REACT_APP_GOOGLE_API_KEY=AIzaSyCpH9XKQo_RsDAwt07iaeZJqcD7fV12KYg
REACT_APP_GOOGLE_SHEETS_ID=1Y9EEbhFmQdrD8kbwS4QSnAVeeA5fDjjyVIE1mzbY14I
```

## 📦 Deployment

### Deploy Manual
```bash
git push heroku main
```

### Ver Logs
```bash
heroku logs --tail --app tribus-reservas-app-2024
```

### Abrir App
```bash
heroku open --app tribus-reservas-app-2024
```

## 🗄️ Base de Datos

### MongoDB Atlas
- **Cluster:** Cluster0
- **Database:** tribus
- **Usuario:** tribus_admin

### Acceder a MongoDB
```bash
mongosh "mongodb+srv://cluster0.o16ucum.mongodb.net/tribus" --username tribus_admin
```

## 🔐 Credenciales de Acceso

Ver archivo `CREDENCIALES.md` para lista completa de usuarios y contraseñas.

**Acceso rápido:**
- Usuario: `admin`
- Contraseña: `admin123`

## 📝 Historial de Cambios

### v200 - Última versión desplegada
- ✅ Eliminación de sección "Nombres de Asistentes"
- ✅ Corrección de sistema de selección de colaboradores
- ✅ Configuración de MONGODB_URI
- ✅ Reset de contraseñas de usuarios principales

### Apps Eliminadas
- ❌ `tribus-reservas-2024` (eliminada el 3 de Octubre 2025)
  - Razón: App duplicada, consolidación a una sola instancia

## 🔄 Git Remotes

```bash
heroku → https://git.heroku.com/tribus-reservas-app-2024.git
```

## ⚙️ Comandos Útiles

### Reiniciar Dynos
```bash
heroku restart --app tribus-reservas-app-2024
```

### Escalar Dynos
```bash
heroku ps:scale web=1 --app tribus-reservas-app-2024
```

### Ver Estado
```bash
heroku ps --app tribus-reservas-app-2024
```

### Configurar Variables
```bash
heroku config:set VARIABLE=valor --app tribus-reservas-app-2024
```

---

**Última actualización:** 3 de Octubre de 2025
