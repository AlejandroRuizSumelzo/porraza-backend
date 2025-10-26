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
import type { SaveMatchPredictionData } from '@domain/repositories/match-prediction.repository.interface';
import type { SaveGroupStandingData } from '@domain/repositories/group-standing-prediction.repository.interface';
import type { MatchPrediction } from '@domain/entities/match-prediction.entity';
import type { GroupStandingPrediction } from '@domain/entities/group-standing-prediction.entity';
import { CalculateGroupStandingsUseCase } from './calculate-group-standings.use-case';

/**
 * Datos de entrada para guardar predicciones de un grupo
 */
export interface SaveGroupPredictionsInput {
  predictionId: string;
  groupId: string;
  matchPredictions: SaveMatchPredictionData[];
}

/**
 * Respuesta del caso de uso
 */
export interface SaveGroupPredictionsOutput {
  matchPredictions: MatchPrediction[];
  groupStandings: GroupStandingPrediction[];
  tiebreakConflicts: Array<{
    teams: string[];
    tiebreakGroup: number;
  }>;
}

/**
 * SaveGroupPredictionsUseCase (Application Layer)
 *
 * Caso de uso más complejo del sistema de predicciones.
 * Guarda predicciones de partidos de un grupo y calcula automáticamente
 * la tabla de posiciones según reglas FIFA.
 *
 * Responsabilidades:
 * 1. Validar que la predicción exista y no esté bloqueada
 * 2. Guardar predicciones de partidos (6 partidos por grupo)
 * 3. Calcular tabla de posiciones según reglas FIFA
 * 4. Detectar empates totales (puntos, DG, GF)
 * 5. Guardar tabla de posiciones calculada
 * 6. Retornar standings con flags de desempate
 *
 * Reglas FIFA implementadas:
 * - Puntos: Victoria 3, Empate 1, Derrota 0
 * - Diferencia de goles (GD = GF - GC)
 * - Goles a favor (GF)
 * - Si empate total → marcar has_tiebreak_conflict = TRUE
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

    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,

    private readonly calculateGroupStandingsUseCase: CalculateGroupStandingsUseCase,
  ) {}

  async execute(
    input: SaveGroupPredictionsInput,
  ): Promise<SaveGroupPredictionsOutput> {
    // 1. Validar que la predicción exista y no esté bloqueada
    const prediction = await this.predictionRepository.findById(
      input.predictionId,
    );

    if (!prediction) {
      throw new NotFoundException(
        `Prediction with id ${input.predictionId} not found`,
      );
    }

    if (!prediction.canBeEdited()) {
      throw new ForbiddenException(
        'Predictions are locked. Deadline has passed.',
      );
    }

    // 2. Validar que sean exactamente 6 partidos (grupo de 4 equipos)
    if (input.matchPredictions.length !== 6) {
      throw new BadRequestException(
        'A group must have exactly 6 match predictions (4 teams play 6 matches)',
      );
    }

    // 3. Guardar predicciones de partidos (UPSERT)
    const matchPredictions = await this.matchPredictionRepository.saveMany(
      input.predictionId,
      input.matchPredictions,
    );

    // 4. Calcular tabla de posiciones según reglas FIFA
    const groupStandings = await this.calculateGroupStandings(
      input.groupId,
      matchPredictions,
    );

    // 5. Guardar tabla de posiciones (DELETE + INSERT)
    const savedStandings = await this.groupStandingRepository.saveMany(
      input.predictionId,
      groupStandings,
    );

    // 6. Detectar conflictos de desempate
    const tiebreakConflicts = this.detectTiebreakConflicts(savedStandings);

    return {
      matchPredictions,
      groupStandings: savedStandings,
      tiebreakConflicts,
    };
  }

  /**
   * Calcula la tabla de posiciones de un grupo según reglas FIFA
   *
   * Lógica:
   * 1. Obtiene datos de partidos (homeTeamId, awayTeamId) desde la BD
   * 2. Extrae equipos únicos del grupo (4 equipos)
   * 3. Construye datos enriquecidos con teamIds y scores predichos
   * 4. Delega a CalculateGroupStandingsUseCase para cálculo FIFA
   * 5. Retorna tabla ordenada con flags de desempate
   */
  private async calculateGroupStandings(
    groupId: string,
    matchPredictions: MatchPrediction[],
  ): Promise<SaveGroupStandingData[]> {
    // 1. Obtener datos reales de los partidos para extraer teamIds
    const matchIds = matchPredictions.map((mp) => mp.matchId);
    const matches = await this.matchRepository.findByIds(matchIds);

    // 2. Validar que se obtuvieron todos los partidos
    if (matches.length !== 6) {
      throw new Error(
        `Expected 6 matches for group ${groupId}, but found ${matches.length}`,
      );
    }

    // 3. Extraer todos los equipos únicos del grupo (debería haber exactamente 4)
    const teamIdsSet = new Set<string>();
    for (const match of matches) {
      if (match.homeTeamId) teamIdsSet.add(match.homeTeamId);
      if (match.awayTeamId) teamIdsSet.add(match.awayTeamId);
    }

    const teamIds = Array.from(teamIdsSet);

    // 4. Validar que hay exactamente 4 equipos
    if (teamIds.length !== 4) {
      throw new Error(
        `Expected 4 teams in group ${groupId}, but found ${teamIds.length}`,
      );
    }

    // 5. Construir datos enriquecidos con teamIds y scores predichos
    const enrichedMatches = matchPredictions.map((mp) => {
      const match = matches.find((m) => m.id === mp.matchId);

      if (!match) {
        throw new Error(`Match with id ${mp.matchId} not found`);
      }

      if (!match.homeTeamId || !match.awayTeamId) {
        throw new Error(
          `Match ${mp.matchId} has undefined teams (homeTeamId: ${match.homeTeamId}, awayTeamId: ${match.awayTeamId})`,
        );
      }

      return {
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: mp.homeScore,
        awayScore: mp.awayScore,
      };
    });

    // 6. Delegar a CalculateGroupStandingsUseCase para cálculo FIFA
    return this.calculateGroupStandingsUseCase.execute(
      groupId,
      teamIds,
      enrichedMatches,
    );
  }

  /**
   * Detecta conflictos de desempate (equipos empatados en puntos, GD y GF)
   *
   * Retorna grupos de equipos empatados que requieren orden manual del usuario
   */
  private detectTiebreakConflicts(
    standings: GroupStandingPrediction[],
  ): Array<{ teams: string[]; tiebreakGroup: number }> {
    const conflicts: Array<{ teams: string[]; tiebreakGroup: number }> = [];

    // Agrupar standings por tiebreak_group
    const tiebreakGroups = new Map<number, GroupStandingPrediction[]>();

    for (const standing of standings) {
      if (standing.hasTiebreakConflict && standing.tiebreakGroup !== null) {
        const group = tiebreakGroups.get(standing.tiebreakGroup) || [];
        group.push(standing);
        tiebreakGroups.set(standing.tiebreakGroup, group);
      }
    }

    // Convertir a formato de respuesta
    tiebreakGroups.forEach((group, tiebreakGroupNumber) => {
      if (group.length > 1) {
        conflicts.push({
          teams: group.map((s) => s.teamId),
          tiebreakGroup: tiebreakGroupNumber,
        });
      }
    });

    return conflicts;
  }
}
