import { Injectable, Inject } from '@nestjs/common';
import type { IPredictionRepository } from '@domain/repositories/prediction.repository.interface';

/**
 * GetPredictionStatsUseCase (Application Layer)
 *
 * Caso de uso para obtener estadísticas de una predicción.
 */
@Injectable()
export class GetPredictionStatsUseCase {
  constructor(
    @Inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository,
  ) {}

  async execute(predictionId: string) {
    return await this.predictionRepository.getPredictionStats(predictionId);
  }
}
