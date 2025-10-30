import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { MatchModule } from '@modules/match/match.module';
import { TeamModule } from '@modules/team/team.module';
import { StadiumModule } from '@modules/stadium/stadium.module';
import { PredictionController } from '@adapters/controllers/prediction.controller';
import { PlayerController } from '@adapters/controllers/player.controller';

// Player Use Cases
import { GetPlayersByTeamUseCase } from '@application/use-cases/players/get-players-by-team.use-case';
import { GetAllGoalkeepersUseCase } from '@application/use-cases/players/get-all-goalkeepers.use-case';
import { GetPlayersByTeamsUseCase } from '@application/use-cases/players/get-players-by-teams.use-case';

// Prediction Use Cases
import { GetOrCreatePredictionUseCase } from '@application/use-cases/predictions/get-or-create-prediction.use-case';
import { SaveGroupPredictionsUseCase } from '@application/use-cases/predictions/save-group-predictions.use-case';
import { SaveKnockoutPredictionsUseCase } from '@application/use-cases/predictions/save-knockout-predictions.use-case';
import { CalculateGroupStandingsUseCase } from '@application/use-cases/predictions/calculate-group-standings.use-case';
import { CalculateBestThirdPlacesUseCase } from '@application/use-cases/predictions/calculate-best-third-places.use-case';
import { GetBestThirdPlacesByPredictionUseCase } from '@application/use-cases/predictions/get-best-third-places.use-case';
import { GetResolvedRoundOf32MatchesUseCase } from '@application/use-cases/predictions/get-resolved-round-of-32-matches.use-case';
import { UpdateAwardsUseCase } from '@application/use-cases/predictions/update-awards.use-case';
import { UpdateChampionUseCase } from '@application/use-cases/predictions/update-champion.use-case';
import { GetLeagueRankingUseCase } from '@application/use-cases/predictions/get-league-ranking.use-case';
import { GetPredictionStatsUseCase } from '@application/use-cases/predictions/get-prediction-stats.use-case';
import { GetMatchesWithPredictionsUseCase } from '@application/use-cases/predictions/get-matches-with-predictions.use-case';

// Services
import { CalculateGroupStandingsService } from '@application/services/calculate-group-standings.service';
import { KnockoutBracketResolverService } from '@infrastructure/services/knockout-bracket-resolver.service';
import { KnockoutValidatorService } from '@infrastructure/services/knockout-validator.service';

// Repositories
import { PlayerRepository } from '@infrastructure/persistence/repositories/player.repository';
import { PredictionRepository } from '@infrastructure/persistence/repositories/prediction.repository';
import { MatchPredictionRepository } from '@infrastructure/persistence/repositories/match-prediction.repository';
import { GroupStandingPredictionRepository } from '@infrastructure/persistence/repositories/group-standing-prediction.repository';
import { BestThirdPlacePredictionRepository } from '@infrastructure/persistence/repositories/best-third-place-prediction.repository';

/**
 * PredictionModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad del sistema de predicciones del Mundial 2026.
 * Este módulo implementa Clean Architecture con Dependency Injection siguiendo el patrón SOLID.
 *
 * FUNCIONALIDAD PRINCIPAL:
 * - Gestión de predicciones de usuarios en ligas
 * - Predicciones de fase de grupos (12 grupos × 6 partidos = 72 predicciones)
 * - Cálculo automático de clasificaciones según reglas FIFA
 * - Predicciones de eliminatorias (calculadas por frontend)
 * - Premios individuales (Golden Boot, Ball, Glove)
 * - Selección de campeón
 * - Rankings de ligas en tiempo real
 * - Sistema de puntuación acumulativa
 *
 * ESTRUCTURA DE DATOS:
 * - players (1,104 registros: 48 equipos × 23 jugadores)
 * - predictions (1 por usuario por liga)
 * - match_predictions (hasta 104 por predicción)
 * - group_standings_predictions (48 registros: 12 grupos × 4 equipos)
 * - best_third_places_predictions (8 mejores terceros)
 *
 * REGLAS FIFA IMPLEMENTADAS:
 * 1. Clasificación de grupos: puntos → diferencia de goles → goles a favor
 * 2. Detección de empates en posiciones críticas (tiebreak manual)
 * 3. 8 mejores terceros puestos clasifican a Round of 32
 * 4. Deadline global: 1h antes del primer partido (11 junio 2026, 19:00 UTC)
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS:
 *
 * 1. DatabaseModule (importado):
 *    - Proporciona 'DATABASE_POOL' (Pool de pg)
 *    - Todos los repositorios lo inyectan con @Inject('DATABASE_POOL')
 *
 * 2. MatchModule (importado):
 *    - Proporciona 'IMatchRepository' (consulta de partidos)
 *    - SaveGroupPredictionsUseCase lo necesita para calcular clasificaciones
 *
 * 3. Repositories (5 providers con tokens):
 *    - IPlayerRepository → PlayerRepository
 *    - IPredictionRepository → PredictionRepository
 *    - IMatchPredictionRepository → MatchPredictionRepository
 *    - IGroupStandingPredictionRepository → GroupStandingPredictionRepository
 *    - IBestThirdPlacePredictionRepository → BestThirdPlacePredictionRepository
 *    - Cada Use Case inyecta solo los repositorios que necesita (SRP)
 *
 * 4. Use Cases (10 providers):
 *    - Casos de uso de jugadores (3)
 *    - Casos de uso de predicciones (7)
 *    - Cada uno depende de abstracciones (interfaces de repositorios)
 *    - CalculateGroupStandingsUseCase es puro (sin repositorios, solo lógica FIFA)
 *
 * 5. Controllers (2):
 *    - PlayerController (consulta jugadores)
 *    - PredictionController (CRUD predicciones + rankings)
 *
 * FLUJO DE INYECCIÓN COMPLETO:
 * ```
 * DatabaseModule.DATABASE_POOL
 *     ↓
 * Repositories (5 implementaciones concretas)
 *     ↓
 * Use Cases (10 casos de uso)
 *     ↓
 * Controllers (2 REST controllers)
 * ```
 *
 * VENTAJAS DEL DISEÑO:
 * - Single Responsibility: Cada repositorio maneja 1 entidad
 * - Inversión de Dependencias: Use Cases dependen de interfaces
 * - Testeable: Fácil mock de repositorios con tokens
 * - Mantenible: Cambios en implementación no afectan casos de uso
 * - Escalable: Agregar nuevo tipo de predicción es simple (nuevo repo + use case)
 *
 * EJEMPLO DE TESTING:
 * ```typescript
 * {
 *   provide: 'IPredictionRepository',
 *   useValue: mockPredictionRepository  // Mock para tests unitarios
 * }
 * ```
 */
@Module({
  imports: [
    DatabaseModule, // Proporciona DATABASE_POOL para todos los repositorios
    MatchModule, // Proporciona IMatchRepository para SaveGroupPredictionsUseCase
    TeamModule, // Proporciona ITeamRepository para GetResolvedRoundOf32MatchesUseCase
    StadiumModule, // Proporciona IStadiumRepository para GetResolvedRoundOf32MatchesUseCase
  ],
  controllers: [
    PlayerController, // GET /players/team/:teamId, GET /players/goalkeepers
    PredictionController, // CRUD completo de predicciones + rankings
  ],
  providers: [
    // ========================
    // PLAYER USE CASES (3)
    // ========================
    GetPlayersByTeamUseCase, // Obtiene 23 jugadores de un equipo
    GetAllGoalkeepersUseCase, // Obtiene 48 porteros (para Golden Glove)
    GetPlayersByTeamsUseCase, // Obtiene jugadores de múltiples equipos (batch)

    // ========================
    // PREDICTION USE CASES (11)
    // ========================
    GetOrCreatePredictionUseCase, // Obtiene o crea predicción (auto-create)
    SaveGroupPredictionsUseCase, // Guarda 6 predicciones + calcula tabla
    SaveKnockoutPredictionsUseCase, // Guarda predicciones de eliminatorias (R32, R16, QF, SF, Final)
    GetBestThirdPlacesByPredictionUseCase, // Obtiene 8 mejores terceros de una predicción
    GetResolvedRoundOf32MatchesUseCase, // Resuelve equipos de R32 según predicciones de grupos
    UpdateAwardsUseCase, // Actualiza Golden Boot/Ball/Glove
    UpdateChampionUseCase, // Actualiza equipo campeón
    GetLeagueRankingUseCase, // Obtiene ranking de liga (JOIN users)
    GetPredictionStatsUseCase, // Obtiene estadísticas de progreso
    GetMatchesWithPredictionsUseCase, // Obtiene matches de grupos con predicciones

    // ========================
    // SERVICES - Helper Services
    // ========================
    CalculateGroupStandingsService, // Servicio de validación y cálculo de tablas

    /**
     * KnockoutBracketResolverService
     * Token: 'IKnockoutBracketResolverService'
     * Implementa: IKnockoutBracketResolverService (Domain Service)
     * Responsabilidades:
     * - Resolver placeholders de partidos de eliminatorias (ej: "Group A winners")
     * - Asignar terceros lugares según ranking y disponibilidad
     * - Garantizar que cada tercero se asigne solo una vez
     * - Consultar grupos desde BD para mapeo groupId → groupLetter
     */
    {
      provide: 'IKnockoutBracketResolverService',
      useClass: KnockoutBracketResolverService,
    },

    /**
     * KnockoutValidatorService
     * Token: 'IKnockoutValidatorService'
     * Implementa: IKnockoutValidatorService (Domain Service)
     * Responsabilidades:
     * - Validar que fase anterior esté completa antes de permitir predicciones
     * - Validar que equipos en partidos coincidan con ganadores esperados
     * - Validar consistencia de resultados (90', prórroga, penaltis)
     * - Determinar ganadores de fases anteriores para cascada de validación
     */
    {
      provide: 'IKnockoutValidatorService',
      useClass: KnockoutValidatorService,
    },

    // ========================
    // CALCULATION USE CASES (2) - Pure Business Logic
    // ========================
    CalculateGroupStandingsUseCase, // Calcula tabla según reglas FIFA (puro)
    CalculateBestThirdPlacesUseCase, // Calcula 8 mejores terceros (puro)

    // ========================
    // REPOSITORIES (5) - Infrastructure Layer
    // ========================

    /**
     * PlayerRepository
     * Token: 'IPlayerRepository'
     * Implementa: IPlayerRepository
     * Responsabilidades:
     * - Consulta de jugadores por equipo
     * - Filtrado por posición (GK para Golden Glove)
     * - Validación de existencia de jugadores
     */
    {
      provide: 'IPlayerRepository',
      useClass: PlayerRepository,
    },

    /**
     * PredictionRepository
     * Token: 'IPredictionRepository'
     * Implementa: IPredictionRepository
     * Responsabilidades:
     * - CRUD de predicciones principales
     * - Consulta por usuario/liga
     * - Actualización de premios y campeón
     * - Bloqueo de predicciones (deadline)
     * - Actualización de puntos totales
     * - Rankings de ligas (JOIN con users)
     * - Estadísticas de progreso
     */
    {
      provide: 'IPredictionRepository',
      useClass: PredictionRepository,
    },

    /**
     * MatchPredictionRepository
     * Token: 'IMatchPredictionRepository'
     * Implementa: IMatchPredictionRepository
     * Responsabilidades:
     * - CRUD de predicciones de partidos (hasta 104 por predicción)
     * - UPSERT (permite editar antes del deadline)
     * - Consulta de predicciones por predicción/grupo/fase
     * - Conteo de predicciones (para estadísticas)
     */
    {
      provide: 'IMatchPredictionRepository',
      useClass: MatchPredictionRepository,
    },

    /**
     * GroupStandingPredictionRepository
     * Token: 'IGroupStandingPredictionRepository'
     * Implementa: IGroupStandingPredictionRepository
     * Responsabilidades:
     * - CRUD de clasificaciones de grupos (48 registros: 12 grupos × 4 equipos)
     * - Guardado batch (DELETE + INSERT para updates)
     * - Consulta de clasificaciones por grupo
     * - Detección de empates (tiebreak_group)
     */
    {
      provide: 'IGroupStandingPredictionRepository',
      useClass: GroupStandingPredictionRepository,
    },

    /**
     * BestThirdPlacePredictionRepository
     * Token: 'IBestThirdPlacePredictionRepository'
     * Implementa: IBestThirdPlacePredictionRepository
     * Responsabilidades:
     * - CRUD de mejores terceros puestos (8 equipos clasificados a R32)
     * - Guardado batch (DELETE + INSERT para updates)
     * - Cálculo según reglas FIFA (ordenamiento multi-criteria)
     */
    {
      provide: 'IBestThirdPlacePredictionRepository',
      useClass: BestThirdPlacePredictionRepository,
    },

    /**
     * NOTA SOBRE TOKENS:
     *
     * - TypeScript interfaces NO existen en runtime (se borran al compilar)
     * - NestJS necesita tokens únicos para inyectar dependencias
     * - Usamos strings como identificadores únicos
     * - Los Use Cases usan @Inject('IRepositoryName')
     *
     * Alternativa válida: Usar Symbols
     * export const PLAYER_REPOSITORY = Symbol('IPlayerRepository');
     * provide: PLAYER_REPOSITORY,
     * @Inject(PLAYER_REPOSITORY)
     */
  ],
  exports: [
    // Exportar Use Cases si otros módulos los necesitan
    GetOrCreatePredictionUseCase,
    GetLeagueRankingUseCase,

    // Exportar repositorios si otros módulos necesitan acceso directo
    // Por ejemplo, si sistema de puntuación necesita acceder a predictions
    'IPredictionRepository',
    'IMatchPredictionRepository',
  ],
})
export class PredictionModule {}
