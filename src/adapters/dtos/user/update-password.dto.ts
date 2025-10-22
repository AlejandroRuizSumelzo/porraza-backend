import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * UpdatePasswordDto (Adapters Layer)
 *
 * DTO para actualización de contraseña.
 * Se usa en el endpoint PATCH /users/:id/password.
 *
 * Separado de UpdateUserDto por razones de seguridad:
 * - El cambio de contraseña requiere validación adicional
 * - Permite implementar flujo de "olvidé mi contraseña" en el futuro
 * - Facilita agregar campo "currentPassword" para verificación
 */
export class UpdatePasswordDto {
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
  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;

  /**
   * Contraseña actual (opcional por ahora)
   * En el futuro, este campo debería ser obligatorio para verificar
   * que el usuario conoce su contraseña actual antes de cambiarla
   */
  // @ApiProperty({
  //   description: 'Current password for verification',
  //   example: 'CurrentPass123',
  //   type: String,
  //   format: 'password',
  // })
  // @IsString({ message: 'Current password must be a string' })
  // @IsNotEmpty({ message: 'Current password is required' })
  // currentPassword!: string;
}
