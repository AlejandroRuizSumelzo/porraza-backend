import type { MatchPrediction } from '@domain/entities/match-prediction.entity';

/**
 * Datos para crear/actualizar predicción de partido
 */
export interface SaveMatchPredictionData {
  matchId: string;
  homeScore: number;
  awayScore: number;
  homeScoreET?: number | null;
  awayScoreET?: number | null;
  penaltiesWinner?: 'home' | 'away' | null;
}

/**
 * IMatchPredictionRepository (Domain Layer - Port)
 *
 * Interface que define el contrato para operaciones con la entidad MatchPrediction.
 * Siguiendo Single Responsibility Principle (SRP), este repositorio solo maneja match_predictions.
 *
 * Responsabilidades:
 * - Guardar predicciones de partidos (individual o batch)
 * - Consultar predicciones de partidos por predicción/grupo/match
 * - Actualizar puntos ganados en predicciones de partidos
 *
 * Usado por:
 * - SaveGroupPredictionsUseCase - Guardar predicciones de fase de grupos
 * - SaveKnockoutPredictionsUseCase - Guardar predicciones de eliminatorias
 * - CalculatePointsUseCase - Actualizar puntos después de partidos reales
 */
export interface IMatchPredictionRepository {
  /**
   * Guarda predicciones de partidos (batch)
   * Se usa cuando el usuario guarda predicciones de un grupo completo o eliminatorias
   *
   * @param predictionId - UUID de la predicción principal
   * @param matchPredictions - Array de predicciones de partidos
   * @returns Array de MatchPrediction creadas/actualizadas
   *
   * Comportamiento:
   * - Si la predicción ya existe (prediction_id + match_id), actualiza (UPSERT)
   * - Si no existe, crea nueva predicción
   */
  saveMany(
    predictionId: string,
    matchPredictions: SaveMatchPredictionData[],
  ): Promise<MatchPrediction[]>;

  /**
   * Guarda una predicción de partido individual
   */
  save(
    predictionId: string,
    matchPrediction: SaveMatchPredictionData,
  ): Promise<MatchPrediction>;

  /**
   * Obtiene todas las predicciones de partidos de una predicción
   */
  findByPrediction(predictionId: string): Promise<MatchPrediction[]>;

  /**
   * Obtiene predicciones de partidos de un grupo específico
   * Útil para mostrar/editar predicciones de un grupo
   */
  findByPredictionAndGroup(
    predictionId: string,
    groupId: string,
  ): Promise<MatchPrediction[]>;

  /**
   * Obtiene predicción de un partido específico
   */
  findByPredictionAndMatch(
    predictionId: string,
    matchId: string,
  ): Promise<MatchPrediction | null>;

  /**
   * Actualiza puntos ganados en una predicción de partido
   * Se ejecuta cuando el partido real finaliza (CalculatePointsUseCase)
   *
   * @param id - UUID de la match_prediction
   * @param pointsEarned - Puntos totales ganados
   * @param pointsBreakdown - Detalle de puntos { exactResult: 3, correct1X2: 1, ... }
   */
  updatePoints(
    id: string,
    pointsEarned: number,
    pointsBreakdown: any,
  ): Promise<void>;

  /**
   * Elimina predicciones de partidos de una predicción
   * Útil para reset o eliminación en cascada
   */
  deleteByPrediction(predictionId: string): Promise<void>;
}
