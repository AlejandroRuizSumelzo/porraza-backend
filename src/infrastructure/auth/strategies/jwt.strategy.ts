import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@domain/repositories/jwt.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import { getJwtConfig } from '../auth.config';

/**
 * JwtStrategy (Infrastructure Layer)
 *
 * Estrategia de Passport para validar tokens JWT en requests HTTP.
 * Esta clase se ejecuta automáticamente cuando un endpoint está protegido
 * con @UseGuards(JwtAuthGuard).
 *
 * Flujo de ejecución:
 * 1. Cliente envía request con header: Authorization: Bearer <token>
 * 2. ExtractJwt.fromAuthHeaderAsBearerToken() extrae el token
 * 3. Passport verifica la firma y expiración del token
 * 4. Si el token es válido, se llama al método validate() con el payload
 * 5. validate() busca el usuario en BD y verifica que esté activo
 * 6. El usuario se adjunta a request.user (accesible en controllers)
 * 7. Si algo falla, se retorna 401 Unauthorized
 *
 * Configuración:
 * - jwtFromRequest: Extrae token del header Authorization
 * - ignoreExpiration: false (rechazar tokens expirados)
 * - secretOrKey: Clave secreta para verificar firma
 *
 * IMPORTANTE:
 * - Solo valida tokens de tipo 'access' (no 'refresh')
 * - Verifica que el usuario exista y esté activo en cada request
 * - Si el usuario fue eliminado/desactivado, el token se rechaza aunque sea válido
 *
 * Request User:
 * - Después de validate(), request.user contiene el objeto User completo
 * - Accesible en controllers con @Req() o decorador personalizado @CurrentUser()
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {
    const jwtConfig = getJwtConfig();

    super({
      // Extraer token del header Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // NO ignorar expiración (rechazar tokens expirados)
      ignoreExpiration: false,

      // Clave secreta para verificar la firma del token
      secretOrKey: jwtConfig.secret,
    });
  }

  /**
   * Método validate() llamado por Passport después de verificar el token
   *
   * Este método se ejecuta SOLO si:
   * - El token tiene una firma válida
   * - El token NO ha expirado
   *
   * Responsabilidades:
   * - Buscar el usuario en BD
   * - Verificar que el usuario exista
   * - Verificar que el usuario esté activo
   * - Verificar que el token sea de tipo 'access' (no 'refresh')
   * - Retornar el usuario completo (se adjunta a request.user)
   *
   * @param payload - Payload decodificado del JWT
   * @returns Usuario completo (se adjunta a request.user)
   * @throws UnauthorizedException si el usuario no existe, está inactivo, o el token es de tipo refresh
   */
  async validate(payload: JwtPayload) {
    // Validar que sea un access token (no refresh token)
    if (payload.type !== 'access') {
      throw new UnauthorizedException(
        'Invalid token type. Use access token for API requests',
      );
    }

    // Buscar el usuario por ID (del payload)
    const user = await this.userRepository.findById(payload.sub);

    // Verificar que el usuario exista
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verificar que el usuario esté activo
    if (!user.canLogin()) {
      throw new UnauthorizedException(
        'Account is inactive. Please contact support.',
      );
    }

    // Retornar el usuario completo
    // Passport lo adjunta automáticamente a request.user
    return user;
  }
}
