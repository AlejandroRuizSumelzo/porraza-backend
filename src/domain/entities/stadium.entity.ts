/**
 * Interfaz para los datos de estadio desde la base de datos
 */
export interface StadiumDatabaseRow {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  capacity: number | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Stadium Entity (Domain Layer)
 *
 * Entidad de dominio pura que representa un estadio en el sistema.
 * Esta clase NO tiene dependencias de frameworks externos (NestJS, pg, etc.).
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Puede contener métodos de negocio si fuera necesario
 */
export class Stadium {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly city: string,
    public readonly country: string,
    public readonly timezone: string,
    public readonly capacity: number | null,
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
      throw new Error('Stadium ID is required');
    }

    if (!this.code || this.code.trim() === '') {
      throw new Error('Stadium code is required');
    }

    if (!this.name || this.name.trim() === '') {
      throw new Error('Stadium name is required');
    }

    if (!this.city || this.city.trim() === '') {
      throw new Error('Stadium city is required');
    }

    if (!this.country || this.country.trim() === '') {
      throw new Error('Stadium country is required');
    }

    if (this.country.length !== 3) {
      throw new Error('Stadium country must be a 3-letter ISO code');
    }

    if (!this.timezone || this.timezone.trim() === '') {
      throw new Error('Stadium timezone is required');
    }

    if (this.capacity !== null && this.capacity < 0) {
      throw new Error('Stadium capacity cannot be negative');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   */
  static fromDatabase(data: StadiumDatabaseRow): Stadium {
    return new Stadium(
      data.id,
      data.code,
      data.name,
      data.city,
      data.country,
      data.timezone,
      data.capacity,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Representación en string para debugging
   */
  toString(): string {
    return `Stadium(${this.code} - ${this.name}, ${this.city}, ${this.country})`;
  }
}
