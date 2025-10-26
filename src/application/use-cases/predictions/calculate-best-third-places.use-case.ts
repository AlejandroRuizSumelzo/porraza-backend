import { Injectable } from '@nestjs/common';
import type { GroupStandingPrediction } from '@domain/entities/group-standing-prediction.entity';
import type { SaveBestThirdPlaceData } from '@domain/repositories/best-third-place-prediction.repository.interface';

/**
 * CalculateBestThirdPlacesUseCase (Application Layer)
 *
 * Lógica pura para calcular los 8 mejores terceros lugares según reglas FIFA.
 *
 * Mundial 2026: 12 grupos → 12 terceros → Solo los 8 mejores clasifican a R32
 *
 * Criterios FIFA:
 * 1. Puntos
 * 2. Diferencia de goles
 * 3. Goles a favor
 * 4. Si empate total → marcar has_tiebreak_conflict = TRUE
 */
@Injectable()
export class CalculateBestThirdPlacesUseCase {
  /**
   * Calcula los 8 mejores terceros lugares
   *
   * @param thirdPlaces - Array de 12 terceros lugares (uno por grupo)
   * @returns Array de 8 mejores terceros ordenados por ranking (1-8)
   */
  execute(thirdPlaces: GroupStandingPrediction[]): SaveBestThirdPlaceData[] {
    // 1. Validar que haya 12 terceros (uno por grupo)
    if (thirdPlaces.length !== 12) {
      throw new Error(
        'Must provide exactly 12 third place teams (one per group)',
      );
    }

    // 2. Ordenar terceros por criterios FIFA
    const sortedThirds = [...thirdPlaces].sort((a, b) => {
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

      // Empate total
      return 0;
    });

    // 3. Tomar los 8 mejores
    const best8 = sortedThirds.slice(0, 8);

    // 4. Asignar ranking y detectar empates
    const bestThirdPlaces: SaveBestThirdPlaceData[] = [];
    let tiebreakGroupCounter = 1;

    for (let i = 0; i < best8.length; i++) {
      const team = best8[i];
      const prevTeam = i > 0 ? best8[i - 1] : null;

      let hasTiebreakConflict = false;
      let tiebreakGroup: number | null = null;

      if (prevTeam) {
        const isTied =
          team.points === prevTeam.points &&
          team.goalDifference === prevTeam.goalDifference &&
          team.goalsFor === prevTeam.goalsFor;

        if (isTied) {
          hasTiebreakConflict = true;

          const prevBestThird = bestThirdPlaces[i - 1];
          if (prevBestThird.hasTiebreakConflict) {
            tiebreakGroup = prevBestThird.tiebreakGroup!;
          } else {
            tiebreakGroup = tiebreakGroupCounter++;
            prevBestThird.hasTiebreakConflict = true;
            prevBestThird.tiebreakGroup = tiebreakGroup;
          }
        }
      }

      bestThirdPlaces.push({
        teamId: team.teamId,
        rankingPosition: i + 1, // 1-8
        points: team.points,
        goalDifference: team.goalDifference,
        goalsFor: team.goalsFor,
        fromGroupId: team.groupId,
        hasTiebreakConflict,
        tiebreakGroup,
        manualTiebreakOrder: null,
      });
    }

    return bestThirdPlaces;
  }
}
