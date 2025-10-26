import { Injectable, Inject } from '@nestjs/common';
import type { IPlayerRepository } from '@domain/repositories/player.repository.interface';
import type { Player } from '@domain/entities/player.entity';

/**
 * GetAllGoalkeepersUseCase (Application Layer)
 *
 * Caso de uso para obtener todos los porteros del torneo.
 *
 * Usado por:
 * - Frontend para selección de Golden Glove (mejor portero)
 * - Filtrar jugadores elegibles para el premio
 */
@Injectable()
export class GetAllGoalkeepersUseCase {
  constructor(
    @Inject('IPlayerRepository')
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(): Promise<Player[]> {
    return await this.playerRepository.findAllGoalkeepers();
  }
}
