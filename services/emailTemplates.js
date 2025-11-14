/**
 * Plantillas de email para diferentes tipos de notificaciones
 */

/**
 * Plantilla para email de recuperación de contraseña
 */
const passwordResetTemplate = (name, resetUrl, expirationMinutes = 30) => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperación de Contraseña - Tribus</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Contenedor principal -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header con logo y título -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="#667eea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Recuperación de Contraseña
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                Sistema de Reservas Tribus
              </p>
            </td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #18181b; font-size: 20px; font-weight: 600;">
                Hola ${name || 'Usuario'},
              </h2>

              <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Reservas Tribus.
              </p>

              <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                Si solicitaste este cambio, haz clic en el botón de abajo para crear una nueva contraseña:
              </p>

              <!-- Botón principal -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px;">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Restablecer mi Contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Información de seguridad -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 0 0 30px;">
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600;">
                  ⏰ Importante:
                </p>
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  Este enlace expirará en <strong>${expirationMinutes} minutos</strong> por razones de seguridad.
                </p>
              </div>

              <p style="margin: 0 0 20px; color: #52525b; font-size: 14px; line-height: 1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>

              <div style="background-color: #f4f4f5; padding: 16px; border-radius: 6px; margin: 0 0 30px; word-break: break-all;">
                <code style="color: #667eea; font-size: 13px; font-family: 'Courier New', monospace;">
                  ${resetUrl}
                </code>
              </div>

              <!-- Aviso de seguridad -->
              <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin: 0 0 20px;">
                <p style="margin: 0 0 10px; color: #991b1b; font-size: 14px; font-weight: 600;">
                  🔒 Seguridad:
                </p>
                <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
                  Si no solicitaste restablecer tu contraseña, <strong>ignora este email</strong> y tu contraseña permanecerá sin cambios. Tu cuenta está segura.
                </p>
              </div>

              <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Si tienes problemas o preguntas, contacta al equipo de soporte.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #71717a; font-size: 14px;">
                <strong>Sistema de Reservas Tribus</strong>
              </p>
              <p style="margin: 0 0 15px; color: #a1a1aa; font-size: 12px; line-height: 1.5;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} Tribus. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

/**
 * Plantilla de texto plano para recuperación de contraseña
 * (fallback para clientes de email que no soportan HTML)
 */
const passwordResetTextTemplate = (name, resetUrl, expirationMinutes = 30) => {
  return `
Recuperación de Contraseña - Sistema de Reservas Tribus

Hola ${name || 'Usuario'},

Recibimos una solicitud para restablecer la contraseña de tu cuenta.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetUrl}

IMPORTANTE:
- Este enlace expirará en ${expirationMinutes} minutos por razones de seguridad.
- Si no solicitaste este cambio, ignora este email y tu contraseña permanecerá sin cambios.

Si tienes problemas con el enlace, cópialo y pégalo en tu navegador.

---
Sistema de Reservas Tribus
© ${new Date().getFullYear()} Tribus. Todos los derechos reservados.

Este es un email automático, por favor no respondas a este mensaje.
  `.trim();
};

module.exports = {
  passwordResetTemplate,
  passwordResetTextTemplate
};
