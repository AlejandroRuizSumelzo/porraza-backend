import type { Stadium } from '@domain/entities/stadium.entity';

/**
 * IStadiumRepository Interface (Domain Layer - Port)
 *
 * Este es un "puerto" en Clean Architecture que define el contrato
 * que debe cumplir cualquier implementación de repositorio de estadios.
 *
 * Principio de Inversión de Dependencias (Dependency Inversion Principle):
 * - El DOMINIO define la interface (este archivo)
 * - La INFRAESTRUCTURA implementa la interface (StadiumRepository con pg)
 * - Los USE CASES dependen de la ABSTRACCIÓN, no de la implementación
 *
 * Ventajas:
 * - Cambiar de pg a Prisma/TypeORM solo requiere crear nueva implementación
 * - Los use cases no se modifican al cambiar la tecnología de persistencia
 * - Facilita testing (mock de la interface)
 */
export interface IStadiumRepository {
  /**
   * Obtiene todos los estadios ordenados por nombre
   * @returns Promise con array de entidades Stadium
   */
  findAll(): Promise<Stadium[]>;

  /**
   * Busca un estadio por su ID
   * @param id - UUID del estadio
   * @returns Promise con Stadium o null si no existe
   */
  findById(id: string): Promise<Stadium | null>;

  /**
   * Busca múltiples estadios por sus IDs
   * @param ids - Array de UUIDs de estadios
   * @returns Promise con array de entidades Stadium
   */
  findByIds(ids: string[]): Promise<Stadium[]>;

  /**
   * Busca un estadio por su código
   * @param code - Código único del estadio
   * @returns Promise con Stadium o null si no existe
   */
  findByCode(code: string): Promise<Stadium | null>;
}
