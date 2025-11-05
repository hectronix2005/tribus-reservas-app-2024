const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

/**
 * Servicio de Notificaciones por Email MEJORADO Y ROBUSTO
 * Con validación estricta y auditoría completa
 */

class ImprovedEmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'Tribus Reservas <noreply@tribus.com>';
  }

  /**
   * Inicializa el transportador de correo
   */
  async initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      await this.transporter.verify();
      console.log('✅ Servicio de email mejorado inicializado correctamente');
      return true;
    } catch (error) {
      console.error('⚠️  No se pudo inicializar el servicio de email:', error.message);
      console.log('📧 Configura las variables de entorno EMAIL_USER y EMAIL_PASSWORD para habilitar notificaciones');
      return false;
    }
  }

  /**
   * Valida un email
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Valida y limpia la lista de destinatarios
   * ESTA ES LA CLAVE PARA PREVENIR ENVÍOS INCORRECTOS
   */
  validateAndCleanRecipients(user, collaborators = []) {
    console.log('\n🔍 ========================================');
    console.log('🔍 VALIDACIÓN ESTRICTA DE DESTINATARIOS');
    console.log('🔍 ========================================');

    const validation = {
      validRecipients: [],
      invalidEmails: [],
      warnings: [],
      allValid: true
    };

    // Validar email del creador
    console.log('\n1️⃣ Validando email del creador:');
    console.log('   Usuario:', user.name);
    console.log('   Email:', user.email);

    if (!this.isValidEmail(user.email)) {
      validation.invalidEmails.push(user.email);
      validation.warnings.push(`Email del creador inválido: ${user.email}`);
      validation.allValid = false;
      console.log('   ❌ Email inválido');
    } else {
      validation.validRecipients.push({
        email: user.email.trim().toLowerCase(),
        name: user.name,
        role: 'creator',
        userId: user._id || user.id
      });
      console.log('   ✅ Email válido');
    }

    // Validar colaboradores
    console.log('\n2️⃣ Validando colaboradores:');
    console.log(`   Total de colaboradores recibidos: ${collaborators.length}`);

    if (collaborators && collaborators.length > 0) {
      const seenEmails = new Set([user.email.trim().toLowerCase()]);

      collaborators.forEach((collab, index) => {
        console.log(`\n   Colaborador ${index + 1}/${collaborators.length}:`);
        console.log(`   - ID: ${collab._id || collab.id || 'N/A'}`);
        console.log(`   - Nombre: ${collab.name || 'N/A'}`);
        console.log(`   - Email: ${collab.email || 'N/A'}`);

        // Validar que tenga email
        if (!collab.email) {
          validation.warnings.push(`Colaborador ${collab.name} no tiene email`);
          console.log('   ⚠️ Sin email');
          return;
        }

        const cleanEmail = collab.email.trim().toLowerCase();

        // Validar formato de email
        if (!this.isValidEmail(cleanEmail)) {
          validation.invalidEmails.push(cleanEmail);
          validation.warnings.push(`Email inválido para ${collab.name}: ${cleanEmail}`);
          validation.allValid = false;
          console.log('   ❌ Email inválido');
          return;
        }

        // Evitar duplicados
        if (seenEmails.has(cleanEmail)) {
          validation.warnings.push(`Email duplicado detectado: ${cleanEmail}`);
          console.log('   ⚠️ Email duplicado (ignorado)');
          return;
        }

        // Agregar a la lista de destinatarios válidos
        seenEmails.add(cleanEmail);
        validation.validRecipients.push({
          email: cleanEmail,
          name: collab.name,
          role: 'collaborator',
          userId: collab._id || collab.id
        });
        console.log('   ✅ Email válido y agregado');
      });
    }

    console.log('\n3️⃣ Resumen de validación:');
    console.log(`   ✅ Destinatarios válidos: ${validation.validRecipients.length}`);
    console.log(`   ❌ Emails inválidos: ${validation.invalidEmails.length}`);
    console.log(`   ⚠️  Advertencias: ${validation.warnings.length}`);

    console.log('\n4️⃣ Lista final de destinatarios:');
    validation.validRecipients.forEach((recipient, idx) => {
      console.log(`   ${idx + 1}. ${recipient.email} (${recipient.name}) [${recipient.role}]`);
    });

    console.log('\n🔍 ========================================\n');

    return validation;
  }

  /**
   * Crea un log de auditoría en la base de datos
   */
  async createEmailLog(logData) {
    try {
      const emailLog = new EmailLog(logData);
      await emailLog.save();
      console.log('📝 Log de email guardado en BD:', emailLog._id);
      return emailLog;
    } catch (error) {
      console.error('❌ Error guardando log de email:', error.message);
      // No fallar el envío si el log falla
      return null;
    }
  }

  /**
   * Envía confirmación de reserva con validación y auditoría robustas
   */
  async sendReservationConfirmation(reservation, user, collaborators = [], metadata = {}) {
    if (!this.transporter) {
      console.log('⚠️  Servicio de email no configurado. Saltando notificación.');
      return { success: false, reason: 'Email service not configured' };
    }

    console.log('\n📧 ============================================');
    console.log('📧 INICIO DE ENVÍO DE EMAIL DE CONFIRMACIÓN');
    console.log('📧 ============================================');
    console.log(`📧 Reserva: ${reservation.reservationId}`);
    console.log(`📧 Área: ${reservation.area}`);
    console.log(`📧 Fecha: ${reservation.date}`);
    console.log(`📧 Equipo: ${reservation.teamName}`);

    try {
      // PASO 1: Validar y limpiar destinatarios
      const validation = this.validateAndCleanRecipients(user, collaborators);

      if (validation.validRecipients.length === 0) {
        console.error('❌ No hay destinatarios válidos');
        return {
          success: false,
          error: 'No valid recipients',
          warnings: validation.warnings
        };
      }

      // PASO 2: Extraer solo los emails
      const recipientEmails = validation.validRecipients.map(r => r.email);

      // PASO 3: Preparar log de auditoría ANTES de enviar
      const logData = {
        emailType: 'reservation_confirmation',
        subject: `✅ Confirmación de Reserva - ${reservation.area}`,
        to: recipientEmails,
        bcc: ['noreply.tribus@gmail.com'],
        reservationId: reservation.reservationId,
        reservationInternalId: reservation._id,
        creatorUserId: user._id || user.id,
        creatorEmail: user.email,
        expectedCollaborators: validation.validRecipients.map(r => ({
          userId: r.userId,
          email: r.email,
          name: r.name
        })),
        status: 'pending',
        validation: {
          allRecipientsValid: validation.allValid,
          invalidEmails: validation.invalidEmails,
          warnings: validation.warnings
        },
        ipAddress: metadata.ipAddress || 'N/A',
        userAgent: metadata.userAgent || 'N/A'
      };

      // Guardar log ANTES del envío
      const emailLog = await this.createEmailLog(logData);

      // PASO 4: Preparar el email
      const emailHtml = this.getReservationConfirmationTemplate(
        reservation,
        user,
        validation.validRecipients
      );

      const mailOptions = {
        from: this.from,
        to: recipientEmails.join(', '),
        bcc: 'noreply.tribus@gmail.com',
        subject: `✅ Confirmación de Reserva - ${reservation.area}`,
        html: emailHtml,
        text: this.getReservationConfirmationText(reservation, user)
      };

      console.log('\n📤 Enviando email...');
      console.log('   Desde:', this.from);
      console.log('   Para:', recipientEmails.join(', '));
      console.log('   BCC:', 'noreply.tribus@gmail.com');

      // PASO 5: Enviar el email
      const info = await this.transporter.sendMail(mailOptions);

      console.log('\n✅ Email enviado exitosamente');
      console.log('   Message ID:', info.messageId);
      console.log('   Destinatarios:', validation.validRecipients.length);

      // PASO 6: Actualizar log con el resultado exitoso
      if (emailLog) {
        emailLog.status = 'success';
        emailLog.messageId = info.messageId;
        emailLog.sentAt = new Date();
        await emailLog.save();
        console.log('   Log actualizado en BD');
      }

      console.log('\n📧 ============================================');
      console.log('📧 EMAIL ENVIADO Y AUDITADO EXITOSAMENTE');
      console.log('📧 ============================================\n');

      return {
        success: true,
        messageId: info.messageId,
        recipients: validation.validRecipients.length,
        recipientsList: validation.validRecipients,
        warnings: validation.warnings,
        emailLogId: emailLog ? emailLog._id : null
      };

    } catch (error) {
      console.error('\n❌ Error enviando email:', error.message);
      console.error('   Stack:', error.stack);

      // Actualizar log con el error
      if (emailLog) {
        emailLog.status = 'failed';
        emailLog.error = error.message;
        await emailLog.save();
      }

      console.log('\n📧 ============================================');
      console.log('📧 ERROR EN ENVÍO DE EMAIL');
      console.log('📧 ============================================\n');

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Envía notificación de cancelación con validación robusta
   */
  async sendCancellationNotification(reservation, user, collaborators = [], canceledBy = null, metadata = {}) {
    if (!this.transporter) {
      console.log('⚠️  Servicio de email no configurado. Saltando notificación.');
      return { success: false, reason: 'Email service not configured' };
    }

    try {
      // Validar y limpiar destinatarios
      const validation = this.validateAndCleanRecipients(user, collaborators);

      if (validation.validRecipients.length === 0) {
        return {
          success: false,
          error: 'No valid recipients'
        };
      }

      const recipientEmails = validation.validRecipients.map(r => r.email);

      // Crear log de auditoría
      const logData = {
        emailType: 'reservation_cancellation',
        subject: `❌ Reserva Cancelada - ${reservation.area}`,
        to: recipientEmails,
        bcc: ['noreply.tribus@gmail.com'],
        reservationId: reservation.reservationId,
        reservationInternalId: reservation._id,
        creatorUserId: user._id || user.id,
        creatorEmail: user.email,
        expectedCollaborators: validation.validRecipients.map(r => ({
          userId: r.userId,
          email: r.email,
          name: r.name
        })),
        status: 'pending',
        validation: {
          allRecipientsValid: validation.allValid,
          invalidEmails: validation.invalidEmails,
          warnings: validation.warnings
        },
        ipAddress: metadata.ipAddress || 'N/A',
        userAgent: metadata.userAgent || 'N/A'
      };

      const emailLog = await this.createEmailLog(logData);

      const emailHtml = this.getCancellationTemplate(reservation, user, canceledBy);

      const mailOptions = {
        from: this.from,
        to: recipientEmails.join(', '),
        bcc: 'noreply.tribus@gmail.com',
        subject: `❌ Reserva Cancelada - ${reservation.area}`,
        html: emailHtml,
        text: `Tu reserva para ${reservation.area} el ${reservation.date} ha sido cancelada.`
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(`📧 Notificación de cancelación enviada a ${validation.validRecipients.length} destinatario(s)`);
      console.log(`   Message ID: ${info.messageId}`);

      // Actualizar log
      if (emailLog) {
        emailLog.status = 'success';
        emailLog.messageId = info.messageId;
        emailLog.sentAt = new Date();
        await emailLog.save();
      }

      return {
        success: true,
        messageId: info.messageId,
        recipients: validation.validRecipients.length,
        recipientsList: validation.validRecipients,
        warnings: validation.warnings,
        emailLogId: emailLog ? emailLog._id : null
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
   * (Mantiene la misma estructura que el servicio original)
   */
  getReservationConfirmationTemplate(reservation, user, validRecipients = []) {
    const formatDate = (dateString) => {
      let date;

      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-').map(Number);
          date = new Date(year, month - 1, day);
        } else {
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

    // Filtrar solo colaboradores (sin el creador)
    const collaboratorsList = validRecipients
      .filter(r => r.role === 'collaborator')
      .map(r => r.name)
      .join(', ');

    const collaboratorsSection = collaboratorsList
      ? `
        <tr>
          <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
            <strong>Colaboradores:</strong>
          </td>
          <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
            ${collaboratorsList}
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
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
                Hola <strong>${user.name}</strong>,
              </p>
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #666666; line-height: 1.6;">
                Tu reserva ha sido confirmada. A continuación encontrarás los detalles:
              </p>
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
                ${!reservation.area.toLowerCase().includes('hot desk') ? `
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Horario:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.startTime} - ${reservation.endTime}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 15px; background-color: #f8f9fa; border-bottom: 1px solid #dee2e6;">
                    <strong>Equipo:</strong>
                  </td>
                  <td style="padding: 15px; background-color: #ffffff; border-bottom: 1px solid #dee2e6;">
                    ${reservation.teamName}
                  </td>
                </tr>
                ${collaboratorsSection}
              </table>
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  <strong>⚠️ Importante:</strong> Por favor, llega puntualmente a tu reserva.
                </p>
              </div>
            </td>
          </tr>
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
   * Plantilla de texto plano
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
Equipo: ${reservation.teamName}

Saludos,
Tribus - Sistema de Reservas
    `;
  }

  /**
   * Plantilla de cancelación
   */
  getCancellationTemplate(reservation, user, canceledBy = null) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reserva Cancelada</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="background: linear-gradient(135deg, #f93a5a 0%, #f7778c 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">❌ Reserva Cancelada</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p>Hola <strong>${user.name}</strong>,</p>
              <p>Tu reserva <strong>${reservation.reservationId}</strong> para <strong>${reservation.area}</strong> ha sido cancelada.</p>
              ${canceledBy ? `<p>Cancelada por: ${canceledBy.name}</p>` : ''}
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
const improvedEmailService = new ImprovedEmailService();

module.exports = improvedEmailService;
