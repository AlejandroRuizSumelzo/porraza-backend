import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchPhase, MatchStatus } from '@domain/entities/match.entity';

/**
 * DTO anidado para representar un equipo en el calendario
 */
export class CalendarTeamDto {
  @ApiProperty({
    description: 'Team ID',
    example: 'd8357f2b-e7be-47ad-8e06-997d09017409',
  })
  id: string;

  @ApiProperty({
    description: 'Team name',
    example: 'Mexico',
  })
  name: string;

  @ApiProperty({
    description: 'FIFA three-letter code',
    example: 'MEX',
  })
  fifaCode: string;

  @ApiProperty({
    description: 'Confederation',
    example: 'CONCACAF',
  })
  confederation: string;

  @ApiProperty({
    description: 'Whether the team is a host nation',
    example: true,
  })
  isHost: boolean;

  @ApiPropertyOptional({
    description:
      'Placeholder text for TBD teams (e.g., "Group A winners"). Only present for knockout matches.',
    example: 'Group A winners',
    nullable: true,
  })
  placeholder: string | null;
}

/**
 * DTO anidado para representar un estadio en el calendario
 */
export class CalendarStadiumDto {
  @ApiProperty({
    description: 'Stadium ID',
    example: 'fd2c4c48-1a2d-4404-8a61-3c463e3e1604',
  })
  id: string;

  @ApiProperty({
    description: 'Stadium code (for images)',
    example: 'MEX_CDMX_AZTECA',
  })
  code: string;

  @ApiProperty({
    description: 'Stadium name',
    example: 'Estadio Azteca',
  })
  name: string;

  @ApiProperty({
    description: 'City',
    example: 'Ciudad de México',
  })
  city: string;

  @ApiProperty({
    description: 'Country code (3 letters)',
    example: 'MEX',
  })
  country: string;

  @ApiProperty({
    description: 'IANA timezone',
    example: 'America/Mexico_City',
  })
  timezone: string;

  @ApiPropertyOptional({
    description: 'Stadium capacity',
    example: 87000,
    nullable: true,
  })
  capacity: number | null;
}

/**
 * DTO para representar un partido en el calendario
 */
export class MatchCalendarItemDto {
  @ApiProperty({
    description: 'Match ID',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
  })
  id: string;

  @ApiProperty({
    description: 'Match number (1-104)',
    example: 1,
    minimum: 1,
    maximum: 104,
  })
  matchNumber: number;

  @ApiProperty({
    description: 'Tournament phase',
    enum: MatchPhase,
    example: MatchPhase.GROUP_STAGE,
  })
  phase: MatchPhase;

  @ApiPropertyOptional({
    description: 'Group letter (only for GROUP_STAGE matches)',
    example: 'A',
    nullable: true,
  })
  group: string | null;

  @ApiProperty({
    description: 'Match date (YYYY-MM-DD)',
    example: '2026-06-11',
  })
  date: string;

  @ApiProperty({
    description: 'Match time (HH:MM:SS)',
    example: '20:00:00',
  })
  time: string;

  @ApiProperty({
    description: 'Match status',
    enum: MatchStatus,
    example: MatchStatus.SCHEDULED,
  })
  status: MatchStatus;

  @ApiProperty({
    description: 'Home team data',
    type: CalendarTeamDto,
  })
  homeTeam: CalendarTeamDto;

  @ApiProperty({
    description: 'Away team data',
    type: CalendarTeamDto,
  })
  awayTeam: CalendarTeamDto;

  @ApiProperty({
    description: 'Stadium data',
    type: CalendarStadiumDto,
  })
  stadium: CalendarStadiumDto;

  @ApiPropertyOptional({
    description: 'Match score (null if not finished)',
    example: { home: 2, away: 1 },
    nullable: true,
  })
  score: { home: number; away: number } | null;

  @ApiPropertyOptional({
    description:
      'Extra time score (knockout matches only, null if not applicable)',
    example: { home: 3, away: 2 },
    nullable: true,
  })
  scoreEt: { home: number; away: number } | null;

  @ApiPropertyOptional({
    description:
      'Penalty shootout score (knockout matches only, null if not applicable)',
    example: { home: 5, away: 4 },
    nullable: true,
  })
  penalties: { home: number; away: number } | null;
}

/**
 * DTO para agrupar partidos por fase del torneo
 */
export class MatchCalendarPhaseGroupDto {
  @ApiProperty({
    description: 'Phase name',
    enum: MatchPhase,
    example: MatchPhase.GROUP_STAGE,
  })
  phase: MatchPhase;

  @ApiProperty({
    description: 'Matches in this phase',
    type: [MatchCalendarItemDto],
  })
  matches: MatchCalendarItemDto[];
}

/**
 * DTO de respuesta para el calendario completo del Mundial
 */
export class MatchCalendarResponseDto {
  @ApiProperty({
    description: 'Total number of matches',
    example: 104,
  })
  total: number;

  @ApiProperty({
    description: 'Matches grouped by tournament phase',
    type: [MatchCalendarPhaseGroupDto],
  })
  calendar: MatchCalendarPhaseGroupDto[];
}
