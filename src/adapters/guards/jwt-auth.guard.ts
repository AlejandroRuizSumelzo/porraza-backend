import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JwtAuthGuard (Adapters Layer)
 *
 * Guard de NestJS que protege rutas requiriendo autenticación JWT.
 * Extiende AuthGuard de Passport para usar la estrategia JWT.
 *
 * Uso:
 * - En controllers: @UseGuards(JwtAuthGuard)
 * - A nivel de método o clase
 * - Puede hacerse global en main.ts: app.useGlobalGuards(new JwtAuthGuard())
 *
 * Flujo de ejecución:
 * 1. Se ejecuta antes de cualquier handler del controller
 * 2. Llama a super.canActivate() que ejecuta la estrategia JWT
 * 3. JwtStrategy valida el token y busca el usuario
 * 4. Si es válido, adjunta el usuario a request.user
 * 5. Si no es válido, lanza 401 Unauthorized
 * 6. El handler del controller se ejecuta solo si el guard retorna true
 *
 * Ejemplos de uso:
 *
 * @example
 * // Proteger un endpoint específico
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@Req() req) {
 *   return req.user; // Usuario autenticado
 * }
 *
 * @example
 * // Proteger todos los endpoints de un controller
 * @Controller('users')
 * @UseGuards(JwtAuthGuard)
 * export class UserController {
 *   // Todos los endpoints requieren autenticación
 * }
 *
 * @example
 * // Hacer el guard global (en main.ts)
 * app.useGlobalGuards(new JwtAuthGuard());
 *
 * IMPORTANTE:
 * - Este guard NO verifica permisos/roles (solo autenticación)
 * - Para autorización, crear guards adicionales (ej: RolesGuard)
 * - El usuario autenticado está disponible en request.user
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determina si el request puede activar la ruta
   *
   * @param context - Contexto de ejecución de NestJS
   * @returns true si el token es válido, false/error si no
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Llamar a la implementación de AuthGuard('jwt')
    // Esto ejecuta JwtStrategy.validate()
    return super.canActivate(context);
  }

  /**
   * Maneja el resultado del usuario validado
   * Puede usarse para transformar el usuario antes de adjuntarlo a request.user
   *
   * @param err - Error si ocurrió durante validación
   * @param user - Usuario validado por JwtStrategy
   * @returns Usuario a adjuntar a request.user
   */
  handleRequest(err: any, user: any) {
    // Si hay error o no hay usuario, lanzar UnauthorizedException
    if (err || !user) {
      throw err || new Error('Unauthorized');
    }

    // Retornar el usuario validado
    return user;
  }
}
