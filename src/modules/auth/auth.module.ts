import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@adapters/controllers/auth.controller';
import { LoginUseCase } from '@application/use-cases/auth/login.use-case';
import { RefreshTokenUseCase } from '@application/use-cases/auth/refresh-token.use-case';
import { RegisterUseCase } from '@application/use-cases/auth/register.use-case';
import { VerifyEmailUseCase } from '@application/use-cases/auth/verify-email.use-case';
import { ResendVerificationUseCase } from '@application/use-cases/auth/resend-verification.use-case';
import { RequestPasswordResetUseCase } from '@application/use-cases/auth/request-password-reset.use-case';
import { ResetPasswordUseCase } from '@application/use-cases/auth/reset-password.use-case';
import { JwtServiceImpl } from '@infrastructure/auth/jwt.service';
import { JwtStrategy } from '@infrastructure/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';
import { UserModule } from '@modules/user/user.module';
import { EmailModule } from '@modules/email/email.module';
import { getJwtConfig } from '@infrastructure/auth/auth.config';

/**
 * AuthModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad de autenticación JWT.
 * Este módulo es el "pegamento" que conecta todas las capas mediante
 * el patrón de Inyección de Dependencias de NestJS.
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS EXPLICADO:
 *
 * 1. PassportModule (importado):
 *    - Proporciona funcionalidad de Passport.js
 *    - Necesario para estrategias de autenticación
 *
 * 2. JwtModule (importado):
 *    - Proporciona funcionalidad de JWT (@nestjs/jwt)
 *    - Configurado con secret y expiración desde auth.config.ts
 *    - Inyecta JwtService en JwtServiceImpl
 *
 * 3. UserModule (importado):
 *    - Exporta GetUserByEmailUseCase y GetUserByIdUseCase
 *    - Exporta 'IUserRepository' (necesario para LoginUseCase y JwtStrategy)
 *    - Proporciona acceso al repositorio de usuarios
 *
 * 4. JwtServiceImpl (provider):
 *    - Token: 'IJwtRepository' (string único)
 *    - Clase: JwtServiceImpl (implementación con @nestjs/jwt)
 *    - Los Use Cases lo inyectan con @Inject('IJwtRepository')
 *
 * 5. JwtStrategy (provider):
 *    - Estrategia de Passport para validar JWT
 *    - Se registra automáticamente con nombre 'jwt'
 *    - Usada por JwtAuthGuard
 *
 * 6. JwtAuthGuard (provider):
 *    - Guard para proteger rutas
 *    - Usa JwtStrategy internamente
 *    - Exportado para usarse en otros módulos
 *
 * 7. Use Cases (providers):
 *    - LoginUseCase: Autenticación + generación de tokens
 *    - RefreshTokenUseCase: Refresh de access token
 *    - Inyectan 'IJwtRepository' y 'IUserRepository'
 *
 * 8. AuthController (controller):
 *    - Endpoints REST: /auth/login, /auth/refresh, /auth/me
 *    - Recibe Use Cases vía constructor
 *    - Delega lógica de negocio a los Use Cases
 *
 * FLUJO DE INYECCIÓN:
 * JwtModule → JwtServiceImpl → Use Cases → AuthController
 * UserModule → IUserRepository → Use Cases + JwtStrategy
 * PassportModule → JwtStrategy → JwtAuthGuard
 *
 * VENTAJAS DEL PATRÓN:
 * - Inversión de dependencias: Use Cases dependen de abstracciones (IJwtRepository)
 * - Fácil testing: Mock de providers con tokens
 * - Cambio de implementación: Solo cambiar el 'useClass' del provider
 * - Desacoplamiento: Capas no conocen implementaciones concretas
 *
 * CONFIGURACIÓN JWT:
 * - Secret: Leído desde JWT_SECRET env variable
 * - Access token expiration: 15 minutos (configurable)
 * - Refresh token expiration: 7 días (configurable)
 * - Configuración centralizada en auth.config.ts
 */
@Module({
  imports: [
    // PassportModule: Proporciona funcionalidad de Passport.js
    PassportModule,

    // JwtModule: Configuración de JWT
    JwtModule.register({
      secret: getJwtConfig().secret,
    }),

    // UserModule: Importar para acceder a IUserRepository
    // UserModule exporta 'IUserRepository' y use cases de usuarios
    UserModule,

    // EmailModule: Importar para acceder a IEmailRepository
    // EmailModule exporta 'IEmailRepository' (ResendEmailService)
    EmailModule,
  ],

  controllers: [
    // AuthController: Maneja endpoints REST de autenticación
    AuthController,
  ],

  providers: [
    // Use Cases: Lógica de negocio de autenticación
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    VerifyEmailUseCase,
    ResendVerificationUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,

    // JWT Service: Implementación de generación/verificación de tokens
    {
      provide: 'IJwtRepository', // Token: Nombre de la interface
      useClass: JwtServiceImpl, // Implementación: Clase con @nestjs/jwt
    },

    // JWT Strategy: Estrategia de Passport para validar tokens
    // Se registra automáticamente con nombre 'jwt'
    JwtStrategy,

    // JWT Auth Guard: Guard para proteger rutas
    JwtAuthGuard,

    /**
     * ¿Por qué usamos token 'IJwtRepository'?
     *
     * - TypeScript interfaces NO existen en runtime (se borran al compilar)
     * - NestJS necesita tokens únicos para inyectar dependencias
     * - Usamos string 'IJwtRepository' como identificador
     * - Los Use Cases usan @Inject('IJwtRepository')
     *
     * Esto permite Inversión de Dependencias:
     * - Use Cases (Application Layer) dependen de interface (Domain Layer)
     * - JwtServiceImpl (Infrastructure Layer) implementa la interface
     * - Sin este patrón, Use Cases dependerían directamente de la implementación
     */
  ],

  exports: [
    // Exportar JwtAuthGuard para usarlo en otros módulos
    JwtAuthGuard,

    // Exportar Use Cases si otros módulos necesitan lógica de auth
    LoginUseCase,
    RefreshTokenUseCase,

    // Exportar IJwtRepository si otros módulos necesitan generar tokens
    // (ej: módulo de email verification podría necesitar generar tokens)
    'IJwtRepository',
  ],
})
export class AuthModule {}
