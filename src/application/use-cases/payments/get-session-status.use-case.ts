import { Injectable, Inject } from '@nestjs/common';
import type { IPaymentRepository } from '@domain/repositories/payment.repository.interface';

/**
 * GetSessionStatusUseCase (Application Layer)
 *
 * Caso de uso para obtener el estado de una sesión de Stripe.
 * Consulta directamente la API de Stripe para verificar si el pago se completó.
 *
 * Flujo:
 * 1. Consulta la sesión en Stripe por sessionId
 * 2. Retorna el estado (hasPaid, paymentDate, email)
 *
 * Diferencia con VerifyPaymentStatusUseCase:
 * - VerifyPaymentStatus: Consulta el estado en la BASE DE DATOS (más rápido)
 * - GetSessionStatus: Consulta el estado en STRIPE (más actualizado, para verificaciones en tiempo real)
 *
 * Casos de uso:
 * - Página de éxito después del pago (verificar que se completó)
 * - Debugging de pagos (ver estado real en Stripe)
 * - Reconciliación de pagos pendientes
 */
@Injectable()
export class GetSessionStatusUseCase {
  constructor(
    @Inject('IPaymentRepository')
    private readonly paymentRepository: IPaymentRepository,
  ) {}

  async execute(sessionId: string) {
    return await this.paymentRepository.getSessionStatus(sessionId);
  }
}
