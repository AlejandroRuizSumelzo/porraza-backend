import { Injectable, Inject } from '@nestjs/common';
import type { IJwtRepository } from '@domain/repositories/jwt.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IEmailRepository } from '@domain/repositories/email.repository.interface';

/**
 * RequestPasswordResetUseCase (Application Layer)
 *
 * Caso de uso para solicitar el restablecimiento de contraseña.
 *
 * Flujo:
 * 1. Buscar usuario por email
 * 2. Validar que el usuario existe y está activo
 * 3. Generar token de reset (válido por 1 hora)
 * 4. Enviar email con enlace de recuperación
 * 5. Retornar mensaje genérico (no revela si el email existe)
 *
 * Reglas de negocio:
 * - Siempre devuelve el mismo mensaje (seguridad: no revela si el email existe)
 * - Solo envía email si el usuario existe y está activo
 * - Token expira en 1 hora (más corto que email verification por seguridad)
 * - Envío de email es "fire and forget" (no bloquea el flujo)
 */
@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject('IJwtRepository')
    private readonly jwtRepository: IJwtRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IEmailRepository')
    private readonly emailRepository: IEmailRepository,
  ) {}

  async execute(email: string): Promise<{ message: string }> {
    // 1. Buscar usuario por email
    const user = await this.userRepository.findByEmail(email);

    // 2. Si no existe o está inactivo, devolver mensaje genérico (seguridad)
    // No revelar si el email existe en el sistema (prevenir enumeración de usuarios)
    if (!user || !user.isActive) {
      return {
        message: 'Si el email existe, recibirás un enlace de recuperación.',
      };
    }

    // 3. Generar token de reset (1 hora de expiración)
    const resetToken = await this.jwtRepository.generatePasswordResetToken(
      user.id,
      user.email,
    );

    // 4. Enviar email con enlace de reset (fire and forget - no bloquea)
    this.emailRepository
      .sendPasswordResetEmail(user.email, resetToken, user.name)
      .catch((error) => {
        console.error(
          `Failed to send password reset email to ${user.email}:`,
          error,
        );
      });

    // 5. Respuesta genérica (no revela si el email existe)
    return {
      message: 'Si el email existe, recibirás un enlace de recuperación.',
    };
  }
}
