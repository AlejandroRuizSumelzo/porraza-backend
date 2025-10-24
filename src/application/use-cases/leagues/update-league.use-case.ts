import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type {
  ILeagueRepository,
  UpdateLeagueData,
} from '@domain/repositories/league.repository.interface';
import type { League } from '@domain/entities/league.entity';

/**
 * UpdateLeagueUseCase (Application Layer)
 *
 * Caso de uso para actualizar los datos de una liga.
 *
 * Responsabilidades:
 * 1. Validar que la liga existe
 * 2. Validar que el usuario es el administrador de la liga
 * 3. Actualizar los datos de la liga
 * 4. Retornar la liga actualizada
 *
 * Reglas de negocio:
 * - Solo el admin puede actualizar la liga
 * - Si se cambia de 'public' a 'private', se genera invite_code automáticamente
 * - updated_at se actualiza automáticamente por trigger de BD
 */
@Injectable()
export class UpdateLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de actualización de liga
   *
   * @param leagueId - UUID de la liga a actualizar
   * @param userId - UUID del usuario que intenta actualizar (debe ser admin)
   * @param data - Datos a actualizar
   * @returns Liga actualizada
   * @throws NotFoundException si la liga no existe
   * @throws ForbiddenException si el usuario no es admin
   */
  async execute(
    leagueId: string,
    userId: string,
    data: UpdateLeagueData,
  ): Promise<League> {
    // 1. Validar que la liga existe
    const league = await this.leagueRepository.findById(leagueId);

    if (!league) {
      throw new NotFoundException(`League with id ${leagueId} not found`);
    }

    // 2. Validar que el usuario es el administrador
    if (!league.isAdmin(userId)) {
      throw new ForbiddenException(
        'Only the league admin can update the league',
      );
    }

    // 3. Actualizar la liga
    try {
      const updatedLeague = await this.leagueRepository.update(leagueId, data);
      return updatedLeague;
    } catch (error: any) {
      throw error;
    }
  }
}
