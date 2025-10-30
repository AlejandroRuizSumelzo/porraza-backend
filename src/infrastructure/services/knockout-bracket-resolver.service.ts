import { Injectable, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import type {
  IKnockoutBracketResolverService,
  ResolvedTeams,
} from '@domain/services/knockout-bracket-resolver.service.interface';
import type { GroupStandingPrediction } from '@domain/entities/group-standing-prediction.entity';
import type { BestThirdPlacePrediction } from '@domain/entities/best-third-place-prediction.entity';
import type { Match } from '@domain/entities/match.entity';
import { FIFA_THIRD_PLACE_ALLOCATION_TABLE } from '@domain/constants/fifa-third-place-allocation.constant';

/**
 * KnockoutBracketResolverService (Infrastructure Layer)
 *
 * Implementación concreta del servicio de dominio para resolver brackets de eliminatorias.
 *
 * Estrategia de asignación de terceros lugares (sin tabla oficial FIFA):
 * 1. Ordenar partidos de R32 por match_number (73-88)
 * 2. Construir mapa de equipos clasificados (ganadores, subcampeones, terceros)
 * 3. Para cada partido con placeholder de tercero:
 *    a) Extraer grupos posibles del placeholder (ej: "Group A/B/C/D/F third place" → [A,B,C,D,F])
 *    b) Filtrar cuáles de esos grupos tienen terceros en top 8
 *    c) De los disponibles, tomar el de MEJOR RANKING (rankingPosition menor)
 *    d) Asignar ese tercero al partido
 *    e) Marcarlo como "ya usado" (cada tercero solo juega 1 vez)
 *
 * Dependencias:
 * - DATABASE_POOL: Para queries a tabla `groups` (obtener letra del grupo)
 *
 * Notas:
 * - Esta estrategia asegura que los terceros con mejor ranking jueguen primero
 * - Evita duplicados (cada tercero solo se asigna una vez)
 * - Si en el futuro se consigue la tabla oficial FIFA, se puede reemplazar
 *   la función determineThirdPlaceAssignment() sin cambiar la interfaz
 */
@Injectable()
export class KnockoutBracketResolverService
  implements IKnockoutBracketResolverService
{
  // Cache para mapeo de groupId → groupLetter (evitar queries repetidas)
  private groupLetterCache: Map<string, string> = new Map();

  constructor(@Inject('DATABASE_POOL') private readonly pool: Pool) {}

  async resolveRoundOf32Teams(
    groupStandings: GroupStandingPrediction[],
    bestThirdPlaces: BestThirdPlacePrediction[],
    roundOf32Matches: Match[],
  ): Promise<Map<string, ResolvedTeams>> {
    // 1. Construir mapas de equipos clasificados
    const qualifiedTeams = await this.buildQualifiedTeamsMap(groupStandings);

    // 2. Construir mapa de terceros clasificados (top 8)
    const thirdPlacesMap = await this.buildThirdPlacesMap(bestThirdPlaces);

    // 3. Obtener grupos que tienen terceros en top 8
    const qualifiedThirdPlaceGroups =
      await this.getQualifiedThirdPlaceGroups(bestThirdPlaces);

    // 4. Obtener combinación de grupos clasificados para buscar en tabla FIFA
    const groupsCombination = Array.from(qualifiedThirdPlaceGroups)
      .sort()
      .join('');

    // Buscar asignación oficial en tabla FIFA
    const fifaAllocation = FIFA_THIRD_PLACE_ALLOCATION_TABLE[groupsCombination];

    // 5. Ordenar partidos por match_number para asignación secuencial
    const sortedMatches = [...roundOf32Matches].sort(
      (a, b) => a.matchNumber - b.matchNumber,
    );

    // 6. Set de terceros ya usados (para no asignar dos veces)
    const usedThirdPlaces = new Set<string>();

    // 7. Resolver cada partido
    const resolvedMap = new Map<string, ResolvedTeams>();

    for (const match of sortedMatches) {
      const homeTeamId = await this.resolveTeamFromPlaceholder(
        match.homeTeamPlaceholder,
        qualifiedTeams,
        thirdPlacesMap,
        qualifiedThirdPlaceGroups,
        usedThirdPlaces,
        fifaAllocation,
      );

      const awayTeamId = await this.resolveTeamFromPlaceholder(
        match.awayTeamPlaceholder,
        qualifiedTeams,
        thirdPlacesMap,
        qualifiedThirdPlaceGroups,
        usedThirdPlaces,
        fifaAllocation,
      );

      resolvedMap.set(match.id, { homeTeamId, awayTeamId });
    }

    return resolvedMap;
  }

  /**
   * Construye mapa de equipos clasificados por posición (1º, 2º, 3º)
   */
  private async buildQualifiedTeamsMap(
    groupStandings: GroupStandingPrediction[],
  ): Promise<QualifiedTeamsMap> {
    const map: QualifiedTeamsMap = {
      winners: new Map(),
      runnersUp: new Map(),
      thirds: new Map(),
    };

    // Agrupar standings por groupId
    const standingsByGroup = this.groupBy(groupStandings, 'groupId');

    for (const [groupId, standings] of Object.entries(standingsByGroup)) {
      // Ordenar considerando manual_tiebreak_order si existe
      const sorted = this.sortStandings(standings);

      // Obtener letra del grupo (A-L)
      const groupLetter = await this.getGroupLetter(groupId);

      // Asignar equipos por posición
      map.winners.set(groupLetter, sorted[0].teamId);
      map.runnersUp.set(groupLetter, sorted[1].teamId);
      map.thirds.set(groupLetter, sorted[2].teamId);
    }

    return map;
  }

  /**
   * Construye mapa de terceros clasificados (top 8) por grupo
   */
  private async buildThirdPlacesMap(
    bestThirdPlaces: BestThirdPlacePrediction[],
  ): Promise<Map<string, BestThirdPlacePrediction>> {
    const map = new Map<string, BestThirdPlacePrediction>();

    // Solo considerar los 8 mejores (rankingPosition 1-8)
    const top8 = bestThirdPlaces.filter((btp) => btp.rankingPosition <= 8);

    for (const btp of top8) {
      const groupLetter = await this.getGroupLetter(btp.fromGroupId);
      map.set(groupLetter, btp);
    }

    return map;
  }

  /**
   * Obtiene el set de grupos que tienen terceros en top 8
   */
  private async getQualifiedThirdPlaceGroups(
    bestThirdPlaces: BestThirdPlacePrediction[],
  ): Promise<Set<string>> {
    const groups = new Set<string>();

    const top8 = bestThirdPlaces.filter((btp) => btp.rankingPosition <= 8);

    for (const btp of top8) {
      const groupLetter = await this.getGroupLetter(btp.fromGroupId);
      groups.add(groupLetter);
    }

    return groups;
  }

  /**
   * Resuelve un placeholder a un teamId específico
   */
  private async resolveTeamFromPlaceholder(
    placeholder: string | null,
    qualifiedTeams: QualifiedTeamsMap,
    thirdPlacesMap: Map<string, BestThirdPlacePrediction>,
    qualifiedThirdPlaceGroups: Set<string>,
    usedThirdPlaces: Set<string>,
    fifaAllocation?: any,
  ): Promise<string> {
    if (!placeholder) {
      throw new Error('Placeholder is required for R32 matches');
    }

    // Caso 1: "Group A winners"
    const winnersMatch = placeholder.match(/Group ([A-L]) winners/);
    if (winnersMatch) {
      const group = winnersMatch[1];
      const teamId = qualifiedTeams.winners.get(group);
      if (!teamId) {
        throw new Error(`No winner found for group ${group}`);
      }
      return teamId;
    }

    // Caso 2: "Group B runners-up"
    const runnersUpMatch = placeholder.match(/Group ([A-L]) runners-up/);
    if (runnersUpMatch) {
      const group = runnersUpMatch[1];
      const teamId = qualifiedTeams.runnersUp.get(group);
      if (!teamId) {
        throw new Error(`No runner-up found for group ${group}`);
      }
      return teamId;
    }

    // Caso 3: "Group A/B/C/D/F third place" (COMPLEJO)
    const thirdPlaceMatch = placeholder.match(
      /Group ([A-L\/]+) third place/,
    );
    if (thirdPlaceMatch) {
      const possibleGroupsStr = thirdPlaceMatch[1];
      const possibleGroups = possibleGroupsStr.split('/');

      // Determinar cuál tercero se asigna a este partido
      const assignedGroup = this.determineThirdPlaceAssignment(
        possibleGroupsStr, // Pasar el string original (ej: "A/B/C/D/F")
        possibleGroups,
        thirdPlacesMap,
        qualifiedThirdPlaceGroups,
        usedThirdPlaces,
        fifaAllocation, // ← Pasar tabla FIFA
      );

      const teamId = qualifiedTeams.thirds.get(assignedGroup);
      if (!teamId) {
        throw new Error(`No third place found for group ${assignedGroup}`);
      }

      // Marcar como usado
      usedThirdPlaces.add(assignedGroup);

      return teamId;
    }

    throw new Error(`Unknown placeholder format: ${placeholder}`);
  }

  /**
   * FUNCIÓN CRÍTICA: Determina cuál tercero se asigna a un partido
   *
   * Estrategia:
   * 1. Si hay tabla oficial FIFA para esta combinación, usarla (PRIORIDAD)
   * 2. Si no, usar fallback: mejor ranking disponible que NO haya sido usado
   * 3. Si ninguno de los posibles está disponible, usar CUALQUIER tercero disponible (garantiza que los 8 se usen)
   */
  private determineThirdPlaceAssignment(
    placeholderKey: string, // "A/B/C/D/F"
    possibleGroups: string[],
    thirdPlacesMap: Map<string, BestThirdPlacePrediction>,
    qualifiedThirdPlaceGroups: Set<string>,
    usedThirdPlaces: Set<string>,
    fifaAllocation?: any,
  ): string {
    // ESTRATEGIA 1: Usar tabla oficial FIFA si existe
    if (fifaAllocation && fifaAllocation[placeholderKey]) {
      const assignedGroup = fifaAllocation[placeholderKey];

      // Verificar que no haya sido usado y esté en top 8
      if (
        !usedThirdPlaces.has(assignedGroup) &&
        qualifiedThirdPlaceGroups.has(assignedGroup)
      ) {
        return assignedGroup;
      }
    }

    // ESTRATEGIA 2: Fallback - Mejor ranking disponible de los grupos posibles
    const availableFromPossible = possibleGroups.filter(
      (g) => qualifiedThirdPlaceGroups.has(g) && !usedThirdPlaces.has(g),
    );

    if (availableFromPossible.length > 0) {
      let bestRanking = 9;
      let bestGroup: string | null = null;

      for (const group of availableFromPossible) {
        const thirdPlace = thirdPlacesMap.get(group);
        if (thirdPlace && thirdPlace.rankingPosition < bestRanking) {
          bestRanking = thirdPlace.rankingPosition;
          bestGroup = group;
        }
      }

      if (bestGroup) {
        return bestGroup;
      }
    }

    // ESTRATEGIA 3: Último recurso - Usar CUALQUIER tercero disponible (no usado)
    const anyAvailable = Array.from(qualifiedThirdPlaceGroups).filter(
      (g) => !usedThirdPlaces.has(g),
    );

    if (anyAvailable.length > 0) {
      let bestRanking = 9;
      let bestGroup: string | null = null;

      for (const group of anyAvailable) {
        const thirdPlace = thirdPlacesMap.get(group);
        if (thirdPlace && thirdPlace.rankingPosition < bestRanking) {
          bestRanking = thirdPlace.rankingPosition;
          bestGroup = group;
        }
      }

      if (bestGroup) {
        return bestGroup;
      }
    }

    // Si llegamos aquí, no hay terceros disponibles (error)
    throw new Error(
      `No third place available. Possible: ${possibleGroups.join('/')}, Already used: ${Array.from(usedThirdPlaces).join(',')}`,
    );
  }

  /**
   * Ordena standings considerando manual_tiebreak_order si existe
   */
  private sortStandings(
    standings: GroupStandingPrediction[],
  ): GroupStandingPrediction[] {
    return standings.sort((a, b) => {
      // Si hay orden manual de desempate, usarlo
      if (a.manualTiebreakOrder !== null && b.manualTiebreakOrder !== null) {
        return a.manualTiebreakOrder - b.manualTiebreakOrder;
      }
      // Sino, usar position calculada
      return a.position - b.position;
    });
  }

  /**
   * Obtiene la letra del grupo (A-L) desde su UUID
   * Hace query a BD y cachea el resultado
   */
  private async getGroupLetter(groupId: string): Promise<string> {
    // Verificar cache
    if (this.groupLetterCache.has(groupId)) {
      return this.groupLetterCache.get(groupId)!;
    }

    // Query a BD
    const query = `
      SELECT name FROM groups WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [groupId]);

      if (result.rows.length === 0) {
        throw new Error(`Group not found: ${groupId}`);
      }

      const groupLetter = result.rows[0].name as string;

      // Guardar en cache
      this.groupLetterCache.set(groupId, groupLetter);

      return groupLetter;
    } catch (error) {
      console.error('Error fetching group letter:', error);
      throw new Error(`Failed to fetch group letter for ${groupId}`);
    }
  }

  /**
   * Utility: Agrupar array por una key
   */
  private groupBy<T>(
    array: T[],
    key: keyof T,
  ): Record<string, T[]> {
    return array.reduce(
      (result, item) => {
        const groupKey = String(item[key]);
        (result[groupKey] = result[groupKey] || []).push(item);
        return result;
      },
      {} as Record<string, T[]>,
    );
  }
}

/**
 * Mapa de equipos clasificados por tipo
 */
interface QualifiedTeamsMap {
  winners: Map<string, string>; // Map<groupLetter, teamId>
  runnersUp: Map<string, string>;
  thirds: Map<string, string>;
}
