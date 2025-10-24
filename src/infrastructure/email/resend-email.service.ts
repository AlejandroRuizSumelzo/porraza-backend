import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import type { IEmailRepository } from '@domain/repositories/email.repository.interface';
import { getVerificationEmailTemplate } from './templates/verification-email.template';
import { getWelcomeEmailTemplate } from './templates/welcome-email.template';
import { getPasswordResetEmailTemplate } from './templates/password-reset-email.template';
import { getPasswordChangedEmailTemplate } from './templates/password-changed-email.template';

/**
 * ResendEmailService (Infrastructure Layer)
 *
 * Implementación concreta del IEmailRepository usando Resend.
 * Esta clase pertenece a la capa de infraestructura y usa librerías externas.
 *
 * Responsabilidades:
 * - Enviar emails usando la API de Resend
 * - Generar HTML desde templates
 * - Manejar errores de envío de emails
 *
 * Configuración:
 * - Lee RESEND_API_KEY desde variables de entorno
 * - Lee FRONTEND_URL para generar links de verificación
 * - Emails se envían desde: Porraza <noreply@porraza.com>
 *
 * IMPORTANTE:
 * - En desarrollo, si RESEND_API_KEY no está configurado, solo logea en consola
 * - En producción, RESEND_API_KEY es obligatorio
 * - Los errores de envío se propagan al use case para manejo apropiado
 */
@Injectable()
export class ResendEmailService implements IEmailRepository {
  private resend: Resend | null = null;
  private readonly fromEmail = 'Porraza <noreply@porraza.com>';
  private readonly isDevelopment = process.env.NODE_ENV !== 'production';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;

    // Validar que RESEND_API_KEY esté configurado
    if (!apiKey) {
      if (this.isDevelopment) {
        console.warn(
          '⚠️  RESEND_API_KEY not configured. Emails will be logged to console only.',
        );
      } else {
        throw new Error(
          'RESEND_API_KEY environment variable is required in production',
        );
      }
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  /**
   * Envía email de verificación de cuenta
   */
  async sendVerificationEmail(
    to: string,
    token: string,
    name: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const subject = 'Verifica tu cuenta de Porraza';
    const html = getVerificationEmailTemplate(name, verificationUrl);

    await this.sendEmail(to, subject, html, 'verification');
  }

  /**
   * Envía email de bienvenida después de verificar la cuenta
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = '¡Bienvenido a Porraza!';
    const html = getWelcomeEmailTemplate(name);

    await this.sendEmail(to, subject, html, 'welcome');
  }

  /**
   * Envía email de restablecimiento de contraseña
   */
  async sendPasswordResetEmail(
    to: string,
    token: string,
    name: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const subject = 'Recupera tu contraseña - Porraza';
    const html = getPasswordResetEmailTemplate(name, resetUrl);

    await this.sendEmail(to, subject, html, 'password-reset');
  }

  /**
   * Envía email de notificación de cambio de contraseña
   */
  async sendPasswordChangedEmail(to: string, name: string): Promise<void> {
    const subject = 'Tu contraseña ha sido actualizada - Porraza';
    const html = getPasswordChangedEmailTemplate(name);

    await this.sendEmail(to, subject, html, 'password-changed');
  }

  /**
   * Método privado para enviar emails usando Resend
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    type: string,
  ): Promise<void> {
    // Si no hay API key (desarrollo), solo logear
    if (!this.resend) {
      console.log('\n📧 [EMAIL MOCK - Development Mode]');
      console.log(`Type: ${type}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`HTML length: ${html.length} characters`);
      console.log('---\n');
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error(`Failed to send ${type} email to ${to}:`, error);
        throw new Error(
          `Failed to send ${type} email: ${error.message || 'Unknown error'}`,
        );
      }

      console.log(
        `✅ ${type} email sent successfully to ${to} (ID: ${data?.id})`,
      );
    } catch (error: any) {
      console.error(`Error sending ${type} email to ${to}:`, error);
      throw new Error(
        `Failed to send ${type} email: ${error.message || 'Unknown error'}`,
      );
    }
  }
}
