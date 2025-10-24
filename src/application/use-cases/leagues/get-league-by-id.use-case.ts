import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { League } from '@domain/entities/league.entity';

/**
 * GetLeagueByIdUseCase (Application Layer)
 *
 * Caso de uso para obtener una liga por su ID.
 *
 * Responsabilidades:
 * 1. Buscar la liga por ID
 * 2. Lanzar excepción si no existe
 * 3. Retornar la liga
 */
@Injectable()
export class GetLeagueByIdUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @param id - UUID de la liga
   * @returns Liga encontrada
   * @throws NotFoundException si la liga no existe
   */
  async execute(id: string): Promise<League> {
    const league = await this.leagueRepository.findById(id);

    if (!league) {
      throw new NotFoundException(`League with id ${id} not found`);
    }

    return league;
  }
}
