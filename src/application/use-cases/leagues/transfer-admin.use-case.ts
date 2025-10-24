import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';

/**
 * TransferAdminUseCase (Application Layer)
 *
 * Caso de uso para transferir el rol de administrador a otro usuario.
 *
 * Responsabilidades:
 * 1. Validar que la liga existe
 * 2. Validar que el usuario actual es el admin
 * 3. Validar que el nuevo admin es miembro de la liga
 * 4. Validar que no se transfiera a sí mismo (no tiene sentido)
 * 5. Transferir el rol de admin
 *
 * Reglas de negocio:
 * - Solo el admin actual puede transferir su rol
 * - El nuevo admin debe ser miembro activo de la liga
 * - No se puede transferir a sí mismo
 * - El admin anterior se mantiene como miembro normal
 */
@Injectable()
export class TransferAdminUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de transferir admin
   *
   * @param leagueId - UUID de la liga
   * @param currentAdminId - UUID del admin actual
   * @param newAdminId - UUID del nuevo admin
   * @returns void
   * @throws NotFoundException si la liga no existe
   * @throws ForbiddenException si el usuario no es admin
   * @throws BadRequestException si el nuevo admin no es miembro o es el mismo
   */
  async execute(
    leagueId: string,
    currentAdminId: string,
    newAdminId: string,
  ): Promise<void> {
    // 1. Validar que la liga existe
    const league = await this.leagueRepository.findById(leagueId);

    if (!league) {
      throw new NotFoundException(`League with id ${leagueId} not found`);
    }

    // 2. Validar que el usuario actual es el admin
    if (!league.isAdmin(currentAdminId)) {
      throw new ForbiddenException(
        'Only the current admin can transfer admin role',
      );
    }

    // 3. Validar que no se transfiera a sí mismo
    if (currentAdminId === newAdminId) {
      throw new BadRequestException(
        'Cannot transfer admin role to yourself',
      );
    }

    // 4. Validar que el nuevo admin es miembro de la liga
    const isMember = await this.leagueRepository.isMember(leagueId, newAdminId);

    if (!isMember) {
      throw new BadRequestException(
        'New admin must be a member of the league',
      );
    }

    // 5. Transferir el rol de admin
    try {
      await this.leagueRepository.transferAdmin(leagueId, newAdminId);
    } catch (error: any) {
      throw error;
    }
  }
}
