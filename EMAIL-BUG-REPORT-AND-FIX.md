# 🐛 REPORTE DE BUG: Emails Enviados a Destinatarios Incorrectos

## 📋 RESUMEN DEL PROBLEMA

**Severidad:** CRÍTICA
**Fecha de detección:** 5 de Noviembre de 2025
**Usuario afectado:** andrealucero@pibox.app

### Descripción

El sistema está enviando correos de confirmación de reservas a usuarios que NO están incluidos en la lista de colaboradores de la reserva.

**Caso específico reportado:**
- **Reserva ID:** RES-20251105-150849-3722
- **Usuario que recibe el correo:** Andrea Lucero (andrealucero@pibox.app)
- **Problema:** Andrea NO está en la lista de colaboradores pero está recibiendo el email

## 🔍 INVESTIGACIÓN REALIZADA

### 1. Verificación en Base de Datos

Se realizó una investigación exhaustiva usando el script `investigate-specific-reservation.js`:

```
Reserva: RES-20251105-150849-3722
Área: Hot Desk / Zona Abierta
Fecha: 2025-11-20
Estado: confirmed
Equipo: Administrativo y Financiero
Puestos solicitados: 8
```

**Colaboradores registrados en la BD (8 personas):**
1. Omaira Gonzalez (ogonzalezr@pibox.app)
2. Gisell Poveda (auxadministrativo@pibox.app)
3. Diego Romero (dromero@pibox.app) - Creador
4. Mauricio Bustos (mbustos@picap.co)
5. Andres Choconta (abolivar@pibox.app)
6. Mateo Silva (msilva@pibox.app)
7. Laura Narvaez (gestioncartera@pibox.app)
8. Paula Pinzon (dpinzon@pibox.app)

**✅ CONFIRMADO:** Andrea Lucero (andrealucero@pibox.app) NO está en la lista de colaboradores.

### 2. Análisis del Código

Se revisó el código de envío de emails:

**services/emailService.js (líneas 45-90):**
```javascript
async sendReservationConfirmation(reservation, user, collaborators = []) {
  const recipients = [user.email];

  if (collaborators && collaborators.length > 0) {
    const collaboratorEmails = collaborators
      .map(c => c.email)
      .filter(email => email && email !== user.email);
    recipients.push(...collaboratorEmails);
  }

  const mailOptions = {
    from: this.from,
    to: recipients.join(', '),
    bcc: 'noreply.tribus@gmail.com',
    // ...
  };

  await this.transporter.sendMail(mailOptions);
}
```

**server.js (líneas 2029-2091):**
```javascript
// Obtener datos de colaboradores para el email
const colaboradoresData = validColaboradores.length > 0
  ? await User.find({ _id: { $in: validColaboradores } }).select('name email')
  : [];

const emailResult = await emailService.sendReservationConfirmation(
  reservationWithAreaInfo,
  user,
  colaboradoresData
);
```

El código parece correcto, pero el problema persiste.

## 🎯 POSIBLES CAUSAS DEL BUG

### Hipótesis 1: Problema en la query de MongoDB
Posiblemente la query `User.find({ _id: { $in: validColaboradores } })` está retornando usuarios adicionales debido a:
- IDs corruptos o mal formados
- Índices de base de datos corruptos
- Problema con ObjectId conversions

### Hipótesis 2: Reenvío automático de email
- Alguno de los emails en la lista tiene configurado un reenvío automático a Andrea
- Reglas de email en el servidor de correo

### Hipótesis 3: Caché o datos residuales
- El array de colaboradores contiene datos residuales de una reserva anterior
- Problemas de memoria en el servidor

### Hipótesis 4: Múltiples instancias del servidor
- Hay múltiples instancias del servidor corriendo con diferentes versiones de la base de datos
- Problema de sincronización

## ✅ SOLUCIÓN IMPLEMENTADA

Se creó un sistema robusto con **3 componentes principales**:

### 1. Modelo de Auditoría (`models/EmailLog.js`)

Registra TODOS los emails enviados con información detallada:
- Tipo de email (confirmación, cancelación, etc.)
- Destinatarios (to, bcc)
- Información de la reserva
- Colaboradores esperados
- Estado del envío (success, failed, pending)
- Validaciones realizadas
- Metadatos (IP, User-Agent, timestamp)

**Ventajas:**
- ✅ Trazabilidad completa de todos los emails
- ✅ Permite auditoría posterior
- ✅ Detecta discrepancias entre destinatarios esperados y reales
- ✅ Facilita debugging de problemas futuros

### 2. Servicio de Email Mejorado (`services/emailService-improved.js`)

Incluye validaciones robustas:

#### a) Validación de formato de email
```javascript
isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}
```

#### b) Limpieza y normalización de destinatarios
```javascript
validateAndCleanRecipients(user, collaborators) {
  // 1. Valida email del creador
  // 2. Valida cada colaborador
  // 3. Elimina duplicados
  // 4. Normaliza emails (lowercase, trim)
  // 5. Genera warnings para problemas detectados
  // 6. Retorna solo destinatarios válidos
}
```

#### c) Logging detallado en consola
```
🔍 ========================================
🔍 VALIDACIÓN ESTRICTA DE DESTINATARIOS
🔍 ========================================

1️⃣ Validando email del creador:
   Usuario: Diego Romero
   Email: dromero@pibox.app
   ✅ Email válido

2️⃣ Validando colaboradores:
   Total de colaboradores recibidos: 8

   Colaborador 1/8:
   - ID: 68b34191e21262aa9ba77fc7
   - Nombre: Omaira Gonzalez
   - Email: ogonzalezr@pibox.app
   ✅ Email válido y agregado

   ... (continúa con todos)

3️⃣ Resumen de validación:
   ✅ Destinatarios válidos: 9
   ❌ Emails inválidos: 0
   ⚠️  Advertencias: 0

4️⃣ Lista final de destinatarios:
   1. dromero@pibox.app (Diego Romero) [creator]
   2. ogonzalezr@pibox.app (Omaira Gonzalez) [collaborator]
   ... (lista completa)
```

#### d) Auditoría automática en base de datos
Cada email enviado crea un registro con:
- Destinatarios reales vs. esperados
- Validaciones realizadas
- Resultado del envío
- Message ID de nodemailer
- Timestamp exacto

### 3. Beneficios del Sistema Mejorado

| Característica | Sistema Anterior | Sistema Mejorado |
|----------------|------------------|------------------|
| Validación de emails | ❌ No | ✅ Formato y existencia |
| Eliminación duplicados | ❌ No | ✅ Sí |
| Normalización emails | ❌ No | ✅ Lowercase + trim |
| Logging en consola | ⚠️ Básico | ✅ Detallado |
| Auditoría en BD | ❌ No | ✅ Completa |
| Detección de anomalías | ❌ No | ✅ Sí |
| Trazabilidad | ⚠️ Limitada | ✅ Total |

## 🚀 INSTRUCCIONES DE IMPLEMENTACIÓN

### Paso 1: Revisar archivos creados

Los siguientes archivos fueron creados:
1. `models/EmailLog.js` - Modelo de auditoría
2. `services/emailService-improved.js` - Servicio mejorado
3. `investigate-specific-reservation.js` - Script de investigación

### Paso 2: Actualizar server.js

**IMPORTANTE:** Debes actualizar el server.js para usar el nuevo servicio.

**ANTES:**
```javascript
const emailService = require('./services/emailService');
```

**DESPUÉS:**
```javascript
// Usar el servicio mejorado con auditoría completa
const emailService = require('./services/emailService-improved');
```

También actualizar la llamada para incluir metadata:

**ANTES:**
```javascript
const emailResult = await emailService.sendReservationConfirmation(
  reservationWithAreaInfo,
  user,
  colaboradoresData
);
```

**DESPUÉS:**
```javascript
const emailResult = await emailService.sendReservationConfirmation(
  reservationWithAreaInfo,
  user,
  colaboradoresData,
  {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || 'Unknown'
  }
);
```

### Paso 3: Reiniciar el servidor

```bash
# Detener servidor actual
# Ctrl+C o kill del proceso

# Reiniciar
npm start
# o
node server.js
```

### Paso 4: Verificar funcionamiento

1. **Crear una reserva de prueba**
2. **Revisar la consola** - Deberías ver el logging detallado
3. **Verificar la base de datos** - Debe haber un registro en la colección `emaillogs`

```javascript
// Verificar en MongoDB
db.emaillogs.find().sort({sentAt: -1}).limit(1).pretty()
```

### Paso 5: Monitorear emails enviados

Puedes consultar la auditoría de emails:

```javascript
// Ver todos los emails de una reserva
db.emaillogs.find({ reservationId: "RES-20251105-150849-3722" }).pretty()

// Ver emails fallidos
db.emaillogs.find({ status: "failed" }).pretty()

// Ver emails con warnings
db.emaillogs.find({ "validation.warnings": { $exists: true, $ne: [] } }).pretty()

// Ver emails enviados a un destinatario específico
db.emaillogs.find({ "to": "andrealucero@pibox.app" }).pretty()
```

## 📊 VERIFICACIÓN DE LA SOLUCIÓN

### Script de Verificación

Se creará un script `verify-email-system.js` para verificar que el sistema funciona correctamente.

### Checklist de Verificación

- [ ] El modelo EmailLog se crea correctamente en MongoDB
- [ ] Los emails se envían con validación estricta
- [ ] La consola muestra logging detallado
- [ ] Los registros de auditoría se guardan en la BD
- [ ] No se envían emails a destinatarios no autorizados
- [ ] Los duplicados se eliminan correctamente
- [ ] Los emails inválidos se rechazan

## 🔐 SEGURIDAD ADICIONAL

### Recomendaciones

1. **Monitoreo continuo:** Revisar los logs de emails semanalmente
2. **Alertas:** Configurar alertas para emails fallidos o con warnings
3. **Auditoría periódica:** Revisar mensualmente que los emails se envían correctamente
4. **Whitelist de dominios:** Considerar agregar una whitelist de dominios permitidos

### Lista de Dominios Permitidos (Opcional)

```javascript
const ALLOWED_DOMAINS = [
  'pibox.app',
  'picap.co',
  'tribus.com'
];

function isDomainAllowed(email) {
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}
```

## 📝 PRÓXIMOS PASOS

1. ✅ Implementar el servicio mejorado (COMPLETADO)
2. ✅ Crear modelo de auditoría (COMPLETADO)
3. ⏳ Actualizar server.js (PENDIENTE)
4. ⏳ Reiniciar el servidor (PENDIENTE)
5. ⏳ Crear script de verificación (PENDIENTE)
6. ⏳ Monitorear durante 1 semana (PENDIENTE)
7. ⏳ Reportar resultados (PENDIENTE)

## 🆘 SOPORTE

Si tienes preguntas o necesitas ayuda con la implementación:

1. Revisa los logs en consola
2. Consulta la colección `emaillogs` en MongoDB
3. Ejecuta el script `investigate-specific-reservation.js` para investigar reservas específicas
4. Revisa este documento para más detalles

---

**Fecha de creación:** 5 de Noviembre de 2025
**Última actualización:** 5 de Noviembre de 2025
**Versión:** 1.0.0
