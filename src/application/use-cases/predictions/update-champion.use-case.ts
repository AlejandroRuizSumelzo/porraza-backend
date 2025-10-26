import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IPredictionRepository } from '@domain/repositories/prediction.repository.interface';
import type { UpdateChampionData } from '@domain/repositories/prediction.repository.interface';
import type { Prediction } from '@domain/entities/prediction.entity';

/**
 * UpdateChampionUseCase (Application Layer)
 *
 * Caso de uso para actualizar el campeón predicho.
 */
@Injectable()
export class UpdateChampionUseCase {
  constructor(
    @Inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository,
  ) {}

  async execute(
    predictionId: string,
    data: UpdateChampionData,
  ): Promise<Prediction> {
    // 1. Validar que la predicción exista y no esté bloqueada
    const prediction = await this.predictionRepository.findById(predictionId);

    if (!prediction) {
      throw new NotFoundException(
        `Prediction with id ${predictionId} not found`,
      );
    }

    if (!prediction.canBeEdited()) {
      throw new ForbiddenException(
        'Predictions are locked. Deadline has passed.',
      );
    }

    // 2. Actualizar campeón
    return await this.predictionRepository.updateChampion(predictionId, data);
  }
}
