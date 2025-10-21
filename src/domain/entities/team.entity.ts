/**
 * Interfaz para los datos de equipo desde la base de datos
 */
export interface TeamDatabaseRow {
  id: string;
  name: string;
  fifa_code: string;
  confederation: string;
  is_host: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Team Entity (Domain Layer)
 *
 * Entidad de dominio pura que representa un equipo nacional en el sistema.
 * Esta clase NO tiene dependencias de frameworks externos (NestJS, pg, etc.).
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Puede contener métodos de negocio si fuera necesario
 */
export class Team {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly fifaCode: string,
    public readonly confederation: string,
    public readonly isHost: boolean,
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
      throw new Error('Team ID is required');
    }

    if (!this.name || this.name.trim() === '') {
      throw new Error('Team name is required');
    }

    if (!this.fifaCode || this.fifaCode.trim() === '') {
      throw new Error('Team FIFA code is required');
    }

    if (this.fifaCode.length !== 3) {
      throw new Error('Team FIFA code must be exactly 3 characters');
    }

    if (!this.confederation || this.confederation.trim() === '') {
      throw new Error('Team confederation is required');
    }

    const validConfederations = [
      'AFC',
      'CAF',
      'CONCACAF',
      'CONMEBOL',
      'OFC',
      'UEFA',
      'TBD',
    ];
    if (!validConfederations.includes(this.confederation)) {
      throw new Error(
        `Team confederation must be one of: ${validConfederations.join(', ')}`,
      );
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   */
  static fromDatabase(data: TeamDatabaseRow): Team {
    return new Team(
      data.id,
      data.name,
      data.fifa_code,
      data.confederation,
      data.is_host,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Representación en string para debugging
   */
  toString(): string {
    return `Team(${this.fifaCode} - ${this.name}, ${this.confederation}${this.isHost ? ', Host' : ''})`;
  }
}
