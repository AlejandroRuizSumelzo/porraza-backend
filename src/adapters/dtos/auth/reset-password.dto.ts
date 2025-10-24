import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * ResetPasswordDto (Adapters Layer)
 *
 * DTO para el endpoint de restablecimiento de contraseña con token.
 * Se usa en el endpoint POST /auth/reset-password.
 *
 * El token es un JWT que contiene:
 * - sub: userId
 * - email: userEmail
 * - type: 'password_reset'
 * - exp: 1 hora desde la emisión (más corto que email verification por seguridad)
 *
 * Flujo:
 * 1. Usuario recibe email con enlace: /reset-password?token=xxx
 * 2. Frontend extrae el token y muestra formulario de nueva contraseña
 * 3. Usuario ingresa nueva contraseña
 * 4. Frontend llama a POST /auth/reset-password con token y nueva contraseña
 * 5. Backend valida token, actualiza contraseña y envía email de confirmación
 * 6. Usuario puede hacer login con la nueva contraseña
 */
export class ResetPasswordDto {
  /**
   * Token JWT de restablecimiento de contraseña
   * - Recibido por email
   * - Contiene userId y email
   * - Expira en 1 hora (seguridad)
   * - De un solo uso implícito (no se guarda en BD, pero token expira)
   */
  @ApiProperty({
    description:
      'Password reset token (JWT) received in the password reset email. Valid for 1 hour.',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwidHlwZSI6InBhc3N3b3JkX3Jlc2V0IiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE2MTYyNDI2MjJ9.xxxxx',
    type: String,
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  /**
   * Nueva contraseña
   * - Mínimo 8 caracteres
   * - Debe contener al menos: 1 mayúscula, 1 minúscula, 1 número
   * - Se hasheará con bcrypt antes de guardar en BD
   */
  @ApiProperty({
    description:
      'New password for the user account (minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number)',
    example: 'NewSecurePass456',
    type: String,
    format: 'password',
    minLength: 8,
  })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}
