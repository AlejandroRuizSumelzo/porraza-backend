import { Injectable } from '@nestjs/common';
import type { SaveGroupStandingData } from '@domain/repositories/group-standing-prediction.repository.interface';

/**
 * Team stats para cálculo de tabla
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
 * CalculateGroupStandingsUseCase (Application Layer)
 *
 * Lógica pura para calcular tabla de posiciones de un grupo según reglas FIFA.
 *
 * Este Use Case NO accede a base de datos, solo contiene lógica de negocio.
 * Es utilizado por SaveGroupPredictionsUseCase.
 *
 * Reglas FIFA implementadas:
 * 1. Puntos (Victoria 3, Empate 1, Derrota 0)
 * 2. Diferencia de goles (GD = GF - GC)
 * 3. Goles a favor (GF)
 * 4. Si empate total → marcar has_tiebreak_conflict = TRUE
 */
@Injectable()
export class CalculateGroupStandingsUseCase {
  /**
   * Calcula tabla de posiciones dado un conjunto de predicciones de partidos
   *
   * @param groupId - UUID del grupo
   * @param teamIds - Array con los 4 teamIds del grupo
   * @param matchPredictions - Array de 6 predicciones de partidos del grupo
   * @returns Array de 4 standings ordenados por posición (1-4)
   */
  execute(
    groupId: string,
    teamIds: string[],
    matchPredictions: Array<{
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number;
      awayScore: number;
    }>,
  ): SaveGroupStandingData[] {
    // 1. Validar que haya 4 equipos
    if (teamIds.length !== 4) {
      throw new Error('A group must have exactly 4 teams');
    }

    // 2. Inicializar estadísticas de equipos
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

    // 3. Procesar cada partido predicho
    for (const match of matchPredictions) {
      const homeTeam = teamStatsMap.get(match.homeTeamId);
      const awayTeam = teamStatsMap.get(match.awayTeamId);

      if (!homeTeam || !awayTeam) {
        continue; // Skip si los equipos no están en el grupo
      }

      // Actualizar partidos jugados
      homeTeam.played++;
      awayTeam.played++;

      // Actualizar goles
      homeTeam.goalsFor += match.homeScore;
      homeTeam.goalsAgainst += match.awayScore;
      awayTeam.goalsFor += match.awayScore;
      awayTeam.goalsAgainst += match.homeScore;

      // Determinar resultado y actualizar puntos
      if (match.homeScore > match.awayScore) {
        // Victoria local
        homeTeam.wins++;
        homeTeam.points += 3;
        awayTeam.losses++;
      } else if (match.homeScore < match.awayScore) {
        // Victoria visitante
        awayTeam.wins++;
        awayTeam.points += 3;
        homeTeam.losses++;
      } else {
        // Empate
        homeTeam.draws++;
        homeTeam.points += 1;
        awayTeam.draws++;
        awayTeam.points += 1;
      }
    }

    // 4. Calcular diferencia de goles
    for (const [, team] of teamStatsMap) {
      team.goalDifference = team.goalsFor - team.goalsAgainst;
    }

    // 5. Ordenar equipos según criterios FIFA
    const sortedTeams = Array.from(teamStatsMap.values()).sort((a, b) => {
      // 1. Puntos (mayor es mejor)
      if (a.points !== b.points) {
        return b.points - a.points;
      }

      // 2. Diferencia de goles (mayor es mejor)
      if (a.goalDifference !== b.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }

      // 3. Goles a favor (mayor es mejor)
      if (a.goalsFor !== b.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }

      // Si todo es igual, están empatados (se marcará has_tiebreak_conflict)
      return 0;
    });

    // 6. Asignar posiciones y detectar empates
    const standings: SaveGroupStandingData[] = [];
    let currentPosition = 1;
    let tiebreakGroupCounter = 1;

    for (let i = 0; i < sortedTeams.length; i++) {
      const team = sortedTeams[i];
      const prevTeam = i > 0 ? sortedTeams[i - 1] : null;

      // Detectar si está empatado con el equipo anterior (empate total)
      let hasTiebreakConflict = false;
      let tiebreakGroup: number | null = null;

      if (prevTeam) {
        const isTied =
          team.points === prevTeam.points &&
          team.goalDifference === prevTeam.goalDifference &&
          team.goalsFor === prevTeam.goalsFor;

        if (isTied) {
          hasTiebreakConflict = true;

          // Si el equipo anterior también tiene conflicto, usar el mismo grupo
          const prevStanding = standings[i - 1];
          if (prevStanding.hasTiebreakConflict) {
            tiebreakGroup = prevStanding.tiebreakGroup!;
          } else {
            // Crear nuevo grupo de desempate
            tiebreakGroup = tiebreakGroupCounter++;
            // Actualizar el equipo anterior también
            prevStanding.hasTiebreakConflict = true;
            prevStanding.tiebreakGroup = tiebreakGroup;
          }
        }
      }

      standings.push({
        groupId,
        teamId: team.teamId,
        position: currentPosition++,
        points: team.points,
        played: team.played,
        wins: team.wins,
        draws: team.draws,
        losses: team.losses,
        goalsFor: team.goalsFor,
        goalsAgainst: team.goalsAgainst,
        goalDifference: team.goalDifference,
        hasTiebreakConflict,
        tiebreakGroup,
        manualTiebreakOrder: null,
      });
    }

    return standings;
  }
}
