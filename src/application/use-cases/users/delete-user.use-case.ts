import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';

/**
 * DeleteUserUseCase (Application Layer)
 *
 * Caso de uso para eliminar un usuario del sistema.
 *
 * Responsabilidades:
 * 1. Verificar que el usuario existe
 * 2. Delegar eliminación al repositorio
 *
 * NOTAS IMPORTANTES:
 * - Actualmente realiza eliminación física (hard delete)
 * - FUTURAS MEJORAS: Implementar soft delete (is_deleted flag o deleted_at)
 * - Considerar qué hacer con datos relacionados (predictions, leagues, etc.)
 * - En producción, podría requerir permisos de admin
 *
 * ALTERNATIVA SOFT DELETE (futuro):
 * - En lugar de DELETE, hacer UPDATE users SET deleted_at = NOW()
 * - Ventajas: datos recuperables, auditoría completa
 * - Desventajas: email queda "reservado" (considerar liberar después de X tiempo)
 */
@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de eliminación de usuario
   *
   * @param id - UUID del usuario a eliminar
   * @returns void
   * @throws NotFoundException si el usuario no existe
   */
  async execute(id: string): Promise<void> {
    // 1. Verificar que el usuario existe
    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // 2. Eliminar usuario
    try {
      await this.userRepository.delete(id);
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      throw error;
    }
  }
}
