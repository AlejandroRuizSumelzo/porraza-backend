import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';

/**
 * RemoveMemberUseCase (Application Layer)
 *
 * Caso de uso para que el admin expulse a un miembro de la liga.
 *
 * Responsabilidades:
 * 1. Validar que la liga existe
 * 2. Validar que el usuario que ejecuta es el admin
 * 3. Validar que el miembro a expulsar es miembro de la liga
 * 4. Validar que el admin no se expulse a sí mismo (debe usar LeaveLeague)
 * 5. Expulsar al miembro
 *
 * Reglas de negocio:
 * - Solo el admin puede expulsar miembros
 * - El admin no puede expulsarse a sí mismo (debe usar leave)
 * - Al expulsar se eliminan las predicciones del usuario en esa liga (futuro)
 */
@Injectable()
export class RemoveMemberUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de expulsar un miembro
   *
   * @param leagueId - UUID de la liga
   * @param adminUserId - UUID del admin que ejecuta la acción
   * @param memberToRemoveId - UUID del miembro a expulsar
   * @returns void
   * @throws NotFoundException si la liga no existe
   * @throws ForbiddenException si el usuario no es admin
   * @throws BadRequestException si intenta expulsarse a sí mismo o el miembro no existe
   */
  async execute(
    leagueId: string,
    adminUserId: string,
    memberToRemoveId: string,
  ): Promise<void> {
    // 1. Validar que la liga existe
    const league = await this.leagueRepository.findById(leagueId);

    if (!league) {
      throw new NotFoundException(`League with id ${leagueId} not found`);
    }

    // 2. Validar que el usuario que ejecuta es el admin
    if (!league.isAdmin(adminUserId)) {
      throw new ForbiddenException(
        'Only the league admin can remove members',
      );
    }

    // 3. Validar que el admin no se expulse a sí mismo
    if (adminUserId === memberToRemoveId) {
      throw new BadRequestException(
        'Admin cannot remove themselves. Use leave league instead',
      );
    }

    // 4. Validar que el miembro a expulsar es miembro de la liga
    const isMember = await this.leagueRepository.isMember(
      leagueId,
      memberToRemoveId,
    );

    if (!isMember) {
      throw new BadRequestException(
        'User is not a member of this league',
      );
    }

    // 5. Expulsar al miembro
    try {
      await this.leagueRepository.removeMember(leagueId, memberToRemoveId);
    } catch (error: any) {
      throw error;
    }
  }
}
