import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type {
  IBestThirdPlacePredictionRepository,
  SaveBestThirdPlaceData,
  ResolveBestThirdTiebreakData,
} from '@domain/repositories/best-third-place-prediction.repository.interface';
import {
  BestThirdPlacePrediction,
  type BestThirdPlacePredictionDatabaseRow,
} from '@domain/entities/best-third-place-prediction.entity';

/**
 * BestThirdPlacePredictionRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IBestThirdPlacePredictionRepository usando PostgreSQL con pg.
 * Siguiendo SRP, este repositorio solo maneja la entidad BestThirdPlacePrediction.
 *
 * Responsabilidades:
 * - Guardar los 8 mejores terceros
 * - Consultar mejores terceros
 * - Resolver desempates manuales
 * - Actualizar puntos ganados
 */
@Injectable()
export class BestThirdPlacePredictionRepository
  implements IBestThirdPlacePredictionRepository
{
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Guarda los 8 mejores terceros (batch con DELETE + INSERT)
   */
  async saveMany(
    predictionId: string,
    bestThirds: SaveBestThirdPlaceData[],
  ): Promise<BestThirdPlacePrediction[]> {
    if (bestThirds.length === 0) {
      return [];
    }

    // Validar que sean exactamente 8 terceros (ranking 1-8)
    if (bestThirds.length !== 8) {
      throw new Error('Must provide exactly 8 best third places');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Eliminar best third places anteriores
      await client.query(
        `DELETE FROM best_third_places_predictions WHERE prediction_id = $1`,
        [predictionId],
      );

      // Insertar nuevos best third places
      const savedBestThirds: BestThirdPlacePrediction[] = [];

      for (const bestThird of bestThirds) {
        const query = `
          INSERT INTO best_third_places_predictions (
            prediction_id,
            team_id,
            ranking_position,
            points,
            goal_difference,
            goals_for,
            from_group_id,
            has_tiebreak_conflict,
            tiebreak_group,
            manual_tiebreak_order
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING
            id,
            prediction_id,
            team_id,
            ranking_position,
            points,
            goal_difference,
            goals_for,
            from_group_id,
            has_tiebreak_conflict,
            tiebreak_group,
            manual_tiebreak_order,
            points_earned,
            created_at,
            updated_at
        `;

        const result: QueryResult<BestThirdPlacePredictionDatabaseRow> =
          await client.query(query, [
            predictionId,
            bestThird.teamId,
            bestThird.rankingPosition,
            bestThird.points,
            bestThird.goalDifference,
            bestThird.goalsFor,
            bestThird.fromGroupId,
            bestThird.hasTiebreakConflict ?? false,
            bestThird.tiebreakGroup ?? null,
            bestThird.manualTiebreakOrder ?? null,
          ]);

        savedBestThirds.push(
          BestThirdPlacePrediction.fromDatabase(result.rows[0]),
        );
      }

      await client.query('COMMIT');

      return savedBestThirds;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving best third places (batch):', error);
      throw new Error('Failed to save best third places in database');
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene los mejores terceros predichos (8 terceros)
   */
  async findByPrediction(
    predictionId: string,
  ): Promise<BestThirdPlacePrediction[]> {
    const query = `
      SELECT
        id,
        prediction_id,
        team_id,
        ranking_position,
        points,
        goal_difference,
        goals_for,
        from_group_id,
        has_tiebreak_conflict,
        tiebreak_group,
        manual_tiebreak_order,
        points_earned,
        created_at,
        updated_at
      FROM best_third_places_predictions
      WHERE prediction_id = $1
      ORDER BY ranking_position ASC
    `;

    try {
      const result: QueryResult<BestThirdPlacePredictionDatabaseRow> =
        await this.pool.query(query, [predictionId]);

      return result.rows.map((row) =>
        BestThirdPlacePrediction.fromDatabase(row),
      );
    } catch (error) {
      console.error(
        `Error fetching best third places for prediction ${predictionId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch best third places by prediction from database',
      );
    }
  }

  /**
   * Actualiza orden manual para resolver desempate entre terceros
   */
  async updateTiebreakOrder(
    predictionId: string,
    tiebreaks: ResolveBestThirdTiebreakData[],
  ): Promise<void> {
    if (tiebreaks.length === 0) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const tiebreak of tiebreaks) {
        const query = `
          UPDATE best_third_places_predictions
          SET manual_tiebreak_order = $1
          WHERE id = $2 AND prediction_id = $3
        `;

        await client.query(query, [
          tiebreak.manualTiebreakOrder,
          tiebreak.bestThirdId,
          predictionId,
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating best third places tiebreak order:', error);
      throw new Error(
        'Failed to update best third places tiebreak order in database',
      );
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza puntos ganados por acertar tercer lugar clasificado
   */
  async updatePoints(id: string, pointsEarned: number): Promise<void> {
    const query = `
      UPDATE best_third_places_predictions
      SET points_earned = $1
      WHERE id = $2
    `;

    try {
      const result = await this.pool.query(query, [pointsEarned, id]);

      if (result.rowCount === 0) {
        throw new Error(`Best third place prediction with id ${id} not found`);
      }
    } catch (error) {
      console.error(`Error updating points for best third place ${id}:`, error);
      throw new Error('Failed to update best third place points in database');
    }
  }

  /**
   * Elimina best third places de una predicción
   */
  async deleteByPrediction(predictionId: string): Promise<void> {
    const query = `
      DELETE FROM best_third_places_predictions
      WHERE prediction_id = $1
    `;

    try {
      await this.pool.query(query, [predictionId]);
    } catch (error) {
      console.error(
        `Error deleting best third places for prediction ${predictionId}:`,
        error,
      );
      throw new Error(
        'Failed to delete best third places by prediction from database',
      );
    }
  }
}
