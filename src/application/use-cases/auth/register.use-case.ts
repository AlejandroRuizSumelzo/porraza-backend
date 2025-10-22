import { Injectable, Inject, ConflictException } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IJwtRepository } from '@domain/repositories/jwt.repository.interface';
import type { IEmailRepository } from '@domain/repositories/email.repository.interface';
import type { User } from '@domain/entities/user.entity';
import type { RegisterDto } from '@adapters/dtos/auth/register.dto';

/**
 * RegisterResult
 *
 * Resultado del caso de uso de registro.
 */
export interface RegisterResult {
  user: User;
  message: string;
}

/**
 * RegisterUseCase (Application Layer)
 *
 * Caso de uso para registrar un nuevo usuario y enviar email de verificación.
 *
 * Flujo:
 * 1. Validar que el email no exista
 * 2. Crear usuario (email_verified = FALSE por defecto en BD)
 * 3. Generar token de verificación JWT (24h)
 * 4. Enviar email de verificación (async, no bloquea)
 * 5. Retornar usuario + mensaje
 *
 * Reglas de negocio:
 * - Email debe ser único
 * - Usuario se crea con email_verified = FALSE
 * - Usuario NO puede hacer login hasta verificar email
 * - Si falla el envío de email, no se rollback (usuario ya creado)
 */
@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IJwtRepository')
    private readonly jwtRepository: IJwtRepository,
    @Inject('IEmailRepository')
    private readonly emailRepository: IEmailRepository,
  ) {}

  async execute(registerDto: RegisterDto): Promise<RegisterResult> {
    // 1. Validar que el email no exista
    const existingUser = await this.userRepository.findByEmail(
      registerDto.email,
    );

    if (existingUser) {
      throw new ConflictException(
        `User with email ${registerDto.email} already exists`,
      );
    }

    // 2. Crear usuario (email_verified = FALSE por defecto)
    let user: User;
    try {
      user = await this.userRepository.create({
        email: registerDto.email,
        password: registerDto.password,
        name: registerDto.name,
      });
    } catch (error: any) {
      if (error.message === 'Email already exists') {
        throw new ConflictException(
          `User with email ${registerDto.email} already exists`,
        );
      }
      throw error;
    }

    // 3. Generar token de verificación
    const verificationToken =
      await this.jwtRepository.generateEmailVerificationToken(
        user.id,
        user.email,
      );

    // 4. Enviar email de verificación (fire and forget - no bloquear)
    this.emailRepository
      .sendVerificationEmail(user.email, verificationToken, user.name)
      .catch((error) => {
        console.error(
          `Failed to send verification email to ${user.email}:`,
          error,
        );
        // TODO: Implementar retry queue (ej: Bull, BullMQ) para reintentar
      });

    // 5. Retornar resultado
    return {
      user,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }
}
