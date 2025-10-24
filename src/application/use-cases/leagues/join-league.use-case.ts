import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';

/**
 * Datos de entrada para unirse a una liga
 */
export interface JoinLeagueInput {
  leagueId: string;
  userId: string;
  inviteCode?: string; // Solo requerido para ligas privadas
}

/**
 * JoinLeagueUseCase (Application Layer)
 *
 * Caso de uso para que un usuario se una a una liga.
 *
 * Responsabilidades:
 * 1. Validar que la liga existe
 * 2. Validar que el usuario existe y está activo
 * 3. Validar que el usuario ha pagado (hasPaid = true)
 * 4. Validar que el usuario ha verificado su email (isEmailVerified = true)
 * 5. Validar que el usuario no es ya miembro
 * 6. Validar que la liga no ha alcanzado el límite de miembros
 * 7. Si liga privada, validar código de invitación
 * 8. Agregar usuario como miembro
 *
 * Reglas de negocio:
 * - Solo usuarios con has_paid = true pueden unirse a ligas
 * - Solo usuarios con email_verified = true pueden unirse a ligas
 * - Ligas públicas: unión automática (sin código)
 * - Ligas privadas: requiere invite_code válido
 * - No se puede exceder max_members
 * - No se puede unirse dos veces a la misma liga
 */
@Injectable()
export class JoinLeagueUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de unirse a una liga
   *
   * @param input - Datos para unirse (leagueId, userId, inviteCode)
   * @returns void
   * @throws NotFoundException si la liga o usuario no existe
   * @throws ForbiddenException si el usuario no ha pagado o no ha verificado email
   * @throws ConflictException si el usuario ya es miembro
   * @throws BadRequestException si la liga está llena o falta invite_code
   */
  async execute(input: JoinLeagueInput): Promise<void> {
    // 1. Validar que la liga existe
    const league = await this.leagueRepository.findById(input.leagueId);

    if (!league) {
      throw new NotFoundException(
        `League with id ${input.leagueId} not found`,
      );
    }

    // 2. Validar que el usuario existe
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundException(`User with id ${input.userId} not found`);
    }

    // 3. Validar que el usuario ha pagado
    if (!user.hasCompletedPayment()) {
      throw new ForbiddenException('You must complete payment to join a league');
    }

    // 4. Validar que el usuario ha verificado su email
    if (!user.hasVerifiedEmail()) {
      throw new ForbiddenException(
        'You must verify your email to join a league',
      );
    }

    // 5. Validar que el usuario no es ya miembro
    const isMember = await this.leagueRepository.isMember(
      input.leagueId,
      input.userId,
    );

    if (isMember) {
      throw new ConflictException('You are already a member of this league');
    }

    // 6. Validar que la liga no ha alcanzado el límite de miembros
    const memberCount = await this.leagueRepository.getMemberCount(
      input.leagueId,
    );

    if (memberCount >= league.maxMembers) {
      throw new BadRequestException(
        `League has reached maximum capacity (${league.maxMembers} members)`,
      );
    }

    // 7. Si liga privada, validar código de invitación
    if (league.isPrivate()) {
      if (!input.inviteCode) {
        throw new BadRequestException(
          'Invite code is required for private leagues',
        );
      }

      // Normalizar códigos a mayúsculas para comparación
      const normalizedInput = input.inviteCode.toUpperCase().trim();
      const normalizedLeagueCode = league.inviteCode?.toUpperCase().trim();

      if (normalizedInput !== normalizedLeagueCode) {
        throw new BadRequestException('Invalid invite code');
      }
    }

    // 8. Agregar usuario como miembro
    try {
      await this.leagueRepository.addMember(input.leagueId, input.userId);
    } catch (error: any) {
      // Manejar errores del repositorio
      if (error.message === 'User is already a member of this league') {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
