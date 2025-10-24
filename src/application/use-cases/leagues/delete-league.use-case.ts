import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';

/**
 * DeleteLeagueUseCase (Application Layer)
 *
 * Caso de uso para eliminar una liga.
 *
 * Responsabilidades:
 * 1. Validar que la liga existe
 * 2. Validar que el usuario es el administrador de la liga
 * 3. Eliminar la liga (cascada elimina: miembros, predicciones)
 *
 * Reglas de negocio:
 * - Solo el admin puede eliminar la liga
 * - La eliminación es física (hard delete)
 * - Se eliminan automáticamente: league_members, predictions (futuro)
 */
@Injectable()
export class DeleteLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de eliminación de liga
   *
   * @param leagueId - UUID de la liga a eliminar
   * @param userId - UUID del usuario que intenta eliminar (debe ser admin)
   * @returns void
   * @throws NotFoundException si la liga no existe
   * @throws ForbiddenException si el usuario no es admin
   */
  async execute(leagueId: string, userId: string): Promise<void> {
    // 1. Validar que la liga existe
    const league = await this.leagueRepository.findById(leagueId);

    if (!league) {
      throw new NotFoundException(`League with id ${leagueId} not found`);
    }

    // 2. Validar que el usuario es el administrador
    if (!league.isAdmin(userId)) {
      throw new ForbiddenException(
        'Only the league admin can delete the league',
      );
    }

    // 3. Eliminar la liga
    try {
      await this.leagueRepository.delete(leagueId);
    } catch (error: any) {
      throw error;
    }
  }
}
