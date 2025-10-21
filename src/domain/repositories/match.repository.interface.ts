import type { Match } from '@domain/entities/match.entity';

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
  findCalendarWithDetails(): Promise<MatchWithDetailsRow[]>;
}
