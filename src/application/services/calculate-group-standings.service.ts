import { Injectable } from '@nestjs/common';
import type { SaveMatchPredictionData } from '@domain/repositories/match-prediction.repository.interface';
import type { SaveGroupStandingData } from '@domain/repositories/group-standing-prediction.repository.interface';

/**
 * Interface para predicción de partido con team IDs (usado por el servicio de cálculo)
 * Extiende SaveMatchPredictionData añadiendo homeTeamId y awayTeamId necesarios para cálculos
 */
export interface MatchPredictionWithTeams extends SaveMatchPredictionData {
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Interface para estadísticas de un equipo en un grupo
 */
interface TeamStats {
  teamId: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

/**
 * CalculateGroupStandingsService
 *
 * Servicio helper que calcula tablas de posiciones de grupos
 * basándose en las predicciones de partidos.
 *
 * Implementa reglas FIFA World Cup:
 * - 3 puntos por victoria
 * - 1 punto por empate
 * - 0 puntos por derrota
 *
 * Criterios de ordenación:
 * 1. Puntos
 * 2. Diferencia de goles
 * 3. Goles a favor
 * 4. (En v1 no implementamos más criterios)
 *
 * Este servicio NO maneja persistencia, solo cálculos puros.
 */
@Injectable()
export class CalculateGroupStandingsService {
  /**
   * Calcula tabla de posiciones de un grupo desde predicciones de partidos
   *
   * @param groupId - UUID del grupo
   * @param teamIds - Array de 4 UUIDs de equipos del grupo
   * @param matchPredictions - Predicciones de los 6 partidos del grupo (con homeTeamId y awayTeamId)
   * @returns Array de 4 posiciones ordenadas (1º a 4º)
   */
  calculateStandings(
    groupId: string,
    teamIds: string[],
    matchPredictions: MatchPredictionWithTeams[],
  ): SaveGroupStandingData[] {
    // Validar que hay 4 equipos
    if (teamIds.length !== 4) {
      throw new Error(`Group must have exactly 4 teams, got ${teamIds.length}`);
    }

    // Validar que hay 6 partidos (combinaciones de 4 equipos: 4C2 = 6)
    if (matchPredictions.length !== 6) {
      throw new Error(
        `Group stage must have exactly 6 matches, got ${matchPredictions.length}`,
      );
    }

    // 1. Inicializar estadísticas para cada equipo
    const teamStatsMap = new Map<string, TeamStats>();

    for (const teamId of teamIds) {
      teamStatsMap.set(teamId, {
        teamId,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      });
    }

    // 2. Procesar cada partido
    for (const match of matchPredictions) {
      const homeTeamId = match.homeTeamId;
      const awayTeamId = match.awayTeamId;

      if (!homeTeamId || !awayTeamId) {
        throw new Error(
          `Match prediction must include homeTeamId and awayTeamId`,
        );
      }

      const homeStats = teamStatsMap.get(homeTeamId);
      const awayStats = teamStatsMap.get(awayTeamId);

      if (!homeStats || !awayStats) {
        throw new Error(
          `Match contains teams not in the group: ${homeTeamId}, ${awayTeamId}`,
        );
      }

      // Incrementar partidos jugados
      homeStats.played++;
      awayStats.played++;

      // Actualizar goles
      homeStats.goalsFor += match.homeScore;
      homeStats.goalsAgainst += match.awayScore;
      awayStats.goalsFor += match.awayScore;
      awayStats.goalsAgainst += match.homeScore;

      // Determinar resultado y actualizar puntos/W/D/L
      if (match.homeScore > match.awayScore) {
        // Victoria local
        homeStats.wins++;
        homeStats.points += 3;
        awayStats.losses++;
      } else if (match.homeScore < match.awayScore) {
        // Victoria visitante
        awayStats.wins++;
        awayStats.points += 3;
        homeStats.losses++;
      } else {
        // Empate
        homeStats.draws++;
        homeStats.points += 1;
        awayStats.draws++;
        awayStats.points += 1;
      }

      // Calcular diferencia de goles
      homeStats.goalDifference = homeStats.goalsFor - homeStats.goalsAgainst;
      awayStats.goalDifference = awayStats.goalsFor - awayStats.goalsAgainst;
    }

    // 3. Convertir Map a Array y ordenar según criterios FIFA
    const standings = Array.from(teamStatsMap.values()).sort(
      (a, b) => this.compareFIFACriteria(a, b),
    );

    // 4. Asignar posiciones (1-4)
    const standingsWithPosition: SaveGroupStandingData[] = standings.map(
      (stats, index) => ({
        groupId,
        teamId: stats.teamId,
        position: index + 1, // 1-based position
        points: stats.points,
        played: stats.played,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        goalsFor: stats.goalsFor,
        goalsAgainst: stats.goalsAgainst,
        goalDifference: stats.goalDifference,
        hasTiebreakConflict: false, // Por defecto, lo detectamos después
        tiebreakGroup: null,
        manualTiebreakOrder: null,
      }),
    );

    // 5. Detectar empates (conflictos de desempate)
    this.detectTiebreakConflicts(standingsWithPosition);

    return standingsWithPosition;
  }

  /**
   * Compara dos equipos según criterios FIFA
   * @returns positivo si a > b, negativo si a < b, 0 si iguales
   */
  private compareFIFACriteria(a: TeamStats, b: TeamStats): number {
    // 1. Puntos (descendente - más puntos = mejor)
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    // 2. Diferencia de goles (descendente)
    if (a.goalDifference !== b.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }

    // 3. Goles a favor (descendente)
    if (a.goalsFor !== b.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }

    // Si todo es igual, hay empate total
    return 0;
  }

  /**
   * Detecta equipos que están empatados en todos los criterios FIFA
   * Marca has_tiebreak_conflict y agrupa equipos empatados
   */
  private detectTiebreakConflicts(
    standings: SaveGroupStandingData[],
  ): void {
    let tiebreakGroupCounter = 1;

    for (let i = 0; i < standings.length; i++) {
      const currentTeam = standings[i];

      // Si ya tiene grupo de desempate asignado, skip
      if (currentTeam.tiebreakGroup !== null) {
        continue;
      }

      // Buscar equipos empatados con este
      const tiedTeams: SaveGroupStandingData[] = [currentTeam];

      for (let j = i + 1; j < standings.length; j++) {
        const otherTeam = standings[j];

        // Comparar si están empatados en TODOS los criterios
        if (
          currentTeam.points === otherTeam.points &&
          currentTeam.goalDifference === otherTeam.goalDifference &&
          currentTeam.goalsFor === otherTeam.goalsFor
        ) {
          tiedTeams.push(otherTeam);
        }
      }

      // Si hay más de 1 equipo empatado, marcar conflicto
      if (tiedTeams.length > 1) {
        for (const team of tiedTeams) {
          team.hasTiebreakConflict = true;
          team.tiebreakGroup = tiebreakGroupCounter;
        }
        tiebreakGroupCounter++;
      }
    }
  }

  /**
   * Valida que las estadísticas de una tabla sean consistentes
   * con las predicciones de partidos
   *
   * @returns { valid: boolean, errors: string[] }
   */
  validateStandings(
    providedStandings: SaveGroupStandingData[],
    calculatedStandings: SaveGroupStandingData[],
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Validar cantidad de equipos
    if (providedStandings.length !== 4) {
      errors.push(`Must have exactly 4 teams, got ${providedStandings.length}`);
      return { valid: false, errors };
    }

    // 2. Validar posiciones únicas (1, 2, 3, 4)
    const positions = providedStandings.map((s) => s.position).sort();
    if (JSON.stringify(positions) !== '[1,2,3,4]') {
      errors.push(
        `Positions must be [1, 2, 3, 4], got [${positions.join(', ')}]`,
      );
      return { valid: false, errors };
    }

    // 3. Validar que cada equipo tenga estadísticas correctas
    for (const providedTeam of providedStandings) {
      const calculatedTeam = calculatedStandings.find(
        (c) => c.teamId === providedTeam.teamId,
      );

      if (!calculatedTeam) {
        errors.push(`Team ${providedTeam.teamId} not found in calculated standings`);
        continue;
      }

      // Validar puntos
      if (providedTeam.points !== calculatedTeam.points) {
        errors.push(
          `Team ${providedTeam.teamId}: points mismatch (provided=${providedTeam.points}, calculated=${calculatedTeam.points})`,
        );
      }

      // Validar partidos jugados
      if (providedTeam.played !== calculatedTeam.played) {
        errors.push(
          `Team ${providedTeam.teamId}: played mismatch (provided=${providedTeam.played}, calculated=${calculatedTeam.played})`,
        );
      }

      // Validar victorias
      if (providedTeam.wins !== calculatedTeam.wins) {
        errors.push(
          `Team ${providedTeam.teamId}: wins mismatch (provided=${providedTeam.wins}, calculated=${calculatedTeam.wins})`,
        );
      }

      // Validar empates
      if (providedTeam.draws !== calculatedTeam.draws) {
        errors.push(
          `Team ${providedTeam.teamId}: draws mismatch (provided=${providedTeam.draws}, calculated=${calculatedTeam.draws})`,
        );
      }

      // Validar derrotas
      if (providedTeam.losses !== calculatedTeam.losses) {
        errors.push(
          `Team ${providedTeam.teamId}: losses mismatch (provided=${providedTeam.losses}, calculated=${calculatedTeam.losses})`,
        );
      }

      // Validar goles a favor
      if (providedTeam.goalsFor !== calculatedTeam.goalsFor) {
        errors.push(
          `Team ${providedTeam.teamId}: goalsFor mismatch (provided=${providedTeam.goalsFor}, calculated=${calculatedTeam.goalsFor})`,
        );
      }

      // Validar goles en contra
      if (providedTeam.goalsAgainst !== calculatedTeam.goalsAgainst) {
        errors.push(
          `Team ${providedTeam.teamId}: goalsAgainst mismatch (provided=${providedTeam.goalsAgainst}, calculated=${calculatedTeam.goalsAgainst})`,
        );
      }

      // Validar diferencia de goles
      if (providedTeam.goalDifference !== calculatedTeam.goalDifference) {
        errors.push(
          `Team ${providedTeam.teamId}: goalDifference mismatch (provided=${providedTeam.goalDifference}, calculated=${calculatedTeam.goalDifference})`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
