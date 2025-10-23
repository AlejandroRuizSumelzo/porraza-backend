import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { IJwtRepository } from '@domain/repositories/jwt.repository.interface';
import type { RefreshTokenDto } from '@adapters/dtos/auth/refresh-token.dto';

/**
 * RefreshTokenResult
 *
 * Resultado del caso de uso de refresh token.
 * Contiene el nuevo access token y el tiempo de expiración.
 */
export interface RefreshTokenResult {
  accessToken: string;
  expiresIn: number;
}

/**
 * RefreshTokenUseCase (Application Layer)
 *
 * Caso de uso para refrescar un access token expirado usando un refresh token válido.
 *
 * Flujo de ejecución:
 * 1. Verificar y decodificar el refresh token
 * 2. Validar que sea de tipo 'refresh' (no 'access')
 * 3. Buscar el usuario por ID (del payload del token)
 * 4. Verificar que el usuario aún exista
 * 5. Validar que el usuario esté activo
 * 6. Generar un nuevo access token
 * 7. Retornar nuevo access token
 *
 * Reglas de negocio:
 * - Solo se aceptan tokens de tipo 'refresh'
 * - El usuario debe existir en la BD
 * - El usuario debe estar activo (isActive = true)
 * - Si el refresh token ha expirado → 401 Unauthorized
 * - Si el usuario está inactivo → 403 Forbidden
 * - Si el usuario no existe → 401 Unauthorized (por seguridad, no revelar que fue eliminado)
 *
 * Seguridad:
 * - Validar tipo de token (prevenir uso de access tokens)
 * - Verificar que el usuario aún esté activo (podría haber sido desactivado)
 * - Verificar que el usuario aún exista (podría haber sido eliminado)
 *
 * Inyección de dependencias:
 * - IJwtRepository: Para verificar refresh token y generar nuevo access token
 * - IUserRepository: Para verificar que el usuario exista y esté activo
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject('IJwtRepository')
    private readonly jwtRepository: IJwtRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de refresh token
   *
   * @param refreshTokenDto - DTO con el refresh token (o objeto con refreshToken como string)
   * @returns Nuevo access token + tiempo de expiración
   * @throws UnauthorizedException si el refresh token es inválido o ha expirado
   * @throws ForbiddenException si el usuario está inactivo
   */
  async execute(
    refreshTokenDto: RefreshTokenDto | { refreshToken: string },
  ): Promise<RefreshTokenResult> {
    // 1. Verificar y decodificar el refresh token
    // Esto también valida que sea de tipo 'refresh'
    const payload = await this.jwtRepository.verifyRefreshToken(
      refreshTokenDto.refreshToken!,
    );

    // 2. Buscar el usuario por ID (del payload)
    const user = await this.userRepository.findById(payload.sub);

    // 3. Verificar que el usuario aún exista
    if (!user) {
      // Usuario fue eliminado después de emitir el refresh token
      throw new UnauthorizedException('Invalid token');
    }

    // 4. Validar que el usuario esté activo
    if (!user.canLogin()) {
      // Usuario fue desactivado después de emitir el refresh token
      throw new ForbiddenException(
        'Account is inactive. Please contact support.',
      );
    }

    // 5. Generar un nuevo access token
    const accessToken = await this.jwtRepository.generateAccessToken(
      user.id,
      user.email,
    );

    // 6. Retornar nuevo access token
    return {
      accessToken,
      expiresIn: 900, // 15 minutos en segundos (debe coincidir con config)
    };
  }
}
