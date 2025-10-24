import { Module } from '@nestjs/common';
import { StripeModule } from '@infrastructure/stripe/stripe.module';
import { PaymentController } from '@adapters/controllers/payment.controller';
import { StripePaymentService } from '@infrastructure/stripe/stripe-payment.service';
import { CreateCheckoutSessionUseCase } from '@application/use-cases/payments/create-checkout-session.use-case';
import { VerifyPaymentStatusUseCase } from '@application/use-cases/payments/verify-payment-status.use-case';
import { GetSessionStatusUseCase } from '@application/use-cases/payments/get-session-status.use-case';
import { HandleStripeWebhookUseCase } from '@application/use-cases/payments/handle-stripe-webhook.use-case';
import { UserModule } from '@modules/user/user.module';

/**
 * PaymentModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad de pagos con Stripe.
 * Este módulo es el "pegamento" que conecta todas las capas mediante
 * el patrón de Inyección de Dependencias de NestJS.
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS EXPLICADO:
 *
 * 1. StripeModule (importado):
 *    - Módulo global que proporciona el cliente de Stripe (STRIPE_CLIENT)
 *    - Configurado con STRIPE_SECRET_KEY desde .env
 *    - Disponible en toda la aplicación (@Global)
 *
 * 2. UserModule (importado):
 *    - Exporta 'IUserRepository' (necesario para los use cases)
 *    - Permite actualizar el estado de pago de usuarios
 *    - Proporciona acceso al repositorio de usuarios
 *
 * 3. StripePaymentService (provider):
 *    - Token: 'IPaymentRepository' (string único)
 *    - Clase: StripePaymentService (implementación con Stripe SDK)
 *    - Los Use Cases lo inyectan con @Inject('IPaymentRepository')
 *
 * 4. Use Cases (providers):
 *    - CreateCheckoutSessionUseCase: Crea sesión de checkout
 *    - VerifyPaymentStatusUseCase: Verifica si el usuario pagó (desde BD)
 *    - GetSessionStatusUseCase: Verifica estado de sesión (desde Stripe)
 *    - HandleStripeWebhookUseCase: Procesa webhooks de Stripe
 *    - Inyectan 'IPaymentRepository' y/o 'IUserRepository'
 *
 * 5. PaymentController (controller):
 *    - Endpoints REST: /payments/create-checkout-session, /payments/verify-status, etc.
 *    - Recibe Use Cases vía constructor
 *    - Delega lógica de negocio a los Use Cases
 *
 * FLUJO DE INYECCIÓN:
 * StripeModule → StripePaymentService → Use Cases → PaymentController
 * UserModule → IUserRepository → Use Cases
 *
 * VENTAJAS DEL PATRÓN:
 * - Inversión de dependencias: Use Cases dependen de abstracciones (IPaymentRepository)
 * - Fácil testing: Mock de providers con tokens
 * - Cambio de implementación: Solo cambiar el 'useClass' del provider (de Stripe a PayPal, por ejemplo)
 * - Desacoplamiento: Capas no conocen implementaciones concretas
 *
 * CONFIGURACIÓN DE PAGOS:
 * - Monto: 1,99€ (configurado como STRIPE_PRICE_ID en .env)
 * - Modo: Embedded Checkout (ui_mode: 'embedded')
 * - Tipo: Pago único (mode: 'payment', no suscripción)
 * - Webhook: checkout.session.completed para confirmar pagos
 */
@Module({
  imports: [
    // StripeModule: Proporciona el cliente de Stripe (STRIPE_CLIENT)
    StripeModule,

    // UserModule: Importar para acceder a IUserRepository
    // UserModule exporta 'IUserRepository' para actualizar estado de pago
    UserModule,
  ],

  controllers: [
    // PaymentController: Maneja endpoints REST de pagos
    PaymentController,
  ],

  providers: [
    // Payment Service: Implementación de procesamiento de pagos con Stripe
    {
      provide: 'IPaymentRepository', // Token: Nombre de la interface
      useClass: StripePaymentService, // Implementación: Clase con Stripe SDK
    },

    // Use Cases: Lógica de negocio de pagos
    CreateCheckoutSessionUseCase,
    VerifyPaymentStatusUseCase,
    GetSessionStatusUseCase,
    HandleStripeWebhookUseCase,

    /**
     * ¿Por qué usamos token 'IPaymentRepository'?
     *
     * - TypeScript interfaces NO existen en runtime (se borran al compilar)
     * - NestJS necesita tokens únicos para inyectar dependencias
     * - Usamos string 'IPaymentRepository' como identificador
     * - Los Use Cases usan @Inject('IPaymentRepository')
     *
     * Esto permite Inversión de Dependencias:
     * - Use Cases (Application Layer) dependen de interface (Domain Layer)
     * - StripePaymentService (Infrastructure Layer) implementa la interface
     * - Sin este patrón, Use Cases dependerían directamente de Stripe
     * - Podríamos cambiar a PayPal sin modificar los Use Cases
     */
  ],

  exports: [
    // Exportar IPaymentRepository si otros módulos necesitan procesar pagos
    'IPaymentRepository',

    // Exportar Use Cases si otros módulos necesitan lógica de pagos
    VerifyPaymentStatusUseCase,
  ],
})
export class PaymentModule {}
