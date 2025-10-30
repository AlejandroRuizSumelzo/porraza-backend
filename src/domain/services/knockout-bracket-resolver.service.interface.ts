import type { GroupStandingPrediction } from '@domain/entities/group-standing-prediction.entity';
import type { BestThirdPlacePrediction } from '@domain/entities/best-third-place-prediction.entity';
import type { Match } from '@domain/entities/match.entity';

/**
 * IKnockoutBracketResolverService (Domain Layer)
 *
 * Domain Service para resolver los equipos de partidos de eliminatorias basándose
 * en las predicciones de fase de grupos.
 *
 * Contexto FIFA Mundial 2026:
 * - 48 equipos, 12 grupos de 4 equipos cada uno
 * - Clasifican: 12 primeros + 12 segundos + 8 mejores terceros = 32 equipos a R32
 * - Los partidos de Round of 32 tienen placeholders (ej: "Group A winners")
 * - Este servicio resuelve qué equipo juega en cada partido según las predicciones
 *
 * Responsabilidades:
 * - Extraer equipos clasificados de group_standings_predictions (1º y 2º)
 * - Extraer equipos clasificados de best_third_places_predictions (8 mejores 3º)
 * - Resolver placeholders simples: "Group A winners", "Group B runners-up"
 * - Resolver placeholders complejos: "Group A/B/C/D/F third place"
 * - Garantizar que cada tercero se asigne a UN SOLO partido
 *
 * Reglas de asignación de terceros:
 * - De los grupos posibles (ej: A/B/C/D/F), filtrar cuáles están en top 8
 * - Asignar el tercero con mejor ranking (menor rankingPosition)
 * - Marcar como "usado" para no asignar dos veces
 * - Procesar partidos en orden (match_number 73-88)
 */
export interface IKnockoutBracketResolverService {
  /**
   * Resuelve los equipos (home/away) de partidos de Round of 32
   * basándose en predicciones de grupos
   *
   * @param groupStandings - Tablas de posiciones predichas de los 12 grupos
   * @param bestThirdPlaces - Los 8 mejores terceros predichos (ordenados 1-8)
   * @param roundOf32Matches - Partidos de R32 con placeholders (73-88)
   * @returns Map<matchId, { homeTeamId, awayTeamId }>
   */
  resolveRoundOf32Teams(
    groupStandings: GroupStandingPrediction[],
    bestThirdPlaces: BestThirdPlacePrediction[],
    roundOf32Matches: Match[],
  ): Promise<Map<string, ResolvedTeams>>;
}

/**
 * Equipos resueltos para un partido de eliminatorias
 */
export interface ResolvedTeams {
  homeTeamId: string;
  awayTeamId: string;
}
