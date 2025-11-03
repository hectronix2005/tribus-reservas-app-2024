# 📦 Sistema de Backup y Contingencia

## Garantía del 100% de Integridad de Datos

Este sistema garantiza que **NUNCA** se pierdan reservas mediante múltiples capas de protección.

## 🛡️ Capas de Protección

### 1. **MongoDB Atlas** (Capa Principal)
- Base de datos en la nube con replicación automática
- Backups automáticos diarios de MongoDB Atlas
- Recuperación point-in-time disponible

### 2. **Backups Locales Automáticos** (Capa de Contingencia)
- Backups automáticos antes de operaciones DELETE
- Backups automáticos antes de operaciones UPDATE masivas
- Backups periódicos cada 30 minutos
- Se mantienen los últimos 50 backups

### 3. **Sistema de Auditoría** (Trazabilidad)
- Registro de todas las operaciones que modifican datos
- Logs diarios con timestamp, usuario, operación y datos
- Almacenados en `./audit-logs/`

## 📋 Comandos Disponibles

### Crear Backups

```bash
# Backup completo de todas las colecciones
npm run backup:create

# Backup solo de reservaciones
npm run backup:create-reservations

# Backup incremental (solo cambios desde último backup)
npm run backup:incremental
```

### Listar Backups

```bash
# Ver todos los backups disponibles
npm run backup:list
```

### Verificar Integridad

```bash
# Verificar que un backup esté válido
npm run backup:verify full-backup-2025-11-03T05-00-40-310Z.json
```

### Restaurar Datos

```bash
# Restaurar desde un backup específico
npm run backup:restore full-backup-2025-11-03T05-00-40-310Z.json
```

⚠️ **IMPORTANTE**: Antes de restaurar, se crea automáticamente un backup de seguridad de los datos actuales.

### Ayuda

```bash
# Ver todos los comandos disponibles
npm run backup:help
```

## 🔄 Recuperación de Datos Perdidos

Si se perdieron reservas, sigue estos pasos:

### Paso 1: Verificar cuántas reservas tienes actualmente

```bash
# Conéctate a MongoDB y verifica
mongosh "mongodb+srv://cluster0.o16ucum.mongodb.net/tribus" --username tribus_admin
use tribus
db.reservations.countDocuments()
```

### Paso 2: Listar backups disponibles

```bash
npm run backup:list
```

Verás una lista como esta:
```
1. full-backup-2025-11-03T05-00-40-310Z.json
   📅 Creado: 11/3/2025, 12:00:42 AM
   📊 Registros: 301
   💾 Tamaño: 987.73 KB
```

### Paso 3: Verificar el backup antes de restaurar

```bash
npm run backup:verify full-backup-2025-11-03T05-00-40-310Z.json
```

### Paso 4: Restaurar el backup

```bash
npm run backup:restore full-backup-2025-11-03T05-00-40-310Z.json
```

### Paso 5: Verificar que se restauraron correctamente

```bash
# Conéctate a MongoDB nuevamente
db.reservations.countDocuments()
```

## 🚨 Recuperación de Emergencia

Si necesitas recuperar datos urgentemente:

1. **Detén el servidor** para evitar más pérdidas
   ```bash
   # Mata todos los procesos node
   killall node
   ```

2. **Lista los backups** y encuentra el más reciente
   ```bash
   npm run backup:list
   ```

3. **Restaura inmediatamente**
   ```bash
   npm run backup:restore [archivo-del-backup]
   ```

4. **Reinicia el servidor**
   ```bash
   # Terminal 1: Backend
   npm start

   # Terminal 2: Frontend
   npm run dev
   ```

## 📊 Logs de Auditoría

Todos los cambios se registran en `./audit-logs/audit-YYYY-MM-DD.log`

Cada entrada contiene:
- Timestamp exacto
- Operación realizada (POST, PUT, DELETE)
- Usuario que ejecutó la operación
- Datos modificados
- IP y User-Agent

Ejemplo de entrada:
```json
{
  "timestamp": "2025-11-03T05:00:00.000Z",
  "operation": "DELETE_/api/reservations/:id",
  "details": {
    "method": "DELETE",
    "path": "/api/reservations/123",
    "userId": "user123",
    "userEmail": "admin@tribus.com",
    "ip": "::1"
  }
}
```

## 🔐 Ubicación de Archivos

- **Backups**: `./backups/`
- **Logs de Auditoría**: `./audit-logs/`
- **Sistema de Backup**: `./utils/backupSystem.js`
- **Middleware**: `./middleware/backupMiddleware.js`
- **CLI Manager**: `./scripts/backup-manager.js`

## ⚙️ Configuración Automática

El sistema está configurado para:

✅ Crear backup automático cada 30 minutos
✅ Backup antes de cada DELETE
✅ Backup antes de UPDATE masivo
✅ Registrar todas las operaciones en logs
✅ Mantener últimos 50 backups (limpieza automática)
✅ Verificación de integridad incluida

## 🎯 Garantías

1. **Nunca se pierden datos**: Múltiples capas de respaldo
2. **Trazabilidad completa**: Logs de auditoría de todas las operaciones
3. **Recuperación rápida**: Comandos simples para restaurar
4. **Validación automática**: Verificación de integridad de backups
5. **Protección antes de operaciones críticas**: Backups automáticos antes de DELETE/UPDATE

## 📞 Soporte

Si tienes problemas con el sistema de backup:

1. Revisa los logs en `./audit-logs/`
2. Verifica la integridad del backup con `npm run backup:verify`
3. Lista todos los backups disponibles con `npm run backup:list`
4. En caso de emergencia, restaura el backup más reciente

---

**Última actualización**: 3 de noviembre de 2025
**Versión del sistema**: 2.0.0
**Estado**: ✅ Activo y operacional
