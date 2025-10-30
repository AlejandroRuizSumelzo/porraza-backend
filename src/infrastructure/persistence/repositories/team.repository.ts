import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type { ITeamRepository } from '@domain/repositories/team.repository.interface';
import { Team, type TeamDatabaseRow } from '@domain/entities/team.entity';

/**
 * TeamRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del ITeamRepository usando PostgreSQL con pg.
 * Esta clase pertenece a la capa de infraestructura y ejecuta SQL queries nativas.
 *
 * Patrón de Inyección de Dependencias:
 * 1. Implementa la interface ITeamRepository (del dominio)
 * 2. Inyecta el Pool de pg usando el token 'DATABASE_POOL'
 * 3. Se registra como provider en TeamModule
 *
 * Responsabilidades:
 * - Ejecutar SQL queries con pg
 * - Mapear resultados de BD a entidades de dominio (Team)
 * - Manejar errores de base de datos
 */
@Injectable()
export class TeamRepository implements ITeamRepository {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Obtiene todos los equipos ordenados por nombre
   */
  async findAll(): Promise<Team[]> {
    const query = `
      SELECT
        id,
        name,
        fifa_code,
        confederation,
        is_host,
        created_at,
        updated_at
      FROM teams
      ORDER BY name ASC
    `;

    try {
      const result: QueryResult<TeamDatabaseRow> = await this.pool.query(query);

      return result.rows.map((row) => Team.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching all teams:', error);
      throw new Error('Failed to fetch teams from database');
    }
  }

  /**
   * Busca un equipo por su ID
   */
  async findById(id: string): Promise<Team | null> {
    const query = `
      SELECT
        id,
        name,
        fifa_code,
        confederation,
        is_host,
        created_at,
        updated_at
      FROM teams
      WHERE id = $1
    `;

    try {
      const result: QueryResult<TeamDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Team.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching team with id ${id}:`, error);
      throw new Error('Failed to fetch team by ID from database');
    }
  }

  /**
   * Busca múltiples equipos por sus IDs
   * Query batch optimizada con ANY($1)
   */
  async findByIds(ids: string[]): Promise<Team[]> {
    if (ids.length === 0) {
      return [];
    }

    const query = `
      SELECT
        id,
        name,
        fifa_code,
        confederation,
        is_host,
        created_at,
        updated_at
      FROM teams
      WHERE id = ANY($1)
      ORDER BY name ASC
    `;

    try {
      const result: QueryResult<TeamDatabaseRow> = await this.pool.query(
        query,
        [ids],
      );

      return result.rows.map((row) => Team.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching teams by ids:', error);
      throw new Error('Failed to fetch teams by IDs from database');
    }
  }
}
