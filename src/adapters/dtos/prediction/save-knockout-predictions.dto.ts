import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para una predicción de partido de eliminatorias
 */
export class KnockoutMatchPredictionDto {
  @ApiProperty({
    description: 'ID del partido',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'Match ID is required' })
  @IsUUID('4', { message: 'Match ID must be a valid UUID' })
  matchId: string;

  @ApiProperty({
    description: 'ID del equipo local',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'Home team ID is required' })
  @IsUUID('4', { message: 'Home team ID must be a valid UUID' })
  homeTeamId: string;

  @ApiProperty({
    description: 'ID del equipo visitante',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsNotEmpty({ message: 'Away team ID is required' })
  @IsUUID('4', { message: 'Away team ID must be a valid UUID' })
  awayTeamId: string;

  @ApiProperty({
    description: 'Goles del equipo local en tiempo reglamentario (90 minutos)',
    example: 2,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Home score is required' })
  @IsInt({ message: 'Home score must be an integer' })
  @Min(0, { message: 'Home score cannot be negative' })
  homeScore: number;

  @ApiProperty({
    description:
      'Goles del equipo visitante en tiempo reglamentario (90 minutos)',
    example: 1,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Away score is required' })
  @IsInt({ message: 'Away score must be an integer' })
  @Min(0, { message: 'Away score cannot be negative' })
  awayScore: number;

  @ApiPropertyOptional({
    description:
      'Goles del equipo local en prórroga (solo si hay empate en 90 minutos)',
    example: 3,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'Home extra time score must be an integer' })
  @Min(0, { message: 'Home extra time score cannot be negative' })
  homeScoreET?: number | null;

  @ApiPropertyOptional({
    description:
      'Goles del equipo visitante en prórroga (solo si hay empate en 90 minutos)',
    example: 2,
    minimum: 0,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'Away extra time score must be an integer' })
  @Min(0, { message: 'Away extra time score cannot be negative' })
  awayScoreET?: number | null;

  @ApiPropertyOptional({
    description:
      'Ganador de los penaltis (solo si hay empate después de la prórroga)',
    example: 'home',
    enum: ['home', 'away'],
    nullable: true,
  })
  @IsOptional()
  @IsIn(['home', 'away'], {
    message: 'Penalties winner must be either "home" or "away"',
  })
  penaltiesWinner?: 'home' | 'away' | null;
}

/**
 * DTO para guardar predicciones de una fase de eliminatorias
 */
export class SaveKnockoutPredictionsDto {
  @ApiProperty({
    description: 'Fase de eliminatorias',
    example: 'ROUND_OF_16',
    enum: ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'],
  })
  @IsNotEmpty({ message: 'Phase is required' })
  @IsIn(['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'], {
    message: 'Invalid phase',
  })
  phase: string;

  @ApiProperty({
    description: 'Array de predicciones de partidos',
    type: [KnockoutMatchPredictionDto],
    example: [
      {
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        homeTeamId: '123e4567-e89b-12d3-a456-426614174001',
        awayTeamId: '123e4567-e89b-12d3-a456-426614174002',
        homeScore: 2,
        awayScore: 2,
        homeScoreET: 3,
        awayScoreET: 2,
        penaltiesWinner: null,
      },
    ],
  })
  @IsArray({ message: 'Predictions must be an array' })
  @ArrayNotEmpty({ message: 'Predictions array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => KnockoutMatchPredictionDto)
  predictions: KnockoutMatchPredictionDto[];
}
