# 🔒 Prueba de Recuperación de Contraseña

## ✅ Implementación Completada

La funcionalidad completa de recuperación de contraseña ha sido implementada con éxito.

## 📁 Archivos Creados/Modificados

### Backend
1. **models/PasswordReset.js** - Modelo de tokens de recuperación
2. **services/emailTemplates.js** - Plantillas HTML para emails
3. **server.js** - Endpoints agregados:
   - `POST /api/forgot-password`
   - `POST /api/reset-password`

### Frontend
1. **src/services/api.ts** - Métodos de API actualizados
2. **src/components/ForgotPassword.tsx** - Conectado a API real
3. **src/components/ResetPassword.tsx** - Validación de token real

## 🧪 Cómo Probar

### Paso 1: Solicitar Recuperación de Contraseña

1. Ir a la página de login
2. Hacer clic en "¿Olvidaste tu contraseña?"
3. Ingresar un email válido de usuario (ejemplo: `hneira@picap.co`)
4. Hacer clic en "Enviar Instrucciones"

**Resultado esperado:**
- Mensaje de éxito en pantalla
- Email enviado a la dirección especificada
- Log en base de datos en colección `emaillogs`
- Token guardado en colección `passwordresets`

### Paso 2: Verificar Email Enviado

**Usando script de logs:**
```bash
node ver-emails-enviados.js
```

**Consulta directa a MongoDB:**
```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const emails = await db.collection('emaillogs')
    .find({ emailType: 'password_reset' })
    .sort({ sentAt: -1 })
    .limit(5)
    .toArray();
  console.log('📧 Últimos emails de recuperación:');
  emails.forEach((e, i) => {
    console.log(\`\${i+1}. Para: \${e.to[0]} - Estado: \${e.status} - Fecha: \${e.sentAt}\`);
  });
  await mongoose.connection.close();
})();
"
```

### Paso 3: Obtener Token para Pruebas

**En desarrollo, puedes obtener el token desde MongoDB:**
```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const PasswordReset = require('./models/PasswordReset');
  const latest = await PasswordReset.findOne({ used: false })
    .sort({ createdAt: -1 });
  if (latest) {
    console.log('🔑 Token más reciente (sin usar):');
    console.log('Email:', latest.email);
    console.log('Expira:', latest.expiresAt);
    console.log('Token (hashed):', latest.token);
    console.log('\\n⚠️ NOTA: El token en BD está hasheado.');
    console.log('El token real se envió por email.');
  } else {
    console.log('❌ No hay tokens disponibles');
  }
  await mongoose.connection.close();
})();
"
```

### Paso 4: Usar el Token

1. Abrir el email recibido
2. Hacer clic en el enlace (formato: `http://localhost:5173/reset-password?token=XXXXX`)
3. Ingresar nueva contraseña (mínimo 6 caracteres)
4. Confirmar contraseña
5. Hacer clic en "Actualizar Contraseña"

**Resultado esperado:**
- Contraseña actualizada en la base de datos
- Token marcado como usado
- Mensaje de éxito
- Redirección a login

### Paso 5: Verificar Cambio de Contraseña

1. Ir a login
2. Intentar login con email y **contraseña antigua** ❌ (debe fallar)
3. Intentar login con email y **contraseña nueva** ✅ (debe funcionar)

## 🔍 Verificaciones de Seguridad

### ✅ Implementadas:

1. **Token Seguro**:
   - 256 bits aleatorios
   - Hasheado con SHA-256 antes de guardar

2. **Expiración**:
   - 30 minutos de validez
   - Auto-eliminación de MongoDB después de expirar

3. **Un Solo Uso**:
   - Token marcado como "usado" después del reset
   - No se puede reutilizar el mismo token

4. **Invalidación de Tokens Anteriores**:
   - Al solicitar nuevo token, los anteriores se marcan como usados

5. **Protección contra Enumeración**:
   - Mismo mensaje de éxito si el email existe o no
   - Previene descubrir emails válidos

6. **Rate Limiting**:
   - Aplicado a nivel de API (1000 req/15min en desarrollo)

7. **Auditoría Completa**:
   - Todos los intentos registrados en `emaillogs`
   - IP y User-Agent guardados para análisis

## 📊 Consultas Útiles

### Ver todos los tokens activos
```javascript
db.passwordresets.find({ used: false, expiresAt: { $gt: new Date() } })
```

### Ver intentos de recuperación por usuario
```javascript
db.emaillogs.find({
  emailType: 'password_reset',
  to: 'hneira@picap.co'
}).sort({ sentAt: -1 })
```

### Limpiar tokens expirados manualmente
```javascript
db.passwordresets.deleteMany({ expiresAt: { $lt: new Date() } })
```

## 🎨 Características del Email

- ✅ Diseño profesional responsive
- ✅ Botón destacado para reset
- ✅ Enlace alternativo en texto plano
- ✅ Advertencias de seguridad
- ✅ Indicador de expiración (30 minutos)
- ✅ Versión HTML y texto plano (fallback)

## 🚀 Producción

Para producción, asegurarse de:

1. Configurar `FRONTEND_URL` en variables de entorno
2. Usar SMTP seguro (TLS/SSL)
3. Configurar SPF, DKIM, DMARC para el dominio
4. Monitorear logs de emails
5. Considerar reducir tiempo de expiración si es necesario
6. Implementar límite de intentos por email/IP

## 📝 Notas

- El sistema usa el mismo servicio de emails que las confirmaciones de reserva
- Los logs se guardan en la misma colección `emaillogs` con tipo `password_reset`
- Los tokens se almacenan hasheados (nunca en texto plano)
- La colección `passwordresets` tiene auto-eliminación configurada

---

**Estado**: ✅ Implementación completa y lista para pruebas
**Fecha**: 2025-11-13
