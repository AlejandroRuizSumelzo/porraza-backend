import type { BestThirdPlacePrediction } from '@domain/entities/best-third-place-prediction.entity';

/**
 * Datos para guardar mejor tercer lugar
 */
export interface SaveBestThirdPlaceData {
  teamId: string;
  rankingPosition: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  fromGroupId: string;
  hasTiebreakConflict?: boolean;
  tiebreakGroup?: number | null;
  manualTiebreakOrder?: number | null;
}

/**
 * Datos para resolver desempate manual entre terceros
 */
export interface ResolveBestThirdTiebreakData {
  bestThirdId: string;
  manualTiebreakOrder: number;
}

/**
 * IBestThirdPlacePredictionRepository (Domain Layer - Port)
 *
 * Interface que define el contrato para operaciones con la entidad BestThirdPlacePrediction.
 * Siguiendo Single Responsibility Principle (SRP), este repositorio solo maneja best_third_places_predictions.
 *
 * Responsabilidades:
 * - Guardar los 8 mejores terceros (calculados por backend)
 * - Consultar mejores terceros de una predicción
 * - Resolver desempates manuales entre terceros
 * - Actualizar puntos ganados al comparar con resultados reales
 *
 * Contexto Mundial 2026:
 * - 12 grupos de 4 equipos = 12 terceros lugares
 * - Solo los 8 mejores terceros clasifican a Round of 32
 * - Se ordenan por: puntos → diferencia de goles → goles a favor
 *
 * Usado por:
 * - CalculateBestThirdPlacesUseCase - Calcular mejores terceros cuando se completan todos los grupos
 * - ResolveBestThirdTiebreakUseCase - Usuario ordena manualmente terceros empatados
 * - CalculatePointsUseCase - Actualizar puntos al finalizar fase de grupos
 */
export interface IBestThirdPlacePredictionRepository {
  /**
   * Guarda los 8 mejores terceros (batch)
   * Se ejecuta automáticamente cuando el usuario completa el último grupo
   *
   * @param predictionId - UUID de la predicción principal
   * @param bestThirds - Array con 8 mejores terceros (ranking 1-8)
   * @returns Array de BestThirdPlacePrediction creadas/actualizadas
   *
   * Comportamiento:
   * - Elimina best_third_places anteriores (DELETE + INSERT)
   * - Inserta los 8 nuevos mejores terceros
   * - Marca has_tiebreak_conflict si hay empates totales
   */
  saveMany(
    predictionId: string,
    bestThirds: SaveBestThirdPlaceData[],
  ): Promise<BestThirdPlacePrediction[]>;

  /**
   * Obtiene los mejores terceros predichos (8 terceros)
   * @returns Array de 8 terceros ordenados por ranking_position (1-8)
   */
  findByPrediction(predictionId: string): Promise<BestThirdPlacePrediction[]>;

  /**
   * Actualiza orden manual para resolver desempate entre terceros
   * Se ejecuta cuando el usuario arrastra terceros para ordenar manualmente
   *
   * @param predictionId - UUID de la predicción
   * @param tiebreaks - Array con bestThirdId y orden manual
   */
  updateTiebreakOrder(
    predictionId: string,
    tiebreaks: ResolveBestThirdTiebreakData[],
  ): Promise<void>;

  /**
   * Actualiza puntos ganados por acertar tercer lugar clasificado
   * Se ejecuta al comparar con best_third_places_actual
   *
   * @param id - UUID del best_third_place_prediction
   * @param pointsEarned - Puntos ganados por acertar que este equipo clasifica
   */
  updatePoints(id: string, pointsEarned: number): Promise<void>;

  /**
   * Elimina best third places de una predicción
   * Útil para reset o eliminación en cascada
   */
  deleteByPrediction(predictionId: string): Promise<void>;
}
