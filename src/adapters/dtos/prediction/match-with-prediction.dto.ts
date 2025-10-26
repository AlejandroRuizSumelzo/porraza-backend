import { ApiProperty } from '@nestjs/swagger';
import { MatchEnrichedResponseDto } from '@adapters/dtos/match-enriched.response.dto';
import { MatchPredictionResponseDto } from './match-prediction-response.dto';
import { TeamBasicDto } from '@adapters/dtos/team-basic.dto';
import { StadiumBasicDto } from '@adapters/dtos/stadium-basic.dto';
import { GroupBasicDto } from '@adapters/dtos/group-basic.dto';
import type { Match } from '@domain/entities/match.entity';
import type { MatchPrediction } from '@domain/entities/match-prediction.entity';
import type { MatchWithBasicDetailsRow } from '@domain/repositories/match.repository.interface';

/**
 * MatchWithPredictionDto
 *
 * DTO combinado que representa un partido con su predicción del usuario.
 * Este DTO se usa para retornar toda la información necesaria en una sola estructura.
 *
 * Usado en:
 * - GET /predictions/league/:leagueId (array de matches con predicciones)
 *
 * Estructura:
 * - match: Información completa del partido (equipos, estadio, fecha, etc.)
 * - userPrediction: Predicción del usuario para ese partido (0-0 si no existe)
 *
 * Casos de uso:
 * - Usuario accede a predicciones: Frontend recibe todos los partidos listos para renderizar
 * - Si no hay predicción: userPrediction viene inicializado a 0-0 (no null)
 * - Frontend muestra formularios pre-poblados con predicciones existentes o 0-0 por defecto
 */
export class MatchWithPredictionDto {
  @ApiProperty({
    description:
      'Complete match information with enriched team, stadium and group objects',
    type: MatchEnrichedResponseDto,
  })
  match!: MatchEnrichedResponseDto;

  @ApiProperty({
    description:
      'User prediction for this match (initialized to 0-0 if not created yet)',
    type: MatchPredictionResponseDto,
  })
  userPrediction!: MatchPredictionResponseDto;

  /**
   * Factory method para crear DTO desde row de BD con JOINs
   * Este es el método optimizado que mapea directamente desde el resultado SQL
   *
   * @param row - Row de BD con información de match, teams, stadium y group
   * @param matchPrediction - Entidad MatchPrediction (opcional, puede ser null si no existe)
   * @returns MatchWithPredictionDto con toda la información enriquecida
   */
  static fromDatabaseRow(
    row: MatchWithBasicDetailsRow,
    matchPrediction: MatchPrediction | null,
  ): MatchWithPredictionDto {
    const dto = new MatchWithPredictionDto();

    // Mapear match enriquecido
    const matchDto = new MatchEnrichedResponseDto();
    matchDto.id = row.match_id;
    matchDto.matchNumber = row.match_number;
    matchDto.phase = row.phase as any;
    matchDto.matchDate = row.match_date;
    matchDto.matchTime = row.match_time;
    matchDto.status = row.status as any;
    matchDto.homeScore = row.home_score;
    matchDto.awayScore = row.away_score;
    matchDto.homeScoreEt = row.home_score_et;
    matchDto.awayScoreEt = row.away_score_et;
    matchDto.homePenalties = row.home_penalties;
    matchDto.awayPenalties = row.away_penalties;
    matchDto.predictionsLockedAt = row.predictions_locked_at;
    matchDto.homeTeamPlaceholder = row.home_team_placeholder;
    matchDto.awayTeamPlaceholder = row.away_team_placeholder;
    matchDto.dependsOnMatchIds = row.depends_on_match_ids;
    matchDto.createdAt = row.created_at;
    matchDto.updatedAt = row.updated_at;

    // Mapear home team
    if (row.home_team_id) {
      const homeTeam = new TeamBasicDto();
      homeTeam.id = row.home_team_id;
      homeTeam.name = row.home_team_name!;
      homeTeam.fifaCode = row.home_team_fifa_code!;
      homeTeam.confederation = row.home_team_confederation!;
      matchDto.homeTeam = homeTeam;
    } else {
      matchDto.homeTeam = null;
    }

    // Mapear away team
    if (row.away_team_id) {
      const awayTeam = new TeamBasicDto();
      awayTeam.id = row.away_team_id;
      awayTeam.name = row.away_team_name!;
      awayTeam.fifaCode = row.away_team_fifa_code!;
      awayTeam.confederation = row.away_team_confederation!;
      matchDto.awayTeam = awayTeam;
    } else {
      matchDto.awayTeam = null;
    }

    // Mapear stadium
    const stadium = new StadiumBasicDto();
    stadium.id = row.stadium_id;
    stadium.code = row.stadium_code;
    stadium.name = row.stadium_name;
    stadium.city = row.stadium_city;
    stadium.country = row.stadium_country;
    stadium.capacity = row.stadium_capacity;
    matchDto.stadium = stadium;

    // Mapear group (nullable)
    if (row.group_id && row.group_name) {
      const group = new GroupBasicDto();
      group.id = row.group_id;
      group.name = row.group_name;
      matchDto.group = group;
    } else {
      matchDto.group = null;
    }

    dto.match = matchDto;

    // Si existe predicción, usarla; sino, crear vacía (0-0)
    dto.userPrediction = matchPrediction
      ? MatchPredictionResponseDto.fromEntity(matchPrediction)
      : MatchPredictionResponseDto.createEmpty(row.match_id);

    return dto;
  }

  /**
   * Factory method para crear array de DTOs desde rows de BD con JOINs
   * Este es el método PRINCIPAL para el endpoint de predicciones
   *
   * @param rows - Array de rows de BD con información completa (JOINs)
   * @param matchPredictions - Array de entidades MatchPrediction (puede estar vacío)
   * @returns Array de MatchWithPredictionDto con toda la información enriquecida
   */
  static fromDatabaseRows(
    rows: MatchWithBasicDetailsRow[],
    matchPredictions: MatchPrediction[],
  ): MatchWithPredictionDto[] {
    // Crear un map para lookup rápido de predicciones por matchId
    const predictionsByMatchId = new Map<string, MatchPrediction>();
    matchPredictions.forEach((prediction) => {
      predictionsByMatchId.set(prediction.matchId, prediction);
    });

    // Mapear cada row con su predicción (o null si no existe)
    return rows.map((row) => {
      const matchPrediction =
        predictionsByMatchId.get(row.match_id) || null;
      return MatchWithPredictionDto.fromDatabaseRow(row, matchPrediction);
    });
  }
}
