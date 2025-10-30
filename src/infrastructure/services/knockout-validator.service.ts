import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { IKnockoutValidatorService } from '@domain/services/knockout-validator.service.interface';
import type { IMatchPredictionRepository } from '@domain/repositories/match-prediction.repository.interface';
import type { IMatchRepository } from '@domain/repositories/match.repository.interface';
import { KnockoutPhase } from '@domain/value-objects/knockout-phase.vo';

/**
 * KnockoutValidatorService (Infrastructure Layer - Domain Service Implementation)
 *
 * Implementa la validación de predicciones de eliminatorias.
 */
@Injectable()
export class KnockoutValidatorService implements IKnockoutValidatorService {
  constructor(
    @Inject('IMatchPredictionRepository')
    private readonly matchPredictionRepository: IMatchPredictionRepository,
    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,
  ) {}

  /**
   * Valida que una fase pueda ser predicha
   */
  async validatePhaseCanBePredicted(
    predictionId: string,
    phase: KnockoutPhase,
  ): Promise<void> {
    // Si es la primera fase (R32), no hay validación previa
    if (phase.isFirstPhase()) {
      return;
    }

    // Obtener fase anterior
    const previousPhase = phase.getPreviousPhase();
    if (!previousPhase) {
      throw new BadRequestException('Cannot determine previous phase');
    }

    // Obtener partidos de la fase anterior
    const previousPhaseMatches = await this.matchRepository.findByPhase(
      previousPhase.value,
    );

    if (previousPhaseMatches.length === 0) {
      throw new BadRequestException(
        `No matches found for phase ${previousPhase.value}`,
      );
    }

    // Obtener predicciones de la fase anterior
    const previousPhasePredictions =
      await this.matchPredictionRepository.findByPredictionAndPhase(
        predictionId,
        previousPhase.value,
      );

    // Validar que todas las predicciones de la fase anterior existan
    if (
      previousPhasePredictions.length !== previousPhaseMatches.length ||
      previousPhasePredictions.length !== previousPhase.getExpectedMatchCount()
    ) {
      throw new BadRequestException(
        `Cannot predict ${phase.value}. Previous phase ${previousPhase.value} is not complete. ` +
          `Expected ${previousPhase.getExpectedMatchCount()} predictions, found ${previousPhasePredictions.length}`,
      );
    }

    // Validar que todas las predicciones tengan un ganador definido
    const invalidPredictions = previousPhasePredictions.filter(
      (pred) => pred.getFinalWinner() === 'draw',
    );

    if (invalidPredictions.length > 0) {
      throw new BadRequestException(
        `Cannot predict ${phase.value}. Some matches in ${previousPhase.value} ` +
          `have no winner defined (draws without resolution)`,
      );
    }
  }

  /**
   * Valida que los equipos de un partido coincidan con los ganadores esperados
   */
  async validateMatchTeams(
    predictionId: string,
    phase: KnockoutPhase,
    matchId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): Promise<void> {
    // Si es la primera fase, no hay validación de equipos
    // (los equipos ya vienen resueltos del sistema de grupos)
    if (phase.isFirstPhase()) {
      return;
    }

    // Obtener el partido actual
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new BadRequestException(`Match ${matchId} not found`);
    }

    // Validar que el partido pertenezca a la fase correcta
    if (match.phase !== phase.value) {
      throw new BadRequestException(
        `Match ${matchId} does not belong to phase ${phase.value}`,
      );
    }

    // Obtener los IDs de los partidos que alimentan este partido
    const dependsOnMatchIds = match.dependsOnMatchIds;
    if (!dependsOnMatchIds || dependsOnMatchIds.length !== 2) {
      throw new BadRequestException(
        `Match ${matchId} has invalid dependencies`,
      );
    }

    // Obtener las predicciones y los partidos previos
    const [
      homeFeedingPrediction,
      awayFeedingPrediction,
      homeFeedingMatch,
      awayFeedingMatch,
    ] = await Promise.all([
      this.matchPredictionRepository.findByPredictionAndMatch(
        predictionId,
        dependsOnMatchIds[0].toString(),
      ),
      this.matchPredictionRepository.findByPredictionAndMatch(
        predictionId,
        dependsOnMatchIds[1].toString(),
      ),
      this.matchRepository.findByMatchNumber(dependsOnMatchIds[0]),
      this.matchRepository.findByMatchNumber(dependsOnMatchIds[1]),
    ]);

    if (
      !homeFeedingPrediction ||
      !awayFeedingPrediction ||
      !homeFeedingMatch ||
      !awayFeedingMatch
    ) {
      throw new BadRequestException(
        `Cannot find predictions or matches for feeding matches of ${matchId}`,
      );
    }

    // Obtener los ganadores de los partidos previos
    const homeWinnerId = this.determineWinner(
      homeFeedingPrediction,
      homeFeedingMatch,
    );
    const awayWinnerId = this.determineWinner(
      awayFeedingPrediction,
      awayFeedingMatch,
    );

    if (!homeWinnerId || !awayWinnerId) {
      throw new BadRequestException(
        `Cannot determine winners from feeding matches`,
      );
    }

    // Validar que los equipos coincidan
    if (homeTeamId !== homeWinnerId) {
      throw new BadRequestException(
        `Invalid home team. Expected winner of match ${dependsOnMatchIds[0]}, ` +
          `but got ${homeTeamId} instead of ${homeWinnerId}`,
      );
    }

    if (awayTeamId !== awayWinnerId) {
      throw new BadRequestException(
        `Invalid away team. Expected winner of match ${dependsOnMatchIds[1]}, ` +
          `but got ${awayTeamId} instead of ${awayWinnerId}`,
      );
    }
  }

  /**
   * Valida la consistencia de resultados de un partido
   */
  validateMatchResult(
    homeScore: number,
    awayScore: number,
    homeScoreET: number | null,
    awayScoreET: number | null,
    penaltiesWinner: 'home' | 'away' | null,
  ): void {
    // Validar que los goles no sean negativos
    if (homeScore < 0 || awayScore < 0) {
      throw new BadRequestException('Scores cannot be negative');
    }

    if (
      (homeScoreET !== null && homeScoreET < 0) ||
      (awayScoreET !== null && awayScoreET < 0)
    ) {
      throw new BadRequestException('Extra time scores cannot be negative');
    }

    // CASO 1: Si no hay empate en 90', no debe haber prórroga ni penaltis
    if (homeScore !== awayScore) {
      if (homeScoreET !== null || awayScoreET !== null) {
        throw new BadRequestException(
          'Extra time scores should not be provided when there is a winner in regular time',
        );
      }
      if (penaltiesWinner !== null) {
        throw new BadRequestException(
          'Penalties winner should not be provided when there is a winner in regular time',
        );
      }
      return;
    }

    // CASO 2: Hay empate en 90', DEBE haber prórroga
    if (homeScore === awayScore) {
      if (homeScoreET === null || awayScoreET === null) {
        throw new BadRequestException(
          'Extra time scores are required when regular time ends in a draw',
        );
      }

      // Validar que los goles de prórroga incluyan los de 90'
      if (homeScoreET < homeScore || awayScoreET < awayScore) {
        throw new BadRequestException(
          'Extra time scores must be greater than or equal to regular time scores',
        );
      }

      // CASO 2A: Hay ganador en prórroga, NO debe haber penaltis
      if (homeScoreET !== awayScoreET) {
        if (penaltiesWinner !== null) {
          throw new BadRequestException(
            'Penalties winner should not be provided when there is a winner in extra time',
          );
        }
        return;
      }

      // CASO 2B: Empate en prórroga, DEBE haber penaltis
      if (homeScoreET === awayScoreET) {
        if (penaltiesWinner === null) {
          throw new BadRequestException(
            'Penalties winner is required when extra time ends in a draw',
          );
        }
        if (penaltiesWinner !== 'home' && penaltiesWinner !== 'away') {
          throw new BadRequestException(
            'Penalties winner must be either "home" or "away"',
          );
        }
      }
    }
  }

  /**
   * Obtiene el mapa de ganadores de la fase anterior
   */
  async getPreviousPhaseWinners(
    predictionId: string,
    phase: KnockoutPhase,
  ): Promise<Map<string, string>> {
    const previousPhase = phase.getPreviousPhase();
    if (!previousPhase) {
      return new Map();
    }

    const [previousPhasePredictions, previousPhaseMatches] = await Promise.all(
      [
        this.matchPredictionRepository.findByPredictionAndPhase(
          predictionId,
          previousPhase.value,
        ),
        this.matchRepository.findByPhase(previousPhase.value),
      ],
    );

    const matchesMap = new Map(
      previousPhaseMatches.map((m) => [m.id, m] as const),
    );
    const winnersMap = new Map<string, string>();

    for (const prediction of previousPhasePredictions) {
      const match = matchesMap.get(prediction.matchId);
      if (!match) continue;

      const winnerId = this.determineWinner(prediction, match);
      if (winnerId) {
        winnersMap.set(prediction.matchId, winnerId);
      }
    }

    return winnersMap;
  }

  /**
   * Determina el ganador de una predicción de partido
   * @param prediction - La predicción con los scores
   * @param match - El partido con los IDs de los equipos
   */
  private determineWinner(prediction: any, match: any): string | null {
    if (!match.homeTeamId || !match.awayTeamId) {
      return null; // Partido con equipos TBD
    }

    // Si hay penaltis, el ganador está explícito
    if (prediction.penaltiesWinner) {
      return prediction.penaltiesWinner === 'home'
        ? match.homeTeamId
        : match.awayTeamId;
    }

    // Si hay prórroga, comparar goles de prórroga
    if (
      prediction.homeScoreET !== null &&
      prediction.awayScoreET !== null
    ) {
      if (prediction.homeScoreET > prediction.awayScoreET) {
        return match.homeTeamId;
      }
      if (prediction.awayScoreET > prediction.homeScoreET) {
        return match.awayTeamId;
      }
      // Empate en prórroga sin penaltis = inválido, pero no crasheamos aquí
      return null;
    }

    // Comparar goles de 90'
    if (prediction.homeScore > prediction.awayScore) {
      return match.homeTeamId;
    }
    if (prediction.awayScore > prediction.homeScore) {
      return match.awayTeamId;
    }

    // Empate sin resolución
    return null;
  }
}
