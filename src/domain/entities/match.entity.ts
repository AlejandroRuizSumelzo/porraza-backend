/**
 * Match Phase Enum
 * Representa las diferentes fases del torneo
 */
export enum MatchPhase {
  GROUP_STAGE = 'GROUP_STAGE',
  ROUND_OF_32 = 'ROUND_OF_32',
  ROUND_OF_16 = 'ROUND_OF_16',
  QUARTER_FINAL = 'QUARTER_FINAL',
  SEMI_FINAL = 'SEMI_FINAL',
  THIRD_PLACE = 'THIRD_PLACE',
  FINAL = 'FINAL',
}

/**
 * Match Status Enum
 * Representa el estado actual del partido
 */
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED',
}

/**
 * Interfaz para los datos de partido desde la base de datos
 */
export interface MatchDatabaseRow {
  id: string;
  match_number: number;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_placeholder: string | null;
  away_team_placeholder: string | null;
  stadium_id: string;
  group_id: string | null;
  phase: MatchPhase;
  match_date: Date;
  match_time: string;
  home_score: number | null;
  away_score: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: MatchStatus;
  predictions_locked_at: Date;
  depends_on_match_ids: number[] | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Match Entity (Domain Layer)
 *
 * Entidad de dominio pura que representa un partido en el sistema.
 * Esta clase NO tiene dependencias de frameworks externos (NestJS, pg, etc.).
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 *
 * Notas importantes:
 * - Los partidos de fase de grupos tienen home_team_id y away_team_id definidos
 * - Los partidos de eliminatorias pueden tener equipos TBD (por definir)
 * - Los placeholders describen qué equipos jugarán (ej: "Group A winners")
 * - depends_on_match_ids indica qué partidos determinan los equipos de este partido
 */
export class Match {
  constructor(
    public readonly id: string,
    public readonly matchNumber: number,
    public readonly homeTeamId: string | null,
    public readonly awayTeamId: string | null,
    public readonly homeTeamPlaceholder: string | null,
    public readonly awayTeamPlaceholder: string | null,
    public readonly stadiumId: string,
    public readonly groupId: string | null,
    public readonly phase: MatchPhase,
    public readonly matchDate: Date,
    public readonly matchTime: string,
    public readonly homeScore: number | null,
    public readonly awayScore: number | null,
    public readonly homeScoreEt: number | null,
    public readonly awayScoreEt: number | null,
    public readonly homePenalties: number | null,
    public readonly awayPenalties: number | null,
    public readonly status: MatchStatus,
    public readonly predictionsLockedAt: Date,
    public readonly dependsOnMatchIds: number[] | null,
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
      throw new Error('Match ID is required');
    }

    if (this.matchNumber < 1 || this.matchNumber > 104) {
      throw new Error('Match number must be between 1 and 104');
    }

    if (!this.stadiumId || this.stadiumId.trim() === '') {
      throw new Error('Match stadium ID is required');
    }

    // Validar que partidos de fase de grupos tengan group_id
    if (this.phase === MatchPhase.GROUP_STAGE && !this.groupId) {
      throw new Error('Group stage matches must have a group ID');
    }

    // Validar que partidos de eliminatorias NO tengan group_id
    if (this.phase !== MatchPhase.GROUP_STAGE && this.groupId) {
      throw new Error('Knockout stage matches must not have a group ID');
    }

    // Validar que los scores sean no negativos si están definidos
    if (this.homeScore !== null && this.homeScore < 0) {
      throw new Error('Home score cannot be negative');
    }

    if (this.awayScore !== null && this.awayScore < 0) {
      throw new Error('Away score cannot be negative');
    }

    if (this.homeScoreEt !== null && this.homeScoreEt < 0) {
      throw new Error('Home extra time score cannot be negative');
    }

    if (this.awayScoreEt !== null && this.awayScoreEt < 0) {
      throw new Error('Away extra time score cannot be negative');
    }

    if (this.homePenalties !== null && this.homePenalties < 0) {
      throw new Error('Home penalties cannot be negative');
    }

    if (this.awayPenalties !== null && this.awayPenalties < 0) {
      throw new Error('Away penalties cannot be negative');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   */
  static fromDatabase(data: MatchDatabaseRow): Match {
    return new Match(
      data.id,
      data.match_number,
      data.home_team_id,
      data.away_team_id,
      data.home_team_placeholder,
      data.away_team_placeholder,
      data.stadium_id,
      data.group_id,
      data.phase,
      new Date(data.match_date),
      data.match_time,
      data.home_score,
      data.away_score,
      data.home_score_et,
      data.away_score_et,
      data.home_penalties,
      data.away_penalties,
      data.status,
      new Date(data.predictions_locked_at),
      data.depends_on_match_ids,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Verifica si el partido es de fase de grupos
   */
  isGroupStage(): boolean {
    return this.phase === MatchPhase.GROUP_STAGE;
  }

  /**
   * Verifica si el partido tiene equipos TBD (por definir)
   */
  hasTbdTeams(): boolean {
    return (
      this.homeTeamPlaceholder !== null || this.awayTeamPlaceholder !== null
    );
  }

  /**
   * Verifica si el partido ha finalizado
   */
  isFinished(): boolean {
    return this.status === MatchStatus.FINISHED;
  }

  /**
   * Verifica si las predicciones están bloqueadas
   */
  arePredictionsLocked(): boolean {
    return new Date() >= this.predictionsLockedAt;
  }

  /**
   * Representación en string para debugging
   */
  toString(): string {
    const homeTeam = this.homeTeamPlaceholder || this.homeTeamId || 'TBD';
    const awayTeam = this.awayTeamPlaceholder || this.awayTeamId || 'TBD';
    return `Match #${this.matchNumber} (${this.phase}): ${homeTeam} vs ${awayTeam} - ${this.status}`;
  }
}
