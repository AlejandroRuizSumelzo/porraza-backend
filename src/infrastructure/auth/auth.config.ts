/**
 * Auth Configuration (Infrastructure Layer)
 *
 * Configuración centralizada para autenticación JWT.
 * Lee variables de entorno y proporciona valores por defecto seguros.
 *
 * Variables de entorno requeridas:
 * - JWT_SECRET: Clave secreta para firmar tokens (OBLIGATORIO en producción)
 * - JWT_ACCESS_EXPIRATION: Duración del access token (default: 15m)
 * - JWT_REFRESH_EXPIRATION: Duración del refresh token (default: 7d)
 *
 * IMPORTANTE:
 * - En producción, JWT_SECRET debe ser una clave aleatoria fuerte (min 32 caracteres)
 * - Nunca commitear JWT_SECRET al repositorio
 * - Usar diferentes secrets para dev/staging/prod
 */

export interface JwtConfig {
  /** Clave secreta para firmar tokens JWT */
  secret: string;
  /** Duración del access token (formato: ms, ej: '15m', '1h', '900s') */
  accessTokenExpiration: string;
  /** Duración del refresh token (formato: ms, ej: '7d', '30d') */
  refreshTokenExpiration: string;
  /** Duración del access token en segundos (para el response) */
  accessTokenExpirationSeconds: number;
}

/**
 * Obtiene la configuración JWT desde variables de entorno
 * @throws Error si JWT_SECRET no está definido en producción
 */
export function getJwtConfig(): JwtConfig {
  const secret = process.env.JWT_SECRET;
  const accessExpiration = process.env.JWT_ACCESS_EXPIRATION || '15m';
  const refreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';

  // Validar que JWT_SECRET esté definido
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'JWT_SECRET environment variable is required in production',
      );
    }

    // En desarrollo, usar un secret por defecto con warning
    console.warn(
      '⚠️  JWT_SECRET not set. Using default secret for development. DO NOT USE IN PRODUCTION!',
    );
  }

  return {
    secret: secret || 'dev-secret-change-in-production-min-32-chars',
    accessTokenExpiration: accessExpiration,
    refreshTokenExpiration: refreshExpiration,
    accessTokenExpirationSeconds: parseExpirationToSeconds(accessExpiration),
  };
}

/**
 * Convierte una expresión de tiempo (ej: '15m', '7d') a segundos
 * Soporta: s (segundos), m (minutos), h (horas), d (días)
 */
function parseExpirationToSeconds(expiration: string): number {
  const match = expiration.match(/^(\d+)([smhd])$/);

  if (!match) {
    console.warn(
      `Invalid expiration format: ${expiration}. Using default 900 seconds (15m)`,
    );
    return 900; // 15 minutos por defecto
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return 900; // 15 minutos por defecto
  }
}
