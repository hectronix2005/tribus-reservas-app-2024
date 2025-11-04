const nodemailer = require('nodemailer');

/**
 * Servicio de Notificaciones por Email
 * Envía confirmaciones automáticas de reservas
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'Tribus Reservas <noreply@tribus.com>';
  }

  /**
   * Inicializa el transportador de correo
   */
  async initialize() {
    try {
      // Configuración para Gmail
      // Para usar Gmail, necesitas:
      // 1. Habilitar "Acceso de apps menos seguras" o
      // 2. Usar "Contraseñas de aplicación" (recomendado)
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      // Verificar conexión
      await this.transporter.verify();
      console.log('✅ Servicio de email inicializado correctamente');
      return true;
    } catch (error) {
      console.error('⚠️  No se pudo inicializar el servicio de email:', error.message);
      console.log('📧 Configura las variables de entorno EMAIL_USER y EMAIL_PASSWORD para habilitar notificaciones');
      return false;
    }
  }

  /**
   * Envía confirmación de reserva al usuario y colaboradores
   */
  async sendReservationConfirmation(reservation, user, collaborators = []) {
    if (!this.transporter) {
      console.log('⚠️  Servicio de email no configurado. Saltando notificación.');
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const recipients = [user.email];

      // Agregar emails de colaboradores si existen
      if (collaborators && collaborators.length > 0) {
        const collaboratorEmails = collaborators
          .map(c => c.email)
          .filter(email => email && email !== user.email);
        recipients.push(...collaboratorEmails);
      }

      const emailHtml = this.getReservationConfirmationTemplate(reservation, user, collaborators);

      const mailOptions = {
        from: this.from,
        to: recipients.join(', '),
        bcc: 'noreply.tribus@gmail.com', // Copia oculta para registro
        subject: `✅ Confirmación de Reserva - ${reservation.area}`,
        html: emailHtml,
        text: this.getReservationConfirmationText(reservation, user)
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Email enviado exitosamente a ${recipients.length} destinatario(s) + 1 BCC`);
      console.log(`   ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        recipients: recipients.length
      };
    } catch (error) {
      console.error('❌ Error enviando email:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envía notificación de cancelación
   */
  async sendCancellationNotification(reservation, user, collaborators = []) {
    if (!this.transporter) {
      console.log('⚠️  Servicio de email no configurado. Saltando notificación.');
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const recipients = [user.email];

      if (collaborators && collaborators.length > 0) {
        const collaboratorEmails = collaborators
          .map(c => c.email)
          .filter(email => email && email !== user.email);
        recipients.push(...collaboratorEmails);
      }

      const emailHtml = this.getCancellationTemplate(reservation, user);

      const mailOptions = {
        from: this.from,
        to: recipients.join(', '),
        bcc: 'noreply.tribus@gmail.com', // Copia oculta para registro
        subject: `❌ Reserva Cancelada - ${reservation.area}`,
        html: emailHtml,
        text: `Tu reserva para ${reservation.area} el ${reservation.date} ha sido cancelada.`
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Notificación de cancelación enviada a ${recipients.length} destinatario(s) + 1 BCC`);

      return {
        success: true,
        messageId: info.messageId,
        recipients: recipients.length
      };
    } catch (error) {
      console.error('❌ Error enviando notificación de cancelación:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Plantilla HTML para confirmación de reserva
   */
  getReservationConfirmationTemplate(reservation, user, collaborators = []) {
    const formatDate = (dateString) => {
      let date;

      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        // Si es una fecha en formato YYYY-MM-DD, crear fecha en hora local
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-').map(Number);
          date = new Date(year, month - 1, day);
        } else {
          // Para otros formatos, usar Date constructor normal
          date = new Date(dateString);
        }
      } else {
        date = new Date(dateString);
      }

      return date.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const collaboratorsList = collaborators.length > 0
      ? `
        <tr>
          <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
            <strong>Colaboradores:</strong>
          </td>
          <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
            ${collaborators.map(c => c.name).join(', ')}
          </td>
        </tr>
      `
      : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Reserva</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ✅ Reserva Confirmada
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                Tu reserva ha sido registrada exitosamente
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
                Hola <strong>${user.name}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Tu reserva ha sido confirmada. A continuación encontrarás los detalles:
              </p>

              <!-- Reservation Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>ID de Reserva:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.reservationId}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Área:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.area}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Fecha:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${formatDate(reservation.date)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Horario:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.startTime} - ${reservation.endTime}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Equipo:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.teamName}
                  </td>
                </tr>
                ${!reservation.isMeetingRoom && reservation.requestedSeats ? `
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Puestos Solicitados:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.requestedSeats}
                  </td>
                </tr>
                ` : ''}
                ${collaboratorsList}
                ${reservation.notes ? `
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa;">
                    <strong>Notas:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff;">
                    ${reservation.notes}
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Important Note -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>⚠️ Importante:</strong> Por favor, llega puntualmente a tu reserva. Si necesitas cancelar, hazlo con anticipación para que otros puedan usar el espacio.
                </p>
              </div>

              <p style="margin: 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                <strong>Tribus - Sistema de Reservas</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Este es un email automático, por favor no responder.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Plantilla de texto plano para confirmación
   */
  getReservationConfirmationText(reservation, user) {
    return `
Hola ${user.name},

Tu reserva ha sido confirmada exitosamente.

DETALLES DE LA RESERVA:
------------------------
ID: ${reservation.reservationId}
Área: ${reservation.area}
Fecha: ${reservation.date}
Horario: ${reservation.startTime} - ${reservation.endTime}
Equipo: ${reservation.teamName}
Puestos: ${reservation.requestedSeats}
${reservation.notes ? `Notas: ${reservation.notes}` : ''}

Por favor, llega puntualmente a tu reserva.

Saludos,
Tribus - Sistema de Reservas
    `;
  }

  /**
   * Envía notificación de formulario de contacto
   */
  async sendContactFormNotification(contactForm) {
    if (!this.transporter) {
      console.log('⚠️  Servicio de email no configurado. Saltando notificación de contacto.');
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      const adminEmail = 'noreply.tribus@gmail.com';

      // Email al usuario (confirmación)
      const userEmailHtml = this.getContactConfirmationTemplate(contactForm);
      const userMailOptions = {
        from: this.from,
        to: contactForm.email,
        subject: '✅ Hemos recibido tu mensaje - Tribus Coworking',
        html: userEmailHtml
      };

      // Email al admin (notificación de nuevo contacto)
      const adminEmailHtml = this.getContactNotificationTemplate(contactForm);
      const adminMailOptions = {
        from: this.from,
        to: adminEmail,
        subject: `📧 Nuevo contacto de ${contactForm.name}`,
        html: adminEmailHtml
      };

      // Enviar ambos emails
      const [userInfo, adminInfo] = await Promise.all([
        this.transporter.sendMail(userMailOptions),
        this.transporter.sendMail(adminMailOptions)
      ]);

      console.log(`📧 Emails de contacto enviados exitosamente`);
      console.log(`   Usuario: ${userInfo.messageId}`);
      console.log(`   Admin: ${adminInfo.messageId}`);

      return {
        success: true,
        userMessageId: userInfo.messageId,
        adminMessageId: adminInfo.messageId
      };
    } catch (error) {
      console.error('❌ Error enviando emails de contacto:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Plantilla HTML de confirmación para el usuario
   */
  getContactConfirmationTemplate(contactForm) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Contacto</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ✅ ¡Gracias por contactarnos!
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                Hemos recibido tu mensaje
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
                Hola <strong>${contactForm.name}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Gracias por tu interés en Tribus Coworking. Hemos recibido tu mensaje y nuestro equipo se pondrá en contacto contigo lo antes posible.
              </p>

              <!-- Contact Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Tu mensaje:</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #ffffff;">
                    ${contactForm.message}
                  </td>
                </tr>
              </table>

              <!-- Important Note -->
              <div style="background-color: #d1ecf1; border-left: 4px solid #0dcaf0; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; color: #055160; font-size: 14px;">
                  <strong>📞 Información de contacto:</strong><br>
                  Tel: ${contactForm.countryCode} ${contactForm.phone}<br>
                  Email: ${contactForm.email}
                </p>
              </div>

              <p style="margin: 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Responderemos a la brevedad. Si necesitas atención urgente, puedes llamarnos al +57 300 123 4567.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                <strong>Tribus Coworking</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Este es un email automático, por favor no responder.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Plantilla HTML de notificación para el admin
   */
  getContactNotificationTemplate(contactForm) {
    const interestedInLabels = {
      hot_desk: 'Hot Desk (Puesto flexible)',
      sala_reunion: 'Sala de Reuniones',
      oficina_privada: 'Oficina Privada',
      otro: 'Otro / Información General'
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Contacto</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📧 Nuevo Formulario de Contacto
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                CRM - Gestión de Leads
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Has recibido un nuevo formulario de contacto que requiere seguimiento.
              </p>

              <!-- Contact Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Nombre:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${contactForm.name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Email:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    <a href="mailto:${contactForm.email}" style="color: #667eea; text-decoration: none;">${contactForm.email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Teléfono:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    <a href="tel:${contactForm.countryCode}${contactForm.phone}" style="color: #667eea; text-decoration: none;">${contactForm.countryCode} ${contactForm.phone}</a>
                  </td>
                </tr>
                ${contactForm.company ? `
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Empresa:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${contactForm.company}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Interesado en:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${interestedInLabels[contactForm.interestedIn] || contactForm.interestedIn}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Mensaje:</strong>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 15px; background-color: #ffffff;">
                    ${contactForm.message}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align: center; margin-top: 30px;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #666666;">
                  Gestiona este contacto desde el panel de administración
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                <strong>Tribus CRM - Sistema de Gestión de Contactos</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Notificación automática del sistema
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Plantilla HTML para cancelación
   */
  getCancellationTemplate(reservation, user) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reserva Cancelada</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f93a5a 0%, #f7778c 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                ❌ Reserva Cancelada
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                Tu reserva ha sido cancelada
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
                Hola <strong>${user.name}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Tu reserva ha sido cancelada. Los detalles de la reserva cancelada son:
              </p>

              <!-- Reservation Details -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>ID de Reserva:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.reservationId}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Área:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.area}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Fecha:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.date}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa;">
                    <strong>Horario:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff;">
                    ${reservation.startTime} - ${reservation.endTime}
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Puedes crear una nueva reserva cuando lo necesites.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                <strong>Tribus - Sistema de Reservas</strong>
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Este es un email automático, por favor no responder.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

// Exportar instancia singleton
const emailService = new EmailService();

module.exports = emailService;
