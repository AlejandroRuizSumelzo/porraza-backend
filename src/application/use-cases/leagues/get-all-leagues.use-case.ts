import { Injectable, Inject } from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { League } from '@domain/entities/league.entity';

/**
 * GetAllLeaguesUseCase (Application Layer)
 *
 * Caso de uso para obtener todas las ligas del sistema.
 *
 * Responsabilidades:
 * 1. Obtener todas las ligas (públicas y privadas)
 * 2. Retornar array de ligas
 *
 * Nota: En producción, considerar implementar paginación
 */
@Injectable()
export class GetAllLeaguesUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @returns Array de todas las ligas
   */
  async execute(): Promise<League[]> {
    return this.leagueRepository.findAll();
  }
}
