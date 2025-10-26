import type { Prediction } from '@domain/entities/prediction.entity';

/**
 * Datos para crear una predicción
 * Se crea automáticamente cuando el usuario accede por primera vez a predicciones de una liga
 */
export interface CreatePredictionData {
  userId: string;
  leagueId: string;
}

/**
 * Datos para actualizar premios individuales
 */
export interface UpdateAwardsData {
  goldenBootPlayerId?: string | null;
  goldenBallPlayerId?: string | null;
  goldenGlovePlayerId?: string | null;
}

/**
 * Datos para actualizar el campeón
 */
export interface UpdateChampionData {
  championTeamId: string;
}

/**
 * IPredictionRepository (Domain Layer - Port)
 *
 * Interface que define el contrato para operaciones con la entidad Prediction (principal).
 * Siguiendo Single Responsibility Principle (SRP), este repositorio solo maneja la entidad Prediction.
 *
 * Otras entidades relacionadas tienen sus propios repositorios:
 * - IMatchPredictionRepository - Para match_predictions
 * - IGroupStandingPredictionRepository - Para group_standings_predictions
 * - IBestThirdPlacePredictionRepository - Para best_third_places_predictions
 *
 * Responsabilidades:
 * - CRUD de predicciones principales
 * - Actualizar premios individuales (Golden Boot/Ball/Glove)
 * - Actualizar campeón
 * - Marcar fases completadas (grupos, eliminatorias, premios)
 * - Bloquear predicciones (deadline)
 * - Actualizar puntos totales
 * - Consultas de predicciones por usuario/liga
 * - Rankings de ligas
 */
export interface IPredictionRepository {
  /**
   * Busca una predicción por ID
   */
  findById(id: string): Promise<Prediction | null>;

  /**
   * Busca la predicción de un usuario en una liga específica
   * @returns Prediction si existe, null si el usuario no ha creado predicción para esa liga
   */
  findByUserAndLeague(
    userId: string,
    leagueId: string,
  ): Promise<Prediction | null>;

  /**
   * Obtiene todas las predicciones de un usuario (todas sus ligas)
   */
  findByUser(userId: string): Promise<Prediction[]>;

  /**
   * Obtiene todas las predicciones de una liga
   * Útil para calcular rankings
   */
  findByLeague(leagueId: string): Promise<Prediction[]>;

  /**
   * Crea una nueva predicción
   * Se ejecuta automáticamente cuando el usuario accede por primera vez a predicciones de una liga
   */
  create(data: CreatePredictionData): Promise<Prediction>;

  /**
   * Actualiza premios individuales (Golden Boot, Ball, Glove)
   */
  updateAwards(id: string, data: UpdateAwardsData): Promise<Prediction>;

  /**
   * Actualiza el campeón predicho
   */
  updateChampion(id: string, data: UpdateChampionData): Promise<Prediction>;

  /**
   * Marca fase de grupos como completada
   */
  markGroupsCompleted(id: string): Promise<Prediction>;

  /**
   * Marca fase de eliminatorias como completada
   */
  markKnockoutsCompleted(id: string): Promise<Prediction>;

  /**
   * Marca premios como completados
   */
  markAwardsCompleted(id: string): Promise<Prediction>;

  /**
   * Bloquea una predicción (deadline pasado)
   */
  lock(id: string): Promise<Prediction>;

  /**
   * Actualiza el total de puntos acumulados
   */
  updateTotalPoints(id: string, points: number): Promise<Prediction>;

  /**
   * Verifica si existe una predicción para un usuario en una liga
   */
  exists(userId: string, leagueId: string): Promise<boolean>;

  /**
   * Obtiene el ranking de una liga ordenado por puntos
   * Incluye datos de usuario para display
   */
  getLeagueRanking(leagueId: string): Promise<
    Array<{
      prediction: Prediction;
      user: {
        id: string;
        name: string;
        email: string;
      };
      position: number;
    }>
  >;

  /**
   * Obtiene estadísticas globales de una predicción
   */
  getPredictionStats(predictionId: string): Promise<{
    totalMatches: number;
    predictedMatches: number;
    groupsCompleted: number;
    totalGroups: number;
    hasChampion: boolean;
    hasAllAwards: boolean;
    completionPercentage: number;
  }>;
}
