import { ApiProperty } from '@nestjs/swagger';
import { PredictionResponseDto } from './prediction-response.dto';

/**
 * LeagueRankingUserDto
 *
 * DTO que contiene información básica del usuario en el ranking.
 * Solo incluye datos públicos (no password_hash, tokens, etc.).
 */
export class LeagueRankingUserDto {
  @ApiProperty({
    description: 'User unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Lionel Messi',
  })
  name!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'messi@example.com',
  })
  email!: string;
}

/**
 * LeagueRankingItemDto
 *
 * DTO para un elemento en el ranking de una liga.
 * Combina predicción, usuario y posición en el ranking.
 *
 * Usado en:
 * - GET /predictions/league/:leagueId
 *
 * Ordenamiento:
 * - Por totalPoints DESC
 * - Empates se muestran con la misma posición
 */
export class LeagueRankingItemDto {
  @ApiProperty({
    description: 'Prediction data',
    type: PredictionResponseDto,
  })
  prediction!: PredictionResponseDto;

  @ApiProperty({
    description: 'User data (owner of the prediction)',
    type: LeagueRankingUserDto,
  })
  user!: LeagueRankingUserDto;

  @ApiProperty({
    description: 'Position in the league ranking (1-indexed)',
    example: 1,
    minimum: 1,
  })
  position!: number;
}

/**
 * LeagueRankingResponseDto
 *
 * DTO de respuesta para el ranking completo de una liga.
 * Retorna array de items ordenados por puntuación.
 */
export class LeagueRankingResponseDto {
  @ApiProperty({
    description: 'League UUID',
    example: '750e8400-e29b-41d4-a716-446655440000',
  })
  leagueId!: string;

  @ApiProperty({
    description: 'Ranking items (sorted by totalPoints DESC)',
    type: [LeagueRankingItemDto],
  })
  ranking!: LeagueRankingItemDto[];

  @ApiProperty({
    description: 'Total number of participants in the league',
    example: 25,
  })
  totalParticipants!: number;
}
