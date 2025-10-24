import { Injectable, Inject } from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { League } from '@domain/entities/league.entity';

/**
 * GetUserLeaguesUseCase (Application Layer)
 *
 * Caso de uso para obtener todas las ligas donde el usuario es miembro.
 *
 * Responsabilidades:
 * 1. Obtener ligas donde el usuario es miembro (públicas y privadas)
 * 2. Retornar array de ligas ordenadas por fecha de ingreso (más reciente primero)
 *
 * Útil para:
 * - Mostrar "Mis Ligas" en el perfil del usuario
 * - Listar ligas en las que puede crear predicciones
 */
@Injectable()
export class GetUserLeaguesUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @param userId - UUID del usuario
   * @returns Array de ligas del usuario
   */
  async execute(userId: string): Promise<League[]> {
    return this.leagueRepository.findByUserId(userId);
  }
}
