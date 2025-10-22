import type { User } from '@domain/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

/**
 * UserResponseDto (Adapters Layer)
 *
 * DTO para respuestas HTTP que contienen datos de usuario.
 * Este DTO transforma la entidad User para:
 * 1. Ocultar campos sensibles (password_hash)
 * 2. Formatear datos para el cliente
 * 3. Serializar correctamente fechas
 *
 * IMPORTANTE: Este DTO NUNCA debe incluir password_hash por seguridad.
 *
 * Se usa en respuestas de:
 * - GET /users/:id
 * - GET /users/email/:email
 * - POST /users (después de crear)
 * - PATCH /users/:id (después de actualizar)
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user (UUID)',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
    type: String,
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    type: String,
  })
  name: string;

  @ApiProperty({
    description:
      'Account status (true = active and can login, false = suspended)',
    example: true,
    type: Boolean,
  })
  isActive: boolean;

  @ApiProperty({
    description:
      'Email verification status (true = verified, false = pending verification)',
    example: false,
    type: Boolean,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Timestamp when the user account was created',
    example: '2025-10-22T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the user account was last updated',
    example: '2025-10-22T12:45:00.000Z',
    type: String,
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiProperty({
    description:
      'Timestamp of the last successful login (null if user has never logged in)',
    example: '2025-10-22T14:20:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  lastLoginAt: Date | null;

  /**
   * Constructor privado para forzar uso del factory method
   */
  private constructor(
    id: string,
    email: string,
    name: string,
    isActive: boolean,
    isEmailVerified: boolean,
    createdAt: Date,
    updatedAt: Date,
    lastLoginAt: Date | null,
  ) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.isActive = isActive;
    this.isEmailVerified = isEmailVerified;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.lastLoginAt = lastLoginAt;
  }

  /**
   * Factory method para crear DTO desde entidad User
   * Excluye password_hash automáticamente
   */
  static fromEntity(user: User): UserResponseDto {
    return new UserResponseDto(
      user.id,
      user.email,
      user.name,
      user.isActive,
      user.isEmailVerified,
      user.createdAt,
      user.updatedAt,
      user.lastLoginAt,
    );
  }

  /**
   * Factory method para crear array de DTOs desde array de Users
   * Útil para endpoint GET /users (listar todos)
   */
  static fromEntities(users: User[]): UserResponseDto[] {
    return users.map((user) => UserResponseDto.fromEntity(user));
  }
}
