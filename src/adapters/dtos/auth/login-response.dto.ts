import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@adapters/dtos/user/user-response.dto';
import type { User } from '@domain/entities/user.entity';

/**
 * LoginResponseDto (Adapters Layer)
 *
 * DTO que representa la respuesta exitosa del endpoint de login.
 *
 * Contiene:
 * - accessToken: JWT de corta duración (15 minutos) para autenticar requests
 * - refreshToken: JWT de larga duración (7 días) para obtener nuevos access tokens
 * - expiresIn: Tiempo de expiración del access token en segundos
 * - user: Datos del usuario (sin password)
 *
 * Flujo de uso:
 * 1. Usuario hace login → recibe accessToken + refreshToken
 * 2. Frontend guarda ambos tokens (accessToken en memoria, refreshToken en localStorage/httpOnly cookie)
 * 3. Frontend usa accessToken en header Authorization: Bearer <token>
 * 4. Cuando accessToken expira → usa refreshToken en POST /auth/refresh para obtener nuevo accessToken
 * 5. Cuando refreshToken expira → usuario debe hacer login nuevamente
 */
export class LoginResponseDto {
  /**
   * Access Token JWT
   * - Duración corta (15 minutos)
   * - Se usa para autenticar cada request
   * - Se envía en header: Authorization: Bearer <accessToken>
   * - Contiene: { sub: userId, email, type: 'access', iat, exp }
   */
  @ApiProperty({
    description:
      'JWT access token for authenticating API requests (expires in 15 minutes)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.xxxxx',
    type: String,
  })
  accessToken: string;

  /**
   * Refresh Token JWT
   * - Duración larga (7 días)
   * - Se usa para obtener nuevos access tokens cuando expiran
   * - Se envía en POST /auth/refresh
   * - Contiene: { sub: userId, type: 'refresh', iat, exp }
   * - IMPORTANTE: Guardar de forma segura (httpOnly cookie recomendado)
   */
  @ApiProperty({
    description:
      'JWT refresh token for obtaining new access tokens (expires in 7 days). Store securely!',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2ODQzODIyfQ.yyyyy',
    type: String,
  })
  refreshToken: string;

  /**
   * Tiempo de expiración del access token en segundos
   * - 900 segundos = 15 minutos
   * - Útil para que el frontend sepa cuándo refrescar el token
   */
  @ApiProperty({
    description: 'Access token expiration time in seconds (900 = 15 minutes)',
    example: 900,
    type: Number,
  })
  expiresIn: number;

  /**
   * Datos del usuario autenticado
   * - Incluye: id, email, name, isActive, isEmailVerified, createdAt, updatedAt, lastLoginAt
   * - NO incluye password_hash (seguridad)
   */
  @ApiProperty({
    description: 'Authenticated user information (without password)',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  /**
   * Constructor para crear una instancia desde los datos de dominio
   */
  constructor(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    user: User,
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresIn = expiresIn;
    this.user = UserResponseDto.fromEntity(user);
  }

  /**
   * Factory method para crear instancia desde datos de dominio
   */
  static create(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    user: User,
  ): LoginResponseDto {
    return new LoginResponseDto(accessToken, refreshToken, expiresIn, user);
  }
}
