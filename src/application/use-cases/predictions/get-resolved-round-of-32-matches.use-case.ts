import { Injectable, Inject } from '@nestjs/common';
import type { IGroupStandingPredictionRepository } from '@domain/repositories/group-standing-prediction.repository.interface';
import type { IBestThirdPlacePredictionRepository } from '@domain/repositories/best-third-place-prediction.repository.interface';
import type { IMatchRepository } from '@domain/repositories/match.repository.interface';
import type { ITeamRepository } from '@domain/repositories/team.repository.interface';
import type { IStadiumRepository } from '@domain/repositories/stadium.repository.interface';
import type { IKnockoutBracketResolverService } from '@domain/services/knockout-bracket-resolver.service.interface';
import type { Match } from '@domain/entities/match.entity';
import type { Team } from '@domain/entities/team.entity';
import type { Stadium } from '@domain/entities/stadium.entity';

/**
 * GetResolvedRoundOf32MatchesUseCase (Application Layer)
 *
 * Caso de uso para obtener los partidos de Round of 32 con equipos RESUELTOS
 * basándose en las predicciones de grupos del usuario.
 *
 * Contexto:
 * - Cuando un usuario completa los 12 grupos, el sistema calcula:
 *   - Tablas de posiciones de cada grupo (1º, 2º, 3º, 4º)
 *   - Los 8 mejores terceros lugares
 * - Los partidos de R32 tienen placeholders (ej: "Group A winners")
 * - Este use case RESUELVE esos placeholders usando las predicciones del usuario
 *
 * Flujo:
 * 1. Verifica que se hayan completado los 12 grupos
 * 2. Obtiene las tablas de posiciones predichas (12 grupos × 4 equipos = 48)
 * 3. Obtiene los 8 mejores terceros predichos
 * 4. Obtiene los 16 partidos de R32 (partidos 73-88)
 * 5. Usa el servicio de dominio para resolver placeholders
 * 6. Retorna los 16 partidos con homeTeamId/awayTeamId resueltos
 *
 * Resultado:
 * - Array de 16 matches de R32
 * - Cada match tiene homeTeamId/awayTeamId según las predicciones del usuario
 * - Frontend puede renderizar el bracket completo
 * - Usuario puede hacer predicciones de eliminatorias
 *
 * Casos de uso:
 * - Usuario completa los 12 grupos → Frontend muestra los 32 clasificados
 * - Usuario accede a predicciones existentes → Frontend muestra bracket resuelto
 * - Usuario edita grupos → Frontend actualiza bracket automáticamente
 */
@Injectable()
export class GetResolvedRoundOf32MatchesUseCase {
  constructor(
    @Inject('IGroupStandingPredictionRepository')
    private readonly groupStandingRepository: IGroupStandingPredictionRepository,

    @Inject('IBestThirdPlacePredictionRepository')
    private readonly bestThirdPlaceRepository: IBestThirdPlacePredictionRepository,

    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,

    @Inject('ITeamRepository')
    private readonly teamRepository: ITeamRepository,

    @Inject('IStadiumRepository')
    private readonly stadiumRepository: IStadiumRepository,

    @Inject('IKnockoutBracketResolverService')
    private readonly knockoutResolver: IKnockoutBracketResolverService,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @param predictionId - UUID de la predicción
   * @param groupsCompleted - Si el usuario completó los 12 grupos
   * @returns Array de 16 matches de R32 (vacío si groups no completados)
   */
  async execute(
    predictionId: string,
    groupsCompleted: boolean,
  ): Promise<ResolvedRoundOf32Match[]> {
    // Si no se completaron los grupos, retornar array vacío
    if (!groupsCompleted) {
      return [];
    }

    // 1. Obtener tablas de posiciones predichas (12 grupos)
    const groupStandings =
      await this.groupStandingRepository.findByPrediction(predictionId);

    if (groupStandings.length === 0) {
      return [];
    }

    // 2. Obtener los 8 mejores terceros predichos
    const bestThirdPlaces =
      await this.bestThirdPlaceRepository.findByPrediction(predictionId);

    if (bestThirdPlaces.length !== 8) {
      // No se calcularon correctamente los mejores terceros
      return [];
    }

    // 3. Obtener los 16 partidos de R32
    const roundOf32Matches =
      await this.matchRepository.findByPhase('ROUND_OF_32');

    if (roundOf32Matches.length !== 16) {
      throw new Error(
        `Expected 16 Round of 32 matches, found ${roundOf32Matches.length}`,
      );
    }

    // 4. Resolver equipos usando el servicio de dominio
    const resolvedTeamsMap = await this.knockoutResolver.resolveRoundOf32Teams(
      groupStandings,
      bestThirdPlaces,
      roundOf32Matches,
    );

    // 5. Obtener IDs únicos de teams y stadiums
    const teamIds = new Set<string>();
    const stadiumIds = new Set<string>();

    for (const match of roundOf32Matches) {
      const resolved = resolvedTeamsMap.get(match.id);
      if (resolved) {
        teamIds.add(resolved.homeTeamId);
        teamIds.add(resolved.awayTeamId);
      }
      stadiumIds.add(match.stadiumId);
    }

    // 6. Hacer queries batch para obtener teams y stadiums
    const [teams, stadiums] = await Promise.all([
      this.teamRepository.findByIds(Array.from(teamIds)),
      this.stadiumRepository.findByIds(Array.from(stadiumIds)),
    ]);

    // 7. Crear mapas para acceso rápido
    const teamsMap = new Map(teams.map((t) => [t.id, t]));
    const stadiumsMap = new Map(stadiums.map((s) => [s.id, s]));

    // 8. Mapear matches con objetos completos
    const resolvedMatches: ResolvedRoundOf32Match[] = roundOf32Matches.map(
      (match) => {
        const resolved = resolvedTeamsMap.get(match.id);

        if (!resolved) {
          throw new Error(`Failed to resolve teams for match ${match.id}`);
        }

        const homeTeam = teamsMap.get(resolved.homeTeamId);
        const awayTeam = teamsMap.get(resolved.awayTeamId);
        const stadium = stadiumsMap.get(match.stadiumId);

        if (!homeTeam || !awayTeam || !stadium) {
          throw new Error(
            `Missing data for match ${match.matchNumber}: homeTeam=${!!homeTeam}, awayTeam=${!!awayTeam}, stadium=${!!stadium}`,
          );
        }

        return {
          id: match.id,
          matchNumber: match.matchNumber,
          homeTeam: {
            id: homeTeam.id,
            name: homeTeam.name,
            fifaCode: homeTeam.fifaCode,
            confederation: homeTeam.confederation,
          },
          awayTeam: {
            id: awayTeam.id,
            name: awayTeam.name,
            fifaCode: awayTeam.fifaCode,
            confederation: awayTeam.confederation,
          },
          stadium: {
            id: stadium.id,
            code: stadium.code,
            name: stadium.name,
            city: stadium.city,
            country: stadium.country,
            capacity: stadium.capacity,
          },
          matchDate: match.matchDate,
          matchTime: match.matchTime,
          phase: match.phase,
          predictionsLockedAt: match.predictionsLockedAt,
        };
      },
    );

    // 9. Ordenar por match_number
    return resolvedMatches.sort((a, b) => a.matchNumber - b.matchNumber);
  }
}

/**
 * Partido de R32 con equipos y estadio resueltos (objetos completos)
 */
export interface ResolvedRoundOf32Match {
  id: string;
  matchNumber: number;
  homeTeam: {
    id: string;
    name: string;
    fifaCode: string;
    confederation: string;
  };
  awayTeam: {
    id: string;
    name: string;
    fifaCode: string;
    confederation: string;
  };
  stadium: {
    id: string;
    code: string;
    name: string;
    city: string;
    country: string;
    capacity: number | null;
  };
  matchDate: Date;
  matchTime: string;
  phase: string;
  predictionsLockedAt: Date;
}
