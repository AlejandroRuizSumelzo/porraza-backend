import { Injectable, Inject } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { User } from '@domain/entities/user.entity';

/**
 * GetAllUsersUseCase (Application Layer)
 *
 * Caso de uso para obtener todos los usuarios del sistema.
 *
 * Responsabilidades:
 * 1. Obtener lista completa de usuarios
 * 2. Retornar array (vacío si no hay usuarios)
 *
 * NOTA IMPORTANTE:
 * - Este endpoint puede retornar muchos registros en producción
 * - Considerar implementar paginación en el futuro
 * - Considerar implementar filtros (por is_active, búsqueda por nombre, etc.)
 *
 * Se usa en:
 * - GET /users (listar todos los usuarios)
 * - Panel de administración (futuro)
 */
@Injectable()
export class GetAllUsersUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de obtener todos los usuarios
   *
   * @returns Array de usuarios (puede estar vacío)
   */
  async execute(): Promise<User[]> {
    return await this.userRepository.findAll();
  }
}
