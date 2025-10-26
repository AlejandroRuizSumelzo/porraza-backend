import { Injectable, Inject } from '@nestjs/common';
import type { IPredictionRepository } from '@domain/repositories/prediction.repository.interface';

/**
 * GetLeagueRankingUseCase (Application Layer)
 *
 * Caso de uso para obtener el ranking de una liga ordenado por puntos.
 */
@Injectable()
export class GetLeagueRankingUseCase {
  constructor(
    @Inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository,
  ) {}

  async execute(leagueId: string) {
    return await this.predictionRepository.getLeagueRanking(leagueId);
  }
}
