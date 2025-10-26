import { ApiProperty } from '@nestjs/swagger';
import { Prediction } from '@domain/entities/prediction.entity';

/**
 * PredictionResponseDto
 *
 * DTO de respuesta para entidad Prediction.
 * Transforma la entidad de dominio a formato HTTP response.
 *
 * Usado en:
 * - GET /predictions/league/:leagueId
 * - Respuestas de POST/PATCH endpoints
 *
 * Campos incluidos:
 * - Identificación: id, userId, leagueId
 * - Premios individuales: goldenBootPlayerId, goldenBallPlayerId, goldenGlovePlayerId
 * - Campeón: championTeamId
 * - Puntuación: totalPoints
 * - Estado: isLocked
 * - Metadata: createdAt, updatedAt
 */
export class PredictionResponseDto {
  @ApiProperty({
    description: 'Prediction unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'User UUID who owns this prediction',
    example: '650e8400-e29b-41d4-a716-446655440000',
  })
  userId!: string;

  @ApiProperty({
    description: 'League UUID this prediction belongs to',
    example: '750e8400-e29b-41d4-a716-446655440000',
  })
  leagueId!: string;

  @ApiProperty({
    description: 'Player UUID predicted to win Golden Boot (Pichichi)',
    example: '850e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  goldenBootPlayerId!: string | null;

  @ApiProperty({
    description: 'Player UUID predicted to win Golden Ball (MVP)',
    example: '950e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  goldenBallPlayerId!: string | null;

  @ApiProperty({
    description: 'Player UUID predicted to win Golden Glove (Best GK)',
    example: 'a50e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  goldenGlovePlayerId!: string | null;

  @ApiProperty({
    description: 'Team UUID predicted to win the World Cup 2026',
    example: 'b50e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  championTeamId!: string | null;

  @ApiProperty({
    description: 'Total points earned from this prediction (calculated)',
    example: 42,
    minimum: 0,
  })
  totalPoints!: number;

  @ApiProperty({
    description:
      'Whether predictions are locked (deadline passed: 1h before first match)',
    example: false,
  })
  isLocked!: boolean;

  @ApiProperty({
    description: 'Timestamp when prediction was created',
    example: '2025-10-24T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when prediction was last updated',
    example: '2025-10-24T12:00:00.000Z',
  })
  updatedAt!: Date;

  /**
   * Factory method para crear DTO desde entidad de dominio
   *
   * @param prediction - Entidad Prediction del dominio
   * @returns PredictionResponseDto para HTTP response
   */
  static fromEntity(prediction: Prediction): PredictionResponseDto {
    const dto = new PredictionResponseDto();
    dto.id = prediction.id;
    dto.userId = prediction.userId;
    dto.leagueId = prediction.leagueId;
    dto.goldenBootPlayerId = prediction.goldenBootPlayerId;
    dto.goldenBallPlayerId = prediction.goldenBallPlayerId;
    dto.goldenGlovePlayerId = prediction.goldenGlovePlayerId;
    dto.championTeamId = prediction.championTeamId;
    dto.totalPoints = prediction.totalPoints;
    dto.isLocked = prediction.isLocked;
    dto.createdAt = prediction.createdAt;
    dto.updatedAt = prediction.updatedAt;
    return dto;
  }
}
