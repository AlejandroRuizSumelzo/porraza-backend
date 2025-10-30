import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type { IStadiumRepository } from '@domain/repositories/stadium.repository.interface';
import {
  Stadium,
  type StadiumDatabaseRow,
} from '@domain/entities/stadium.entity';

/**
 * StadiumRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IStadiumRepository usando PostgreSQL con pg.
 * Esta clase pertenece a la capa de infraestructura y ejecuta SQL queries nativas.
 *
 * Patrón de Inyección de Dependencias:
 * 1. Implementa la interface IStadiumRepository (del dominio)
 * 2. Inyecta el Pool de pg usando el token 'DATABASE_POOL'
 * 3. Se registra como provider en StadiumModule
 *
 * Responsabilidades:
 * - Ejecutar SQL queries con pg
 * - Mapear resultados de BD a entidades de dominio (Stadium)
 * - Manejar errores de base de datos
 */
@Injectable()
export class StadiumRepository implements IStadiumRepository {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Obtiene todos los estadios ordenados por nombre
   */
  async findAll(): Promise<Stadium[]> {
    const query = `
      SELECT
        id,
        code,
        name,
        city,
        country,
        timezone,
        capacity,
        created_at,
        updated_at
      FROM stadiums
      ORDER BY name ASC
    `;

    try {
      const result: QueryResult<StadiumDatabaseRow> =
        await this.pool.query(query);

      return result.rows.map((row) => Stadium.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching all stadiums:', error);
      throw new Error('Failed to fetch stadiums from database');
    }
  }

  /**
   * Busca un estadio por su ID
   */
  async findById(id: string): Promise<Stadium | null> {
    const query = `
      SELECT
        id,
        code,
        name,
        city,
        country,
        timezone,
        capacity,
        created_at,
        updated_at
      FROM stadiums
      WHERE id = $1
    `;

    try {
      const result: QueryResult<StadiumDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Stadium.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching stadium with id ${id}:`, error);
      throw new Error('Failed to fetch stadium by ID from database');
    }
  }

  /**
   * Busca múltiples estadios por sus IDs
   * Query batch optimizada con ANY($1)
   */
  async findByIds(ids: string[]): Promise<Stadium[]> {
    if (ids.length === 0) {
      return [];
    }

    const query = `
      SELECT
        id,
        code,
        name,
        city,
        country,
        timezone,
        capacity,
        created_at,
        updated_at
      FROM stadiums
      WHERE id = ANY($1)
      ORDER BY name ASC
    `;

    try {
      const result: QueryResult<StadiumDatabaseRow> = await this.pool.query(
        query,
        [ids],
      );

      return result.rows.map((row) => Stadium.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching stadiums by ids:', error);
      throw new Error('Failed to fetch stadiums by IDs from database');
    }
  }

  /**
   * Busca un estadio por su código
   */
  async findByCode(code: string): Promise<Stadium | null> {
    const query = `
      SELECT
        id,
        code,
        name,
        city,
        country,
        timezone,
        capacity,
        created_at,
        updated_at
      FROM stadiums
      WHERE code = $1
    `;

    try {
      const result: QueryResult<StadiumDatabaseRow> = await this.pool.query(
        query,
        [code],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Stadium.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching stadium with code ${code}:`, error);
      throw new Error('Failed to fetch stadium by code from database');
    }
  }
}
