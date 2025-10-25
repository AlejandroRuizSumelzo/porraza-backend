import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Length, Matches } from 'class-validator';

/**
 * JoinLeagueDto (Adapters Layer)
 *
 * DTO para unirse a una liga.
 *
 * Campos:
 * - code: Código de la liga (opcional para públicas, requerido para privadas)
 *
 * Notas:
 * - leagueId se extrae de los params de la URL (:id)
 * - userId se extrae del JWT (req.user.id)
 * - El código se normaliza a mayúsculas para comparación
 */
export class JoinLeagueDto {
  @ApiProperty({
    description:
      'League code for private leagues (6-20 alphanumeric characters, optional for public leagues)',
    example: 'PORRAZA2026',
    required: false,
    minLength: 6,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(6, 20, { message: 'Code must be between 6 and 20 characters' })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Code must contain only uppercase letters and numbers',
  })
  code?: string;
}
