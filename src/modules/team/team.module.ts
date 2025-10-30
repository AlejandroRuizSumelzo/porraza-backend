import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { TeamController } from '@adapters/controllers/team.controller';
import { GetAllTeamsUseCase } from '@application/use-cases/teams/get-all-teams.use-case';
import { GetTeamByIdUseCase } from '@application/use-cases/teams/get-team-by-id.use-case';
import { TeamRepository } from '@infrastructure/persistence/repositories/team.repository';

/**
 * TeamModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad de equipos.
 * Este módulo es el "pegamento" que conecta todas las capas mediante
 * el patrón de Inyección de Dependencias de NestJS.
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS EXPLICADO:
 *
 * 1. DatabaseModule (importado):
 *    - Proporciona 'DATABASE_POOL' (Pool de pg)
 *    - TeamRepository lo inyecta con @Inject('DATABASE_POOL')
 *
 * 2. TeamRepository (provider):
 *    - Token: 'ITeamRepository' (string único)
 *    - Clase: TeamRepository (implementación con pg)
 *    - GetAllTeamsUseCase y GetTeamByIdUseCase lo inyectan con @Inject('ITeamRepository')
 *
 * 3. Use Cases (providers):
 *    - GetAllTeamsUseCase: Se inyecta automáticamente en TeamController por su clase
 *    - GetTeamByIdUseCase: Se inyecta automáticamente en TeamController por su clase
 *
 * 4. TeamController (controller):
 *    - Recibe ambos Use Cases vía constructor
 *
 * FLUJO DE INYECCIÓN:
 * DatabaseModule.DATABASE_POOL → TeamRepository → [GetAllTeamsUseCase, GetTeamByIdUseCase] → TeamController
 *
 * VENTAJAS DEL PATRÓN:
 * - Inversión de dependencias: Use cases dependen de abstracciones (ITeamRepository)
 * - Fácil testing: Mock de providers con tokens
 * - Cambio de implementación: Solo cambiar el 'useClass' del provider
 * - Desacoplamiento: Capas no conocen implementaciones concretas
 */
@Module({
  imports: [
    DatabaseModule, // Importar para tener acceso a DATABASE_POOL
  ],
  controllers: [
    TeamController, // Controlador REST que maneja GET /teams y GET /teams/:id
  ],
  providers: [
    // Use Cases: Se inyectan directamente por su clase
    GetAllTeamsUseCase,
    GetTeamByIdUseCase,

    // Repository: Se inyecta con token personalizado (Inversión de Dependencias)
    {
      provide: 'ITeamRepository', // Token: Nombre de la interface
      useClass: TeamRepository, // Implementación: Clase con SQL nativo (pg)
    },

    /**
     * ¿Por qué usamos token 'ITeamRepository'?
     *
     * - TypeScript interfaces NO existen en runtime (se borran al compilar)
     * - NestJS necesita tokens únicos para inyectar dependencias
     * - Usamos string 'ITeamRepository' como identificador
     * - Los Use Cases usan @Inject('ITeamRepository')
     *
     * Alternativa válida: Usar Symbol
     * export const TEAM_REPOSITORY = Symbol('ITeamRepository');
     * provide: TEAM_REPOSITORY,
     * @Inject(TEAM_REPOSITORY)
     */
  ],
  exports: [
    // Exportar repository para que otros módulos puedan usarlo
    'ITeamRepository',
    // Si otros módulos necesitan usar los Use Cases, exportarlos aquí
    // GetAllTeamsUseCase,
    // GetTeamByIdUseCase,
  ],
})
export class TeamModule {}
