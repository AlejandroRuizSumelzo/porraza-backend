import { ApiProperty } from '@nestjs/swagger';

/**
 * CheckoutSessionResponseDto
 *
 * DTO para la respuesta de creación de sesión de checkout.
 * Contiene el clientSecret necesario para inicializar Stripe Embedded Checkout en el frontend.
 *
 * Uso en frontend (React/Next.js):
 * ```typescript
 * const response = await fetch('/api/payments/create-checkout-session', {
 *   method: 'POST',
 *   headers: { 'Authorization': `Bearer ${accessToken}` }
 * });
 * const { clientSecret } = await response.json();
 *
 * // Inicializar Stripe Checkout
 * const checkout = await stripe.initEmbeddedCheckout({ clientSecret });
 * checkout.mount('#checkout-element');
 * ```
 */
export class CheckoutSessionResponseDto {
  @ApiProperty({
    description:
      'Client secret para inicializar Stripe Embedded Checkout en el frontend',
    example:
      'cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0_secret_u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0',
  })
  clientSecret: string;

  @ApiProperty({
    description: 'ID de la sesión de Stripe (para referencia y tracking)',
    example: 'cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',
  })
  sessionId: string;
}
