import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RefreshTokenDto (Adapters Layer)
 *
 * DTO para el endpoint de refresh token.
 * Se usa en el endpoint POST /auth/refresh.
 *
 * Permite obtener un nuevo access token cuando el actual ha expirado,
 * sin necesidad de que el usuario haga login nuevamente.
 */
export class RefreshTokenDto {
  /**
   * Refresh token JWT previamente recibido en el login
   * - Debe ser un JWT válido de tipo 'refresh'
   * - Si está expirado o es inválido, se rechazará (401 Unauthorized)
   * - Si es válido, se generará un nuevo access token
   */
  @ApiProperty({
    description: 'Refresh token received during login',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2ODQzODIyfQ.yyyyy',
    type: String,
  })
  @IsNotEmpty({ message: 'Refresh token is required' })
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;
}
