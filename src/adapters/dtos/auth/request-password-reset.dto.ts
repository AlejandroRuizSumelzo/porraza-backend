import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RequestPasswordResetDto (Adapters Layer)
 *
 * DTO para el endpoint de solicitud de restablecimiento de contraseña.
 * Se usa en el endpoint POST /auth/forgot-password.
 *
 * Flujo:
 * 1. Usuario olvida su contraseña y hace clic en "Olvidé mi contraseña"
 * 2. Frontend llama a POST /auth/forgot-password con email
 * 3. Backend genera token (1h) y envía email con enlace
 * 4. Siempre devuelve el mismo mensaje (no revela si el email existe)
 *
 * Seguridad:
 * - No revela si el email existe en el sistema (previene enumeración de usuarios)
 * - Solo envía email si el usuario existe y está activo
 * - Token expira en 1 hora (más corto que email verification)
 */
export class RequestPasswordResetDto {
  /**
   * Email del usuario que solicita restablecer su contraseña
   * - Debe ser un email válido
   * - No se revela si existe en el sistema (mensaje genérico)
   */
  @ApiProperty({
    description:
      'Email address of the user requesting password reset. Always returns a generic message regardless of whether the email exists (security measure).',
    example: 'user@example.com',
    type: String,
    format: 'email',
  })
  @IsEmail({}, { message: 'Must provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}
