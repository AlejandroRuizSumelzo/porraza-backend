import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@adapters/dtos/user/user-response.dto';
import type { User } from '@domain/entities/user.entity';

/**
 * RegisterResponseDto (Adapters Layer)
 *
 * DTO que representa la respuesta exitosa del endpoint de registro.
 *
 * Contiene:
 * - user: Datos del usuario creado (con email_verified = false)
 * - message: Mensaje instructivo para el usuario
 *
 * Flujo después del registro:
 * 1. Usuario recibe esta respuesta
 * 2. Frontend muestra mensaje: "Revisa tu email para verificar tu cuenta"
 * 3. Usuario revisa su email y hace clic en el link de verificación
 * 4. Frontend llama a POST /auth/verify-email con el token
 * 5. Una vez verificado, usuario puede hacer login
 */
export class RegisterResponseDto {
  /**
   * Datos del usuario creado
   * - email_verified será FALSE
   * - Usuario NO puede hacer login hasta verificar
   */
  @ApiProperty({
    description: 'Created user information (email not verified yet)',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  /**
   * Mensaje instructivo para el usuario
   * Informa que debe verificar su email antes de poder hacer login
   */
  @ApiProperty({
    description: 'Instruction message for the user',
    example:
      'Registration successful. Please check your email to verify your account.',
    type: String,
  })
  message: string;

  /**
   * Constructor para crear una instancia desde datos de dominio
   */
  constructor(user: User, message: string) {
    this.user = UserResponseDto.fromEntity(user);
    this.message = message;
  }

  /**
   * Factory method para crear instancia desde datos de dominio
   */
  static create(user: User, message: string): RegisterResponseDto {
    return new RegisterResponseDto(user, message);
  }
}
