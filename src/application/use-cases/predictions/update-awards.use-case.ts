import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { IPredictionRepository } from '@domain/repositories/prediction.repository.interface';
import type { IPlayerRepository } from '@domain/repositories/player.repository.interface';
import type { UpdateAwardsData } from '@domain/repositories/prediction.repository.interface';
import type { Prediction } from '@domain/entities/prediction.entity';

/**
 * UpdateAwardsUseCase (Application Layer)
 *
 * Caso de uso para actualizar premios individuales (Golden Boot/Ball/Glove).
 *
 * Validaciones:
 * - Predicción no bloqueada
 * - Jugadores existen
 * - Golden Glove debe ser portero
 */
@Injectable()
export class UpdateAwardsUseCase {
  constructor(
    @Inject('IPredictionRepository')
    private readonly predictionRepository: IPredictionRepository,

    @Inject('IPlayerRepository')
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(
    predictionId: string,
    awards: UpdateAwardsData,
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

    // 2. Validar que los jugadores existan
    const playerIds = [
      awards.goldenBootPlayerId,
      awards.goldenBallPlayerId,
      awards.goldenGlovePlayerId,
    ].filter((id) => id !== null && id !== undefined);

    for (const playerId of playerIds) {
      const exists = await this.playerRepository.exists(playerId);
      if (!exists) {
        throw new BadRequestException(`Player with id ${playerId} not found`);
      }
    }

    // 3. Validar que Golden Glove sea portero
    if (awards.goldenGlovePlayerId) {
      const player = await this.playerRepository.findById(
        awards.goldenGlovePlayerId,
      );

      if (player && !player.canBeGoldenGlove()) {
        throw new BadRequestException(
          'Golden Glove award must be assigned to a goalkeeper',
        );
      }
    }

    // 4. Actualizar premios
    return await this.predictionRepository.updateAwards(predictionId, awards);
  }
}
