/**
 * Cookie Configuration (Infrastructure Layer)
 *
 * Configuración centralizada para cookies de autenticación HTTP-only.
 *
 * Opciones de seguridad:
 * - httpOnly: true - Previene acceso desde JavaScript (protección XSS)
 * - secure: true en producción - Solo envía cookies por HTTPS
 * - sameSite: 'lax' - Protección básica contra CSRF
 * - path: '/' - Cookie disponible en todas las rutas
 *
 * IMPORTANTE:
 * - En producción, secure debe ser true (requiere HTTPS)
 * - sameSite 'lax' permite navegación desde externos pero bloquea POST cross-site
 * - maxAge se especifica en milisegundos
 */

export interface CookieConfig {
  /** Previene acceso desde JavaScript (XSS protection) */
  httpOnly: boolean;
  /** Solo HTTPS en producción */
  secure: boolean;
  /** Protección CSRF - 'strict' | 'lax' | 'none' */
  sameSite: 'strict' | 'lax' | 'none';
  /** Cookie disponible en todas las rutas */
  path: string;
  /** Duración del access token en milisegundos */
  accessTokenMaxAge: number;
  /** Duración del refresh token en milisegundos */
  refreshTokenMaxAge: number;
}

/**
 * Nombres de cookies para tokens de autenticación
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

/**
 * Obtiene la configuración de cookies según el entorno
 */
export function getCookieConfig(): CookieConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Siempre true para seguridad
    secure: isProduction, // Solo HTTPS en producción
    sameSite: 'lax', // Protección CSRF moderada
    path: '/', // Todas las rutas
    accessTokenMaxAge: 15 * 60 * 1000, // 15 minutos en milisegundos
    refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 días en milisegundos
  };
}
