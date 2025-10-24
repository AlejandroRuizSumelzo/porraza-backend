/**
 * IEmailRepository (Domain Layer - Interface)
 *
 * Interface que define las operaciones relacionadas con el envío de emails.
 * Siguiendo Clean Architecture, el dominio define la interface
 * y la infraestructura proporciona la implementación concreta.
 *
 * Responsabilidades:
 * - Enviar email de verificación de cuenta
 * - Enviar email de bienvenida después de verificar
 * - Enviar email de restablecimiento de contraseña (futuro)
 *
 * IMPORTANTE:
 * - Esta interface NO tiene dependencias de Resend (inversión de dependencias)
 * - La implementación concreta usará Resend internamente
 * - Permite cambiar la implementación (ej: a SendGrid) sin afectar el dominio
 */
export interface IEmailRepository {
  /**
   * Envía un email de verificación de cuenta al usuario
   *
   * @param to - Email del destinatario
   * @param token - Token JWT de verificación (válido por 24h)
   * @param name - Nombre del usuario para personalizar el email
   * @throws Error si el envío falla
   */
  sendVerificationEmail(to: string, token: string, name: string): Promise<void>;

  /**
   * Envía un email de bienvenida después de verificar la cuenta
   *
   * @param to - Email del destinatario
   * @param name - Nombre del usuario para personalizar el email
   * @throws Error si el envío falla
   */
  sendWelcomeEmail(to: string, name: string): Promise<void>;

  /**
   * Envía un email para restablecer la contraseña
   *
   * @param to - Email del destinatario
   * @param token - Token JWT de restablecimiento (válido por 1h)
   * @param name - Nombre del usuario para personalizar el email
   * @throws Error si el envío falla
   */
  sendPasswordResetEmail(
    to: string,
    token: string,
    name: string,
  ): Promise<void>;

  /**
   * Envía un email de notificación cuando la contraseña ha sido cambiada
   *
   * @param to - Email del destinatario
   * @param name - Nombre del usuario para personalizar el email
   * @throws Error si el envío falla
   */
  sendPasswordChangedEmail(to: string, name: string): Promise<void>;
}
