import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type {
  IPredictionRepository,
  CreatePredictionData,
  UpdateAwardsData,
  UpdateChampionData,
} from '@domain/repositories/prediction.repository.interface';
import {
  Prediction,
  type PredictionDatabaseRow,
} from '@domain/entities/prediction.entity';

/**
 * PredictionRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IPredictionRepository usando PostgreSQL con pg.
 * Siguiendo SRP, este repositorio solo maneja la entidad Prediction (principal).
 *
 * Responsabilidades:
 * - CRUD de predicciones principales
 * - Actualizar premios individuales y campeón
 * - Marcar fases completadas
 * - Bloquear predicciones (deadline)
 * - Rankings de ligas
 */
@Injectable()
export class PredictionRepository implements IPredictionRepository {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Busca una predicción por ID
   */
  async findById(id: string): Promise<Prediction | null> {
    const query = `
      SELECT
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
      FROM predictions
      WHERE id = $1
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching prediction with id ${id}:`, error);
      throw new Error('Failed to fetch prediction by ID from database');
    }
  }

  /**
   * Busca la predicción de un usuario en una liga específica
   */
  async findByUserAndLeague(
    userId: string,
    leagueId: string,
  ): Promise<Prediction | null> {
    const query = `
      SELECT
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
      FROM predictions
      WHERE user_id = $1 AND league_id = $2
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [userId, leagueId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(
        `Error fetching prediction for user ${userId} in league ${leagueId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch prediction by user and league from database',
      );
    }
  }

  /**
   * Obtiene todas las predicciones de un usuario
   */
  async findByUser(userId: string): Promise<Prediction[]> {
    const query = `
      SELECT
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
      FROM predictions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [userId],
      );

      return result.rows.map((row) => Prediction.fromDatabase(row));
    } catch (error) {
      console.error(`Error fetching predictions for user ${userId}:`, error);
      throw new Error('Failed to fetch predictions by user from database');
    }
  }

  /**
   * Obtiene todas las predicciones de una liga
   */
  async findByLeague(leagueId: string): Promise<Prediction[]> {
    const query = `
      SELECT
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
      FROM predictions
      WHERE league_id = $1
      ORDER BY total_points DESC, created_at ASC
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [leagueId],
      );

      return result.rows.map((row) => Prediction.fromDatabase(row));
    } catch (error) {
      console.error(
        `Error fetching predictions for league ${leagueId}:`,
        error,
      );
      throw new Error('Failed to fetch predictions by league from database');
    }
  }

  /**
   * Crea una nueva predicción
   */
  async create(data: CreatePredictionData): Promise<Prediction> {
    const query = `
      INSERT INTO predictions (user_id, league_id)
      VALUES ($1, $2)
      RETURNING
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [data.userId, data.leagueId],
      );

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error: any) {
      // Unique constraint violation (usuario ya tiene predicción en esta liga)
      if (error.code === '23505') {
        throw new Error('Prediction already exists for this user and league');
      }

      console.error('Error creating prediction:', error);
      throw new Error('Failed to create prediction in database');
    }
  }

  /**
   * Actualiza premios individuales
   */
  async updateAwards(id: string, data: UpdateAwardsData): Promise<Prediction> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.goldenBootPlayerId !== undefined) {
      updates.push(`golden_boot_player_id = $${paramIndex++}`);
      params.push(data.goldenBootPlayerId);
    }

    if (data.goldenBallPlayerId !== undefined) {
      updates.push(`golden_ball_player_id = $${paramIndex++}`);
      params.push(data.goldenBallPlayerId);
    }

    if (data.goldenGlovePlayerId !== undefined) {
      updates.push(`golden_glove_player_id = $${paramIndex++}`);
      params.push(data.goldenGlovePlayerId);
    }

    // Marcar awards como completados si se seleccionaron los 3 premios
    const hasAllAwards =
      data.goldenBootPlayerId &&
      data.goldenBallPlayerId &&
      data.goldenGlovePlayerId;

    if (hasAllAwards) {
      updates.push(`awards_completed = TRUE`);
    }

    params.push(id);

    const query = `
      UPDATE predictions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        params,
      );

      if (result.rows.length === 0) {
        throw new Error(`Prediction with id ${id} not found`);
      }

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error updating awards for prediction ${id}:`, error);
      throw new Error('Failed to update prediction awards in database');
    }
  }

  /**
   * Actualiza el campeón
   */
  async updateChampion(
    id: string,
    data: UpdateChampionData,
  ): Promise<Prediction> {
    const query = `
      UPDATE predictions
      SET champion_team_id = $1
      WHERE id = $2
      RETURNING
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [data.championTeamId, id],
      );

      if (result.rows.length === 0) {
        throw new Error(`Prediction with id ${id} not found`);
      }

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error updating champion for prediction ${id}:`, error);
      throw new Error('Failed to update prediction champion in database');
    }
  }

  /**
   * Marca fase de grupos como completada
   */
  async markGroupsCompleted(id: string): Promise<Prediction> {
    return this.updateBooleanField(id, 'groups_completed', true);
  }

  /**
   * Marca fase de eliminatorias como completada
   */
  async markKnockoutsCompleted(id: string): Promise<Prediction> {
    return this.updateBooleanField(id, 'knockouts_completed', true);
  }

  /**
   * Marca premios como completados
   */
  async markAwardsCompleted(id: string): Promise<Prediction> {
    return this.updateBooleanField(id, 'awards_completed', true);
  }

  /**
   * Bloquea una predicción (deadline pasado)
   */
  async lock(id: string): Promise<Prediction> {
    const query = `
      UPDATE predictions
      SET is_locked = TRUE, locked_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        throw new Error(`Prediction with id ${id} not found`);
      }

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error locking prediction ${id}:`, error);
      throw new Error('Failed to lock prediction in database');
    }
  }

  /**
   * Actualiza el total de puntos acumulados
   */
  async updateTotalPoints(id: string, points: number): Promise<Prediction> {
    const query = `
      UPDATE predictions
      SET total_points = $1, last_points_calculation = NOW()
      WHERE id = $2
      RETURNING
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [points, id],
      );

      if (result.rows.length === 0) {
        throw new Error(`Prediction with id ${id} not found`);
      }

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error updating total points for prediction ${id}:`, error);
      throw new Error('Failed to update prediction total points in database');
    }
  }

  /**
   * Verifica si existe una predicción para un usuario en una liga
   */
  async exists(userId: string, leagueId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM predictions
        WHERE user_id = $1 AND league_id = $2
      ) as exists
    `;

    try {
      const result = await this.pool.query(query, [userId, leagueId]);
      return result.rows[0].exists;
    } catch (error) {
      console.error(
        `Error checking prediction existence for user ${userId} in league ${leagueId}:`,
        error,
      );
      throw new Error('Failed to check prediction existence in database');
    }
  }

  /**
   * Obtiene el ranking de una liga ordenado por puntos
   */
  async getLeagueRanking(leagueId: string): Promise<
    Array<{
      prediction: Prediction;
      user: {
        id: string;
        name: string;
        email: string;
      };
      position: number;
    }>
  > {
    const query = `
      SELECT
        p.id,
        p.user_id,
        p.league_id,
        p.golden_boot_player_id,
        p.golden_ball_player_id,
        p.golden_glove_player_id,
        p.champion_team_id,
        p.groups_completed,
        p.knockouts_completed,
        p.awards_completed,
        p.is_locked,
        p.locked_at,
        p.total_points,
        p.last_points_calculation,
        p.created_at,
        p.updated_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        ROW_NUMBER() OVER (ORDER BY p.total_points DESC, p.created_at ASC) as position
      FROM predictions p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.league_id = $1
      ORDER BY p.total_points DESC, p.created_at ASC
    `;

    try {
      const result = await this.pool.query(query, [leagueId]);

      return result.rows.map((row) => ({
        prediction: Prediction.fromDatabase({
          id: row.id,
          user_id: row.user_id,
          league_id: row.league_id,
          golden_boot_player_id: row.golden_boot_player_id,
          golden_ball_player_id: row.golden_ball_player_id,
          golden_glove_player_id: row.golden_glove_player_id,
          champion_team_id: row.champion_team_id,
          groups_completed: row.groups_completed,
          knockouts_completed: row.knockouts_completed,
          awards_completed: row.awards_completed,
          is_locked: row.is_locked,
          locked_at: row.locked_at,
          total_points: row.total_points,
          last_points_calculation: row.last_points_calculation,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }),
        user: {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email,
        },
        position: parseInt(row.position, 10),
      }));
    } catch (error) {
      console.error(`Error fetching league ranking for ${leagueId}:`, error);
      throw new Error('Failed to fetch league ranking from database');
    }
  }

  /**
   * Obtiene estadísticas globales de una predicción
   */
  async getPredictionStats(predictionId: string): Promise<{
    totalMatches: number;
    predictedMatches: number;
    groupsCompleted: number;
    totalGroups: number;
    hasChampion: boolean;
    hasAllAwards: boolean;
    completionPercentage: number;
  }> {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM matches) as total_matches,
        (SELECT COUNT(*) FROM match_predictions WHERE prediction_id = $1) as predicted_matches,
        (SELECT COUNT(DISTINCT group_id) FROM group_standings_predictions WHERE prediction_id = $1) as groups_completed,
        (SELECT COUNT(*) FROM groups) as total_groups,
        p.champion_team_id IS NOT NULL as has_champion,
        (p.golden_boot_player_id IS NOT NULL AND p.golden_ball_player_id IS NOT NULL AND p.golden_glove_player_id IS NOT NULL) as has_all_awards
      FROM predictions p
      WHERE p.id = $1
    `;

    try {
      const result = await this.pool.query(query, [predictionId]);

      if (result.rows.length === 0) {
        throw new Error(`Prediction with id ${predictionId} not found`);
      }

      const row = result.rows[0];

      const totalMatches = parseInt(row.total_matches, 10);
      const predictedMatches = parseInt(row.predicted_matches, 10);
      const completionPercentage =
        totalMatches > 0
          ? Math.round((predictedMatches / totalMatches) * 100)
          : 0;

      return {
        totalMatches,
        predictedMatches,
        groupsCompleted: parseInt(row.groups_completed, 10),
        totalGroups: parseInt(row.total_groups, 10),
        hasChampion: row.has_champion,
        hasAllAwards: row.has_all_awards,
        completionPercentage,
      };
    } catch (error) {
      console.error(
        `Error fetching stats for prediction ${predictionId}:`,
        error,
      );
      throw new Error('Failed to fetch prediction stats from database');
    }
  }

  /**
   * Helper method para actualizar campos booleanos
   */
  private async updateBooleanField(
    id: string,
    field: string,
    value: boolean,
  ): Promise<Prediction> {
    const query = `
      UPDATE predictions
      SET ${field} = $1
      WHERE id = $2
      RETURNING
        id,
        user_id,
        league_id,
        golden_boot_player_id,
        golden_ball_player_id,
        golden_glove_player_id,
        champion_team_id,
        groups_completed,
        knockouts_completed,
        awards_completed,
        is_locked,
        locked_at,
        total_points,
        last_points_calculation,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult<PredictionDatabaseRow> = await this.pool.query(
        query,
        [value, id],
      );

      if (result.rows.length === 0) {
        throw new Error(`Prediction with id ${id} not found`);
      }

      return Prediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error updating ${field} for prediction ${id}:`, error);
      throw new Error(`Failed to update prediction ${field} in database`);
    }
  }
}
