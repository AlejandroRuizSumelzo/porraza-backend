import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  MatchPrediction,
  PenaltiesWinner,
  PointsBreakdown,
} from '@domain/entities/match-prediction.entity';

/**
 * MatchPredictionResponseDto
 *
 * DTO de respuesta para entidad MatchPrediction.
 * Representa la predicción de un usuario para un partido específico.
 *
 * Usado en:
 * - GET /predictions/league/:leagueId (dentro de matches array)
 * - GET /predictions/:id/groups/:groupId
 *
 * Campos incluidos:
 * - Identificación: id, predictionId, matchId
 * - Predicción 90': homeScore, awayScore
 * - Predicción ET: homeScoreET, awayScoreET (solo eliminatorias)
 * - Predicción Penaltis: penaltiesWinner (solo eliminatorias)
 * - Puntos: pointsEarned, pointsBreakdown
 * - Metadata: createdAt, updatedAt
 */
export class MatchPredictionResponseDto {
  @ApiPropertyOptional({
    description:
      'Match prediction unique identifier (UUID) - null if not created yet',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  id!: string | null;

  @ApiPropertyOptional({
    description: 'Prediction UUID this match prediction belongs to',
    example: '650e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  predictionId!: string | null;

  @ApiPropertyOptional({
    description: 'Match UUID being predicted',
    example: '750e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  matchId!: string | null;

  @ApiProperty({
    description: 'Predicted home team score in 90 minutes',
    example: 2,
    minimum: 0,
    default: 0,
  })
  homeScore!: number;

  @ApiProperty({
    description: 'Predicted away team score in 90 minutes',
    example: 1,
    minimum: 0,
    default: 0,
  })
  awayScore!: number;

  @ApiPropertyOptional({
    description:
      'Predicted home team score after extra time (knockout matches only)',
    example: 3,
    minimum: 0,
    nullable: true,
  })
  homeScoreET!: number | null;

  @ApiPropertyOptional({
    description:
      'Predicted away team score after extra time (knockout matches only)',
    example: 2,
    minimum: 0,
    nullable: true,
  })
  awayScoreET!: number | null;

  @ApiPropertyOptional({
    description:
      'Predicted penalty shootout winner (knockout matches only, if ET ends in draw)',
    example: 'home',
    enum: ['home', 'away'],
    nullable: true,
  })
  penaltiesWinner!: PenaltiesWinner | null;

  @ApiProperty({
    description: 'Total points earned from this prediction (0 if not calculated yet)',
    example: 5,
    minimum: 0,
    default: 0,
  })
  pointsEarned!: number;

  @ApiProperty({
    description:
      'Detailed breakdown of points earned (empty object if not calculated)',
    example: {
      exactResult: 3,
      correct1X2: 1,
      phaseBonus: 5,
    },
    default: {},
  })
  pointsBreakdown!: PointsBreakdown;

  @ApiPropertyOptional({
    description: 'Timestamp when match prediction was created',
    example: '2025-10-24T12:00:00.000Z',
    nullable: true,
  })
  createdAt!: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when match prediction was last updated',
    example: '2025-10-24T12:00:00.000Z',
    nullable: true,
  })
  updatedAt!: Date | null;

  /**
   * Factory method para crear DTO desde entidad de dominio
   *
   * @param matchPrediction - Entidad MatchPrediction del dominio
   * @returns MatchPredictionResponseDto para HTTP response
   */
  static fromEntity(
    matchPrediction: MatchPrediction,
  ): MatchPredictionResponseDto {
    const dto = new MatchPredictionResponseDto();
    dto.id = matchPrediction.id;
    dto.predictionId = matchPrediction.predictionId;
    dto.matchId = matchPrediction.matchId;
    dto.homeScore = matchPrediction.homeScore;
    dto.awayScore = matchPrediction.awayScore;
    dto.homeScoreET = matchPrediction.homeScoreET;
    dto.awayScoreET = matchPrediction.awayScoreET;
    dto.penaltiesWinner = matchPrediction.penaltiesWinner;
    dto.pointsEarned = matchPrediction.pointsEarned;
    dto.pointsBreakdown = matchPrediction.pointsBreakdown;
    dto.createdAt = matchPrediction.createdAt;
    dto.updatedAt = matchPrediction.updatedAt;
    return dto;
  }

  /**
   * Factory method para crear predicción inicializada (0-0)
   * Se usa cuando el usuario aún no ha hecho predicción para un partido
   *
   * @param matchId - UUID del partido
   * @returns MatchPredictionResponseDto con valores por defecto
   */
  static createEmpty(matchId: string): MatchPredictionResponseDto {
    const dto = new MatchPredictionResponseDto();
    dto.id = null;
    dto.predictionId = null;
    dto.matchId = matchId;
    dto.homeScore = 0;
    dto.awayScore = 0;
    dto.homeScoreET = null;
    dto.awayScoreET = null;
    dto.penaltiesWinner = null;
    dto.pointsEarned = 0;
    dto.pointsBreakdown = {};
    dto.createdAt = null;
    dto.updatedAt = null;
    return dto;
  }
}
