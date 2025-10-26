import { ApiProperty } from '@nestjs/swagger';

/**
 * PredictionStatsResponseDto
 *
 * DTO de respuesta para estadísticas de una predicción.
 * Proporciona métricas de progreso y completitud.
 *
 * Usado en:
 * - GET /predictions/:id/stats
 *
 * Utilidad:
 * - Frontend muestra barra de progreso
 * - Validar si predicción está completa
 * - Mostrar avisos de "completar grupos", "seleccionar campeón", etc.
 */
export class PredictionStatsResponseDto {
  @ApiProperty({
    description: 'Total number of matches in the tournament (104)',
    example: 104,
  })
  totalMatches!: number;

  @ApiProperty({
    description: 'Number of matches already predicted by the user',
    example: 48,
    minimum: 0,
  })
  predictedMatches!: number;

  @ApiProperty({
    description: 'Number of groups completed (with full standings)',
    example: 8,
    minimum: 0,
    maximum: 12,
  })
  groupsCompleted!: number;

  @ApiProperty({
    description: 'Total number of groups in the tournament (12)',
    example: 12,
  })
  totalGroups!: number;

  @ApiProperty({
    description: 'Whether user has selected a champion team',
    example: true,
  })
  hasChampion!: boolean;

  @ApiProperty({
    description:
      'Whether user has selected all awards (Golden Boot, Ball, Glove)',
    example: false,
  })
  hasAllAwards!: boolean;

  @ApiProperty({
    description: 'Overall completion percentage (0-100)',
    example: 75.5,
    minimum: 0,
    maximum: 100,
  })
  completionPercentage!: number;
}
