/**
 * Interfaz para los datos de predicción de mejores terceros desde la base de datos
 */
export interface BestThirdPlacePredictionDatabaseRow {
  id: string;
  prediction_id: string;
  team_id: string;
  ranking_position: number;
  points: number;
  goal_difference: number;
  goals_for: number;
  from_group_id: string;
  has_tiebreak_conflict: boolean;
  tiebreak_group: number | null;
  manual_tiebreak_order: number | null;
  points_earned: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * BestThirdPlacePrediction Entity (Domain Layer)
 *
 * Entidad de dominio que representa uno de los 8 mejores terceros lugares predichos.
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM o NestJS
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Inmutable (readonly properties)
 *
 * Notas:
 * - Mundial 2026: Los 8 mejores terceros de los 12 grupos clasifican a R32
 * - Se ordenan por: puntos → diferencia de goles → goles a favor
 * - Esta entidad se calcula automáticamente basándose en group_standings_predictions
 * - has_tiebreak_conflict se marca TRUE cuando hay empate total
 * - ranking_position va de 1 (mejor tercero) a 8 (octavo mejor tercero)
 * - points_earned se calcula comparando con best_third_places_actual
 */
export class BestThirdPlacePrediction {
  constructor(
    public readonly id: string,
    public readonly predictionId: string,
    public readonly teamId: string,
    public readonly rankingPosition: number,
    public readonly points: number,
    public readonly goalDifference: number,
    public readonly goalsFor: number,
    public readonly fromGroupId: string,
    public readonly hasTiebreakConflict: boolean,
    public readonly tiebreakGroup: number | null,
    public readonly manualTiebreakOrder: number | null,
    public readonly pointsEarned: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validate();
  }

  /**
   * Validaciones de negocio (Domain Rules)
   */
  private validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('BestThirdPlacePrediction ID is required');
    }

    if (!this.predictionId || this.predictionId.trim() === '') {
      throw new Error('BestThirdPlacePrediction predictionId is required');
    }

    if (!this.teamId || this.teamId.trim() === '') {
      throw new Error('BestThirdPlacePrediction teamId is required');
    }

    if (!this.fromGroupId || this.fromGroupId.trim() === '') {
      throw new Error('BestThirdPlacePrediction fromGroupId is required');
    }

    // Validar ranking (1-8, solo los 8 mejores terceros clasifican)
    if (this.rankingPosition < 1 || this.rankingPosition > 8) {
      throw new Error('Ranking position must be between 1 and 8');
    }

    // Validar estadísticas
    if (this.points < 0) {
      throw new Error('Points cannot be negative');
    }

    if (this.goalsFor < 0) {
      throw new Error('Goals for cannot be negative');
    }

    if (this.pointsEarned < 0) {
      throw new Error('Points earned cannot be negative');
    }

    // Validar tiebreak
    if (this.hasTiebreakConflict && this.tiebreakGroup === null) {
      throw new Error('Tiebreak conflict must have a tiebreak_group assigned');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   */
  static fromDatabase(
    data: BestThirdPlacePredictionDatabaseRow,
  ): BestThirdPlacePrediction {
    return new BestThirdPlacePrediction(
      data.id,
      data.prediction_id,
      data.team_id,
      data.ranking_position,
      data.points,
      data.goal_difference,
      data.goals_for,
      data.from_group_id,
      data.has_tiebreak_conflict,
      data.tiebreak_group,
      data.manual_tiebreak_order,
      data.points_earned,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Verifica si este tercero clasifica a R32
   * Solo los 8 mejores terceros clasifican
   */
  qualifiesToRound32(): boolean {
    return this.rankingPosition <= 8;
  }

  /**
   * Verifica si hay conflicto de desempate con otros terceros
   */
  hasConflict(): boolean {
    return this.hasTiebreakConflict;
  }

  /**
   * Verifica si el usuario ha resuelto manualmente el desempate
   */
  hasManualTiebreakResolution(): boolean {
    return this.manualTiebreakOrder !== null;
  }

  /**
   * Compara este tercer lugar con otro según criterios FIFA
   * @returns positivo si this > other, negativo si this < other, 0 si iguales
   */
  compareByFIFACriteria(other: BestThirdPlacePrediction): number {
    // 1. Puntos
    if (this.points !== other.points) {
      return other.points - this.points; // Mayor puntos = mejor ranking
    }

    // 2. Diferencia de goles
    if (this.goalDifference !== other.goalDifference) {
      return other.goalDifference - this.goalDifference;
    }

    // 3. Goles a favor
    if (this.goalsFor !== other.goalsFor) {
      return other.goalsFor - this.goalsFor;
    }

    // Si todo es igual, hay conflicto de desempate
    return 0;
  }

  /**
   * Obtiene el resumen de estadísticas en formato string
   */
  getStatsString(): string {
    return `${this.points} pts | GD ${this.goalDifference > 0 ? '+' : ''}${this.goalDifference} | GF ${this.goalsFor}`;
  }

  /**
   * Convierte la entidad a objeto plano
   */
  toObject(): {
    id: string;
    predictionId: string;
    teamId: string;
    rankingPosition: number;
    points: number;
    goalDifference: number;
    goalsFor: number;
    fromGroupId: string;
    hasTiebreakConflict: boolean;
    tiebreakGroup: number | null;
    manualTiebreakOrder: number | null;
    pointsEarned: number;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      predictionId: this.predictionId,
      teamId: this.teamId,
      rankingPosition: this.rankingPosition,
      points: this.points,
      goalDifference: this.goalDifference,
      goalsFor: this.goalsFor,
      fromGroupId: this.fromGroupId,
      hasTiebreakConflict: this.hasTiebreakConflict,
      tiebreakGroup: this.tiebreakGroup,
      manualTiebreakOrder: this.manualTiebreakOrder,
      pointsEarned: this.pointsEarned,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toString(): string {
    return `BestThirdPlace #${this.id.substring(0, 8)}: Rank ${this.rankingPosition} - ${this.getStatsString()}`;
  }
}
