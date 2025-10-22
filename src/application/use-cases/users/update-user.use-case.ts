import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { User } from '@domain/entities/user.entity';
import type { UpdateUserDto } from '@adapters/dtos/user/update-user.dto';

/**
 * UpdateUserUseCase (Application Layer)
 *
 * Caso de uso para actualizar el perfil de un usuario.
 *
 * Responsabilidades:
 * 1. Verificar que el usuario existe
 * 2. Si se actualiza email, verificar que no esté en uso por otro usuario
 * 3. Delegar actualización al repositorio
 * 4. Retornar usuario actualizado
 *
 * NOTA: La contraseña NO se actualiza aquí, tiene su propio use case
 * (UpdatePasswordUseCase) por razones de seguridad.
 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de actualización de usuario
   *
   * @param id - UUID del usuario a actualizar
   * @param updateUserDto - Datos a actualizar (name, email, isActive)
   * @returns Usuario actualizado
   * @throws NotFoundException si el usuario no existe
   * @throws ConflictException si el nuevo email ya está en uso
   */
  async execute(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // 1. Verificar que el usuario existe
    const existingUser = await this.userRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // 2. Si se actualiza el email, verificar que no esté en uso
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(
        updateUserDto.email,
      );

      if (userWithEmail) {
        throw new ConflictException(
          `Email ${updateUserDto.email} is already in use`,
        );
      }
    }

    // 3. Actualizar usuario
    try {
      const updatedUser = await this.userRepository.update(id, {
        email: updateUserDto.email,
        name: updateUserDto.name,
        isActive: updateUserDto.isActive,
      });

      return updatedUser;
    } catch (error: any) {
      // Manejar error de email duplicado (race condition)
      if (error.message === 'Email already exists') {
        throw new ConflictException(
          `Email ${updateUserDto.email} is already in use`,
        );
      }

      // Manejar error de usuario no encontrado
      if (error.message === 'User not found') {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Re-lanzar otros errores
      throw error;
    }
  }
}
