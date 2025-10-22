import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { User } from '@domain/entities/user.entity';

/**
 * GetUserByEmailUseCase (Application Layer)
 *
 * Caso de uso para obtener un usuario por su email.
 *
 * Responsabilidades:
 * 1. Buscar usuario en el repositorio
 * 2. Lanzar excepción si no existe
 * 3. Retornar el usuario encontrado
 *
 * Se usa en:
 * - GET /users/email/:email
 * - Login (futuro): verificar que el email existe antes de validar password
 * - Recuperación de contraseña (futuro)
 */
@Injectable()
export class GetUserByEmailUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de búsqueda por email
   *
   * @param email - Email del usuario
   * @returns Usuario encontrado
   * @throws NotFoundException si el usuario no existe
   */
  async execute(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }
}
