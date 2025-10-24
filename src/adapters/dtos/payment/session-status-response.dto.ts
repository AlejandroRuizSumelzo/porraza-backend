import { ApiProperty } from '@nestjs/swagger';

/**
 * SessionStatusResponseDto
 *
 * DTO para la respuesta de verificación de estado de una sesión de Stripe.
 * Consulta el estado directamente desde Stripe (más actualizado que la base de datos).
 *
 * Uso en frontend:
 * - Página de éxito después del pago (verificar que se completó)
 * - Mostrar confirmación al usuario
 * - Debugging de pagos en tiempo real
 */
export class SessionStatusResponseDto {
  @ApiProperty({
    description: 'Indica si el pago de esta sesión se completó',
    example: true,
  })
  hasPaid: boolean;

  @ApiProperty({
    description:
      'Fecha y hora en que se completó el pago (null si no se completó)',
    example: '2025-10-23T14:30:00.000Z',
    nullable: true,
  })
  paymentDate: Date | null;

  @ApiProperty({
    description: 'Email del usuario que realizó el pago (desde Stripe)',
    example: 'usuario@example.com',
    nullable: true,
  })
  email: string | null;
}
