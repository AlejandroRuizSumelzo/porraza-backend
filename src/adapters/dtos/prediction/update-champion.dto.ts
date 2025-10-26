import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * UpdateChampionDto
 *
 * DTO para actualizar el campeón predicho del Mundial.
 * El usuario selecciona qué equipo ganará el torneo.
 *
 * Usado en:
 * - PATCH /predictions/:id/champion
 *
 * Validaciones:
 * - championTeamId debe ser UUID válido
 * - Equipo debe existir en la BD
 * - Predicción debe estar desbloqueada (antes del deadline)
 *
 * Reglas de negocio:
 * - Solo se puede cambiar antes del deadline global (1h antes del primer partido)
 * - Frontend calcula automáticamente eliminatorias según clasificación de grupos
 * - Usuario ajusta manualmente si hay empates en posiciones clave
 */
export class UpdateChampionDto {
  @ApiProperty({
    description: 'Team UUID that user predicts will win the World Cup 2026',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  championTeamId!: string;
}
