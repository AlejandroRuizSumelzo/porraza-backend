import { Injectable, Inject } from '@nestjs/common';
import type { IPaymentRepository } from '@domain/repositories/payment.repository.interface';

/**
 * HandleStripeWebhookUseCase (Application Layer)
 *
 * Caso de uso para procesar webhooks de Stripe.
 * Delega el procesamiento al PaymentRepository, que valida la firma
 * y actualiza el estado del usuario en la base de datos.
 *
 * Flujo:
 * 1. Recibe el rawBody y la firma del webhook
 * 2. El repositorio valida la firma (seguridad)
 * 3. El repositorio procesa el evento (checkout.session.completed)
 * 4. El repositorio actualiza el estado del usuario
 *
 * Seguridad:
 * - La firma del webhook se valida con STRIPE_WEBHOOK_SECRET
 * - Solo se procesan eventos que provienen realmente de Stripe
 * - Si la firma no es válida, se lanza BadRequestException
 *
 * Eventos procesados:
 * - checkout.session.completed: Cuando el pago se completa exitosamente
 *
 * IMPORTANTE:
 * - Este endpoint NO requiere autenticación JWT (es llamado por Stripe)
 * - El rawBody debe ser un Buffer (no JSON parseado)
 * - NestJS debe tener rawBody: true en main.ts
 */
@Injectable()
export class HandleStripeWebhookUseCase {
  constructor(
    @Inject('IPaymentRepository')
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(rawBody: Buffer, signature: string): Promise<void> {
    await this.paymentRepository.handleWebhookEvent(rawBody, signature);
  }
}
