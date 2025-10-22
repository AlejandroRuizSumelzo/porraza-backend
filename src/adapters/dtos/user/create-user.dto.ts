import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateUserDto (Adapters Layer)
 *
 * DTO (Data Transfer Object) para la creación de usuarios.
 * Se usa en el endpoint POST /users para validar los datos de entrada.
 *
 * Decoradores de class-validator:
 * - @IsEmail(): Valida formato de email
 * - @IsNotEmpty(): Campo obligatorio
 * - @IsString(): Debe ser string
 * - @MinLength(): Longitud mínima
 * - @MaxLength(): Longitud máxima
 * - @Matches(): Validación con regex
 *
 * NestJS automáticamente valida estos decoradores cuando se usa
 * ValidationPipe (configurado en main.ts o globalmente).
 *
 * Si la validación falla, NestJS retorna automáticamente:
 * - HTTP 400 Bad Request
 * - JSON con los errores detallados
 */
export class CreateUserDto {
  /**
   * Email del usuario
   * - Debe ser un email válido
   * - Será validado como único en la base de datos (en el use case)
   */
  @ApiProperty({
    description: 'Email address of the user (must be unique)',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
    minLength: 5,
    maxLength: 255,
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  /**
   * Contraseña del usuario
   * - Mínimo 8 caracteres
   * - Debe contener al menos: 1 mayúscula, 1 minúscula, 1 número
   * - Se hasheará con bcrypt antes de guardar en BD
   */
  @ApiProperty({
    description:
      'Password for the user account (minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number)',
    example: 'SecurePass123',
    type: String,
    format: 'password',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  /**
   * Nombre completo del usuario
   * - Mínimo 2 caracteres
   * - Máximo 150 caracteres
   */
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    type: String,
    minLength: 2,
    maxLength: 150,
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(150, { message: 'Name must not exceed 150 characters' })
  name!: string;
}
