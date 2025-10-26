import type { Match } from '@domain/entities/match.entity';

/**
 * Interfaz para los datos combinados simplificados de un partido
 * Usada para retornar matches de fase de grupos con información de equipos, estadio y grupo
 * Esta interfaz es más ligera que MatchWithDetailsRow (solo campos esenciales)
 */
export interface MatchWithBasicDetailsRow {
  // Match data
  match_id: string;
  match_number: number;
  phase: string;
  match_date: Date;
  match_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  predictions_locked_at: Date;
  home_team_placeholder: string | null;
  away_team_placeholder: string | null;
  depends_on_match_ids: number[] | null;
  created_at: Date;
  updated_at: Date;

  // Home team (basic)
  home_team_id: string | null;
  home_team_name: string | null;
  home_team_fifa_code: string | null;
  home_team_confederation: string | null;

  // Away team (basic)
  away_team_id: string | null;
  away_team_name: string | null;
  away_team_fifa_code: string | null;
  away_team_confederation: string | null;

  // Stadium (basic)
  stadium_id: string;
  stadium_code: string;
  stadium_name: string;
  stadium_city: string;
  stadium_country: string;
  stadium_capacity: number | null;

  // Group (basic, nullable for knockout stages)
  group_id: string | null;
  group_name: string | null;
}

/**
 * Interfaz para los datos combinados de un partido con información de equipos y estadio
 * Esta interfaz representa el resultado de una query con JOINs
 */
export interface MatchWithDetailsRow {
  // Match data
  match_id: string;
  match_number: number;
  phase: string;
  group_id: string | null;
  group_name: string | null;
  match_date: Date;
  match_time: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
  home_penalties: number | null;
  away_penalties: number | null;

  // Home team data
  home_team_id: string;
  home_team_name: string;
  home_team_fifa_code: string;
  home_team_confederation: string;
  home_team_is_host: boolean;
  home_team_placeholder: string | null;

  // Away team data
  away_team_id: string;
  away_team_name: string;
  away_team_fifa_code: string;
  away_team_confederation: string;
  away_team_is_host: boolean;
  away_team_placeholder: string | null;

  // Stadium data
  stadium_id: string;
  stadium_code: string;
  stadium_name: string;
  stadium_city: string;
  stadium_country: string;
  stadium_timezone: string;
  stadium_capacity: number | null;
}

export interface IMatchRepository {
  findAll(): Promise<Match[]>;
  findById(id: string): Promise<Match | null>;
  findByIds(ids: string[]): Promise<Match[]>;
  findCalendarWithDetails(): Promise<MatchWithDetailsRow[]>;

  /**
   * Obtiene todos los partidos de fase de grupos (GROUP_STAGE)
   * @returns Array de 72 partidos de la fase de grupos
   */
  findGroupStageMatches(): Promise<Match[]>;

  /**
   * Obtiene todos los partidos de fase de grupos con información completa
   * Incluye objetos completos de teams, stadium y group mediante JOINs
   * Optimizado para el endpoint de predicciones
   * @returns Array de 72 partidos con todos los detalles
   */
  findGroupStageMatchesWithDetails(): Promise<MatchWithBasicDetailsRow[]>;
}
