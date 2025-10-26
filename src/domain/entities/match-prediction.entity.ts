/**
 * Interfaz para los datos de predicción de partido desde la base de datos
 */
export interface MatchPredictionDatabaseRow {
  id: string;
  prediction_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  home_score_et: number | null;
  away_score_et: number | null;
  penalties_winner: string | null;
  points_earned: number;
  points_breakdown: any; // JSONB
  created_at: Date;
  updated_at: Date;
}

/**
 * Type para el ganador de penaltis
 */
export type PenaltiesWinner = 'home' | 'away';

/**
 * Interface para el desglose de puntos
 */
export interface PointsBreakdown {
  exactResult?: number; // Puntos por resultado exacto
  correct1X2?: number; // Puntos por acertar victoria/empate
  correctWinner?: number; // Puntos por acertar ganador (eliminatorias)
  correctET?: number; // Puntos por resultado exacto en prórroga
  correctPenalties?: number; // Puntos por acertar ganador en penaltis
  phaseBonus?: number; // Puntos por acertar clasificado a siguiente fase
}

/**
 * MatchPrediction Entity (Domain Layer)
 *
 * Entidad de dominio que representa la predicción de un partido específico.
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM o NestJS
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Inmutable (readonly properties)
 *
 * Notas:
 * - home_score y away_score son obligatorios (predicción en 90')
 * - home_score_et y away_score_et solo para eliminatorias con prórroga
 * - penalties_winner solo si el partido va a penaltis
 * - points_earned y points_breakdown se calculan después del partido real
 */
export class MatchPrediction {
  constructor(
    public readonly id: string,
    public readonly predictionId: string,
    public readonly matchId: string,
    public readonly homeScore: number,
    public readonly awayScore: number,
    public readonly homeScoreET: number | null,
    public readonly awayScoreET: number | null,
    public readonly penaltiesWinner: PenaltiesWinner | null,
    public readonly pointsEarned: number,
    public readonly pointsBreakdown: PointsBreakdown,
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
      throw new Error('MatchPrediction ID is required');
    }

    if (!this.predictionId || this.predictionId.trim() === '') {
      throw new Error('MatchPrediction predictionId is required');
    }

    if (!this.matchId || this.matchId.trim() === '') {
      throw new Error('MatchPrediction matchId is required');
    }

    // Validar marcadores (no pueden ser negativos)
    if (this.homeScore < 0 || this.awayScore < 0) {
      throw new Error('Scores cannot be negative');
    }

    if (this.homeScoreET !== null && this.homeScoreET < 0) {
      throw new Error('Extra time scores cannot be negative');
    }

    if (this.awayScoreET !== null && this.awayScoreET < 0) {
      throw new Error('Extra time scores cannot be negative');
    }

    // Validar que prórroga solo se use si hay empate en 90'
    if (
      (this.homeScoreET !== null || this.awayScoreET !== null) &&
      this.homeScore !== this.awayScore
    ) {
      throw new Error(
        'Extra time can only be predicted if 90-minute score is a draw',
      );
    }

    // Validar que ambos marcadores de prórroga estén presentes o ausentes
    if (
      (this.homeScoreET !== null && this.awayScoreET === null) ||
      (this.homeScoreET === null && this.awayScoreET !== null)
    ) {
      throw new Error(
        'Both extra time scores must be provided or both must be null',
      );
    }

    // Validar ganador de penaltis
    if (
      this.penaltiesWinner !== null &&
      !['home', 'away'].includes(this.penaltiesWinner)
    ) {
      throw new Error("Penalties winner must be 'home' or 'away'");
    }

    // Validar que penaltis solo se use si hay empate después de prórroga
    if (
      this.penaltiesWinner !== null &&
      this.homeScoreET !== null &&
      this.awayScoreET !== null &&
      this.homeScoreET !== this.awayScoreET
    ) {
      throw new Error(
        'Penalties can only be predicted if extra time score is a draw',
      );
    }

    if (this.pointsEarned < 0) {
      throw new Error('Points earned cannot be negative');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   */
  static fromDatabase(data: MatchPredictionDatabaseRow): MatchPrediction {
    return new MatchPrediction(
      data.id,
      data.prediction_id,
      data.match_id,
      data.home_score,
      data.away_score,
      data.home_score_et,
      data.away_score_et,
      data.penalties_winner as PenaltiesWinner | null,
      data.points_earned,
      data.points_breakdown || {},
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Verifica si la predicción es para un empate en 90'
   */
  isDraw(): boolean {
    return this.homeScore === this.awayScore;
  }

  /**
   * Verifica si la predicción tiene prórroga
   */
  hasExtraTime(): boolean {
    return this.homeScoreET !== null && this.awayScoreET !== null;
  }

  /**
   * Verifica si la predicción va a penaltis
   */
  hasPenalties(): boolean {
    return this.penaltiesWinner !== null;
  }

  /**
   * Obtiene el ganador predicho en 90 minutos
   * @returns 'home' | 'away' | 'draw'
   */
  getWinner90(): 'home' | 'away' | 'draw' {
    if (this.homeScore > this.awayScore) return 'home';
    if (this.homeScore < this.awayScore) return 'away';
    return 'draw';
  }

  /**
   * Obtiene el ganador predicho final (incluye ET y penaltis)
   * @returns 'home' | 'away' | 'draw'
   */
  getFinalWinner(): 'home' | 'away' | 'draw' {
    // Si hay ganador de penaltis, es el ganador final
    if (this.penaltiesWinner) {
      return this.penaltiesWinner;
    }

    // Si hay prórroga, verificar ganador en prórroga
    if (this.hasExtraTime()) {
      if (this.homeScoreET! > this.awayScoreET!) return 'home';
      if (this.homeScoreET! < this.awayScoreET!) return 'away';
      return 'draw'; // Empate después de prórroga (debería ir a penaltis)
    }

    // Si no hay prórroga, retornar ganador en 90'
    return this.getWinner90();
  }

  /**
   * Obtiene el marcador total (90' + prórroga)
   */
  getTotalScore(): { home: number; away: number } {
    if (this.hasExtraTime()) {
      return {
        home: this.homeScore + this.homeScoreET!,
        away: this.awayScore + this.awayScoreET!,
      };
    }

    return {
      home: this.homeScore,
      away: this.awayScore,
    };
  }

  /**
   * Obtiene representación en string del marcador
   */
  getScoreDisplay(): string {
    let display = `${this.homeScore}-${this.awayScore}`;

    if (this.hasExtraTime()) {
      const total = this.getTotalScore();
      display += ` (${total.home}-${total.away} ET)`;
    }

    if (this.hasPenalties()) {
      display += ` [${this.penaltiesWinner === 'home' ? 'Home' : 'Away'} on pens]`;
    }

    return display;
  }

  /**
   * Verifica si ya se calcularon los puntos
   */
  hasPointsCalculated(): boolean {
    return (
      this.pointsEarned > 0 || Object.keys(this.pointsBreakdown).length > 0
    );
  }

  /**
   * Convierte la entidad a objeto plano
   */
  toObject(): {
    id: string;
    predictionId: string;
    matchId: string;
    homeScore: number;
    awayScore: number;
    homeScoreET: number | null;
    awayScoreET: number | null;
    penaltiesWinner: PenaltiesWinner | null;
    pointsEarned: number;
    pointsBreakdown: PointsBreakdown;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      predictionId: this.predictionId,
      matchId: this.matchId,
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      homeScoreET: this.homeScoreET,
      awayScoreET: this.awayScoreET,
      penaltiesWinner: this.penaltiesWinner,
      pointsEarned: this.pointsEarned,
      pointsBreakdown: this.pointsBreakdown,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toString(): string {
    return `MatchPrediction #${this.id.substring(0, 8)}: ${this.getScoreDisplay()} - ${this.pointsEarned} points`;
  }
}
