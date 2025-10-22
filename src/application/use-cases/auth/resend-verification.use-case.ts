import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IJwtRepository } from '@domain/repositories/jwt.repository.interface';
import type { IEmailRepository } from '@domain/repositories/email.repository.interface';

/**
 * ResendVerificationUseCase (Application Layer)
 *
 * Caso de uso para reenviar email de verificación.
 *
 * Flujo:
 * 1. Buscar usuario por email
 * 2. Validar que el usuario exista
 * 3. Validar que el email NO esté verificado
 * 4. Generar nuevo token de verificación
 * 5. Enviar email de verificación
 *
 * Reglas de negocio:
 * - Usuario debe existir
 * - Usuario NO debe estar ya verificado
 * - Se genera un nuevo token (el anterior puede seguir funcionando si no expiró)
 */
@Injectable()
export class ResendVerificationUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IJwtRepository')
    private readonly jwtRepository: IJwtRepository,
    @Inject('IEmailRepository')
    private readonly emailRepository: IEmailRepository,
  ) {}

  async execute(email: string): Promise<void> {
    // 1. Buscar usuario por email
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    // 2. Validar que el email NO esté verificado
    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // 3. Generar nuevo token de verificación
    const verificationToken =
      await this.jwtRepository.generateEmailVerificationToken(
        user.id,
        user.email,
      );

    // 4. Enviar email de verificación
    // En este caso NO usamos fire-and-forget porque el usuario
    // está esperando activamente el email
    await this.emailRepository.sendVerificationEmail(
      user.email,
      verificationToken,
      user.name,
    );
  }
}
