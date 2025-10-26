import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type {
  IPlayerRepository,
  PlayerFilters,
} from '@domain/repositories/player.repository.interface';
import { Player, type PlayerDatabaseRow } from '@domain/entities/player.entity';

/**
 * PlayerRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IPlayerRepository usando PostgreSQL con pg.
 * Esta clase pertenece a la capa de infraestructura y ejecuta SQL queries nativas.
 *
 * Patrón de Inyección de Dependencias:
 * 1. Implementa la interface IPlayerRepository (del dominio)
 * 2. Inyecta el Pool de pg usando el token 'DATABASE_POOL'
 * 3. Se registra como provider en PredictionModule
 *
 * Responsabilidades:
 * - Ejecutar SQL queries con pg
 * - Mapear resultados de BD a entidades de dominio (Player)
 * - Filtrar jugadores por equipo, posición, nombre
 * - Consultas optimizadas para Golden Boot/Ball/Glove
 *
 * Notas:
 * - Los jugadores son datos maestros (seed), no se crean/editan por usuarios
 * - Solo operaciones de lectura (SELECT)
 * - 1,104 jugadores en total (48 equipos × 23 jugadores)
 */
@Injectable()
export class PlayerRepository implements IPlayerRepository {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Busca un jugador por su ID
   */
  async findById(id: string): Promise<Player | null> {
    const query = `
      SELECT
        id,
        name,
        team_id,
        position,
        jersey_number,
        created_at,
        updated_at
      FROM players
      WHERE id = $1
    `;

    try {
      const result: QueryResult<PlayerDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Player.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching player with id ${id}:`, error);
      throw new Error('Failed to fetch player by ID from database');
    }
  }

  /**
   * Obtiene todos los jugadores de un equipo (23 jugadores)
   */
  async findByTeam(teamId: string): Promise<Player[]> {
    const query = `
      SELECT
        id,
        name,
        team_id,
        position,
        jersey_number,
        created_at,
        updated_at
      FROM players
      WHERE team_id = $1
      ORDER BY position, jersey_number
    `;

    try {
      const result: QueryResult<PlayerDatabaseRow> = await this.pool.query(
        query,
        [teamId],
      );

      return result.rows.map((row) => Player.fromDatabase(row));
    } catch (error) {
      console.error(`Error fetching players for team ${teamId}:`, error);
      throw new Error('Failed to fetch players by team from database');
    }
  }

  /**
   * Obtiene jugadores filtrados por criterios
   */
  async findByFilters(filters: PlayerFilters): Promise<Player[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.teamId) {
      conditions.push(`team_id = $${paramIndex++}`);
      params.push(filters.teamId);
    }

    if (filters.position) {
      conditions.push(`position = $${paramIndex++}`);
      params.push(filters.position);
    }

    if (filters.name) {
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${filters.name}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
        id,
        name,
        team_id,
        position,
        jersey_number,
        created_at,
        updated_at
      FROM players
      ${whereClause}
      ORDER BY name
    `;

    try {
      const result: QueryResult<PlayerDatabaseRow> = await this.pool.query(
        query,
        params,
      );

      return result.rows.map((row) => Player.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching players by filters:', error);
      throw new Error('Failed to fetch players by filters from database');
    }
  }

  /**
   * Obtiene todos los porteros (para selección de Golden Glove)
   */
  async findAllGoalkeepers(): Promise<Player[]> {
    const query = `
      SELECT
        id,
        name,
        team_id,
        position,
        jersey_number,
        created_at,
        updated_at
      FROM players
      WHERE position = 'goalkeeper'
      ORDER BY name
    `;

    try {
      const result: QueryResult<PlayerDatabaseRow> =
        await this.pool.query(query);

      return result.rows.map((row) => Player.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching all goalkeepers:', error);
      throw new Error('Failed to fetch all goalkeepers from database');
    }
  }

  /**
   * Obtiene porteros de equipos específicos
   */
  async findGoalkeepersByTeams(teamIds: string[]): Promise<Player[]> {
    if (teamIds.length === 0) {
      return [];
    }

    const query = `
      SELECT
        id,
        name,
        team_id,
        position,
        jersey_number,
        created_at,
        updated_at
      FROM players
      WHERE position = 'goalkeeper'
        AND team_id = ANY($1::uuid[])
      ORDER BY name
    `;

    try {
      const result: QueryResult<PlayerDatabaseRow> = await this.pool.query(
        query,
        [teamIds],
      );

      return result.rows.map((row) => Player.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching goalkeepers by teams:', error);
      throw new Error('Failed to fetch goalkeepers by teams from database');
    }
  }

  /**
   * Obtiene todos los jugadores (1,104 jugadores)
   * PRECAUCIÓN: Usar con cuidado, considerar paginación en producción
   */
  async findAll(): Promise<Player[]> {
    const query = `
      SELECT
        id,
        name,
        team_id,
        position,
        jersey_number,
        created_at,
        updated_at
      FROM players
      ORDER BY name
    `;

    try {
      const result: QueryResult<PlayerDatabaseRow> =
        await this.pool.query(query);

      return result.rows.map((row) => Player.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching all players:', error);
      throw new Error('Failed to fetch all players from database');
    }
  }

  /**
   * Obtiene jugadores de múltiples equipos
   * Útil para obtener solo jugadores de equipos clasificados
   */
  async findByTeams(teamIds: string[]): Promise<Player[]> {
    if (teamIds.length === 0) {
      return [];
    }

    const query = `
      SELECT
        id,
        name,
        team_id,
        position,
        jersey_number,
        created_at,
        updated_at
      FROM players
      WHERE team_id = ANY($1::uuid[])
      ORDER BY team_id, position, jersey_number
    `;

    try {
      const result: QueryResult<PlayerDatabaseRow> = await this.pool.query(
        query,
        [teamIds],
      );

      return result.rows.map((row) => Player.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching players by teams:', error);
      throw new Error('Failed to fetch players by teams from database');
    }
  }

  /**
   * Verifica si un jugador existe
   */
  async exists(id: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM players WHERE id = $1) as exists
    `;

    try {
      const result = await this.pool.query(query, [id]);
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Error checking if player exists with id ${id}:`, error);
      throw new Error('Failed to check player existence in database');
    }
  }
}
