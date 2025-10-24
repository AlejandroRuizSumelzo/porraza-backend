import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.module';
import type {
  IPaymentRepository,
  CreateCheckoutSessionParams,
  CheckoutSessionResult,
  SessionStatusResult,
} from '@domain/repositories/payment.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';

/**
 * StripePaymentService (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IPaymentRepository usando Stripe.
 * Esta clase pertenece a la capa de infraestructura y maneja toda
 * la interacción con la API de Stripe.
 *
 * Patrón de Inyección de Dependencias:
 * 1. Implementa IPaymentRepository (del dominio)
 * 2. Inyecta Stripe client usando el token STRIPE_CLIENT
 * 3. Inyecta IUserRepository para actualizar estado de usuarios
 * 4. Se registra como provider en PaymentModule
 *
 * Responsabilidades:
 * - Crear sesiones de Stripe Embedded Checkout
 * - Verificar el estado de sesiones existentes
 * - Procesar webhooks de Stripe (checkout.session.completed)
 * - Actualizar estado de pago de usuarios en la base de datos
 *
 * Configuración de Stripe:
 * - ui_mode: 'embedded' (checkout embebido en el frontend)
 * - mode: 'payment' (pago único, no suscripción)
 * - amount: 1,99€ (configurado como STRIPE_PRICE_ID en .env)
 * - locale: 'es' (idioma español)
 * - custom_text: Textos personalizados del Mundial Porraza
 * - submit_type: 'pay' (botón de pago)
 * - customer_email: Pre-rellena email del usuario
 * - return_url: Redirige a /checkout/success en el frontend
 *
 * Seguridad:
 * - Verifica firma de webhooks con STRIPE_WEBHOOK_SECRET
 * - Valida que los eventos provienen realmente de Stripe
 * - Asocia pagos a usuarios mediante metadata.userId
 */
@Injectable()
export class StripePaymentService implements IPaymentRepository {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Crea una sesión de Stripe Embedded Checkout
   * Retorna el client_secret necesario para el frontend
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams,
  ): Promise<CheckoutSessionResult> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId) {
      throw new Error(
        'STRIPE_PRICE_ID is not configured in environment variables',
      );
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        ui_mode: 'embedded', // Modo embebido (no redirige a Stripe, se muestra en tu frontend)
        line_items: [
          {
            price: priceId, // ID del precio configurado en Stripe Dashboard (price_xxxxx)
            quantity: 1,
          },
        ],
        mode: 'payment', // Pago único (no suscripción)

        // Idioma español para todo el formulario
        locale: 'es',

        // Textos personalizados del Mundial Porraza
        custom_text: {
          submit: {
            message: '⚽ Completar pago de €1.99 para el Mundial Porraza',
          },
          terms_of_service_acceptance: {
            message:
              'Acepto los [términos de servicio](https://porraza.com/terms) y la [política de privacidad](https://porraza.com/privacy)',
          },
        },

        // Tipo de botón de envío
        submit_type: 'pay',

        // Requerido cuando se usa custom_text.terms_of_service_acceptance
        consent_collection: {
          terms_of_service: 'required',
        },

        return_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        metadata: {
          userId: params.userId, // Asociar sesión con usuario para el webhook
        },
        customer_email: params.userEmail, // Pre-rellenar email en el checkout
      });

      return {
        clientSecret: session.client_secret!,
        sessionId: session.id,
      };
    } catch (error: any) {
      console.error('Error creating Stripe checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  /**
   * Obtiene el estado de una sesión de Stripe
   * Útil para verificar si el pago se completó
   */
  async getSessionStatus(sessionId: string): Promise<SessionStatusResult> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'], // Incluir detalles del pago
      });

      const isPaid = session.status === 'complete';

      return {
        hasPaid: isPaid,
        paymentDate: isPaid ? new Date(session.created * 1000) : null,
        email: session.customer_details?.email || null,
      };
    } catch (error: any) {
      console.error(`Error retrieving Stripe session ${sessionId}:`, error);
      throw new Error(`Failed to get session status: ${error.message}`);
    }
  }

  /**
   * Procesa webhooks de Stripe
   * Valida la firma y procesa eventos de pago completado
   */
  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET is not configured in environment variables',
      );
    }

    let event: Stripe.Event;

    try {
      // Verificar que el webhook proviene realmente de Stripe
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      throw new BadRequestException(
        `Webhook signature verification failed: ${err.message}`,
      );
    }

    // Procesar el evento según su tipo
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Procesa el evento de sesión de checkout completada
   * Actualiza el estado de pago del usuario en la base de datos
   * @private
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    console.log(
      `[WEBHOOK] Processing checkout.session.completed for session ${session.id}`,
    );

    const userId = session.metadata?.userId;

    if (!userId) {
      console.error(
        '[WEBHOOK ERROR] No userId found in session metadata. Cannot update user payment status.',
      );
      return;
    }

    try {
      // Actualizar estado de pago del usuario
      await this.userRepository.updatePaymentStatus(userId, {
        hasPaid: true,
        paymentDate: new Date(),
        stripeCustomerId: session.customer as string,
        stripeSessionId: session.id,
      });

      console.log(
        `[WEBHOOK SUCCESS] Payment completed for user ${userId}. Database updated.`,
      );
    } catch (error: any) {
      console.error(
        `[WEBHOOK ERROR] Failed to update user ${userId}:`,
        error.message,
      );
      throw error;
    }
  }
}
