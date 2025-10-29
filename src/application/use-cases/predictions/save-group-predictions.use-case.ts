import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { IPredictionRepository } from '@domain/repositories/prediction.repository.interface';
import type { IMatchPredictionRepository } from '@domain/repositories/match-prediction.repository.interface';
import type { IGroupStandingPredictionRepository } from '@domain/repositories/group-standing-prediction.repository.interface';
import type { IMatchRepository } from '@domain/repositories/match.repository.interface';
import type { IBestThirdPlacePredictionRepository } from '@domain/repositories/best-third-place-prediction.repository.interface';
import type { SaveGroupStandingData } from '@domain/repositories/group-standing-prediction.repository.interface';
import type { SaveBestThirdPlaceData } from '@domain/repositories/best-third-place-prediction.repository.interface';
import {
  CalculateGroupStandingsService,
  type MatchPredictionWithTeams,
} from '@application/services/calculate-group-standings.service';
import { CalculateBestThirdPlacesUseCase } from './calculate-best-third-places.use-case';

/**
 * Datos de entrada para guardar predicciones de un grupo
 * AHORA incluye groupStandings enviados desde el frontend
 */
export interface SaveGroupPredictionsInput {
  userId: string;
  leagueId: string;
  groupId: string;
  matchPredictions: MatchPredictionWithTeams[];
  groupStandings: SaveGroupStandingData[]; // ✅ NUEVO: Frontend envía la clasificación
}

/**
 * Respuesta del caso de uso
 * AHORA retorna mensaje simple sin clasificación (frontend ya la tiene)
 * Si se completan los 12 grupos, incluye bestThirdPlaces calculados
 */
export interface SaveGroupPredictionsOutput {
  success: boolean;
  message: string;
  groupsCompleted: boolean;
  totalGroupsCompleted: number;
  bestThirdPlaces?: SaveBestThirdPlaceData[]; // Opcional: solo cuando groupsCompleted = true
}

/**
 * SaveGroupPredictionsUseCase (Application Layer)
 *
 * Caso de uso para guardar predicciones de un grupo con validación.
 * **NUEVO ENFOQUE**: Frontend envía la tabla calculada, backend valida.
 *
 * Responsabilidades:
 * 1. Validar que la predicción exista y no esté bloqueada
 * 2. Validar que hay 6 partidos (fase de grupos)
 * 3. Calcular tabla de posiciones desde matchPredictions (source of truth)
 * 4. Validar que groupStandings enviado coincida con el calculado
 * 5. Guardar matchPredictions en BD
 * 6. Guardar groupStandings en BD (usa el enviado por frontend, ya validado)
 * 7. Verificar si se completaron todos los grupos (12)
 * 8. Marcar groups_completed si corresponde
 *
 * Ventajas de este enfoque:
 * - Frontend maneja UX de empates (drag & drop)
 * - Backend valida que estadísticas sean correctas
 * - No necesita retornar clasificación (frontend ya la tiene)
 */
@Injectable()
export class SaveGroupPredictionsUseCase {
  constructor(
    @Inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository,

    @Inject('IMatchPredictionRepository')
    private readonly matchPredictionRepository: IMatchPredictionRepository,

    @Inject('IGroupStandingPredictionRepository')
    private readonly groupStandingRepository: IGroupStandingPredictionRepository,

    @Inject('IBestThirdPlacePredictionRepository')
    private readonly bestThirdPlacePredictionRepository: IBestThirdPlacePredictionRepository,

    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,

    private readonly calculateStandingsService: CalculateGroupStandingsService,
    private readonly calculateBestThirdPlacesUseCase: CalculateBestThirdPlacesUseCase,
  ) {}

  async execute(
    input: SaveGroupPredictionsInput,
  ): Promise<SaveGroupPredictionsOutput> {
    // 1. Buscar predicción del usuario en la liga
    const prediction = await this.predictionRepository.findByUserAndLeague(
      input.userId,
      input.leagueId,
    );

    if (!prediction) {
      throw new NotFoundException(
        `Prediction not found for user ${input.userId} in league ${input.leagueId}`,
      );
    }

    // 2. Validar que la predicción NO esté bloqueada
    if (!prediction.canBeEdited()) {
      throw new ForbiddenException(
        'Predictions are locked. The deadline has passed.',
      );
    }

    // 3. Validar que hay exactamente 6 partidos (fase de grupos)
    if (input.matchPredictions.length !== 6) {
      throw new BadRequestException(
        `Group stage must have exactly 6 matches, got ${input.matchPredictions.length}`,
      );
    }

    // 4. Validar que hay exactamente 4 equipos en groupStandings
    if (input.groupStandings.length !== 4) {
      throw new BadRequestException(
        `Group standings must have exactly 4 teams, got ${input.groupStandings.length}`,
      );
    }

    // 5. Validar que todos los partidos pertenecen al grupo indicado
    const matchIds = input.matchPredictions.map((mp) => mp.matchId);
    const matches = await this.matchRepository.findByIds(matchIds);

    if (matches.length !== 6) {
      throw new NotFoundException(
        `Some matches not found. Expected 6, got ${matches.length}`,
      );
    }

    // Validar que todos pertenecen al groupId
    const allMatchesBelongToGroup = matches.every(
      (match) => match.groupId === input.groupId,
    );

    if (!allMatchesBelongToGroup) {
      throw new BadRequestException(
        `All matches must belong to group ${input.groupId}`,
      );
    }

    // 6. Extraer los 4 equipos únicos del grupo desde los partidos
    const teamIdsSet = new Set<string>();
    for (const match of matches) {
      if (match.homeTeamId) teamIdsSet.add(match.homeTeamId);
      if (match.awayTeamId) teamIdsSet.add(match.awayTeamId);
    }

    const teamIds = Array.from(teamIdsSet);

    if (teamIds.length !== 4) {
      throw new BadRequestException(
        `Group must have exactly 4 teams, found ${teamIds.length}`,
      );
    }

    // 6.5. Enriquecer matchPredictions con homeTeamId y awayTeamId desde matches
    const enrichedMatchPredictions = input.matchPredictions.map((mp) => {
      const match = matches.find((m) => m.id === mp.matchId);
      if (!match) {
        throw new BadRequestException(`Match ${mp.matchId} not found`);
      }
      if (!match.homeTeamId || !match.awayTeamId) {
        throw new BadRequestException(
          `Match ${mp.matchId} does not have valid team IDs`,
        );
      }
      return {
        ...mp,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
      };
    });

    // 7. Calcular tabla de posiciones desde matchPredictions (source of truth)
    const calculatedStandings =
      this.calculateStandingsService.calculateStandings(
        input.groupId,
        teamIds,
        enrichedMatchPredictions,
      );

    // 8. Validar que groupStandings enviado coincida con el calculado
    const validation = this.calculateStandingsService.validateStandings(
      input.groupStandings,
      calculatedStandings,
    );

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Group standings validation failed',
        errors: validation.errors,
      });
    }

    // 9. Guardar matchPredictions en BD (usa los datos enriquecidos)
    await this.matchPredictionRepository.saveMany(
      prediction.id,
      enrichedMatchPredictions,
    );

    // 10. Guardar groupStandings en BD (usa el enviado por frontend, ya validado)
    await this.groupStandingRepository.saveMany(
      prediction.id,
      input.groupStandings,
    );

    // 11. Verificar si se completaron todos los 12 grupos
    const allGroupStandings =
      await this.groupStandingRepository.findByPrediction(prediction.id);

    // Contar grupos únicos
    const completedGroupIds = new Set(
      allGroupStandings.map((gs) => gs.groupId),
    );
    const totalGroupsCompleted = completedGroupIds.size;

    // Si completó los 12 grupos, marcar groups_completed = true
    let groupsCompleted = prediction.groupsCompleted;
    let bestThirdPlaces: SaveBestThirdPlaceData[] | undefined;

    if (totalGroupsCompleted === 12) {
      // Marcar como completado si no lo estaba
      if (!groupsCompleted) {
        await this.predictionRepository.markGroupsCompleted(prediction.id);
        groupsCompleted = true;
      }

      // 12. Calcular y retornar los 8 mejores terceros lugares
      // Extraer los 12 terceros (uno por grupo)
      const thirdPlaces = allGroupStandings.filter((gs) => gs.position === 3);

      if (thirdPlaces.length === 12) {
        // Calcular los 8 mejores terceros según criterios FIFA
        bestThirdPlaces =
          this.calculateBestThirdPlacesUseCase.execute(thirdPlaces);

        // Guardar en BD (upsert - reemplaza los anteriores)
        await this.bestThirdPlacePredictionRepository.saveMany(
          prediction.id,
          bestThirdPlaces,
        );
      }
    }

    return {
      success: true,
      message: 'Group predictions saved successfully',
      groupsCompleted,
      totalGroupsCompleted,
      bestThirdPlaces, // Incluir mejores terceros si se completaron todos los grupos
    };
  }

}
