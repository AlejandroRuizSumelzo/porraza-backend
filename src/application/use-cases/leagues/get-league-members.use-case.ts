import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { User } from '@domain/entities/user.entity';

/**
 * GetLeagueMembersUseCase (Application Layer)
 *
 * Caso de uso para obtener todos los miembros de una liga.
 *
 * Responsabilidades:
 * 1. Validar que la liga existe
 * 2. Obtener todos los miembros de la liga
 * 3. Retornar array de usuarios ordenados por fecha de ingreso
 *
 * Útil para:
 * - Mostrar lista de miembros en la liga
 * - Ver quién es miembro antes de expulsar
 * - Listar usuarios para leaderboard (futuro)
 */
@Injectable()
export class GetLeagueMembersUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @param leagueId - UUID de la liga
   * @returns Array de usuarios miembros (ordenados por joined_at ASC)
   * @throws NotFoundException si la liga no existe
   */
  async execute(leagueId: string): Promise<User[]> {
    // 1. Validar que la liga existe
    const league = await this.leagueRepository.findById(leagueId);

    if (!league) {
      throw new NotFoundException(`League with id ${leagueId} not found`);
    }

    // 2. Obtener miembros
    return this.leagueRepository.getMembers(leagueId);
  }
}
