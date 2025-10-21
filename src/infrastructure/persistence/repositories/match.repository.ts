import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type {
  IMatchRepository,
  MatchWithDetailsRow,
} from '@domain/repositories/match.repository.interface';
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

  /**
   * Obtiene todos los partidos con información completa de equipos y estadio
   * Esta query hace JOIN con las tablas teams, stadiums y groups para obtener
   * toda la información necesaria para el calendario en una sola consulta
   */
  async findCalendarWithDetails(): Promise<MatchWithDetailsRow[]> {
    const query = `
      SELECT
        m.id AS match_id,
        m.match_number,
        m.phase,
        m.group_id,
        g.name AS group_name,
        m.match_date,
        m.match_time,
        m.status,
        m.home_score,
        m.away_score,
        m.home_score_et,
        m.away_score_et,
        m.home_penalties,
        m.away_penalties,

        -- Home team
        ht.id AS home_team_id,
        ht.name AS home_team_name,
        ht.fifa_code AS home_team_fifa_code,
        ht.confederation AS home_team_confederation,
        ht.is_host AS home_team_is_host,
        m.home_team_placeholder,

        -- Away team
        at.id AS away_team_id,
        at.name AS away_team_name,
        at.fifa_code AS away_team_fifa_code,
        at.confederation AS away_team_confederation,
        at.is_host AS away_team_is_host,
        m.away_team_placeholder,

        -- Stadium
        s.id AS stadium_id,
        s.code AS stadium_code,
        s.name AS stadium_name,
        s.city AS stadium_city,
        s.country AS stadium_country,
        s.timezone AS stadium_timezone,
        s.capacity AS stadium_capacity

      FROM matches m
      INNER JOIN teams ht ON m.home_team_id = ht.id
      INNER JOIN teams at ON m.away_team_id = at.id
      INNER JOIN stadiums s ON m.stadium_id = s.id
      LEFT JOIN groups g ON m.group_id = g.id
      ORDER BY m.match_number ASC
    `;

    try {
      const result: QueryResult<MatchWithDetailsRow> =
        await this.pool.query(query);

      return result.rows;
    } catch (error) {
      console.error('Error fetching calendar with details:', error);
      throw new Error('Failed to fetch match calendar from database');
    }
  }
}
