import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type {
  IGroupStandingPredictionRepository,
  SaveGroupStandingData,
  ResolveTiebreakData,
} from '@domain/repositories/group-standing-prediction.repository.interface';
import {
  GroupStandingPrediction,
  type GroupStandingPredictionDatabaseRow,
} from '@domain/entities/group-standing-prediction.entity';

/**
 * GroupStandingPredictionRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IGroupStandingPredictionRepository usando PostgreSQL con pg.
 * Siguiendo SRP, este repositorio solo maneja la entidad GroupStandingPrediction.
 *
 * Responsabilidades:
 * - Guardar tablas de posiciones de grupos
 * - Consultar tablas de posiciones
 * - Resolver desempates manuales
 * - Actualizar puntos ganados
 */
@Injectable()
export class GroupStandingPredictionRepository
  implements IGroupStandingPredictionRepository
{
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Guarda tabla de posiciones de un grupo (batch con DELETE + INSERT)
   */
  async saveMany(
    predictionId: string,
    standings: SaveGroupStandingData[],
  ): Promise<GroupStandingPrediction[]> {
    if (standings.length === 0) {
      return [];
    }

    // Validar que todos los standings sean del mismo grupo
    const groupIds = [...new Set(standings.map((s) => s.groupId))];
    if (groupIds.length !== 1) {
      throw new Error('All standings must belong to the same group');
    }

    const groupId = groupIds[0];
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Eliminar standings anteriores del grupo
      await client.query(
        `DELETE FROM group_standings_predictions
         WHERE prediction_id = $1 AND group_id = $2`,
        [predictionId, groupId],
      );

      // Insertar nuevos standings
      const savedStandings: GroupStandingPrediction[] = [];

      for (const standing of standings) {
        const query = `
          INSERT INTO group_standings_predictions (
            prediction_id,
            group_id,
            team_id,
            position,
            points,
            played,
            wins,
            draws,
            losses,
            goals_for,
            goals_against,
            goal_difference,
            has_tiebreak_conflict,
            tiebreak_group,
            manual_tiebreak_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING
            id,
            prediction_id,
            group_id,
            team_id,
            position,
            points,
            played,
            wins,
            draws,
            losses,
            goals_for,
            goals_against,
            goal_difference,
            has_tiebreak_conflict,
            tiebreak_group,
            manual_tiebreak_order,
            points_earned,
            created_at,
            updated_at
        `;

        const result: QueryResult<GroupStandingPredictionDatabaseRow> =
          await client.query(query, [
            predictionId,
            standing.groupId,
            standing.teamId,
            standing.position,
            standing.points,
            standing.played,
            standing.wins,
            standing.draws,
            standing.losses,
            standing.goalsFor,
            standing.goalsAgainst,
            standing.goalDifference,
            standing.hasTiebreakConflict ?? false,
            standing.tiebreakGroup ?? null,
            standing.manualTiebreakOrder ?? null,
          ]);

        savedStandings.push(
          GroupStandingPrediction.fromDatabase(result.rows[0]),
        );
      }

      await client.query('COMMIT');

      return savedStandings;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving group standings (batch):', error);
      throw new Error('Failed to save group standings in database');
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene tabla de posiciones de un grupo predicha
   */
  async findByPredictionAndGroup(
    predictionId: string,
    groupId: string,
  ): Promise<GroupStandingPrediction[]> {
    const query = `
      SELECT
        id,
        prediction_id,
        group_id,
        team_id,
        position,
        points,
        played,
        wins,
        draws,
        losses,
        goals_for,
        goals_against,
        goal_difference,
        has_tiebreak_conflict,
        tiebreak_group,
        manual_tiebreak_order,
        points_earned,
        created_at,
        updated_at
      FROM group_standings_predictions
      WHERE prediction_id = $1 AND group_id = $2
      ORDER BY position ASC
    `;

    try {
      const result: QueryResult<GroupStandingPredictionDatabaseRow> =
        await this.pool.query(query, [predictionId, groupId]);

      return result.rows.map((row) =>
        GroupStandingPrediction.fromDatabase(row),
      );
    } catch (error) {
      console.error(
        `Error fetching group standings for prediction ${predictionId} and group ${groupId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch group standings by prediction and group from database',
      );
    }
  }

  /**
   * Obtiene todas las tablas de posiciones de grupos
   */
  async findByPrediction(
    predictionId: string,
  ): Promise<GroupStandingPrediction[]> {
    const query = `
      SELECT
        id,
        prediction_id,
        group_id,
        team_id,
        position,
        points,
        played,
        wins,
        draws,
        losses,
        goals_for,
        goals_against,
        goal_difference,
        has_tiebreak_conflict,
        tiebreak_group,
        manual_tiebreak_order,
        points_earned,
        created_at,
        updated_at
      FROM group_standings_predictions
      WHERE prediction_id = $1
      ORDER BY group_id, position ASC
    `;

    try {
      const result: QueryResult<GroupStandingPredictionDatabaseRow> =
        await this.pool.query(query, [predictionId]);

      return result.rows.map((row) =>
        GroupStandingPrediction.fromDatabase(row),
      );
    } catch (error) {
      console.error(
        `Error fetching all group standings for prediction ${predictionId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch all group standings by prediction from database',
      );
    }
  }

  /**
   * Obtiene todos los terceros lugares de una predicción (12 terceros)
   */
  async findThirdPlacesByPrediction(
    predictionId: string,
  ): Promise<GroupStandingPrediction[]> {
    const query = `
      SELECT
        id,
        prediction_id,
        group_id,
        team_id,
        position,
        points,
        played,
        wins,
        draws,
        losses,
        goals_for,
        goals_against,
        goal_difference,
        has_tiebreak_conflict,
        tiebreak_group,
        manual_tiebreak_order,
        points_earned,
        created_at,
        updated_at
      FROM group_standings_predictions
      WHERE prediction_id = $1 AND position = 3
      ORDER BY points DESC, goal_difference DESC, goals_for DESC
    `;

    try {
      const result: QueryResult<GroupStandingPredictionDatabaseRow> =
        await this.pool.query(query, [predictionId]);

      return result.rows.map((row) =>
        GroupStandingPrediction.fromDatabase(row),
      );
    } catch (error) {
      console.error(
        `Error fetching third places for prediction ${predictionId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch third places by prediction from database',
      );
    }
  }

  /**
   * Actualiza orden manual para resolver desempate
   */
  async updateTiebreakOrder(
    predictionId: string,
    groupId: string,
    tiebreaks: ResolveTiebreakData[],
  ): Promise<void> {
    if (tiebreaks.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const tiebreak of tiebreaks) {
        const query = `
          UPDATE group_standings_predictions
          SET manual_tiebreak_order = $1
          WHERE id = $2 AND prediction_id = $3 AND group_id = $4
        `;

        await client.query(query, [
          tiebreak.manualTiebreakOrder,
          tiebreak.standingId,
          predictionId,
          groupId,
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating tiebreak order:', error);
      throw new Error('Failed to update tiebreak order in database');
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza puntos ganados en una posición de grupo
   */
  async updatePoints(id: string, pointsEarned: number): Promise<void> {
    const query = `
      UPDATE group_standings_predictions
      SET points_earned = $1
      WHERE id = $2
    `;

    try {
      const result = await this.pool.query(query, [pointsEarned, id]);

      if (result.rowCount === 0) {
        throw new Error(`Group standing prediction with id ${id} not found`);
      }
    } catch (error) {
      console.error(`Error updating points for group standing ${id}:`, error);
      throw new Error('Failed to update group standing points in database');
    }
  }

  /**
   * Elimina standings de una predicción
   */
  async deleteByPrediction(predictionId: string): Promise<void> {
    const query = `
      DELETE FROM group_standings_predictions
      WHERE prediction_id = $1
    `;

    try {
      await this.pool.query(query, [predictionId]);
    } catch (error) {
      console.error(
        `Error deleting group standings for prediction ${predictionId}:`,
        error,
      );
      throw new Error(
        'Failed to delete group standings by prediction from database',
      );
    }
  }
}
