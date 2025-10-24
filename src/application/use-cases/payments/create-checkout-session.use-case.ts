import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { IPaymentRepository } from '@domain/repositories/payment.repository.interface';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';

/**
 * CreateCheckoutSessionUseCase (Application Layer)
 *
 * Caso de uso para crear una sesión de checkout de Stripe.
 * Orquesta la lógica de negocio entre el repositorio de usuarios
 * y el repositorio de pagos.
 *
 * Flujo:
 * 1. Verifica que el usuario existe
 * 2. Verifica que el usuario NO haya pagado ya (evita pagos duplicados)
 * 3. Crea la sesión de checkout en Stripe
 * 4. Retorna el clientSecret para el frontend
 *
 * Reglas de negocio:
 * - Un usuario solo puede pagar una vez
 * - El usuario debe existir y estar activo
 * - El email del usuario se pre-rellena en el checkout
 */
@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject('IPaymentRepository')
    private readonly paymentRepository: IPaymentRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string) {
    // 1. Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Verificar que el usuario NO haya pagado ya
    if (user.hasCompletedPayment()) {
      throw new BadRequestException(
        'User has already completed payment. Duplicate payments are not allowed.',
      );
    }

    // 3. Crear sesión de checkout en Stripe
    return await this.paymentRepository.createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
    });
  }
}
