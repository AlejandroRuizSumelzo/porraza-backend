import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { User } from '@domain/entities/user.entity';
import type { UpdatePasswordDto } from '@adapters/dtos/user/update-password.dto';

/**
 * UpdatePasswordUseCase (Application Layer)
 *
 * Caso de uso para actualizar la contraseña de un usuario.
 *
 * Responsabilidades:
 * 1. Verificar que el usuario existe
 * 2. Delegar actualización de contraseña al repositorio (que hashea)
 * 3. Retornar usuario actualizado
 *
 * FUTURAS MEJORAS:
 * - Validar contraseña actual antes de cambiar (requires UpdatePasswordDto.currentPassword)
 * - Enviar email de notificación de cambio de contraseña
 * - Invalidar tokens JWT existentes (logout de otras sesiones)
 */
@Injectable()
export class UpdatePasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de actualización de contraseña
   *
   * @param id - UUID del usuario
   * @param updatePasswordDto - Nueva contraseña
   * @returns Usuario actualizado
   * @throws NotFoundException si el usuario no existe
   */
  async execute(
    id: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<User> {
    // 1. Verificar que el usuario existe
    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // TODO: Verificar contraseña actual
    // if (updatePasswordDto.currentPassword) {
    //   const isValid = await bcrypt.compare(
    //     updatePasswordDto.currentPassword,
    //     existingUser.passwordHash
    //   );
    //   if (!isValid) {
    //     throw new UnauthorizedException('Current password is incorrect');
    //   }
    // }

    // 2. Actualizar contraseña (el repositorio hashea)
    try {
      const updatedUser = await this.userRepository.updatePassword({
        userId: id,
        newPassword: updatePasswordDto.newPassword,
      });

      return updatedUser;
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      throw error;
    }
  }
}
