import { ApiProperty } from '@nestjs/swagger';

/**
 * PaymentStatusResponseDto
 *
 * DTO para la respuesta de verificación de estado de pago de un usuario.
 * Consulta el estado desde la base de datos (más rápido que consultar Stripe).
 *
 * Uso en frontend:
 * - Verificar si el usuario tiene acceso premium
 * - Mostrar UI diferente para usuarios pagos vs. gratuitos
 * - Bloquear acceso a funcionalidades de pago
 */
export class PaymentStatusResponseDto {
  @ApiProperty({
    description: 'Indica si el usuario ha completado el pago',
    example: true,
  })
  hasPaid: boolean;

  @ApiProperty({
    description:
      'Fecha y hora en que se completó el pago (null si no ha pagado)',
    example: '2025-10-23T14:30:00.000Z',
    nullable: true,
  })
  paymentDate: Date | null;
}
