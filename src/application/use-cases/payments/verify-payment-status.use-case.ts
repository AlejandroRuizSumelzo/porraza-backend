import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';

/**
 * VerifyPaymentStatusUseCase (Application Layer)
 *
 * Caso de uso para verificar si un usuario ha completado el pago.
 * Consulta directamente el estado del usuario en la base de datos.
 *
 * Flujo:
 * 1. Busca el usuario por ID
 * 2. Retorna el estado de pago (hasPaid, paymentDate)
 *
 * Casos de uso:
 * - El frontend consulta si el usuario puede acceder a funcionalidades premium
 * - Verificar estado de pago antes de permitir ciertas acciones
 * - Mostrar UI diferente para usuarios que pagaron vs. usuarios gratuitos
 */
@Injectable()
export class VerifyPaymentStatusUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      hasPaid: user.hasPaid,
      paymentDate: user.paymentDate,
    };
  }
}
