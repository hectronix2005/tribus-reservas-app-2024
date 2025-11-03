# 📧 Guía de Configuración de Notificaciones por Email

## Funcionalidades

El sistema envía automáticamente notificaciones por email cuando:
- ✅ Se crea una nueva reserva (al usuario y todos los colaboradores)
- ❌ Se cancela una reserva
- 📋 Se modifica una reserva (próximamente)

## Configuración con Gmail (Recomendado)

### Paso 1: Crear una Contraseña de Aplicación en Gmail

1. **Ir a tu cuenta de Google**
   - Ve a https://myaccount.google.com/

2. **Habilitar 2FA (si no está habilitado)**
   - Ve a "Seguridad" → "Verificación en dos pasos"
   - Sigue los pasos para habilitarla

3. **Crear Contraseña de Aplicación**
   - Ve a "Seguridad" → "Contraseñas de aplicaciones"
   - Selecciona "Correo" y "Otro (nombre personalizado)"
   - Escribe "Tribus Reservas"
   - Click en "Generar"
   - **Guarda la contraseña de 16 dígitos** (sin espacios)

### Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Copia el archivo de ejemplo
cp .env.example .env
```

Edita el archivo `.env` y agrega:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=tucorreo@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # La contraseña de aplicación de 16 dígitos
EMAIL_FROM=Tribus Reservas <noreply@tribus.com>
```

### Paso 3: Reiniciar el Servidor

```bash
# Detener el servidor actual (Ctrl+C)
# Reiniciar
npm start
```

Deberías ver:
```
✅ Servicio de email inicializado correctamente
```

## Configuración con Otros Servicios

### Outlook / Hotmail

```env
EMAIL_SERVICE=hotmail
EMAIL_USER=tucorreo@outlook.com
EMAIL_PASSWORD=tu-contraseña
```

### Yahoo

```env
EMAIL_SERVICE=yahoo
EMAIL_USER=tucorreo@yahoo.com
EMAIL_PASSWORD=tu-contraseña-de-aplicacion
```

### Servidor SMTP Personalizado

```env
EMAIL_SERVICE=
EMAIL_HOST=smtp.tu-servidor.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=usuario@tu-dominio.com
EMAIL_PASSWORD=tu-contraseña
```

## Plantillas de Email

El sistema incluye dos plantillas HTML profesionales:

### 1. Confirmación de Reserva ✅

Incluye:
- ID de la reserva
- Área reservada
- Fecha y horario
- Equipo y colaboradores
- Notas adicionales
- Diseño responsive y profesional

### 2. Cancelación de Reserva ❌

Incluye:
- Detalles de la reserva cancelada
- Notificación clara de cancelación
- Diseño responsive

## Probar el Sistema

### Crear una Reserva de Prueba

1. Inicia sesión en la aplicación
2. Crea una nueva reserva
3. Verifica tu email (y el de los colaboradores)
4. Deberías recibir un email de confirmación

### Verificar Logs

El servidor mostrará:

```
📧 Email enviado exitosamente a 3 destinatario(s)
   ID: <mensaje-id@gmail.com>
```

## Solución de Problemas

### Error: "Authentication failed"

❌ **Problema**: Contraseña incorrecta

✅ **Solución**:
- Verifica que estés usando una "Contraseña de aplicación", no tu contraseña normal de Gmail
- Asegúrate de copiar los 16 dígitos sin espacios
- Verifica que la 2FA esté habilitada en tu cuenta de Google

### Error: "Service not configured"

❌ **Problema**: Variables de entorno no configuradas

✅ **Solución**:
- Verifica que el archivo `.env` exista en la raíz del proyecto
- Asegúrate de que las variables estén correctamente definidas
- Reinicia el servidor después de modificar `.env`

### No se envían emails pero no hay errores

⚠️  **Problema**: Modo desarrollo sin configuración

✅ **Solución**:
- El sistema está configurado para NO lanzar errores si el email no está configurado
- Verás este mensaje: `⚠️ Servicio de email no configurado. Saltando notificación.`
- Configura las variables de entorno para habilitar notificaciones

### Los emails van a spam

⚠️  **Problema**: Configuración de dominio o contenido

✅ **Solución**:
1. Si usas Gmail personal, los emails deberían llegar a inbox
2. Para dominio personalizado, configura SPF, DKIM y DMARC
3. Evita palabras spam en el asunto ("gratis", "urgente", etc.)

## Variables de Entorno Completas

```env
# Email Service
EMAIL_SERVICE=gmail                           # Servicio (gmail, hotmail, yahoo)
EMAIL_USER=tucorreo@gmail.com                # Tu email
EMAIL_PASSWORD=abcd efgh ijkl mnop           # Contraseña de aplicación
EMAIL_FROM=Tribus Reservas <noreply@tribus.com>  # Nombre y email del remitente

# SMTP Personalizado (opcional)
EMAIL_HOST=smtp.gmail.com                    # Servidor SMTP
EMAIL_PORT=587                               # Puerto (587 para TLS, 465 para SSL)
EMAIL_SECURE=false                           # true para SSL, false para TLS
```

## Personalización de Plantillas

Las plantillas se encuentran en:
```
services/emailService.js
```

Métodos disponibles para editar:
- `getReservationConfirmationTemplate()` - Plantilla de confirmación
- `getCancellationTemplate()` - Plantilla de cancelación
- `getReservationConfirmationText()` - Versión texto plano

## Límites de Envío

### Gmail
- **Límite**: 500 emails/día
- **Recomendación**: Perfecto para uso empresarial pequeño/mediano

### Outlook/Hotmail
- **Límite**: 300 emails/día

### Yahoo
- **Límite**: 500 emails/día

Para volúmenes mayores, considera:
- SendGrid (99,000 emails/mes gratis)
- AWS SES (62,000 emails/mes gratis)
- Mailgun (5,000 emails/mes gratis)

## Seguridad

✅ **Buenas Prácticas**:
- Usa contraseñas de aplicación, NO tu contraseña principal
- No compartas tu archivo `.env`
- Agrega `.env` a `.gitignore`
- Rota las contraseñas de aplicación periódicamente

❌ **NO Hacer**:
- NO uses "Acceso de apps menos seguras" (deprecated)
- NO compartas credenciales en el código
- NO subas `.env` a repositorios públicos

## Monitoreo

Para ver si los emails se están enviando:

```bash
# En los logs del servidor verás:
📧 Email enviado exitosamente a 3 destinatario(s)
   ID: <1234567890@gmail.com>

# O si falla:
❌ Error enviando email: Authentication failed
```

## FAQ

**P: ¿Puedo usar mi email personal?**
R: Sí, pero recomendamos crear un email específico para la aplicación (ej: reservas@tuempresa.com)

**P: ¿Los colaboradores recibirán el email?**
R: Sí, todos los colaboradores agregados a la reserva recibirán una copia del email de confirmación.

**P: ¿Qué pasa si el email falla?**
R: La reserva se crea exitosamente. El email es una notificación adicional, no afecta el funcionamiento del sistema.

**P: ¿Puedo desactivar las notificaciones?**
R: Sí, simplemente no configures las variables de entorno de email. El sistema funcionará normalmente sin enviar notificaciones.

---

**Última actualización**: 3 de noviembre de 2025
**Versión**: 1.0.0
