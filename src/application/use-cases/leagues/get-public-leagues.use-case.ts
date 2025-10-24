import { Injectable, Inject } from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { League } from '@domain/entities/league.entity';

/**
 * GetPublicLeaguesUseCase (Application Layer)
 *
 * Caso de uso para obtener solo las ligas públicas.
 *
 * Responsabilidades:
 * 1. Obtener ligas con type = 'public'
 * 2. Retornar array de ligas públicas
 *
 * Útil para:
 * - Mostrar ligas disponibles para unirse sin código
 * - Listar ligas en página pública
 */
@Injectable()
export class GetPublicLeaguesUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @returns Array de ligas públicas
   */
  async execute(): Promise<League[]> {
    return this.leagueRepository.findPublicLeagues();
  }
}
