import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * LoginDto (Adapters Layer)
 *
 * DTO para el endpoint de login.
 * Se usa en el endpoint POST /auth/login.
 *
 * Campos requeridos:
 * - email: Email del usuario (validado con IsEmail)
 * - password: Contraseña en texto plano (se verificará con bcrypt)
 *
 * Validaciones:
 * - Email debe ser válido
 * - Password debe tener al menos 8 caracteres (por consistencia con registro)
 */
export class LoginDto {
  /**
   * Email del usuario
   * - Debe ser un email válido
   * - Se normalizará a lowercase antes de buscar en BD
   */
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  /**
   * Contraseña del usuario
   * - Debe tener al menos 8 caracteres
   * - Se verificará contra el hash almacenado en BD
   */
  @ApiProperty({
    description: 'User password (at least 8 characters)',
    example: 'SecurePass123',
    type: String,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
