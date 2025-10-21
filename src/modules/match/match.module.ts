import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { MatchController } from '@adapters/controllers/match.controller';
import { GetAllMatchesUseCase } from '@application/use-cases/matches/get-all-matches.use-case';
import { GetMatchByIdUseCase } from '@application/use-cases/matches/get-match-by-id.use-case';
import { GetMatchCalendarUseCase } from '@application/use-cases/matches/get-match-calendar.use-case';
import { MatchRepository } from '@infrastructure/persistence/repositories/match.repository';

/**
 * MatchModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad de partidos.
 * Este módulo es el "pegamento" que conecta todas las capas mediante
 * el patrón de Inyección de Dependencias de NestJS.
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS EXPLICADO:
 *
 * 1. DatabaseModule (importado):
 *    - Proporciona 'DATABASE_POOL' (Pool de pg)
 *    - MatchRepository lo inyecta con @Inject('DATABASE_POOL')
 *
 * 2. MatchRepository (provider):
 *    - Token: 'IMatchRepository' (string único)
 *    - Clase: MatchRepository (implementación con pg)
 *    - GetAllMatchesUseCase y GetMatchByIdUseCase lo inyectan con @Inject('IMatchRepository')
 *
 * 3. Use Cases (providers):
 *    - GetAllMatchesUseCase: Se inyecta automáticamente en MatchController por su clase
 *    - GetMatchByIdUseCase: Se inyecta automáticamente en MatchController por su clase
 *
 * 4. MatchController (controller):
 *    - Recibe ambos Use Cases vía constructor
 *
 * FLUJO DE INYECCIÓN:
 * DatabaseModule.DATABASE_POOL → MatchRepository → [GetAllMatchesUseCase, GetMatchByIdUseCase] → MatchController
 *
 * VENTAJAS DEL PATRÓN:
 * - Inversión de dependencias: Use cases dependen de abstracciones (IMatchRepository)
 * - Fácil testing: Mock de providers con tokens
 * - Cambio de implementación: Solo cambiar el 'useClass' del provider
 * - Desacoplamiento: Capas no conocen implementaciones concretas
 */
@Module({
  imports: [
    DatabaseModule, // Importar para tener acceso a DATABASE_POOL
  ],
  controllers: [
    MatchController, // Controlador REST que maneja GET /matches y GET /matches/:id
  ],
  providers: [
    // Use Cases: Se inyectan directamente por su clase
    GetAllMatchesUseCase,
    GetMatchByIdUseCase,
    GetMatchCalendarUseCase,

    // Repository: Se inyecta con token personalizado (Inversión de Dependencias)
    {
      provide: 'IMatchRepository', // Token: Nombre de la interface
      useClass: MatchRepository, // Implementación: Clase con SQL nativo (pg)
    },

    /**
     * ¿Por qué usamos token 'IMatchRepository'?
     *
     * - TypeScript interfaces NO existen en runtime (se borran al compilar)
     * - NestJS necesita tokens únicos para inyectar dependencias
     * - Usamos string 'IMatchRepository' como identificador
     * - Los Use Cases usan @Inject('IMatchRepository')
     *
     * Alternativa válida: Usar Symbol
     * export const MATCH_REPOSITORY = Symbol('IMatchRepository');
     * provide: MATCH_REPOSITORY,
     * @Inject(MATCH_REPOSITORY)
     */
  ],
  exports: [
    // Si otros módulos necesitan usar los Use Cases, exportarlos aquí
    // GetAllMatchesUseCase,
    // GetMatchByIdUseCase,
  ],
})
export class MatchModule {}
