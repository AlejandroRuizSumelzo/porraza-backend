/**
 * Parámetros para crear una sesión de checkout en Stripe
 */
export interface CreateCheckoutSessionParams {
  userId: string;
  userEmail: string;
}

/**
 * Resultado de la creación de una sesión de checkout
 * Contiene el client_secret necesario para el frontend
 */
export interface CheckoutSessionResult {
  clientSecret: string;
  sessionId: string;
}

/**
 * Resultado de la verificación del estado de una sesión
 */
export interface SessionStatusResult {
  hasPaid: boolean;
  paymentDate: Date | null;
  email: string | null;
}

/**
 * IPaymentRepository (Domain Layer - Port)
 *
 * Interface que define el contrato para el procesamiento de pagos.
 * Esta interface pertenece a la capa de dominio y NO depende de
 * detalles de implementación específicos de Stripe.
 *
 * Patrón: Dependency Inversion Principle (DIP)
 * - El dominio define QUÉ necesita (esta interface)
 * - La infraestructura implementa CÓMO lo hace (StripePaymentService)
 * - Los Use Cases dependen de esta abstracción, no de Stripe directamente
 *
 * Responsabilidades:
 * - Crear sesiones de checkout para pagos
 * - Verificar el estado de sesiones existentes
 * - Procesar webhooks de confirmación de pago
 *
 * Notas importantes:
 * - La implementación puede ser con Stripe, PayPal, u otro proveedor
 * - Los webhooks deben validar la firma para seguridad
 * - El monto del pago (1,99€) se configura en la implementación
 */
export interface IPaymentRepository {
  /**
   * Crea una sesión de checkout en el proveedor de pagos
   * @param params - userId y userEmail del usuario que va a pagar
   * @returns clientSecret para inicializar el checkout en el frontend
   * @note El clientSecret es sensible, solo debe enviarse al cliente autorizado
   */
  createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSessionResult>;

  /**
   * Obtiene el estado actual de una sesión de pago
   * @param sessionId - ID de la sesión (ej: cs_test_xxxxx en Stripe)
   * @returns Estado del pago (completado o pendiente)
   * @note Útil para verificar pagos en tiempo real
   */
  getSessionStatus(sessionId: string): Promise<SessionStatusResult>;

  /**
   * Procesa un webhook del proveedor de pagos
   * @param rawBody - Cuerpo crudo del webhook (Buffer)
   * @param signature - Firma del webhook para validación
   * @returns void
   * @throws Error si la firma no es válida
   * @note Este método actualiza el estado del usuario en la base de datos
   */
  handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void>;
}
