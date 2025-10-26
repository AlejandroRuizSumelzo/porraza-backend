import type { GroupStandingPrediction } from '@domain/entities/group-standing-prediction.entity';

/**
 * Datos para guardar tabla de posiciones de un grupo
 * (Calculada automáticamente por backend basándose en match_predictions)
 */
export interface SaveGroupStandingData {
  groupId: string;
  teamId: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  hasTiebreakConflict?: boolean;
  tiebreakGroup?: number | null;
  manualTiebreakOrder?: number | null;
}

/**
 * Datos para resolver desempate manual
 */
export interface ResolveTiebreakData {
  standingId: string;
  manualTiebreakOrder: number;
}

/**
 * IGroupStandingPredictionRepository (Domain Layer - Port)
 *
 * Interface que define el contrato para operaciones con la entidad GroupStandingPrediction.
 * Siguiendo Single Responsibility Principle (SRP), este repositorio solo maneja group_standings_predictions.
 *
 * Responsabilidades:
 * - Guardar tablas de posiciones de grupos (calculadas por backend)
 * - Consultar tablas de posiciones por predicción/grupo
 * - Resolver desempates manuales
 * - Actualizar puntos ganados al comparar con resultados reales
 *
 * Usado por:
 * - SaveGroupPredictionsUseCase - Guardar tabla calculada después de guardar partidos
 * - CalculateGroupStandingsUseCase - Calcular tabla según reglas FIFA
 * - ResolveTiebreakUseCase - Usuario ordena manualmente equipos empatados
 * - CalculatePointsUseCase - Actualizar puntos al finalizar fase de grupos
 */
export interface IGroupStandingPredictionRepository {
  /**
   * Guarda tabla de posiciones de un grupo (batch)
   * Se ejecuta después de guardar match_predictions de un grupo
   *
   * @param predictionId - UUID de la predicción principal
   * @param standings - Array con 4 posiciones (1º, 2º, 3º, 4º)
   * @returns Array de GroupStandingPrediction creadas/actualizadas
   *
   * Comportamiento:
   * - Elimina standings anteriores del grupo (DELETE + INSERT)
   * - Inserta las 4 nuevas posiciones
   * - Marca has_tiebreak_conflict si hay empates totales
   */
  saveMany(
    predictionId: string,
    standings: SaveGroupStandingData[],
  ): Promise<GroupStandingPrediction[]>;

  /**
   * Obtiene tabla de posiciones de un grupo predicha
   * @returns Array de 4 posiciones ordenadas (1º a 4º)
   */
  findByPredictionAndGroup(
    predictionId: string,
    groupId: string,
  ): Promise<GroupStandingPrediction[]>;

  /**
   * Obtiene todas las tablas de posiciones de grupos (12 grupos × 4 = 48 registros)
   * Útil para calcular mejores terceros
   */
  findByPrediction(predictionId: string): Promise<GroupStandingPrediction[]>;

  /**
   * Obtiene todos los terceros lugares de una predicción (12 terceros)
   * Útil para calcular los 8 mejores terceros
   * @returns Array de 12 equipos en posición 3
   */
  findThirdPlacesByPrediction(
    predictionId: string,
  ): Promise<GroupStandingPrediction[]>;

  /**
   * Actualiza orden manual para resolver desempate
   * Se ejecuta cuando el usuario arrastra equipos para ordenar manualmente
   *
   * @param predictionId - UUID de la predicción
   * @param groupId - UUID del grupo
   * @param tiebreaks - Array con standingId y orden manual
   */
  updateTiebreakOrder(
    predictionId: string,
    groupId: string,
    tiebreaks: ResolveTiebreakData[],
  ): Promise<void>;

  /**
   * Actualiza puntos ganados en una posición de grupo
   * Se ejecuta al comparar con group_standings_actual
   *
   * @param id - UUID del group_standing_prediction
   * @param pointsEarned - Puntos ganados (3 si posición exacta, 1 si clasificó en otra posición)
   */
  updatePoints(id: string, pointsEarned: number): Promise<void>;

  /**
   * Elimina standings de una predicción
   * Útil para reset o eliminación en cascada
   */
  deleteByPrediction(predictionId: string): Promise<void>;
}
