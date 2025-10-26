import {
  IsUUID,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para predicción de un partido individual
 */
export class MatchPredictionDto {
  @ApiProperty({
    description: 'UUID of the match',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'Match ID must be a valid UUID' })
  matchId!: string;

  @ApiProperty({
    description: 'Home team score (90 minutes)',
    example: 2,
    minimum: 0,
  })
  @IsInt({ message: 'Home score must be an integer' })
  @Min(0, { message: 'Home score cannot be negative' })
  homeScore!: number;

  @ApiProperty({
    description: 'Away team score (90 minutes)',
    example: 1,
    minimum: 0,
  })
  @IsInt({ message: 'Away score must be an integer' })
  @Min(0, { message: 'Away score cannot be negative' })
  awayScore!: number;

  @ApiProperty({
    description: 'Home team score in extra time (only for knockouts)',
    example: 3,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Home extra time score must be an integer' })
  @Min(0, { message: 'Home extra time score cannot be negative' })
  homeScoreET?: number | null;

  @ApiProperty({
    description: 'Away team score in extra time (only for knockouts)',
    example: 2,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Away extra time score must be an integer' })
  @Min(0, { message: 'Away extra time score cannot be negative' })
  awayScoreET?: number | null;

  @ApiProperty({
    description: 'Winner on penalties (home or away)',
    example: 'home',
    enum: ['home', 'away'],
    required: false,
  })
  @IsOptional()
  @IsIn(['home', 'away'], { message: 'Penalties winner must be "home" or "away"' })
  penaltiesWinner?: 'home' | 'away' | null;
}

/**
 * SaveGroupPredictionsDto (Adapters Layer)
 *
 * DTO para guardar predicciones de un grupo completo (6 partidos).
 */
export class SaveGroupPredictionsDto {
  @ApiProperty({
    description: 'Array of 6 match predictions (one group has 6 matches)',
    type: [MatchPredictionDto],
    minItems: 6,
    maxItems: 6,
  })
  @IsArray({ message: 'Match predictions must be an array' })
  @ArrayMinSize(6, { message: 'A group must have exactly 6 match predictions' })
  @ArrayMaxSize(6, { message: 'A group must have exactly 6 match predictions' })
  @ValidateNested({ each: true })
  @Type(() => MatchPredictionDto)
  matchPredictions!: MatchPredictionDto[];
}
