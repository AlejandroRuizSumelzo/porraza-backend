import { Module } from '@nestjs/common';
import { ResendEmailService } from '@infrastructure/email/resend-email.service';

/**
 * EmailModule
 *
 * Módulo NestJS que encapsula la funcionalidad de envío de emails.
 *
 * Responsabilidades:
 * - Proporcionar implementación de IEmailRepository (Resend)
 * - Exportar el servicio para usarlo en otros módulos (ej: AuthModule)
 *
 * Configuración:
 * - Lee RESEND_API_KEY desde variables de entorno
 * - En desarrollo sin API key, solo logea en consola
 * - En producción, API key es obligatorio
 *
 * Uso en otros módulos:
 * @example
 * @Module({
 *   imports: [EmailModule],
 *   providers: [
 *     {
 *       provide: SomeUseCase,
 *       inject: ['IEmailRepository'],
 *     },
 *   ],
 * })
 */
@Module({
  providers: [
    {
      provide: 'IEmailRepository',
      useClass: ResendEmailService,
    },
  ],
  exports: ['IEmailRepository'],
})
export class EmailModule {}
