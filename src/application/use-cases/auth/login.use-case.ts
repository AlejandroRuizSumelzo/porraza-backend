import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type {
  IJwtRepository,
  TokenPair,
} from '@domain/repositories/jwt.repository.interface';
import type { User } from '@domain/entities/user.entity';
import type { LoginDto } from '@adapters/dtos/auth/login.dto';

/**
 * LoginResult
 *
 * Resultado del caso de uso de login.
 * Contiene el usuario autenticado y los tokens generados.
 */
export interface LoginResult {
  user: User;
  tokens: TokenPair;
}

/**
 * LoginUseCase (Application Layer)
 *
 * Caso de uso para autenticar un usuario y generar tokens JWT.
 *
 * Flujo de ejecución:
 * 1. Buscar usuario por email
 * 2. Verificar que el usuario exista
 * 3. Verificar la contraseña con bcrypt
 * 4. Validar que el usuario esté activo (puede hacer login)
 * 5. Generar par de tokens JWT (access + refresh)
 * 6. Actualizar last_login_at
 * 7. Retornar usuario + tokens
 *
 * Reglas de negocio:
 * - Email debe existir en la BD
 * - Password debe coincidir con el hash almacenado
 * - Usuario debe estar activo (isActive = true)
 * - Si el usuario está inactivo, se retorna 403 Forbidden
 * - Si las credenciales son incorrectas, se retorna 401 Unauthorized
 *
 * Seguridad:
 * - NO revelar si el email existe o no (siempre retornar "Invalid credentials")
 * - Usar bcrypt.compare() para comparar passwords (timing-safe)
 * - Actualizar last_login_at solo después de login exitoso
 *
 * Inyección de dependencias:
 * - IUserRepository: Para buscar usuario y actualizar last_login_at
 * - IJwtRepository: Para generar tokens JWT
 */
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IJwtRepository')
    private readonly jwtRepository: IJwtRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de login
   *
   * @param loginDto - Credenciales del usuario (email, password)
   * @returns Usuario autenticado + tokens JWT
   * @throws UnauthorizedException si las credenciales son incorrectas
   * @throws ForbiddenException si el usuario está inactivo
   */
  async execute(loginDto: LoginDto): Promise<LoginResult> {
    // 1. Buscar usuario por email
    const user = await this.userRepository.findByEmail(loginDto.email);

    // 2. Verificar que el usuario exista
    // IMPORTANTE: No revelar si el email existe o no (seguridad)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Validar que el usuario esté activo
    if (!user.canLogin()) {
      throw new ForbiddenException(
        'Account is inactive. Please contact support.',
      );
    }

    // 5. Generar tokens JWT
    const tokens = await this.jwtRepository.generateTokenPair(
      user.id,
      user.email,
    );

    // 6. Actualizar last_login_at
    // NOTA: Lo hacemos de forma asíncrona y no esperamos (fire and forget)
    // Si falla, no afecta al login (el usuario ya tiene sus tokens)
    this.userRepository.updateLastLogin(user.id).catch((error) => {
      console.error(
        `Failed to update last_login_at for user ${user.id}:`,
        error,
      );
    });

    // 7. Retornar resultado
    return {
      user,
      tokens,
    };
  }
}
