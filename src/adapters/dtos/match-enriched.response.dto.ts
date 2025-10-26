import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchPhase, MatchStatus } from '@domain/entities/match.entity';
import { TeamBasicDto } from './team-basic.dto';
import { StadiumBasicDto } from './stadium-basic.dto';
import { GroupBasicDto } from './group-basic.dto';

/**
 * MatchEnrichedResponseDto
 *
 * DTO enriquecido de Match que incluye objetos completos de Team, Stadium y Group.
 * A diferencia de MatchResponseDto (que solo tiene IDs), este DTO incluye toda la información
 * necesaria para que el frontend renderice sin hacer queries adicionales.
 *
 * Usado en:
 * - GET /predictions/league/:leagueId (matches con predicciones)
 *
 * Estructura enriquecida:
 * - homeTeam: Objeto TeamBasicDto completo (name, fifaCode, confederation)
 * - awayTeam: Objeto TeamBasicDto completo
 * - stadium: Objeto StadiumBasicDto completo (name, city, country, capacity)
 * - group: Objeto GroupBasicDto completo (solo para fase de grupos)
 *
 * Frontend puede renderizar:
 * - "MEX vs NZL" (usando fifaCode)
 * - "Mexico vs Nueva Zelanda" (usando name)
 * - "Estadio Azteca, Mexico City" (usando stadium.name, stadium.city)
 * - "Grupo A" (usando group.name)
 */
export class MatchEnrichedResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the match',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
  })
  id!: string;

  @ApiProperty({
    description: 'Official match number (1-104)',
    example: 1,
    minimum: 1,
    maximum: 104,
  })
  matchNumber!: number;

  @ApiProperty({
    description: 'Home team complete information',
    type: TeamBasicDto,
  })
  homeTeam!: TeamBasicDto | null;

  @ApiProperty({
    description: 'Away team complete information',
    type: TeamBasicDto,
  })
  awayTeam!: TeamBasicDto | null;

  @ApiPropertyOptional({
    description:
      'Placeholder describing the home team for knockout matches (e.g., "Group A winners")',
    example: 'Group A winners',
    nullable: true,
  })
  homeTeamPlaceholder!: string | null;

  @ApiPropertyOptional({
    description:
      'Placeholder describing the away team for knockout matches (e.g., "Group B runners-up")',
    example: 'Group B runners-up',
    nullable: true,
  })
  awayTeamPlaceholder!: string | null;

  @ApiProperty({
    description: 'Stadium complete information',
    type: StadiumBasicDto,
  })
  stadium!: StadiumBasicDto;

  @ApiPropertyOptional({
    description: 'Group information (only for group stage matches, null for knockout)',
    type: GroupBasicDto,
    nullable: true,
  })
  group!: GroupBasicDto | null;

  @ApiProperty({
    description: 'Tournament phase of the match',
    enum: MatchPhase,
    example: MatchPhase.GROUP_STAGE,
  })
  phase!: MatchPhase;

  @ApiProperty({
    description: 'Date of the match',
    example: '2026-06-11T00:00:00.000Z',
  })
  matchDate!: Date;

  @ApiProperty({
    description: 'Kickoff time (HH:MM:SS format)',
    example: '20:00:00',
  })
  matchTime!: string;

  @ApiPropertyOptional({
    description:
      'Home team score in regular time (null if match not played yet)',
    example: 2,
    nullable: true,
  })
  homeScore!: number | null;

  @ApiPropertyOptional({
    description:
      'Away team score in regular time (null if match not played yet)',
    example: 1,
    nullable: true,
  })
  awayScore!: number | null;

  @ApiPropertyOptional({
    description:
      'Home team cumulative score after extra time (knockout matches only)',
    example: 3,
    nullable: true,
  })
  homeScoreEt!: number | null;

  @ApiPropertyOptional({
    description:
      'Away team cumulative score after extra time (knockout matches only)',
    example: 2,
    nullable: true,
  })
  awayScoreEt!: number | null;

  @ApiPropertyOptional({
    description: 'Home team penalty shootout score (knockout matches only)',
    example: 5,
    nullable: true,
  })
  homePenalties!: number | null;

  @ApiPropertyOptional({
    description: 'Away team penalty shootout score (knockout matches only)',
    example: 4,
    nullable: true,
  })
  awayPenalties!: number | null;

  @ApiProperty({
    description: 'Current status of the match',
    enum: MatchStatus,
    example: MatchStatus.SCHEDULED,
  })
  status!: MatchStatus;

  @ApiProperty({
    description: 'Deadline for predictions (global: 1 hour before first match)',
    example: '2026-06-12T02:00:00.000+02:00',
  })
  predictionsLockedAt!: Date;

  @ApiPropertyOptional({
    description:
      'Array of match numbers that determine the teams for this match (knockout only)',
    example: [53, 54, 51, 52],
    nullable: true,
    type: [Number],
  })
  dependsOnMatchIds!: number[] | null;

  @ApiProperty({
    description: 'Timestamp when the match was created',
    example: '2025-10-21T11:49:19.503+02:00',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the match was last updated',
    example: '2025-10-21T11:49:19.503+02:00',
  })
  updatedAt!: Date;
}
