import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RegisterDto (Adapters Layer)
 *
 * DTO para el endpoint de registro de usuarios.
 * Se usa en el endpoint POST /auth/register.
 *
 * Campos requeridos:
 * - email: Email del usuario (debe ser único)
 * - password: Contraseña segura (min 8 chars, mayúscula, minúscula, número)
 * - name: Nombre completo del usuario
 *
 * Flujo después del registro:
 * 1. Usuario se crea con email_verified = FALSE
 * 2. Se envía email de verificación
 * 3. Usuario NO puede hacer login hasta verificar email
 */
export class RegisterDto {
  /**
   * Email del usuario
   * - Debe ser válido y único
   * - Se normalizará a lowercase antes de guardar
   */
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  /**
   * Contraseña del usuario
   * - Mínimo 8 caracteres
   * - Debe contener: mayúscula, minúscula, número
   * - Se hasheará con bcrypt antes de guardar
   */
  @ApiProperty({
    description:
      'User password (at least 8 characters, must contain uppercase, lowercase, and number)',
    example: 'SecurePass123',
    type: String,
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  /**
   * Nombre completo del usuario
   * - Entre 2 y 150 caracteres
   * - Se usará en emails y en la interfaz
   */
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    type: String,
    minLength: 2,
    maxLength: 150,
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(150, { message: 'Name must not exceed 150 characters' })
  name: string;
}
