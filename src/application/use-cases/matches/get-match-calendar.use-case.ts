import { Injectable, Inject } from '@nestjs/common';
import type {
  IMatchRepository,
  MatchWithDetailsRow,
} from '@domain/repositories/match.repository.interface';
import {
  MatchCalendarResponseDto,
  MatchCalendarPhaseGroupDto,
  MatchCalendarItemDto,
  CalendarTeamDto,
  CalendarStadiumDto,
} from '@adapters/dtos/match-calendar.response.dto';
import { MatchPhase, MatchStatus } from '@domain/entities/match.entity';

/**
 * GetMatchCalendarUseCase (Application Layer)
 *
 * Caso de uso que obtiene el calendario completo del Mundial con todos los detalles
 * necesarios (equipos, estadios) y los agrupa por fase del torneo.
 *
 * Responsabilidades:
 * - Obtener datos del repositorio
 * - Transformar datos de BD a DTOs de respuesta
 * - Agrupar partidos por fase del torneo
 * - Ordenar las fases en orden lógico del torneo
 *
 * Flujo:
 * 1. Llamar al repositorio para obtener todos los partidos con detalles (JOIN query)
 * 2. Transformar cada fila de BD a MatchCalendarItemDto
 * 3. Agrupar partidos por fase
 * 4. Ordenar fases según progresión del torneo
 * 5. Retornar estructura agrupada
 */
@Injectable()
export class GetMatchCalendarUseCase {
  constructor(
    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(): Promise<MatchCalendarResponseDto> {
    // 1. Obtener todos los partidos con detalles desde el repositorio
    const matchRows = await this.matchRepository.findCalendarWithDetails();

    // 2. Transformar filas de BD a DTOs
    const matchItems = matchRows.map((row) => this.mapRowToCalendarItem(row));

    // 3. Agrupar partidos por fase
    const groupedByPhase = this.groupMatchesByPhase(matchItems);

    // 4. Construir respuesta
    const response = new MatchCalendarResponseDto();
    response.total = matchItems.length;
    response.calendar = groupedByPhase;

    return response;
  }

  /**
   * Transforma una fila de base de datos con JOINs a un MatchCalendarItemDto
   */
  private mapRowToCalendarItem(row: MatchWithDetailsRow): MatchCalendarItemDto {
    const item = new MatchCalendarItemDto();

    // Match basic info
    item.id = row.match_id;
    item.matchNumber = row.match_number;
    item.phase = row.phase as MatchPhase;
    item.group = row.group_name;
    item.date = this.formatDate(row.match_date);
    item.time = row.match_time;
    item.status = row.status as MatchStatus;

    // Home team
    item.homeTeam = new CalendarTeamDto();
    item.homeTeam.id = row.home_team_id;
    item.homeTeam.name = row.home_team_name;
    item.homeTeam.fifaCode = row.home_team_fifa_code;
    item.homeTeam.confederation = row.home_team_confederation;
    item.homeTeam.isHost = row.home_team_is_host;
    item.homeTeam.placeholder = row.home_team_placeholder;

    // Away team
    item.awayTeam = new CalendarTeamDto();
    item.awayTeam.id = row.away_team_id;
    item.awayTeam.name = row.away_team_name;
    item.awayTeam.fifaCode = row.away_team_fifa_code;
    item.awayTeam.confederation = row.away_team_confederation;
    item.awayTeam.isHost = row.away_team_is_host;
    item.awayTeam.placeholder = row.away_team_placeholder;

    // Stadium
    item.stadium = new CalendarStadiumDto();
    item.stadium.id = row.stadium_id;
    item.stadium.code = row.stadium_code;
    item.stadium.name = row.stadium_name;
    item.stadium.city = row.stadium_city;
    item.stadium.country = row.stadium_country;
    item.stadium.timezone = row.stadium_timezone;
    item.stadium.capacity = row.stadium_capacity;

    // Scores (solo si están disponibles)
    if (row.home_score !== null && row.away_score !== null) {
      item.score = {
        home: row.home_score,
        away: row.away_score,
      };
    } else {
      item.score = null;
    }

    if (row.home_score_et !== null && row.away_score_et !== null) {
      item.scoreEt = {
        home: row.home_score_et,
        away: row.away_score_et,
      };
    } else {
      item.scoreEt = null;
    }

    if (row.home_penalties !== null && row.away_penalties !== null) {
      item.penalties = {
        home: row.home_penalties,
        away: row.away_penalties,
      };
    } else {
      item.penalties = null;
    }

    return item;
  }

  /**
   * Agrupa los partidos por fase del torneo y los ordena según la progresión del Mundial
   */
  private groupMatchesByPhase(
    matches: MatchCalendarItemDto[],
  ): MatchCalendarPhaseGroupDto[] {
    // Agrupar por fase usando Map para mantener orden
    const phaseMap = new Map<MatchPhase, MatchCalendarItemDto[]>();

    for (const match of matches) {
      if (!phaseMap.has(match.phase)) {
        phaseMap.set(match.phase, []);
      }
      phaseMap.get(match.phase)!.push(match);
    }

    // Orden de fases según progresión del torneo
    const phaseOrder: MatchPhase[] = [
      MatchPhase.GROUP_STAGE,
      MatchPhase.ROUND_OF_32,
      MatchPhase.ROUND_OF_16,
      MatchPhase.QUARTER_FINAL,
      MatchPhase.SEMI_FINAL,
      MatchPhase.THIRD_PLACE,
      MatchPhase.FINAL,
    ];

    // Construir array ordenado
    const result: MatchCalendarPhaseGroupDto[] = [];

    for (const phase of phaseOrder) {
      const matchesInPhase = phaseMap.get(phase);
      if (matchesInPhase && matchesInPhase.length > 0) {
        const group = new MatchCalendarPhaseGroupDto();
        group.phase = phase;
        group.matches = matchesInPhase;
        result.push(group);
      }
    }

    return result;
  }

  /**
   * Formatea una fecha a string YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
