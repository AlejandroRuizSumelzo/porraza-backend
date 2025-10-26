/**
 * Interfaz para los datos de predicción de tabla de grupo desde la base de datos
 */
export interface GroupStandingPredictionDatabaseRow {
  id: string;
  prediction_id: string;
  group_id: string;
  team_id: string;
  position: number;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  has_tiebreak_conflict: boolean;
  tiebreak_group: number | null;
  manual_tiebreak_order: number | null;
  points_earned: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * GroupStandingPrediction Entity (Domain Layer)
 *
 * Entidad de dominio que representa la posición predicha de un equipo en la tabla de un grupo.
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM o NestJS
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Inmutable (readonly properties)
 *
 * Notas:
 * - Esta entidad se calcula automáticamente basándose en match_predictions
 * - Sigue reglas FIFA: puntos, diferencia de goles, goles a favor
 * - has_tiebreak_conflict se marca TRUE cuando hay empate total entre equipos
 * - tiebreak_group agrupa equipos empatados (ej: 1, 2, 3)
 * - manual_tiebreak_order permite al usuario ordenar manualmente equipos empatados
 * - points_earned se calcula al comparar con group_standings_actual
 */
export class GroupStandingPrediction {
  constructor(
    public readonly id: string,
    public readonly predictionId: string,
    public readonly groupId: string,
    public readonly teamId: string,
    public readonly position: number,
    public readonly points: number,
    public readonly played: number,
    public readonly wins: number,
    public readonly draws: number,
    public readonly losses: number,
    public readonly goalsFor: number,
    public readonly goalsAgainst: number,
    public readonly goalDifference: number,
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
      throw new Error('GroupStandingPrediction ID is required');
    }

    if (!this.predictionId || this.predictionId.trim() === '') {
      throw new Error('GroupStandingPrediction predictionId is required');
    }

    if (!this.groupId || this.groupId.trim() === '') {
      throw new Error('GroupStandingPrediction groupId is required');
    }

    if (!this.teamId || this.teamId.trim() === '') {
      throw new Error('GroupStandingPrediction teamId is required');
    }

    // Validar posición (1-4 en cada grupo)
    if (this.position < 1 || this.position > 4) {
      throw new Error('Position must be between 1 and 4');
    }

    // Validar estadísticas
    if (this.points < 0) {
      throw new Error('Points cannot be negative');
    }

    if (this.played < 0 || this.played > 3) {
      throw new Error('Played matches must be between 0 and 3');
    }

    if (this.wins < 0 || this.draws < 0 || this.losses < 0) {
      throw new Error('Wins, draws, and losses cannot be negative');
    }

    if (this.wins + this.draws + this.losses !== this.played) {
      throw new Error('Wins + draws + losses must equal played matches');
    }

    if (this.goalsFor < 0 || this.goalsAgainst < 0) {
      throw new Error('Goals cannot be negative');
    }

    if (this.goalDifference !== this.goalsFor - this.goalsAgainst) {
      throw new Error('Goal difference must be goals_for - goals_against');
    }

    // Validar puntos FIFA (3 por victoria + 1 por empate)
    const expectedPoints = this.wins * 3 + this.draws * 1;
    if (this.points !== expectedPoints) {
      throw new Error(
        `Points mismatch: expected ${expectedPoints} (${this.wins}W * 3 + ${this.draws}D * 1) but got ${this.points}`,
      );
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
    data: GroupStandingPredictionDatabaseRow,
  ): GroupStandingPrediction {
    return new GroupStandingPrediction(
      data.id,
      data.prediction_id,
      data.group_id,
      data.team_id,
      data.position,
      data.points,
      data.played,
      data.wins,
      data.draws,
      data.losses,
      data.goals_for,
      data.goals_against,
      data.goal_difference,
      data.has_tiebreak_conflict,
      data.tiebreak_group,
      data.manual_tiebreak_order,
      data.points_earned,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Verifica si el equipo clasifica a la siguiente fase
   * En Mundial 2026: 1º, 2º y algunos 3º clasifican
   */
  qualifiesAsFirstOrSecond(): boolean {
    return this.position === 1 || this.position === 2;
  }

  /**
   * Verifica si el equipo clasifica como tercer lugar
   * Los mejores 8 terceros clasifican a R32
   */
  isThirdPlace(): boolean {
    return this.position === 3;
  }

  /**
   * Verifica si el equipo queda eliminado
   */
  isEliminated(): boolean {
    return this.position === 4;
  }

  /**
   * Verifica si hay conflicto de desempate con otros equipos
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
   * Obtiene el WDL (Wins-Draws-Losses) en formato string
   */
  getWDLString(): string {
    return `${this.wins}W-${this.draws}D-${this.losses}L`;
  }

  /**
   * Obtiene el promedio de puntos por partido
   */
  getPointsPerGame(): number {
    if (this.played === 0) return 0;
    return parseFloat((this.points / this.played).toFixed(2));
  }

  /**
   * Obtiene el promedio de goles por partido
   */
  getGoalsPerGame(): number {
    if (this.played === 0) return 0;
    return parseFloat((this.goalsFor / this.played).toFixed(2));
  }

  /**
   * Compara esta predicción con otra según criterios FIFA
   * @returns positivo si this > other, negativo si this < other, 0 si iguales
   */
  compareByFIFACriteria(other: GroupStandingPrediction): number {
    // 1. Puntos
    if (this.points !== other.points) {
      return other.points - this.points; // Mayor puntos = mejor posición
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
   * Convierte la entidad a objeto plano
   */
  toObject(): {
    id: string;
    predictionId: string;
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
      groupId: this.groupId,
      teamId: this.teamId,
      position: this.position,
      points: this.points,
      played: this.played,
      wins: this.wins,
      draws: this.draws,
      losses: this.losses,
      goalsFor: this.goalsFor,
      goalsAgainst: this.goalsAgainst,
      goalDifference: this.goalDifference,
      hasTiebreakConflict: this.hasTiebreakConflict,
      tiebreakGroup: this.tiebreakGroup,
      manualTiebreakOrder: this.manualTiebreakOrder,
      pointsEarned: this.pointsEarned,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toString(): string {
    return `GroupStanding #${this.id.substring(0, 8)}: Pos ${this.position} - ${this.points} pts, GD ${this.goalDifference > 0 ? '+' : ''}${this.goalDifference}`;
  }
}
