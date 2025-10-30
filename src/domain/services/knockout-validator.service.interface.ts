import type { KnockoutPhase } from '@domain/value-objects/knockout-phase.vo';
import type { MatchPrediction } from '@domain/entities/match-prediction.entity';

/**
 * IKnockoutValidatorService (Domain Service Interface)
 *
 * Define el contrato para validar predicciones de fases eliminatorias.
 *
 * Responsabilidades:
 * - Validar que la fase anterior esté completa
 * - Validar que los equipos en los partidos coincidan con los ganadores de la fase anterior
 * - Validar consistencia de resultados (90', prórroga, penaltis)
 */
export interface IKnockoutValidatorService {
  /**
   * Valida que una fase de eliminatorias pueda ser predicha
   *
   * @param predictionId - ID de la predicción
   * @param phase - Fase a validar
   * @returns true si la fase puede ser predicha
   * @throws Error si la fase anterior no está completa o si faltan predicciones
   */
  validatePhaseCanBePredicted(
    predictionId: string,
    phase: KnockoutPhase,
  ): Promise<void>;

  /**
   * Valida que los equipos en un partido coincidan con los ganadores esperados
   * de la fase anterior
   *
   * @param predictionId - ID de la predicción
   * @param phase - Fase actual
   * @param matchId - ID del partido
   * @param homeTeamId - ID del equipo local predicho
   * @param awayTeamId - ID del equipo visitante predicho
   * @throws Error si los equipos no coinciden con los ganadores esperados
   */
  validateMatchTeams(
    predictionId: string,
    phase: KnockoutPhase,
    matchId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): Promise<void>;

  /**
   * Valida la consistencia de los resultados de un partido
   * (90', prórroga, penaltis)
   *
   * @param homeScore - Goles del equipo local en 90'
   * @param awayScore - Goles del equipo visitante en 90'
   * @param homeScoreET - Goles del equipo local en prórroga (opcional)
   * @param awayScoreET - Goles del equipo visitante en prórroga (opcional)
   * @param penaltiesWinner - Ganador de penaltis (opcional)
   * @throws Error si hay inconsistencias
   */
  validateMatchResult(
    homeScore: number,
    awayScore: number,
    homeScoreET: number | null,
    awayScoreET: number | null,
    penaltiesWinner: 'home' | 'away' | null,
  ): void;

  /**
   * Obtiene el mapa de partidos de la fase anterior con sus ganadores predichos
   *
   * @param predictionId - ID de la predicción
   * @param phase - Fase actual
   * @returns Map de matchId → winnerId
   */
  getPreviousPhaseWinners(
    predictionId: string,
    phase: KnockoutPhase,
  ): Promise<Map<string, string>>;
}

/**
 * Resultado de validación de fase
 */
export interface PhaseValidationResult {
  canPredict: boolean;
  reason?: string;
  previousPhase?: string;
  missingMatchesCount?: number;
}
