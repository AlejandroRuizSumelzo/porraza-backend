import {
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * UpdateUserDto (Adapters Layer)
 *
 * DTO para actualización de perfil de usuario.
 * Se usa en el endpoint PATCH /users/:id.
 *
 * Todos los campos son opcionales (@IsOptional):
 * - Solo se actualizan los campos proporcionados
 * - Permite actualizaciones parciales
 *
 * Nota: La contraseña NO se actualiza aquí, tiene su propio endpoint
 * (PATCH /users/:id/password) por razones de seguridad.
 */
export class UpdateUserDto {
  /**
   * Nuevo email del usuario (opcional)
   * - Si se proporciona, debe ser válido
   * - Se validará que no esté en uso por otro usuario
   */
  @ApiPropertyOptional({
    description:
      'New email address for the user (must be unique, will be validated)',
    example: 'newemail@example.com',
    type: String,
    format: 'email',
    minLength: 5,
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  /**
   * Nuevo nombre del usuario (opcional)
   * - Si se proporciona, debe cumplir validaciones de longitud
   */
  @ApiPropertyOptional({
    description: 'New full name for the user',
    example: 'Jane Smith',
    type: String,
    minLength: 2,
    maxLength: 150,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(150, { message: 'Name must not exceed 150 characters' })
  name?: string;

  /**
   * Estado de la cuenta (opcional)
   * - true: cuenta activa (puede hacer login)
   * - false: cuenta suspendida (no puede hacer login)
   * - Solo administradores deberían poder modificar este campo
   */
  @ApiPropertyOptional({
    description:
      'Account status (true = active, false = suspended). Should only be modified by administrators.',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
