import { Module, Global } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * Token de inyección para el cliente de Stripe
 * Usado para inyectar la instancia de Stripe en otros servicios
 */
export const STRIPE_CLIENT = 'STRIPE_CLIENT';

/**
 * StripeModule (Infrastructure Layer - Global Module)
 *
 * Módulo global que proporciona una instancia configurada del cliente de Stripe.
 * Al ser @Global(), está disponible en toda la aplicación sin necesidad de
 * importarlo explícitamente en cada módulo.
 *
 * Patrón: Factory Provider
 * - useFactory: Función que crea la instancia de Stripe
 * - provide: Token único para inyección (STRIPE_CLIENT)
 * - exports: Exporta el token para que otros módulos lo usen
 *
 * Configuración:
 * - API Key: Se lee desde STRIPE_SECRET_KEY en .env
 * - API Version: 2024-11-20.acacia (última versión estable)
 * - TypeScript: Habilitado para mejor type safety
 *
 * Seguridad:
 * - La secret key NUNCA debe exponerse al frontend
 * - Solo se usa en el backend para operaciones seguras
 * - La publishable key (pk_) va en el frontend
 *
 * Uso en otros servicios:
 * ```typescript
 * constructor(
 *   @Inject(STRIPE_CLIENT) private readonly stripe: Stripe
 * ) {}
 * ```
 */
@Global()
@Module({
  providers: [
    {
      provide: STRIPE_CLIENT,
      useFactory: () => {
        const apiKey = process.env.STRIPE_SECRET_KEY;

        // Validar que la API key está configurada
        if (!apiKey) {
          throw new Error(
            'STRIPE_SECRET_KEY is not defined in environment variables',
          );
        }

        // Validar que es una secret key (no publishable key)
        if (!apiKey.startsWith('sk_')) {
          throw new Error(
            'STRIPE_SECRET_KEY must be a secret key (starts with sk_)',
          );
        }

        return new Stripe(apiKey, {
          apiVersion: '2025-09-30.clover',
          typescript: true,
        });
      },
    },
  ],
  exports: [STRIPE_CLIENT],
})
export class StripeModule {}
