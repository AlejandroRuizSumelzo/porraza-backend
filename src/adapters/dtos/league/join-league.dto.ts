import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Length, Matches } from 'class-validator';

/**
 * JoinLeagueDto (Adapters Layer)
 *
 * DTO para unirse a una liga.
 *
 * Campos:
 * - inviteCode: Código de invitación (opcional para públicas, requerido para privadas)
 *
 * Notas:
 * - leagueId se extrae de los params de la URL (:id)
 * - userId se extrae del JWT (req.user.id)
 * - El código se normaliza a mayúsculas para comparación
 */
export class JoinLeagueDto {
  @ApiProperty({
    description:
      'Invite code for private leagues (8 alphanumeric characters, optional for public leagues)',
    example: 'XK7M9P2T',
    required: false,
    minLength: 8,
    maxLength: 8,
  })
  @IsOptional()
  @IsString()
  @Length(8, 8, { message: 'Invite code must be exactly 8 characters long' })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Invite code must contain only uppercase letters and numbers',
  })
  inviteCode?: string;
}
