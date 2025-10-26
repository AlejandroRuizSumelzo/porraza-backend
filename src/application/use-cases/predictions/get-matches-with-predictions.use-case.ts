import { Injectable, Inject } from '@nestjs/common';
import type {
  IMatchRepository,
  MatchWithBasicDetailsRow,
} from '@domain/repositories/match.repository.interface';
import type { IMatchPredictionRepository } from '@domain/repositories/match-prediction.repository.interface';
import type { MatchPrediction } from '@domain/entities/match-prediction.entity';

/**
 * Resultado del Use Case (optimizado con rows de BD)
 */
export interface GetMatchesWithPredictionsResult {
  matchRows: MatchWithBasicDetailsRow[];
  matchPredictions: MatchPrediction[];
}

/**
 * GetMatchesWithPredictionsUseCase (Application Layer)
 *
 * Caso de uso para obtener todos los partidos de fase de grupos (72 partidos)
 * con información completa (teams, stadium, group) junto con las predicciones del usuario.
 *
 * Flujo:
 * 1. Obtiene todos los partidos de fase de grupos con JOINs (teams, stadium, group)
 * 2. Obtiene todas las predicciones del usuario para su predicción
 * 3. Retorna ambos arrays para que el controller los combine
 *
 * Responsabilidades:
 * - Coordinar las consultas a repositorios
 * - Retornar datos en bruto (rows de BD + entidades de predicción)
 * - NO transforma a DTOs (eso es responsabilidad del controller)
 *
 * Performance:
 * - 2 queries independientes (pueden ejecutarse en paralelo)
 * - Query 1: SELECT con JOINs (matches + teams + stadium + group) - 72 rows
 * - Query 2: SELECT * FROM match_predictions WHERE prediction_id = $1 (0-72 rows)
 * - Total: ~10-20ms (JOINs son muy eficientes con índices)
 */
@Injectable()
export class GetMatchesWithPredictionsUseCase {
  constructor(
    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,
    @Inject('IMatchPredictionRepository')
    private readonly matchPredictionRepository: IMatchPredictionRepository,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @param predictionId - UUID de la predicción del usuario
   * @returns Objeto con arrays de match rows (con JOINs) y matchPredictions
   */
  async execute(
    predictionId: string,
  ): Promise<GetMatchesWithPredictionsResult> {
    // Ejecutar ambas queries en paralelo para mejor performance
    const [matchRows, matchPredictions] = await Promise.all([
      this.matchRepository.findGroupStageMatchesWithDetails(),
      this.matchPredictionRepository.findByPrediction(predictionId),
    ]);

    return {
      matchRows,
      matchPredictions,
    };
  }
}
