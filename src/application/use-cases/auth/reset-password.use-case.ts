import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import type { IJwtRepository } from '@domain/repositories/jwt.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IEmailRepository } from '@domain/repositories/email.repository.interface';

/**
 * ResetPasswordUseCase (Application Layer)
 *
 * Caso de uso para restablecer la contraseña usando el token recibido por email.
 *
 * Flujo:
 * 1. Verificar el token de reset (válido y no expirado)
 * 2. Buscar el usuario por ID del token
 * 3. Validar que el email del token coincida con el del usuario (seguridad)
 * 4. Actualizar la contraseña (el repositorio hace el hash con bcrypt)
 * 5. Enviar email de confirmación del cambio
 * 6. Retornar mensaje de éxito
 *
 * Reglas de negocio:
 * - Token debe ser válido, no expirado, y de tipo 'password_reset'
 * - Usuario debe existir
 * - Email del token debe coincidir con el del usuario (validación extra)
 * - La contraseña se hashea automáticamente en el repositorio
 * - Envío de email de confirmación es "fire and forget"
 *
 * NOTA: Los tokens JWT existentes NO se invalidan (stateless).
 * Las sesiones activas del usuario seguirán funcionando hasta que expiren.
 */
@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject('IJwtRepository')
    private readonly jwtRepository: IJwtRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IEmailRepository')
    private readonly emailRepository: IEmailRepository,
  ) {}

  async execute(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // 1. Verificar token de reset (lanza excepción si inválido/expirado)
    let payload;
    try {
      payload = await this.jwtRepository.verifyPasswordResetToken(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // 2. Validar tipo de token (seguridad adicional)
    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException('Invalid token type');
    }

    // 3. Buscar usuario por ID del token
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 4. Validar que el email del token coincida con el del usuario (seguridad)
    if (user.email !== payload.email) {
      throw new UnauthorizedException('Token does not match user email');
    }

    // 5. Actualizar contraseña (el repositorio hace bcrypt hash)
    await this.userRepository.updatePassword({
      userId: user.id,
      newPassword,
    });

    // 6. Enviar email de confirmación (fire and forget - no bloquea)
    this.emailRepository
      .sendPasswordChangedEmail(user.email, user.name)
      .catch((error) => {
        console.error(
          `Failed to send password changed email to ${user.email}:`,
          error,
        );
      });

    // 7. Retornar mensaje de éxito
    return {
      message: 'Contraseña restablecida correctamente',
    };
  }
}
