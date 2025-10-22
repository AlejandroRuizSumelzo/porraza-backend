import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import type { IJwtRepository } from '@domain/repositories/jwt.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IEmailRepository } from '@domain/repositories/email.repository.interface';
import type { User } from '@domain/entities/user.entity';
import type { VerifyEmailDto } from '@adapters/dtos/auth/verify-email.dto';

/**
 * VerifyEmailUseCase (Application Layer)
 *
 * Caso de uso para verificar el email de un usuario.
 *
 * Flujo:
 * 1. Verificar el token JWT
 * 2. Buscar el usuario por ID
 * 3. Validar que el email del token coincida con el del usuario
 * 4. Marcar email como verificado (si no lo está ya)
 * 5. Enviar email de bienvenida (opcional)
 * 6. Retornar usuario verificado
 *
 * Reglas de negocio:
 * - Token debe ser válido y no expirado (24h)
 * - Usuario debe existir
 * - Email del token debe coincidir con email del usuario
 * - Operación es idempotente (si ya está verificado, retorna success)
 */
@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject('IJwtRepository')
    private readonly jwtRepository: IJwtRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IEmailRepository')
    private readonly emailRepository: IEmailRepository,
  ) {}

  async execute(verifyDto: VerifyEmailDto): Promise<User> {
    // 1. Verificar el token JWT
    let payload;
    try {
      payload = await this.jwtRepository.verifyEmailVerificationToken(
        verifyDto.token,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    // 2. Buscar usuario
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 3. Verificar que el email coincida (seguridad extra)
    if (user.email !== payload.email) {
      throw new UnauthorizedException('Token does not match user email');
    }

    // 4. Si ya está verificado, retornar sin hacer nada (idempotente)
    if (user.isEmailVerified) {
      return user;
    }

    // 5. Marcar email como verificado
    const verifiedUser = await this.userRepository.verifyEmail(user.id);

    // 6. Enviar email de bienvenida (fire and forget)
    this.emailRepository
      .sendWelcomeEmail(verifiedUser.email, verifiedUser.name)
      .catch((error) => {
        console.error(
          `Failed to send welcome email to ${verifiedUser.email}:`,
          error,
        );
      });

    return verifiedUser;
  }
}
