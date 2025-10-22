import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ResendVerificationDto (Adapters Layer)
 *
 * DTO para el endpoint de reenvío de email de verificación.
 * Se usa en el endpoint POST /auth/resend-verification.
 *
 * Casos de uso:
 * - Usuario no recibió el email inicial
 * - El token expiró (después de 24h)
 * - Usuario eliminó el email por accidente
 *
 * Flujo:
 * 1. Usuario solicita reenvío proporcionando su email
 * 2. Backend verifica que el usuario exista y NO esté verificado
 * 3. Se genera un nuevo token de verificación
 * 4. Se envía un nuevo email
 */
export class ResendVerificationDto {
  /**
   * Email del usuario que solicita reenvío
   * - Debe existir en la BD
   * - Debe tener email_verified = FALSE
   */
  @ApiProperty({
    description:
      'Email address of the user requesting verification email resend',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;
}
