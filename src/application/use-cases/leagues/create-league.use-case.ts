import {
  Injectable,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { League } from '@domain/entities/league.entity';

/**
 * Datos de entrada para crear una liga
 */
export interface CreateLeagueInput {
  name: string;
  description?: string;
  type: 'public' | 'private';
  adminUserId: string;
  maxMembers?: number;
}

/**
 * CreateLeagueUseCase (Application Layer)
 *
 * Caso de uso para crear una nueva liga.
 *
 * Responsabilidades:
 * 1. Validar que el usuario admin existe y está activo
 * 2. Validar que el usuario ha pagado (hasPaid = true)
 * 3. Validar que el usuario ha verificado su email (isEmailVerified = true)
 * 4. Delegar la creación al repositorio (genera invite_code automáticamente)
 * 5. Retornar la liga creada
 *
 * Flujo:
 * CreateLeagueDto → CreateLeagueUseCase → LeagueRepository → Database
 *
 * Reglas de negocio:
 * - Solo usuarios con has_paid = true pueden crear ligas
 * - Solo usuarios con email_verified = true pueden crear ligas
 * - El admin se agrega automáticamente como primer miembro (lo hace el repo)
 * - Si type = 'private', se genera invite_code automáticamente (lo hace el repo)
 */
@Injectable()
export class CreateLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de creación de liga
   *
   * @param input - Datos de la liga
   * @returns Liga creada
   * @throws NotFoundException si el usuario admin no existe
   * @throws ForbiddenException si el usuario no ha pagado o no ha verificado email
   */
  async execute(input: CreateLeagueInput): Promise<League> {
    // 1. Validar que el usuario admin existe
    const adminUser = await this.userRepository.findById(input.adminUserId);

    if (!adminUser) {
      throw new NotFoundException(
        `User with id ${input.adminUserId} not found`,
      );
    }

    // 2. Validar que el usuario ha pagado
    if (!adminUser.hasCompletedPayment()) {
      throw new ForbiddenException(
        'You must complete payment to create a league',
      );
    }

    // 3. Validar que el usuario ha verificado su email
    if (!adminUser.hasVerifiedEmail()) {
      throw new ForbiddenException(
        'You must verify your email to create a league',
      );
    }

    // 4. Crear la liga (el repositorio genera invite_code y agrega admin como miembro)
    try {
      const league = await this.leagueRepository.create({
        name: input.name,
        description: input.description,
        type: input.type,
        adminUserId: input.adminUserId,
        maxMembers: input.maxMembers,
      });

      return league;
    } catch (error: any) {
      // Re-lanzar errores conocidos
      throw error;
    }
  }
}
