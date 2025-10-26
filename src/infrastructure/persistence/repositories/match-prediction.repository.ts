import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type {
  IMatchPredictionRepository,
  SaveMatchPredictionData,
} from '@domain/repositories/match-prediction.repository.interface';
import {
  MatchPrediction,
  type MatchPredictionDatabaseRow,
} from '@domain/entities/match-prediction.entity';

/**
 * MatchPredictionRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IMatchPredictionRepository usando PostgreSQL con pg.
 * Siguiendo SRP, este repositorio solo maneja la entidad MatchPrediction.
 *
 * Responsabilidades:
 * - Guardar predicciones de partidos (individual o batch)
 * - Consultar predicciones de partidos
 * - Actualizar puntos ganados
 */
@Injectable()
export class MatchPredictionRepository implements IMatchPredictionRepository {
  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Guarda predicciones de partidos (batch con UPSERT)
   */
  async saveMany(
    predictionId: string,
    matchPredictions: SaveMatchPredictionData[],
  ): Promise<MatchPrediction[]> {
    if (matchPredictions.length === 0) {
      return [];
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const savedPredictions: MatchPrediction[] = [];

      for (const mp of matchPredictions) {
        const query = `
          INSERT INTO match_predictions (
            prediction_id,
            match_id,
            home_score,
            away_score,
            home_score_et,
            away_score_et,
            penalties_winner
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (prediction_id, match_id)
          DO UPDATE SET
            home_score = EXCLUDED.home_score,
            away_score = EXCLUDED.away_score,
            home_score_et = EXCLUDED.home_score_et,
            away_score_et = EXCLUDED.away_score_et,
            penalties_winner = EXCLUDED.penalties_winner
          RETURNING
            id,
            prediction_id,
            match_id,
            home_score,
            away_score,
            home_score_et,
            away_score_et,
            penalties_winner,
            points_earned,
            points_breakdown,
            created_at,
            updated_at
        `;

        const result: QueryResult<MatchPredictionDatabaseRow> =
          await client.query(query, [
            predictionId,
            mp.matchId,
            mp.homeScore,
            mp.awayScore,
            mp.homeScoreET ?? null,
            mp.awayScoreET ?? null,
            mp.penaltiesWinner ?? null,
          ]);

        savedPredictions.push(MatchPrediction.fromDatabase(result.rows[0]));
      }

      await client.query('COMMIT');

      return savedPredictions;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving match predictions (batch):', error);
      throw new Error('Failed to save match predictions in database');
    } finally {
      client.release();
    }
  }

  /**
   * Guarda una predicción de partido individual
   */
  async save(
    predictionId: string,
    matchPrediction: SaveMatchPredictionData,
  ): Promise<MatchPrediction> {
    const result = await this.saveMany(predictionId, [matchPrediction]);
    return result[0];
  }

  /**
   * Obtiene todas las predicciones de partidos de una predicción
   */
  async findByPrediction(predictionId: string): Promise<MatchPrediction[]> {
    const query = `
      SELECT
        id,
        prediction_id,
        match_id,
        home_score,
        away_score,
        home_score_et,
        away_score_et,
        penalties_winner,
        points_earned,
        points_breakdown,
        created_at,
        updated_at
      FROM match_predictions
      WHERE prediction_id = $1
      ORDER BY created_at ASC
    `;

    try {
      const result: QueryResult<MatchPredictionDatabaseRow> =
        await this.pool.query(query, [predictionId]);

      return result.rows.map((row) => MatchPrediction.fromDatabase(row));
    } catch (error) {
      console.error(
        `Error fetching match predictions for prediction ${predictionId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch match predictions by prediction from database',
      );
    }
  }

  /**
   * Obtiene predicciones de partidos de un grupo específico
   */
  async findByPredictionAndGroup(
    predictionId: string,
    groupId: string,
  ): Promise<MatchPrediction[]> {
    const query = `
      SELECT
        mp.id,
        mp.prediction_id,
        mp.match_id,
        mp.home_score,
        mp.away_score,
        mp.home_score_et,
        mp.away_score_et,
        mp.penalties_winner,
        mp.points_earned,
        mp.points_breakdown,
        mp.created_at,
        mp.updated_at
      FROM match_predictions mp
      INNER JOIN matches m ON mp.match_id = m.id
      WHERE mp.prediction_id = $1 AND m.group_id = $2
      ORDER BY m.match_number ASC
    `;

    try {
      const result: QueryResult<MatchPredictionDatabaseRow> =
        await this.pool.query(query, [predictionId, groupId]);

      return result.rows.map((row) => MatchPrediction.fromDatabase(row));
    } catch (error) {
      console.error(
        `Error fetching match predictions for prediction ${predictionId} and group ${groupId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch match predictions by prediction and group from database',
      );
    }
  }

  /**
   * Obtiene predicción de un partido específico
   */
  async findByPredictionAndMatch(
    predictionId: string,
    matchId: string,
  ): Promise<MatchPrediction | null> {
    const query = `
      SELECT
        id,
        prediction_id,
        match_id,
        home_score,
        away_score,
        home_score_et,
        away_score_et,
        penalties_winner,
        points_earned,
        points_breakdown,
        created_at,
        updated_at
      FROM match_predictions
      WHERE prediction_id = $1 AND match_id = $2
    `;

    try {
      const result: QueryResult<MatchPredictionDatabaseRow> =
        await this.pool.query(query, [predictionId, matchId]);

      if (result.rows.length === 0) {
        return null;
      }

      return MatchPrediction.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(
        `Error fetching match prediction for prediction ${predictionId} and match ${matchId}:`,
        error,
      );
      throw new Error(
        'Failed to fetch match prediction by prediction and match from database',
      );
    }
  }

  /**
   * Actualiza puntos ganados en una predicción de partido
   */
  async updatePoints(
    id: string,
    pointsEarned: number,
    pointsBreakdown: any,
  ): Promise<void> {
    const query = `
      UPDATE match_predictions
      SET
        points_earned = $1,
        points_breakdown = $2
      WHERE id = $3
    `;

    try {
      const result = await this.pool.query(query, [
        pointsEarned,
        JSON.stringify(pointsBreakdown),
        id,
      ]);

      if (result.rowCount === 0) {
        throw new Error(`Match prediction with id ${id} not found`);
      }
    } catch (error) {
      console.error(
        `Error updating points for match prediction ${id}:`,
        error,
      );
      throw new Error(
        'Failed to update match prediction points in database',
      );
    }
  }

  /**
   * Elimina predicciones de partidos de una predicción
   */
  async deleteByPrediction(predictionId: string): Promise<void> {
    const query = `
      DELETE FROM match_predictions
      WHERE prediction_id = $1
    `;

    try {
      await this.pool.query(query, [predictionId]);
    } catch (error) {
      console.error(
        `Error deleting match predictions for prediction ${predictionId}:`,
        error,
      );
      throw new Error(
        'Failed to delete match predictions by prediction from database',
      );
    }
  }
}
