import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  Headers,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';
import { CreateCheckoutSessionUseCase } from '@application/use-cases/payments/create-checkout-session.use-case';
import { VerifyPaymentStatusUseCase } from '@application/use-cases/payments/verify-payment-status.use-case';
import { GetSessionStatusUseCase } from '@application/use-cases/payments/get-session-status.use-case';
import { HandleStripeWebhookUseCase } from '@application/use-cases/payments/handle-stripe-webhook.use-case';
import { CheckoutSessionResponseDto } from '@adapters/dtos/payment/checkout-session-response.dto';
import { PaymentStatusResponseDto } from '@adapters/dtos/payment/payment-status-response.dto';
import { SessionStatusResponseDto } from '@adapters/dtos/payment/session-status-response.dto';
import type { Request } from 'express';

/**
 * PaymentController (Adapters Layer)
 *
 * Controlador REST para gestionar pagos con Stripe.
 * Expone endpoints para crear sesiones de checkout, verificar pagos y procesar webhooks.
 *
 * Endpoints:
 * - POST /payments/create-checkout-session (autenticado)
 * - GET /payments/verify-status (autenticado)
 * - GET /payments/session-status/:sessionId (autenticado)
 * - POST /payments/webhook (público, validado por firma de Stripe)
 *
 * Seguridad:
 * - Todos los endpoints excepto /webhook requieren JWT válido
 * - El webhook valida la firma de Stripe para evitar ataques
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly verifyPaymentStatusUseCase: VerifyPaymentStatusUseCase,
    private readonly getSessionStatusUseCase: GetSessionStatusUseCase,
    private readonly handleStripeWebhookUseCase: HandleStripeWebhookUseCase,
  ) {}

  /**
   * POST /payments/create-checkout-session
   * Crea una sesión de Stripe Embedded Checkout
   * Requiere autenticación JWT
   */
  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear sesión de checkout de Stripe',
    description:
      'Crea una sesión de checkout embebida para que el usuario complete el pago de 1,99€',
  })
  @ApiResponse({
    status: 201,
    description: 'Sesión creada exitosamente',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Usuario ya ha pagado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async createCheckoutSession(
    @Req() req: any,
  ): Promise<CheckoutSessionResponseDto> {
    const userId = req.user.id; // Extraído del JWT por JwtAuthGuard
    return await this.createCheckoutSessionUseCase.execute(userId);
  }

  /**
   * GET /payments/verify-status
   * Verifica si el usuario autenticado ha completado el pago
   * Requiere autenticación JWT
   */
  @Get('verify-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verificar estado de pago del usuario',
    description:
      'Consulta la base de datos para verificar si el usuario ha completado el pago',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de pago del usuario',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async verifyPaymentStatus(
    @Req() req: any,
  ): Promise<PaymentStatusResponseDto> {
    const userId = req.user.id;
    return await this.verifyPaymentStatusUseCase.execute(userId);
  }

  /**
   * GET /payments/session-status/:sessionId
   * Obtiene el estado de una sesión de Stripe específica
   * Requiere autenticación JWT
   */
  @Get('session-status/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estado de sesión de Stripe',
    description:
      'Consulta Stripe para verificar el estado actual de una sesión de checkout',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de la sesión',
    type: SessionStatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  async getSessionStatus(
    @Param('sessionId') sessionId: string,
  ): Promise<SessionStatusResponseDto> {
    return await this.getSessionStatusUseCase.execute(sessionId);
  }

  /**
   * POST /payments/webhook
   * Endpoint para webhooks de Stripe
   * NO requiere autenticación JWT (validado por firma de Stripe)
   *
   * IMPORTANTE:
   * - NestJS debe tener rawBody: true en main.ts
   * - El body NO debe ser parseado como JSON
   * - La firma se valida con STRIPE_WEBHOOK_SECRET
   */
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Webhook de Stripe',
    description:
      'Recibe eventos de Stripe (checkout.session.completed) y actualiza el estado de pago del usuario',
  })
  @ApiResponse({ status: 200, description: 'Webhook procesado exitosamente' })
  @ApiResponse({ status: 400, description: 'Firma de webhook inválida' })
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    try {
      // Validar que tenemos el rawBody (necesario para verificar firma)
      if (!req.rawBody) {
        throw new Error(
          'rawBody not available. Ensure NestJS is configured with rawBody: true in main.ts',
        );
      }

      await this.handleStripeWebhookUseCase.execute(req.rawBody, signature);
      return { received: true };
    } catch (error: any) {
      console.error('[WEBHOOK] Error processing webhook:', error.message);
      throw error;
    }
  }
}
