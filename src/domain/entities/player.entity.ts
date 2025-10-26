/**
 * Interfaz para los datos de jugador desde la base de datos
 */
export interface PlayerDatabaseRow {
  id: string;
  name: string;
  team_id: string;
  position: string;
  jersey_number: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Player Position Type
 */
export type PlayerPosition =
  | 'goalkeeper'
  | 'defender'
  | 'midfielder'
  | 'forward';

/**
 * Player Entity (Domain Layer)
 *
 * Entidad de dominio pura que representa un jugador de una selección.
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM o NestJS
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Inmutable (readonly properties)
 *
 * Notas:
 * - Cada equipo tiene 23 jugadores convocados
 * - position determina si puede ser Golden Boot, Golden Glove, etc.
 * - jersey_number debe ser único por equipo (1-99)
 */
export class Player {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly teamId: string,
    public readonly position: PlayerPosition,
    public readonly jerseyNumber: number,
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
      throw new Error('Player ID is required');
    }

    if (!this.name || this.name.trim() === '') {
      throw new Error('Player name is required');
    }

    if (this.name.length > 150) {
      throw new Error('Player name must not exceed 150 characters');
    }

    if (!this.teamId || this.teamId.trim() === '') {
      throw new Error('Player teamId is required');
    }

    const validPositions: PlayerPosition[] = [
      'goalkeeper',
      'defender',
      'midfielder',
      'forward',
    ];
    if (!validPositions.includes(this.position)) {
      throw new Error(
        `Invalid position. Must be one of: ${validPositions.join(', ')}`,
      );
    }

    if (this.jerseyNumber < 1 || this.jerseyNumber > 99) {
      throw new Error('Jersey number must be between 1 and 99');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   */
  static fromDatabase(data: PlayerDatabaseRow): Player {
    return new Player(
      data.id,
      data.name,
      data.team_id,
      data.position as PlayerPosition,
      data.jersey_number,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Verifica si el jugador es portero
   * Útil para validar elegibilidad de Golden Glove
   */
  isGoalkeeper(): boolean {
    return this.position === 'goalkeeper';
  }

  /**
   * Verifica si el jugador es delantero
   * Útil para candidatos a Golden Boot
   */
  isForward(): boolean {
    return this.position === 'forward';
  }

  /**
   * Verifica si el jugador puede ser candidato a Golden Glove
   * Solo porteros son elegibles
   */
  canBeGoldenGlove(): boolean {
    return this.isGoalkeeper();
  }

  /**
   * Obtiene nombre formateado para display
   */
  getDisplayName(): string {
    return `#${this.jerseyNumber} ${this.name}`;
  }

  /**
   * Convierte la entidad a objeto plano
   */
  toObject(): {
    id: string;
    name: string;
    teamId: string;
    position: PlayerPosition;
    jerseyNumber: number;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      teamId: this.teamId,
      position: this.position,
      jerseyNumber: this.jerseyNumber,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toString(): string {
    return `Player #${this.id.substring(0, 8)}: ${this.name} (#${this.jerseyNumber}) - ${this.position}`;
  }
}
