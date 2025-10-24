import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * UpdatePasswordDto (Adapters Layer)
 *
 * DTO para actualización de contraseña de usuario autenticado.
 * Se usa en el endpoint PATCH /users/:id/password.
 *
 * Flujo:
 * 1. Usuario autenticado (con JWT) quiere cambiar su contraseña
 * 2. Frontend solicita contraseña actual + nueva contraseña
 * 3. Backend valida contraseña actual antes de cambiar
 * 4. Envía email de notificación del cambio
 *
 * Seguridad:
 * - Requiere autenticación (JWT)
 * - Requiere contraseña actual (no permite cambio solo con sesión activa)
 * - Nueva contraseña debe ser diferente a la actual
 * - Notifica por email (detectar acceso no autorizado)
 *
 * Separado de UpdateUserDto por razones de seguridad:
 * - El cambio de contraseña requiere validación adicional
 * - Diferente del flujo de "olvidé mi contraseña" (sin autenticación)
 */
export class UpdatePasswordDto {
  /**
   * Contraseña actual del usuario
   * - Requerida para verificación de seguridad
   * - Evita que alguien con acceso a sesión activa cambie la contraseña sin saberla
   */
  @ApiProperty({
    description:
      'Current password for verification. Required to ensure the user knows their current password before changing it (security measure).',
    example: 'CurrentPass123',
    type: String,
    format: 'password',
    minLength: 8,
  })
  @IsString({ message: 'Current password must be a string' })
  @MinLength(8, {
    message: 'Current password must be at least 8 characters long',
  })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  /**
   * Nueva contraseña
   * - Mínimo 8 caracteres
   * - Debe contener al menos: 1 mayúscula, 1 minúscula, 1 número
   * - Se hasheará con bcrypt antes de guardar en BD
   * - Debe ser diferente a la contraseña actual
   */
  @ApiProperty({
    description:
      'New password for the user account (minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number). Must be different from current password.',
    example: 'NewSecurePass456',
    type: String,
    format: 'password',
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;
}
