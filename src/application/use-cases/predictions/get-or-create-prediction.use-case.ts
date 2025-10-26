import { Injectable, Inject } from '@nestjs/common';
import type { IPredictionRepository } from '@domain/repositories/prediction.repository.interface';
import type { Prediction } from '@domain/entities/prediction.entity';

/**
 * GetOrCreatePredictionUseCase (Application Layer)
 *
 * Caso de uso para obtener la predicción de un usuario en una liga,
 * o crearla automáticamente si no existe.
 *
 * Flujo:
 * 1. Usuario accede a predicciones de una liga
 * 2. Backend busca predicción existente
 * 3. Si no existe → crea predicción vacía (draft)
 * 4. Retorna predicción
 *
 * Esto garantiza que siempre haya una predicción activa para trabajar.
 */
@Injectable()
export class GetOrCreatePredictionUseCase {
  constructor(
    @Inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository,
  ) {}

  async execute(userId: string, leagueId: string): Promise<Prediction> {
    // 1. Buscar predicción existente
    let prediction = await this.predictionRepository.findByUserAndLeague(
      userId,
      leagueId,
    );

    // 2. Si no existe, crear nueva predicción
    if (!prediction) {
      prediction = await this.predictionRepository.create({
        userId,
        leagueId,
      });
    }

    return prediction;
  }
}
