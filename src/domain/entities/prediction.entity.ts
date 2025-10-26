/**
 * Interfaz para los datos de predicción desde la base de datos
 */
export interface PredictionDatabaseRow {
  id: string;
  user_id: string;
  league_id: string;
  golden_boot_player_id: string | null;
  golden_ball_player_id: string | null;
  golden_glove_player_id: string | null;
  champion_team_id: string | null;
  groups_completed: boolean;
  knockouts_completed: boolean;
  awards_completed: boolean;
  is_locked: boolean;
  locked_at: Date | null;
  total_points: number;
  last_points_calculation: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Prediction Entity (Domain Layer)
 *
 * Entidad de dominio que representa la predicción completa de un usuario para una liga.
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM o NestJS
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Inmutable (readonly properties)
 *
 * Notas:
 * - Cada usuario tiene UNA predicción por liga (constraint en BD)
 * - La predicción se construye por partes (grupos, eliminatorias, premios)
 * - Se bloquea automáticamente cuando pasa el deadline global
 * - total_points es un cache que se recalcula periódicamente
 */
export class Prediction {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly leagueId: string,
    public readonly goldenBootPlayerId: string | null,
    public readonly goldenBallPlayerId: string | null,
    public readonly goldenGlovePlayerId: string | null,
    public readonly championTeamId: string | null,
    public readonly groupsCompleted: boolean,
    public readonly knockoutsCompleted: boolean,
    public readonly awardsCompleted: boolean,
    public readonly isLocked: boolean,
    public readonly lockedAt: Date | null,
    public readonly totalPoints: number,
    public readonly lastPointsCalculation: Date | null,
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
      throw new Error('Prediction ID is required');
    }

    if (!this.userId || this.userId.trim() === '') {
      throw new Error('Prediction userId is required');
    }

    if (!this.leagueId || this.leagueId.trim() === '') {
      throw new Error('Prediction leagueId is required');
    }

    if (this.totalPoints < 0) {
      throw new Error('Total points cannot be negative');
    }

    // Si está bloqueada, debe tener fecha de bloqueo
    if (this.isLocked && !this.lockedAt) {
      throw new Error('Locked predictions must have a locked_at timestamp');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   */
  static fromDatabase(data: PredictionDatabaseRow): Prediction {
    return new Prediction(
      data.id,
      data.user_id,
      data.league_id,
      data.golden_boot_player_id,
      data.golden_ball_player_id,
      data.golden_glove_player_id,
      data.champion_team_id,
      data.groups_completed,
      data.knockouts_completed,
      data.awards_completed,
      data.is_locked,
      data.locked_at ? new Date(data.locked_at) : null,
      data.total_points,
      data.last_points_calculation
        ? new Date(data.last_points_calculation)
        : null,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Verifica si la predicción puede ser editada
   * Solo se puede editar si NO está bloqueada (deadline no ha pasado)
   */
  canBeEdited(): boolean {
    return !this.isLocked;
  }

  /**
   * Verifica si la predicción está bloqueada
   * Las predicciones bloqueadas no se pueden editar
   */
  isBlocked(): boolean {
    return this.isLocked;
  }

  /**
   * Verifica si la fase de grupos está completa
   */
  hasCompletedGroups(): boolean {
    return this.groupsCompleted;
  }

  /**
   * Verifica si la fase de eliminatorias está completa
   */
  hasCompletedKnockouts(): boolean {
    return this.knockoutsCompleted;
  }

  /**
   * Verifica si los premios individuales están completos
   */
  hasCompletedAwards(): boolean {
    return this.awardsCompleted;
  }

  /**
   * Verifica si la predicción está 100% completa
   * (grupos + eliminatorias + premios + campeón)
   */
  isComplete(): boolean {
    return (
      this.groupsCompleted &&
      this.knockoutsCompleted &&
      this.awardsCompleted &&
      this.championTeamId !== null
    );
  }

  /**
   * Calcula el porcentaje de completitud (0-100)
   */
  getCompletionPercentage(): number {
    let completed = 0;
    const total = 4; // grupos, knockouts, awards, champion

    if (this.groupsCompleted) completed++;
    if (this.knockoutsCompleted) completed++;
    if (this.awardsCompleted) completed++;
    if (this.championTeamId !== null) completed++;

    return Math.round((completed / total) * 100);
  }

  /**
   * Verifica si el usuario ha elegido todos los premios individuales
   */
  hasAllAwards(): boolean {
    return (
      this.goldenBootPlayerId !== null &&
      this.goldenBallPlayerId !== null &&
      this.goldenGlovePlayerId !== null
    );
  }

  /**
   * Verifica si el usuario ha elegido un campeón
   */
  hasChampion(): boolean {
    return this.championTeamId !== null;
  }

  /**
   * Verifica si la predicción necesita recalcular puntos
   * Se considera "stale" si pasó más de 1 hora desde el último cálculo
   */
  needsPointsRecalculation(): boolean {
    if (!this.lastPointsCalculation) {
      return true;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.lastPointsCalculation < oneHourAgo;
  }

  /**
   * Obtiene el estado actual de la predicción como string
   */
  getStatus():
    | 'draft'
    | 'in_progress'
    | 'complete'
    | 'locked_incomplete'
    | 'locked_complete' {
    if (this.isLocked) {
      return this.isComplete() ? 'locked_complete' : 'locked_incomplete';
    }

    if (!this.groupsCompleted && !this.knockoutsCompleted) {
      return 'draft';
    }

    if (this.isComplete()) {
      return 'complete';
    }

    return 'in_progress';
  }

  /**
   * Convierte la entidad a objeto plano
   */
  toObject(): {
    id: string;
    userId: string;
    leagueId: string;
    goldenBootPlayerId: string | null;
    goldenBallPlayerId: string | null;
    goldenGlovePlayerId: string | null;
    championTeamId: string | null;
    groupsCompleted: boolean;
    knockoutsCompleted: boolean;
    awardsCompleted: boolean;
    isLocked: boolean;
    lockedAt: Date | null;
    totalPoints: number;
    lastPointsCalculation: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      userId: this.userId,
      leagueId: this.leagueId,
      goldenBootPlayerId: this.goldenBootPlayerId,
      goldenBallPlayerId: this.goldenBallPlayerId,
      goldenGlovePlayerId: this.goldenGlovePlayerId,
      championTeamId: this.championTeamId,
      groupsCompleted: this.groupsCompleted,
      knockoutsCompleted: this.knockoutsCompleted,
      awardsCompleted: this.awardsCompleted,
      isLocked: this.isLocked,
      lockedAt: this.lockedAt,
      totalPoints: this.totalPoints,
      lastPointsCalculation: this.lastPointsCalculation,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toString(): string {
    const status = this.getStatus();
    const completion = this.getCompletionPercentage();
    return `Prediction #${this.id.substring(0, 8)}: User ${this.userId.substring(0, 8)} in League ${this.leagueId.substring(0, 8)} - ${status} (${completion}%) - ${this.totalPoints} points`;
  }
}
