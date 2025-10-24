import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import type {
  IJwtRepository,
  JwtPayload,
  TokenPair,
} from '@domain/repositories/jwt.repository.interface';
import { getJwtConfig } from './auth.config';

/**
 * JwtServiceImpl (Infrastructure Layer)
 *
 * Implementación concreta de IJwtRepository usando @nestjs/jwt.
 * Esta clase pertenece a la capa de infraestructura y usa librerías externas.
 *
 * Responsabilidades:
 * - Generar tokens JWT (access y refresh)
 * - Verificar y decodificar tokens
 * - Validar tipos de tokens
 * - Manejar errores de JWT (expiración, firma inválida, etc.)
 *
 * Configuración:
 * - Lee configuración desde auth.config.ts
 * - Access token: 15 minutos (configurable)
 * - Refresh token: 7 días (configurable)
 *
 * IMPORTANTE:
 * - Los tokens NO se guardan en base de datos (stateless JWT)
 * - Una vez emitido, un token es válido hasta su expiración
 * - Para invalidar tokens se necesitaría una blacklist (fuera del scope inicial)
 */
@Injectable()
export class JwtServiceImpl implements IJwtRepository {
  private readonly jwtConfig = getJwtConfig();

  constructor(private readonly jwtService: NestJwtService) {}

  /**
   * Genera un par de tokens (access + refresh)
   * Usado durante el login
   */
  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email),
      this.generateRefreshToken(userId, email),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtConfig.accessTokenExpirationSeconds,
    };
  }

  /**
   * Genera un access token
   * Usado durante login y refresh
   */
  async generateAccessToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'access',
    };

    return this.jwtService.signAsync(
      payload as any,
      {
        secret: this.jwtConfig.secret,
        expiresIn: this.jwtConfig.accessTokenExpiration,
      } as any,
    );
  }

  /**
   * Genera un refresh token
   * Usado solo durante login
   */
  private async generateRefreshToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'refresh',
    };

    return this.jwtService.signAsync(
      payload as any,
      {
        secret: this.jwtConfig.secret,
        expiresIn: this.jwtConfig.refreshTokenExpiration,
      } as any,
    );
  }

  /**
   * Verifica y decodifica cualquier token JWT
   * Valida firma y expiración
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtConfig.secret,
      });

      // Validar que el payload tenga los campos requeridos
      if (!payload.sub || !payload.email || !payload.type) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return payload;
    } catch (error: any) {
      // Manejar errores específicos de JWT
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }

      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }

      // Re-lanzar si ya es UnauthorizedException
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Otros errores
      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Verifica que un token sea de tipo 'refresh'
   * Previene que se usen access tokens en el endpoint de refresh
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const payload = await this.verifyToken(token);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException(
        'Invalid token type. Expected refresh token',
      );
    }

    return payload;
  }

  /**
   * Genera un token de verificación de email
   * Expira en 24 horas
   */
  async generateEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'email_verification',
    };

    return this.jwtService.signAsync(
      payload as any,
      {
        secret: this.jwtConfig.secret,
        expiresIn: '24h', // Token expira en 24 horas
      } as any,
    );
  }

  /**
   * Verifica que un token sea de tipo 'email_verification'
   * Previene que se usen otros tipos de tokens
   */
  async verifyEmailVerificationToken(token: string): Promise<JwtPayload> {
    const payload = await this.verifyToken(token);

    if (payload.type !== 'email_verification') {
      throw new UnauthorizedException(
        'Invalid token type. Expected email verification token',
      );
    }

    return payload;
  }

  /**
   * Genera un token de restablecimiento de contraseña
   * Expira en 1 hora (más corto que email verification por seguridad)
   */
  async generatePasswordResetToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'password_reset',
    };

    return this.jwtService.signAsync(
      payload as any,
      {
        secret: this.jwtConfig.secret,
        expiresIn: '1h', // Token expira en 1 hora (seguridad)
      } as any,
    );
  }

  /**
   * Verifica que un token sea de tipo 'password_reset'
   * Previene que se usen otros tipos de tokens
   */
  async verifyPasswordResetToken(token: string): Promise<JwtPayload> {
    const payload = await this.verifyToken(token);

    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException(
        'Invalid token type. Expected password reset token',
      );
    }

    return payload;
  }
}
