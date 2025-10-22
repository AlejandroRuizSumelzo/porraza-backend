import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { User } from '@domain/entities/user.entity';

/**
 * GetUserByIdUseCase (Application Layer)
 *
 * Caso de uso para obtener un usuario por su ID.
 *
 * Responsabilidades:
 * 1. Buscar usuario en el repositorio
 * 2. Lanzar excepción si no existe
 * 3. Retornar el usuario encontrado
 *
 * Se usa en:
 * - GET /users/:id
 * - Verificación de existencia de usuario en otros use cases
 */
@Injectable()
export class GetUserByIdUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de búsqueda por ID
   *
   * @param id - UUID del usuario
   * @returns Usuario encontrado
   * @throws NotFoundException si el usuario no existe
   */
  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }
}
