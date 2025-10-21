import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type { IMatchRepository } from '@domain/repositories/match.repository.interface';
import { Match, type MatchDatabaseRow } from '@domain/entities/match.entity';

/**
 * MatchRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IMatchRepository usando PostgreSQL con pg.
 * Esta clase pertenece a la capa de infraestructura y ejecuta SQL queries nativas.
 *
 * Patrón de Inyección de Dependencias:
 * 1. Implementa la interface IMatchRepository (del dominio)
 * 2. Inyecta el Pool de pg usando el token 'DATABASE_POOL'
 * 3. Se registra como provider en MatchModule
 *
 * Responsabilidades:
 * - Ejecutar SQL queries con pg
 * - Mapear resultados de BD a entidades de dominio (Match)
 * - Manejar errores de base de datos
 */
@Injectable()
export class MatchRepository implements IMatchRepository {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Obtiene todos los partidos ordenados por número de partido
   */
  async findAll(): Promise<Match[]> {
    const query = `
      SELECT
        id,
        match_number,
        home_team_id,
        away_team_id,
        home_team_placeholder,
        away_team_placeholder,
        stadium_id,
        group_id,
        phase,
        match_date,
        match_time,
        home_score,
        away_score,
        home_score_et,
        away_score_et,
        home_penalties,
        away_penalties,
        status,
        predictions_locked_at,
        depends_on_match_ids,
        created_at,
        updated_at
      FROM matches
      ORDER BY match_number ASC
    `;

    try {
      const result: QueryResult<MatchDatabaseRow> =
        await this.pool.query(query);

      return result.rows.map((row) => Match.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching all matches:', error);
      throw new Error('Failed to fetch matches from database');
    }
  }

  /**
   * Busca un partido por su ID
   */
  async findById(id: string): Promise<Match | null> {
    const query = `
      SELECT
        id,
        match_number,
        home_team_id,
        away_team_id,
        home_team_placeholder,
        away_team_placeholder,
        stadium_id,
        group_id,
        phase,
        match_date,
        match_time,
        home_score,
        away_score,
        home_score_et,
        away_score_et,
        home_penalties,
        away_penalties,
        status,
        predictions_locked_at,
        depends_on_match_ids,
        created_at,
        updated_at
      FROM matches
      WHERE id = $1
    `;

    try {
      const result: QueryResult<MatchDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Match.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching match with id ${id}:`, error);
      throw new Error('Failed to fetch match by ID from database');
    }
  }
}
