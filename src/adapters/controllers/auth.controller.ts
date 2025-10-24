import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto } from '@adapters/dtos/auth/login.dto';
import { LoginResponseDto } from '@adapters/dtos/auth/login-response.dto';
import { RefreshTokenDto } from '@adapters/dtos/auth/refresh-token.dto';
import { RegisterDto } from '@adapters/dtos/auth/register.dto';
import { RegisterResponseDto } from '@adapters/dtos/auth/register-response.dto';
import { VerifyEmailDto } from '@adapters/dtos/auth/verify-email.dto';
import { ResendVerificationDto } from '@adapters/dtos/auth/resend-verification.dto';
import { RequestPasswordResetDto } from '@adapters/dtos/auth/request-password-reset.dto';
import { ResetPasswordDto } from '@adapters/dtos/auth/reset-password.dto';
import { UserResponseDto } from '@adapters/dtos/user/user-response.dto';
import { LoginUseCase } from '@application/use-cases/auth/login.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { RegisterUseCase } from '@application/use-cases/auth/register.use-case';
import { VerifyEmailUseCase } from '@application/use-cases/auth/verify-email.use-case';
import { ResendVerificationUseCase } from '@application/use-cases/auth/resend-verification.use-case';
import { RequestPasswordResetUseCase } from '@application/use-cases/auth/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@application/use-cases/auth/reset-password.use-case';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';
import { AuthCookiesHelper } from '@infrastructure/auth/auth-cookies.helper';
import type { Request, Response } from 'express';
import type { User } from '@domain/entities/user.entity';

/**
 * Extend Express Request para incluir user
 * Después de pasar por JwtAuthGuard, request.user contiene el User de dominio
 */
interface RequestWithUser extends Request {
  user: User;
}

/**
 * AuthController (Adapters Layer)
 *
 * Controlador REST que maneja los endpoints HTTP relacionados con autenticación.
 *
 * Responsabilidades:
 * 1. Recibir requests HTTP y validar DTOs
 * 2. Delegar lógica de negocio a Use Cases
 * 3. Transformar resultados a DTOs de respuesta
 * 4. Retornar respuestas HTTP con códigos de estado apropiados
 *
 * Endpoints disponibles:
 * - POST   /auth/login   - Autenticar usuario y obtener tokens
 * - POST   /auth/refresh - Refrescar access token usando refresh token
 * - GET    /auth/me      - Obtener datos del usuario autenticado (requiere JWT)
 *
 * Validación automática:
 * - NestJS valida automáticamente los DTOs usando class-validator
 * - Si falla la validación, retorna 400 Bad Request automáticamente
 *
 * Manejo de errores:
 * - UnauthorizedException (use cases) → 401 Unauthorized (automático por NestJS)
 * - ForbiddenException (use cases) → 403 Forbidden (automático por NestJS)
 * - Otros errores → 500 Internal Server Error (automático por NestJS)
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  /**
   * POST /auth/login
   * Autenticar usuario y obtener tokens JWT
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticate a user with email and password. Returns JWT access token (15 min expiration) and refresh token (7 days expiration). The access token should be sent in the Authorization header for protected endpoints.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials',
    examples: {
      example1: {
        summary: 'Valid login credentials',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Validation failed (invalid email format, password too short, etc.)',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Email must be a valid email address',
          'Password must be at least 8 characters long',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials (wrong email or password)',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Account is inactive',
    schema: {
      example: {
        statusCode: 403,
        message: 'Account is inactive. Please contact support.',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.loginUseCase.execute(loginDto);

    // Establecer cookies HTTP-only con los tokens
    AuthCookiesHelper.setAuthCookies(
      res,
      result.tokens.accessToken,
      result.tokens.refreshToken,
    );

    // Mantener también en el body para compatibilidad
    return LoginResponseDto.create(
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.expiresIn,
      result.user,
    );
  }

  /**
   * POST /auth/refresh
   * Refrescar access token usando refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Obtain a new access token using a valid refresh token. Use this endpoint when the access token expires (after 15 minutes). The refresh token is valid for 7 days.',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token received during login',
    examples: {
      example1: {
        summary: 'Valid refresh token',
        value: {
          refreshToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2ODQzODIyfQ.yyyyy',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
    schema: {
      example: {
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.xxxxx',
        expiresIn: 900,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Missing or invalid refresh token',
    schema: {
      example: {
        statusCode: 400,
        message: ['Refresh token is required'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid or expired refresh token, or wrong token type',
    schema: {
      example: {
        statusCode: 401,
        message: 'Token has expired',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User account is inactive',
    schema: {
      example: {
        statusCode: 403,
        message: 'Account is inactive. Please contact support.',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Obtener refresh token desde cookies (prioridad) o body (fallback)
    const refreshToken = AuthCookiesHelper.getRefreshToken(
      req.cookies,
      refreshTokenDto.refreshToken,
    );

    if (!refreshToken) {
      throw new BadRequestException(
        'Refresh token is required (via cookie or request body)',
      );
    }

    // Ejecutar use case con el token obtenido
    const result = await this.refreshTokenUseCase.execute({ refreshToken });

    // Establecer cookie con el nuevo access token
    AuthCookiesHelper.setAccessTokenCookie(res, result.accessToken);

    // Mantener también en el body para compatibilidad
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * POST /auth/logout
   * Cerrar sesión y limpiar cookies de autenticación
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Clear authentication cookies. This does not invalidate the JWT tokens (they remain valid until expiration), but removes them from the browser.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful - cookies cleared',
    schema: {
      example: {
        message: 'Logout successful',
      },
    },
  })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    // Limpiar cookies HTTP-only
    AuthCookiesHelper.clearAuthCookies(res);

    return { message: 'Logout successful' };
  }

  /**
   * GET /auth/me
   * Obtener datos del usuario autenticado
   * Requiere JWT en header: Authorization: Bearer <token>
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description:
      'Retrieve information about the currently authenticated user. Requires a valid JWT access token in the Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing, invalid, or expired JWT token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  getCurrentUser(@Req() req: RequestWithUser): UserResponseDto {
    // request.user fue adjuntado por JwtAuthGuard/JwtStrategy
    return UserResponseDto.fromEntity(req.user);
  }

  /**
   * POST /auth/register
   * Registrar un nuevo usuario y enviar email de verificación
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Create a new user account. After registration, a verification email will be sent. The user CANNOT login until they verify their email by clicking the link in the email.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      example1: {
        summary: 'Valid registration',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'User registered successfully. Verification email sent. User must verify email before login.',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation failed',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already registered',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    const result = await this.registerUseCase.execute(registerDto);
    return RegisterResponseDto.create(result.user, result.message);
  }

  /**
   * POST /auth/verify-email
   * Verificar email de usuario con token JWT
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify user email',
    description:
      'Verify user email using the token received in the verification email. After verification, the user can login.',
  })
  @ApiBody({
    type: VerifyEmailDto,
    description: 'Email verification token',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully. User can now login.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  async verifyEmail(
    @Body() verifyDto: VerifyEmailDto,
  ): Promise<UserResponseDto> {
    const user = await this.verifyEmailUseCase.execute(verifyDto);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * POST /auth/resend-verification
   * Reenviar email de verificación
   */
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description:
      'Resend the email verification link. Use this if the user did not receive the email or if the token expired (after 24h).',
  })
  @ApiBody({
    type: ResendVerificationDto,
    description: 'User email',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      example: {
        message: 'Verification email sent successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Email already verified',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  async resendVerification(
    @Body() resendDto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    await this.resendVerificationUseCase.execute(resendDto.email);
    return { message: 'Verification email sent successfully' };
  }

  /**
   * POST /auth/forgot-password
   * Solicitar restablecimiento de contraseña
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Request a password reset email. Sends an email with a password reset link valid for 1 hour. Always returns success (does not reveal if email exists in system for security).',
  })
  @ApiBody({
    type: RequestPasswordResetDto,
    description: 'User email',
    examples: {
      example1: {
        summary: 'Valid email',
        value: {
          email: 'user@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Password reset email sent (if email exists). Always returns generic message for security.',
    schema: {
      example: {
        message: 'Si el email existe, recibirás un enlace de recuperación.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid email format',
  })
  async requestPasswordReset(
    @Body() requestDto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    return this.requestPasswordResetUseCase.execute(requestDto.email);
  }

  /**
   * POST /auth/reset-password
   * Restablecer contraseña con token
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Reset user password using the token received in the password reset email. The token is valid for 1 hour. After successful reset, a confirmation email is sent.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Reset token and new password',
    examples: {
      example1: {
        summary: 'Valid reset request',
        value: {
          token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwidHlwZSI6InBhc3N3b3JkX3Jlc2V0IiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE2MTYyNDI2MjJ9.xxxxx',
          newPassword: 'NewSecurePass456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Password reset successfully. Confirmation email sent. User can now login with new password.',
    schema: {
      example: {
        message: 'Contraseña restablecida correctamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Password does not meet requirements',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid, expired, or wrong token type',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid or expired reset token',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  async resetPassword(
    @Body() resetDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.resetPasswordUseCase.execute(
      resetDto.token,
      resetDto.newPassword,
    );
  }
}
