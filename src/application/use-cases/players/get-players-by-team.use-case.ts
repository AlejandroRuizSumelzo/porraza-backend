import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IPlayerRepository } from '@domain/repositories/player.repository.interface';
import type { Player } from '@domain/entities/player.entity';

/**
 * GetPlayersByTeamUseCase (Application Layer)
 *
 * Caso de uso para obtener los 23 jugadores de un equipo.
 *
 * Usado por:
 * - Frontend para mostrar plantilla completa de un equipo
 * - Selección de jugadores para Golden Boot/Ball/Glove
 */
@Injectable()
export class GetPlayersByTeamUseCase {
  constructor(
    @Inject('IPlayerRepository')
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(teamId: string): Promise<Player[]> {
    const players = await this.playerRepository.findByTeam(teamId);

    if (players.length === 0) {
      throw new NotFoundException(`No players found for team ${teamId}`);
    }

    return players;
  }
}
