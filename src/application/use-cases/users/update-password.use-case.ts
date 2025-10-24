import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IEmailRepository } from '@domain/repositories/email.repository.interface';

/**
 * UpdatePasswordUseCase (Application Layer)
 *
 * Caso de uso para actualizar la contraseña de un usuario autenticado.
 *
 * Flujo:
 * 1. Verificar que el usuario existe
 * 2. Verificar la contraseña actual (seguridad)
 * 3. Validar que la nueva contraseña sea diferente
 * 4. Actualizar contraseña (el repositorio hashea con bcrypt)
 * 5. Enviar email de notificación del cambio
 * 6. Retornar mensaje de éxito
 *
 * Reglas de negocio:
 * - Requiere contraseña actual correcta (no permitir cambio con solo sesión activa)
 * - Nueva contraseña debe ser diferente a la actual
 * - Notificar por email (detectar acceso no autorizado)
 *
 * NOTA: Los tokens JWT existentes NO se invalidan (stateless).
 * Las sesiones activas seguirán funcionando hasta que expiren.
 * Mejora futura: implementar blacklist o passwordChangedAt timestamp.
 */
@Injectable()
export class UpdatePasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IEmailRepository')
    private readonly emailRepository: IEmailRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de actualización de contraseña
   *
   * @param id - UUID del usuario
   * @param currentPassword - Contraseña actual (requerida)
   * @param newPassword - Nueva contraseña
   * @returns Mensaje de éxito
   * @throws NotFoundException si el usuario no existe
   * @throws UnauthorizedException si la contraseña actual es incorrecta
   * @throws BadRequestException si la nueva contraseña es igual a la actual
   */
  async execute(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    // 2. Verificar contraseña actual (seguridad crítica)
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // 3. Validar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // 4. Actualizar contraseña (el repositorio hashea con bcrypt)
    await this.userRepository.updatePassword({
      userId: user.id,
      newPassword,
    });

    // 5. Enviar email de notificación (fire and forget - no bloquea)
    this.emailRepository
      .sendPasswordChangedEmail(user.email, user.name)
      .catch((error) => {
        console.error(
          `Failed to send password changed email to ${user.email}:`,
          error,
        );
      });

    // 6. Retornar mensaje de éxito
    return {
      message: 'Password updated successfully',
    };
  }
}
