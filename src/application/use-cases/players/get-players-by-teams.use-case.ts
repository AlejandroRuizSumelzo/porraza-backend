import { Injectable, Inject } from '@nestjs/common';
import type { IPlayerRepository } from '@domain/repositories/player.repository.interface';
import type { Player } from '@domain/entities/player.entity';

/**
 * GetPlayersByTeamsUseCase (Application Layer)
 *
 * Caso de uso para obtener jugadores de múltiples equipos.
 *
 * Usado por:
 * - Frontend para mostrar solo jugadores de equipos clasificados
 * - Selección de Golden Boot/Ball después de eliminatorias
 */
@Injectable()
export class GetPlayersByTeamsUseCase {
  constructor(
    @Inject('IPlayerRepository')
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(teamIds: string[]): Promise<Player[]> {
    if (teamIds.length === 0) {
      return [];
    }

    return await this.playerRepository.findByTeams(teamIds);
  }
}
