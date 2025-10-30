import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import type { IPredictionRepository } from '@domain/repositories/prediction.repository.interface';
import type { IMatchPredictionRepository } from '@domain/repositories/match-prediction.repository.interface';
import type { IMatchRepository } from '@domain/repositories/match.repository.interface';
import type { IKnockoutValidatorService } from '@domain/services/knockout-validator.service.interface';
import { KnockoutPhase } from '@domain/value-objects/knockout-phase.vo';
import type { MatchPrediction } from '@domain/entities/match-prediction.entity';

/**
 * SaveKnockoutPredictionsUseCase
 *
 * Caso de uso para guardar predicciones de una fase de eliminatorias.
 *
 * Responsabilidades:
 * - Validar que la predicción existe y no está bloqueada
 * - Validar que la fase anterior esté completa
 * - Validar que los equipos en cada partido coincidan con los ganadores esperados
 * - Validar la consistencia de los resultados (90', prórroga, penaltis)
 * - Guardar todas las predicciones de partidos
 * - Actualizar el estado de completitud de la fase
 *
 * Flujo:
 * 1. Obtener predicción y validar que existe
 * 2. Validar que predicción no esté bloqueada
 * 3. Crear value object de fase y validar que es válida
 * 4. Validar que la fase anterior esté completa (via domain service)
 * 5. Validar cada partido:
 *    - Equipos coinciden con ganadores esperados
 *    - Resultados son consistentes (90', ET, penalties)
 * 6. Guardar todas las predicciones de partidos (batch)
 * 7. Si completó todas las predicciones de la fase, marcar como completada
 */
@Injectable()
export class SaveKnockoutPredictionsUseCase {
  constructor(
    @Inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository,
    @Inject('IMatchPredictionRepository')
    private readonly matchPredictionRepository: IMatchPredictionRepository,
    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,
    @Inject('IKnockoutValidatorService')
    private readonly knockoutValidator: IKnockoutValidatorService,
  ) {}

  async execute(
    predictionId: string,
    phase: string,
    predictions: Array<{
      matchId: string;
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number;
      awayScore: number;
      homeScoreET?: number | null;
      awayScoreET?: number | null;
      penaltiesWinner?: 'home' | 'away' | null;
    }>,
  ): Promise<MatchPrediction[]> {
    // 1. Obtener predicción y validar que existe
    const prediction = await this.predictionRepository.findById(predictionId);
    if (!prediction) {
      throw new NotFoundException(`Prediction ${predictionId} not found`);
    }

    // 2. Validar que predicción no esté bloqueada
    if (prediction.isLocked) {
      throw new BadRequestException(
        'Cannot save predictions. Predictions are locked',
      );
    }

    // 3. Crear value object de fase y validar
    if (!KnockoutPhase.isValid(phase)) {
      throw new BadRequestException(`Invalid phase: ${phase}`);
    }
    const knockoutPhase = new KnockoutPhase(phase);

    // 4. Validar que la fase anterior esté completa
    await this.knockoutValidator.validatePhaseCanBePredicted(
      predictionId,
      knockoutPhase,
    );

    // 5. Validar que el número de predicciones sea correcto
    const expectedMatchCount = knockoutPhase.getExpectedMatchCount();
    if (predictions.length !== expectedMatchCount) {
      throw new BadRequestException(
        `Invalid number of predictions for ${phase}. Expected ${expectedMatchCount}, got ${predictions.length}`,
      );
    }

    // 6. Validar cada predicción
    for (const pred of predictions) {
      // Validar consistencia de resultados
      this.knockoutValidator.validateMatchResult(
        pred.homeScore,
        pred.awayScore,
        pred.homeScoreET ?? null,
        pred.awayScoreET ?? null,
        pred.penaltiesWinner ?? null,
      );

      // Validar que los equipos coincidan con los ganadores esperados
      // (solo para fases después de R32, ya que R32 viene de grupos)
      if (!knockoutPhase.isFirstPhase()) {
        await this.knockoutValidator.validateMatchTeams(
          predictionId,
          knockoutPhase,
          pred.matchId,
          pred.homeTeamId,
          pred.awayTeamId,
        );
      }
    }

    // 7. Guardar todas las predicciones de partidos (batch)
    const savedPredictions = await this.matchPredictionRepository.saveMany(
      predictionId,
      predictions.map((pred) => ({
        matchId: pred.matchId,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        homeScoreET: pred.homeScoreET ?? null,
        awayScoreET: pred.awayScoreET ?? null,
        penaltiesWinner: pred.penaltiesWinner ?? null,
      })),
    );

    // 8. Actualizar estado de completitud según la fase
    // Verificar si todas las fases de eliminatorias están completas
    const allPhases = KnockoutPhase.getAllPhases();
    const allPhasesComplete = await this.checkAllPhasesComplete(
      predictionId,
      allPhases,
    );

    if (allPhasesComplete) {
      await this.predictionRepository.markKnockoutsCompleted(predictionId);
    }

    return savedPredictions;
  }

  /**
   * Verifica si todas las fases de eliminatorias están completas
   */
  private async checkAllPhasesComplete(
    predictionId: string,
    phases: string[],
  ): Promise<boolean> {
    for (const phaseStr of phases) {
      const phase = new KnockoutPhase(phaseStr);
      const expectedCount = phase.getExpectedMatchCount();

      const phasePredictions =
        await this.matchPredictionRepository.findByPredictionAndPhase(
          predictionId,
          phaseStr,
        );

      if (phasePredictions.length !== expectedCount) {
        return false;
      }
    }

    return true;
  }
}
