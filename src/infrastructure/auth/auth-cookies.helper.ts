import type { Response } from 'express';
import { getCookieConfig, COOKIE_NAMES } from './cookie.config';

/**
 * AuthCookiesHelper (Infrastructure Layer)
 *
 * Helper para gestión de cookies de autenticación HTTP-only.
 *
 * Responsabilidades:
 * - Establecer cookies de access y refresh tokens
 * - Limpiar cookies en logout
 * - Extraer refresh token desde cookies o body (fallback)
 *
 * Uso:
 * - setAuthCookies: Establecer ambas cookies (login)
 * - setAccessTokenCookie: Establecer solo access token (refresh)
 * - clearAuthCookies: Limpiar todas las cookies (logout)
 * - getRefreshToken: Obtener refresh token desde cookies o body
 *
 * Seguridad:
 * - Todas las cookies son httpOnly (no accesibles desde JS)
 * - secure: true en producción (solo HTTPS)
 * - sameSite: 'lax' (protección CSRF)
 */
export class AuthCookiesHelper {
  private static config = getCookieConfig();

  /**
   * Establecer cookies de autenticación en la respuesta HTTP
   * Usado en el endpoint /auth/login
   *
   * @param res - Objeto Response de Express
   * @param accessToken - JWT access token (15 min)
   * @param refreshToken - JWT refresh token (7 días)
   */
  static setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    // Cookie para access token (15 minutos)
    const accessCookieOptions: any = {
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      path: this.config.path,
      maxAge: this.config.accessTokenMaxAge,
    };

    if (this.config.domain) {
      accessCookieOptions.domain = this.config.domain;
    }

    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, accessCookieOptions);

    // Cookie para refresh token (7 días)
    const refreshCookieOptions: any = {
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      path: this.config.path,
      maxAge: this.config.refreshTokenMaxAge,
    };

    if (this.config.domain) {
      refreshCookieOptions.domain = this.config.domain;
    }

    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, refreshCookieOptions);
  }

  /**
   * Establecer solo la cookie de access token
   * Usado en el endpoint /auth/refresh
   *
   * @param res - Objeto Response de Express
   * @param accessToken - JWT access token (15 min)
   */
  static setAccessTokenCookie(res: Response, accessToken: string): void {
    const cookieOptions: any = {
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      path: this.config.path,
      maxAge: this.config.accessTokenMaxAge,
    };

    if (this.config.domain) {
      cookieOptions.domain = this.config.domain;
    }

    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, cookieOptions);
  }

  /**
   * Limpiar cookies de autenticación (para logout)
   * Establece maxAge=0 y expira las cookies inmediatamente
   *
   * @param res - Objeto Response de Express
   */
  static clearAuthCookies(res: Response): void {
    const cookieOptions: any = {
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      path: this.config.path,
    };

    if (this.config.domain) {
      cookieOptions.domain = this.config.domain;
    }

    res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, cookieOptions);
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, cookieOptions);
  }

  /**
   * Obtener refresh token desde cookies o body (con fallback)
   * Prioridad 1: Cookie (más seguro)
   * Prioridad 2: Body (compatibilidad con clientes legacy)
   *
   * @param cookies - Objeto cookies parseadas por cookie-parser
   * @param bodyToken - Token del body (opcional)
   * @returns Refresh token o null si no se encuentra
   */
  static getRefreshToken(
    cookies: Record<string, string>,
    bodyToken?: string,
  ): string | null {
    // Prioridad 1: Cookie (más seguro)
    const cookieToken = cookies[COOKIE_NAMES.REFRESH_TOKEN];
    if (cookieToken) {
      return cookieToken;
    }

    // Prioridad 2: Body (fallback para compatibilidad)
    if (bodyToken) {
      return bodyToken;
    }

    return null;
  }
}
