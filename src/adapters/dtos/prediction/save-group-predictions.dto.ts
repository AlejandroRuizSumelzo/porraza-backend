import {
  IsUUID,
  IsArray,
  IsInt,
  Min,
  Max,
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
    description: 'UUID of home team (optional, backend will fetch from match)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Home team ID must be a valid UUID' })
  homeTeamId?: string;

  @ApiProperty({
    description: 'UUID of away team (optional, backend will fetch from match)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Away team ID must be a valid UUID' })
  awayTeamId?: string;

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
 * DTO para posición en tabla de grupo
 * NUEVO: Frontend envía la clasificación calculada
 */
export class GroupStandingDto {
  @ApiProperty({
    description: 'UUID of the team',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'Team ID must be a valid UUID' })
  teamId!: string;

  @ApiProperty({
    description: 'Position in the group (1-4)',
    example: 1,
    minimum: 1,
    maximum: 4,
  })
  @IsInt({ message: 'Position must be an integer' })
  @Min(1, { message: 'Position must be between 1 and 4' })
  @Max(4, { message: 'Position must be between 1 and 4' })
  position!: number;

  @ApiProperty({
    description: 'Total points (3 per win, 1 per draw)',
    example: 9,
    minimum: 0,
  })
  @IsInt({ message: 'Points must be an integer' })
  @Min(0, { message: 'Points cannot be negative' })
  points!: number;

  @ApiProperty({
    description: 'Matches played',
    example: 3,
    minimum: 0,
    maximum: 3,
  })
  @IsInt({ message: 'Played must be an integer' })
  @Min(0, { message: 'Played cannot be negative' })
  played!: number;

  @ApiProperty({
    description: 'Wins',
    example: 3,
    minimum: 0,
  })
  @IsInt({ message: 'Wins must be an integer' })
  @Min(0, { message: 'Wins cannot be negative' })
  wins!: number;

  @ApiProperty({
    description: 'Draws',
    example: 0,
    minimum: 0,
  })
  @IsInt({ message: 'Draws must be an integer' })
  @Min(0, { message: 'Draws cannot be negative' })
  draws!: number;

  @ApiProperty({
    description: 'Losses',
    example: 0,
    minimum: 0,
  })
  @IsInt({ message: 'Losses must be an integer' })
  @Min(0, { message: 'Losses cannot be negative' })
  losses!: number;

  @ApiProperty({
    description: 'Goals for',
    example: 7,
    minimum: 0,
  })
  @IsInt({ message: 'Goals for must be an integer' })
  @Min(0, { message: 'Goals for cannot be negative' })
  goalsFor!: number;

  @ApiProperty({
    description: 'Goals against',
    example: 2,
    minimum: 0,
  })
  @IsInt({ message: 'Goals against must be an integer' })
  @Min(0, { message: 'Goals against cannot be negative' })
  goalsAgainst!: number;

  @ApiProperty({
    description: 'Goal difference (goalsFor - goalsAgainst)',
    example: 5,
  })
  @IsInt({ message: 'Goal difference must be an integer' })
  goalDifference!: number;
}

/**
 * SaveGroupPredictionsDto (Adapters Layer)
 *
 * DTO para guardar predicciones de un grupo completo.
 * NUEVO ENFOQUE: Incluye tanto matchPredictions como groupStandings
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

  @ApiProperty({
    description:
      'Array of 4 group standings (calculated by frontend, validated by backend)',
    type: [GroupStandingDto],
    minItems: 4,
    maxItems: 4,
  })
  @IsArray({ message: 'Group standings must be an array' })
  @ArrayMinSize(4, { message: 'Group standings must have exactly 4 teams' })
  @ArrayMaxSize(4, { message: 'Group standings must have exactly 4 teams' })
  @ValidateNested({ each: true })
  @Type(() => GroupStandingDto)
  groupStandings!: GroupStandingDto[];
}

/**
 * Response DTO para SaveGroupPredictions
 */
export class SaveGroupPredictionsResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Group predictions saved successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Whether all 12 groups have been completed',
    example: false,
  })
  groupsCompleted!: boolean;

  @ApiProperty({
    description: 'Total number of groups completed (out of 12)',
    example: 5,
    minimum: 0,
    maximum: 12,
  })
  totalGroupsCompleted!: number;
}
