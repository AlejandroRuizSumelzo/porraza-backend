import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';

/**
 * LeaveLeagueUseCase (Application Layer)
 *
 * Caso de uso para que un usuario salga de una liga.
 *
 * Responsabilidades:
 * 1. Validar que la liga existe
 * 2. Validar que el usuario es miembro
 * 3. Si el usuario es admin:
 *    a. Si hay otros miembros: transferir admin al miembro más antiguo
 *    b. Si es el único miembro: eliminar la liga completa
 * 4. Si el usuario no es admin: simplemente eliminar del registro
 *
 * Reglas de negocio:
 * - Admin que sale transfiere rol al miembro más antiguo automáticamente
 * - Si admin es el único miembro, se elimina la liga completa
 * - Usuario normal puede salir libremente
 * - Al salir se eliminan sus predicciones en esa liga (futuro)
 */
@Injectable()
export class LeaveLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de salir de una liga
   *
   * @param leagueId - UUID de la liga
   * @param userId - UUID del usuario que sale
   * @returns void
   * @throws NotFoundException si la liga no existe
   * @throws BadRequestException si el usuario no es miembro
   */
  async execute(leagueId: string, userId: string): Promise<void> {
    // 1. Validar que la liga existe
    const league = await this.leagueRepository.findById(leagueId);

    if (!league) {
      throw new NotFoundException(`League with id ${leagueId} not found`);
    }

    // 2. Validar que el usuario es miembro
    const isMember = await this.leagueRepository.isMember(leagueId, userId);

    if (!isMember) {
      throw new BadRequestException('You are not a member of this league');
    }

    // 3. Si el usuario es el admin, manejar transferencia o eliminación
    if (league.isAdmin(userId)) {
      // Obtener el miembro más antiguo (excluyendo al admin actual)
      const oldestMember = await this.leagueRepository.getOldestMember(
        leagueId,
        userId,
      );

      if (oldestMember) {
        // Hay otros miembros: transferir admin al más antiguo
        await this.leagueRepository.transferAdmin(leagueId, oldestMember.id);

        // Ahora el admin anterior puede salir como miembro normal
        await this.leagueRepository.removeMember(leagueId, userId);
      } else {
        // No hay otros miembros: eliminar la liga completa
        await this.leagueRepository.delete(leagueId);
      }
    } else {
      // 4. Usuario normal: simplemente eliminar del registro
      await this.leagueRepository.removeMember(leagueId, userId);
    }
  }
}
