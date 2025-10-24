/**
 * JWT Payload Interface
 *
 * Estructura del payload que se almacena dentro del JWT.
 * Este payload es visible (no encriptado), solo firmado.
 *
 * Campos:
 * - sub: Subject (ID del usuario) - estándar JWT
 * - email: Email del usuario (útil para debugging/logs)
 * - type: Tipo de token ('access' o 'refresh')
 * - iat: Issued at (timestamp de creación) - automático por JWT
 * - exp: Expiration (timestamp de expiración) - automático por JWT
 */
export interface JwtPayload {
  /** User ID (Subject) */
  sub: string;
  /** User email */
  email: string;
  /** Token type */
  type: 'access' | 'refresh' | 'email_verification' | 'password_reset';
}

/**
 * Token Pair Interface
 *
 * Representa el par de tokens (access + refresh) generados durante el login.
 */
export interface TokenPair {
  /** Access token (corta duración, ej: 15m) */
  accessToken: string;
  /** Refresh token (larga duración, ej: 7d) */
  refreshToken: string;
  /** Duración del access token en segundos */
  expiresIn: number;
}

/**
 * IJwtRepository (Domain Layer - Interface)
 *
 * Interface que define las operaciones relacionadas con JWT.
 * Siguiendo Clean Architecture, el dominio define la interface
 * y la infraestructura proporciona la implementación concreta.
 *
 * Responsabilidades:
 * - Generar access tokens y refresh tokens
 * - Verificar y decodificar tokens
 * - Validar que los tokens sean del tipo correcto
 *
 * IMPORTANTE:
 * - Esta interface NO tiene dependencias de @nestjs/jwt (inversión de dependencias)
 * - La implementación concreta usará @nestjs/jwt internamente
 * - Permite cambiar la implementación (ej: a otra librería JWT) sin afectar el dominio
 */
export interface IJwtRepository {
  /**
   * Genera un par de tokens (access + refresh) para un usuario
   *
   * @param userId - ID del usuario
   * @param email - Email del usuario
   * @returns Par de tokens (accessToken, refreshToken, expiresIn)
   */
  generateTokenPair(userId: string, email: string): Promise<TokenPair>;

  /**
   * Genera solo un access token
   * Útil para el flujo de refresh token
   *
   * @param userId - ID del usuario
   * @param email - Email del usuario
   * @returns Access token
   */
  generateAccessToken(userId: string, email: string): Promise<string>;

  /**
   * Verifica y decodifica un token JWT
   *
   * @param token - Token JWT a verificar
   * @returns Payload decodificado si es válido
   * @throws Error si el token es inválido o ha expirado
   */
  verifyToken(token: string): Promise<JwtPayload>;

  /**
   * Verifica que un token sea de tipo 'refresh'
   * Usado en el endpoint de refresh token para validar que no se esté
   * usando un access token en lugar de un refresh token
   *
   * @param token - Token JWT a verificar
   * @returns Payload si es válido y de tipo 'refresh'
   * @throws Error si no es un refresh token válido
   */
  verifyRefreshToken(token: string): Promise<JwtPayload>;

  /**
   * Genera un token de verificación de email
   * Se envía por email al usuario después del registro
   *
   * @param userId - ID del usuario
   * @param email - Email del usuario
   * @returns Token JWT con expiración de 24h
   */
  generateEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<string>;

  /**
   * Verifica que un token sea de tipo 'email_verification'
   * Usado en el endpoint de verificación de email
   *
   * @param token - Token JWT a verificar
   * @returns Payload si es válido y de tipo 'email_verification'
   * @throws Error si no es un token de verificación válido o ha expirado
   */
  verifyEmailVerificationToken(token: string): Promise<JwtPayload>;

  /**
   * Genera un token de restablecimiento de contraseña
   * Se envía por email al usuario cuando solicita restablecer su contraseña
   *
   * @param userId - ID del usuario
   * @param email - Email del usuario
   * @returns Token JWT con expiración de 1h (seguridad)
   */
  generatePasswordResetToken(userId: string, email: string): Promise<string>;

  /**
   * Verifica que un token sea de tipo 'password_reset'
   * Usado en el endpoint de restablecimiento de contraseña
   *
   * @param token - Token JWT a verificar
   * @returns Payload si es válido y de tipo 'password_reset'
   * @throws Error si no es un token de reset válido o ha expirado
   */
  verifyPasswordResetToken(token: string): Promise<JwtPayload>;
}
