import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { UserModule } from '@modules/user/user.module';
import { LeagueController } from '@adapters/controllers/league.controller';

// Use Cases
import { CreateLeagueUseCase } from '@application/use-cases/leagues/create-league.use-case';
import { GetLeagueByIdUseCase } from '@application/use-cases/leagues/get-league-by-id.use-case';
import { GetLeagueByCodeUseCase } from '@application/use-cases/leagues/get-league-by-code.use-case';
import { GetAllLeaguesUseCase } from '@application/use-cases/leagues/get-all-leagues.use-case';
import { GetPublicLeaguesUseCase } from '@application/use-cases/leagues/get-public-leagues.use-case';
import { GetUserLeaguesUseCase } from '@application/use-cases/leagues/get-user-leagues.use-case';
import { UpdateLeagueUseCase } from '@application/use-cases/leagues/update-league.use-case';
import { DeleteLeagueUseCase } from '@application/use-cases/leagues/delete-league.use-case';
import { JoinLeagueUseCase } from '@application/use-cases/leagues/join-league.use-case';
import { LeaveLeagueUseCase } from '@application/use-cases/leagues/leave-league.use-case';
import { RemoveMemberUseCase } from '@application/use-cases/leagues/remove-member.use-case';
import { TransferAdminUseCase } from '@application/use-cases/leagues/transfer-admin.use-case';
import { GetLeagueMembersUseCase } from '@application/use-cases/leagues/get-league-members.use-case';

// Repository
import { LeagueRepository } from '@infrastructure/persistence/repositories/league.repository';

/**
 * LeagueModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad de ligas.
 * Este módulo es el "pegamento" que conecta todas las capas mediante
 * el patrón de Inyección de Dependencias de NestJS.
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS:
 *
 * 1. DatabaseModule (importado):
 *    - Proporciona 'DATABASE_POOL' (Pool de pg)
 *    - LeagueRepository lo inyecta con @Inject('DATABASE_POOL')
 *
 * 2. UserModule (importado):
 *    - Exporta 'IUserRepository' (necesario para validar usuarios en use cases)
 *    - CreateLeagueUseCase y JoinLeagueUseCase lo usan para validar payment/email
 *
 * 3. LeagueRepository (provider):
 *    - Token: 'ILeagueRepository' (string único)
 *    - Clase: LeagueRepository (implementación con pg + SQL nativo)
 *    - Los Use Cases lo inyectan con @Inject('ILeagueRepository')
 *
 * 4. Use Cases (providers):
 *    - Cada Use Case se inyecta automáticamente en LeagueController por su clase
 *    - Todos dependen de ILeagueRepository (inversión de dependencias)
 *    - Algunos dependen de IUserRepository (CreateLeague, JoinLeague)
 *
 * 5. LeagueController (controller):
 *    - Recibe todos los Use Cases vía constructor
 *    - Delega lógica de negocio a los Use Cases
 *
 * FLUJO DE INYECCIÓN:
 * DatabaseModule.DATABASE_POOL → LeagueRepository → Use Cases → LeagueController
 * UserModule.IUserRepository → Use Cases (CreateLeague, JoinLeague)
 */
@Module({
  imports: [
    DatabaseModule, // Importar para tener acceso a DATABASE_POOL
    UserModule, // Importar para tener acceso a IUserRepository
  ],
  controllers: [
    LeagueController, // Controlador REST que maneja los endpoints HTTP
  ],
  providers: [
    // Use Cases: Se inyectan directamente por su clase
    CreateLeagueUseCase,
    GetLeagueByIdUseCase,
    GetLeagueByCodeUseCase,
    GetAllLeaguesUseCase,
    GetPublicLeaguesUseCase,
    GetUserLeaguesUseCase,
    UpdateLeagueUseCase,
    DeleteLeagueUseCase,
    JoinLeagueUseCase,
    LeaveLeagueUseCase,
    RemoveMemberUseCase,
    TransferAdminUseCase,
    GetLeagueMembersUseCase,

    // Repository: Se inyecta con token personalizado (Inversión de Dependencias)
    {
      provide: 'ILeagueRepository', // Token: Nombre de la interface
      useClass: LeagueRepository, // Implementación: Clase con SQL nativo (pg)
    },
  ],
  exports: [
    // Exportar Use Cases si otros módulos necesitan usarlos
    // Por ejemplo, si un módulo de predicciones necesita validar ligas
    GetLeagueByIdUseCase,
    GetLeagueByCodeUseCase,
    GetUserLeaguesUseCase,
    GetLeagueMembersUseCase,
    // Exportar el repositorio si otros módulos necesitan acceso directo
    'ILeagueRepository',
  ],
})
export class LeagueModule {}
