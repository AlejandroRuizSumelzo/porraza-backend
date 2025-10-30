import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';
import { GetOrCreatePredictionUseCase } from '@application/use-cases/predictions/get-or-create-prediction.use-case';
import { SaveGroupPredictionsUseCase } from '@application/use-cases/predictions/save-group-predictions.use-case';
import { SaveKnockoutPredictionsUseCase } from '@application/use-cases/predictions/save-knockout-predictions.use-case';
import { GetBestThirdPlacesByPredictionUseCase } from '@application/use-cases/predictions/get-best-third-places.use-case';
import { GetResolvedRoundOf32MatchesUseCase } from '@application/use-cases/predictions/get-resolved-round-of-32-matches.use-case';
import { UpdateAwardsUseCase } from '@application/use-cases/predictions/update-awards.use-case';
import { UpdateChampionUseCase } from '@application/use-cases/predictions/update-champion.use-case';
import { GetLeagueRankingUseCase } from '@application/use-cases/predictions/get-league-ranking.use-case';
import { GetPredictionStatsUseCase } from '@application/use-cases/predictions/get-prediction-stats.use-case';
import { GetMatchesWithPredictionsUseCase } from '@application/use-cases/predictions/get-matches-with-predictions.use-case';
import { SaveGroupPredictionsDto } from '@adapters/dtos/prediction/save-group-predictions.dto';
import { SaveKnockoutPredictionsDto } from '@adapters/dtos/prediction/save-knockout-predictions.dto';
import { UpdateAwardsDto } from '@adapters/dtos/prediction/update-awards.dto';
import { UpdateChampionDto } from '@adapters/dtos/prediction/update-champion.dto';
import { PredictionResponseDto } from '@adapters/dtos/prediction/prediction-response.dto';
import {
  LeagueRankingResponseDto,
  LeagueRankingItemDto,
} from '@adapters/dtos/prediction/league-ranking-response.dto';
import { PredictionStatsResponseDto } from '@adapters/dtos/prediction/prediction-stats-response.dto';
import { MatchWithPredictionDto } from '@adapters/dtos/prediction/match-with-prediction.dto';

/**
 * PredictionController (Adapters Layer)
 *
 * Controlador REST para gestión de predicciones del Mundial 2026.
 * Maneja todas las operaciones CRUD de predicciones de usuarios en ligas.
 *
 * Endpoints:
 * - GET    /predictions/league/:leagueId - Obtiene/crea predicción + ranking
 * - POST   /predictions/league/:leagueId/groups/:groupId - Guarda predicciones de grupo
 * - PATCH  /predictions/:id/awards - Actualiza premios individuales
 * - PATCH  /predictions/:id/champion - Actualiza campeón
 * - GET    /predictions/:id/stats - Obtiene estadísticas de progreso
 *
 * Autenticación:
 * - Requiere JWT válido en todos los endpoints
 * - Usuario debe estar autenticado (isActive && isEmailVerified)
 * - Usuario debe tener acceso a la liga (miembro o liga pública)
 *
 * Reglas de negocio:
 * - Predicciones se bloquean 1h antes del primer partido (deadline global)
 * - Usuario crea UNA predicción por liga (auto-creada en primer acceso)
 * - Fase de grupos: 12 grupos × 6 partidos = 72 predicciones
 * - Eliminatorias: calculadas automáticamente por frontend según clasificaciones
 * - Premios individuales: Golden Boot, Golden Ball, Golden Glove
 * - Campeón: equipo ganador del torneo
 *
 * Responsabilidades:
 * - Validar parámetros de entrada (DTOs)
 * - Extraer userId del JWT (req.user)
 * - Delegar a Use Cases
 * - Transformar entidades a DTOs de respuesta
 * - Documentar API con Swagger
 */
@ApiTags('predictions')
@ApiBearerAuth('JWT-auth')
@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionController {
  constructor(
    private readonly getOrCreatePredictionUseCase: GetOrCreatePredictionUseCase,
    private readonly saveGroupPredictionsUseCase: SaveGroupPredictionsUseCase,
    private readonly saveKnockoutPredictionsUseCase: SaveKnockoutPredictionsUseCase,
    private readonly getBestThirdPlacesByPredictionUseCase: GetBestThirdPlacesByPredictionUseCase,
    private readonly getResolvedRoundOf32MatchesUseCase: GetResolvedRoundOf32MatchesUseCase,
    private readonly updateAwardsUseCase: UpdateAwardsUseCase,
    private readonly updateChampionUseCase: UpdateChampionUseCase,
    private readonly getLeagueRankingUseCase: GetLeagueRankingUseCase,
    private readonly getPredictionStatsUseCase: GetPredictionStatsUseCase,
    private readonly getMatchesWithPredictionsUseCase: GetMatchesWithPredictionsUseCase,
  ) {}

  /**
   * GET /predictions/league/:leagueId
   *
   * Obtiene o crea la predicción del usuario para una liga.
   * También retorna el ranking completo de la liga, todos los partidos de fase de grupos con predicciones,
   * y los 8 mejores terceros lugares si se completaron los 12 grupos.
   *
   * Flujo:
   * 1. Extrae userId del JWT
   * 2. Busca predicción existente (userId + leagueId)
   * 3. Si no existe, la crea automáticamente
   * 4. Obtiene ranking de la liga
   * 5. Obtiene todos los partidos de fase de grupos (72)
   * 6. Obtiene predicciones del usuario para esos partidos
   * 7. Si groupsCompleted = true, obtiene los 8 mejores terceros
   * 8. Combina matches con predicciones (0-0 si no existe predicción)
   * 9. Retorna predicción + ranking + matches + bestThirdPlaces (si aplica)
   *
   * Casos de uso:
   * - Usuario accede por primera vez a predicciones de una liga
   * - Usuario consulta su predicción existente
   * - Frontend muestra tabla de clasificación de la liga
   * - Frontend muestra formularios de predicción pre-poblados (0-0 por defecto)
   * - Frontend muestra los 32 clasificados a eliminatorias (24 primeros/segundos + 8 mejores terceros)
   *
   * @param leagueId - UUID de la liga
   * @param req - Request con usuario autenticado (JWT)
   * @returns Predicción del usuario + ranking de la liga + matches con predicciones + bestThirdPlaces
   */
  @Get('league/:leagueId')
  @ApiOperation({
    summary: 'Get or create prediction for league with matches',
    description:
      'Retrieves user prediction for a league (auto-creates if not exists), league ranking, and all group stage matches with user predictions (initialized to 0-0 if not created)',
  })
  @ApiParam({
    name: 'leagueId',
    description: 'League UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description:
      'Prediction, ranking, matches with predictions, and best third places retrieved successfully',
    schema: {
      properties: {
        prediction: { type: 'object' },
        ranking: {
          type: 'object',
          properties: {
            leagueId: { type: 'string' },
            ranking: { type: 'array' },
            totalParticipants: { type: 'number' },
          },
        },
        matches: {
          type: 'array',
          description:
            'All group stage matches (72) with user predictions (0-0 if not created)',
          items: {
            type: 'object',
            properties: {
              match: { type: 'object' },
              userPrediction: { type: 'object' },
            },
          },
        },
        bestThirdPlaces: {
          type: 'array',
          description:
            'The 8 best third-placed teams (only included when all 12 groups are completed)',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              predictionId: { type: 'string', format: 'uuid' },
              teamId: { type: 'string', format: 'uuid' },
              rankingPosition: {
                type: 'number',
                description: 'Ranking position (1-8)',
              },
              points: { type: 'number' },
              goalDifference: { type: 'number' },
              goalsFor: { type: 'number' },
              fromGroupId: { type: 'string', format: 'uuid' },
              hasTiebreakConflict: { type: 'boolean' },
              tiebreakGroup: { type: 'number', nullable: true },
              manualTiebreakOrder: { type: 'number', nullable: true },
            },
          },
        },
        roundOf32Matches: {
          type: 'array',
          description:
            'Round of 32 matches (16 matches) with resolved teams and stadiums based on user predictions (only included when all 12 groups are completed)',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              matchNumber: { type: 'number', description: 'Match number (73-88)' },
              homeTeam: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Spain' },
                  fifaCode: { type: 'string', example: 'ESP' },
                  confederation: { type: 'string', example: 'UEFA' },
                },
              },
              awayTeam: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string', example: 'Turkey' },
                  fifaCode: { type: 'string', example: 'TUR' },
                  confederation: { type: 'string', example: 'UEFA' },
                },
              },
              stadium: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  code: { type: 'string', example: 'USA_ATL_MERCEDES_BENZ' },
                  name: { type: 'string', example: 'Mercedes-Benz Stadium' },
                  city: { type: 'string', example: 'Atlanta' },
                  country: { type: 'string', example: 'USA' },
                  capacity: { type: 'number', example: 75000, nullable: true },
                },
              },
              matchDate: { type: 'string', format: 'date' },
              matchTime: { type: 'string' },
              phase: { type: 'string', example: 'ROUND_OF_32' },
              predictionsLockedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User not member of private league',
  })
  @ApiResponse({
    status: 404,
    description: 'League not found',
  })
  async getOrCreatePrediction(
    @Param('leagueId') leagueId: string,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    // 1. Obtener o crear predicción del usuario
    const prediction = await this.getOrCreatePredictionUseCase.execute(
      userId,
      leagueId,
    );

    // 2. Ejecutar queries en paralelo para mejor performance
    const [rankingData, matchesWithPredictions, bestThirdPlaces, roundOf32Matches] =
      await Promise.all([
        this.getLeagueRankingUseCase.execute(leagueId),
        this.getMatchesWithPredictionsUseCase.execute(prediction.id),
        // Solo obtener best third places si se completaron los 12 grupos
        prediction.groupsCompleted
          ? this.getBestThirdPlacesByPredictionUseCase.execute(prediction.id)
          : Promise.resolve([]),
        // Obtener partidos de R32 con equipos resueltos si se completaron los grupos
        this.getResolvedRoundOf32MatchesUseCase.execute(
          prediction.id,
          prediction.groupsCompleted,
        ),
      ]);

    // 3. Transformar a DTOs

    // 3.1. Predicción
    const predictionDto = PredictionResponseDto.fromEntity(prediction);

    // 3.2. Ranking
    const rankingItems: LeagueRankingItemDto[] = rankingData.map((item) => ({
      prediction: PredictionResponseDto.fromEntity(item.prediction),
      user: {
        id: item.user.id,
        name: item.user.name,
        email: item.user.email,
      },
      position: item.position,
    }));

    const rankingDto: LeagueRankingResponseDto = {
      leagueId,
      ranking: rankingItems,
      totalParticipants: rankingItems.length,
    };

    // 3.3. Matches con predicciones enriquecidos (con teams, stadium, group)
    const matchesDto = MatchWithPredictionDto.fromDatabaseRows(
      matchesWithPredictions.matchRows,
      matchesWithPredictions.matchPredictions,
    );

    return {
      prediction: predictionDto,
      ranking: rankingDto,
      matches: matchesDto,
      bestThirdPlaces: bestThirdPlaces.length > 0 ? bestThirdPlaces : undefined,
      roundOf32Matches: roundOf32Matches.length > 0 ? roundOf32Matches : undefined,
    };
  }

  /**
   * POST /predictions/league/:leagueId/groups/:groupId
   *
   * Guarda las predicciones de partidos de un grupo (6 partidos) + tabla de clasificación.
   * **NUEVO ENFOQUE**: Frontend envía tabla calculada, backend valida.
   *
   * Flujo:
   * 1. Valida que haya exactamente 6 predicciones de partidos
   * 2. Valida que haya exactamente 4 posiciones en groupStandings
   * 3. Calcula tabla desde matchPredictions (source of truth)
   * 4. Valida que groupStandings enviado coincida con el calculado
   * 5. Guarda predicciones (UPSERT - permite editar antes del deadline)
   * 6. Guarda tabla de posiciones (con orden del usuario)
   * 7. Verifica si completó los 12 grupos
   * 8. Retorna success + completion status
   *
   * Ventajas:
   * - Frontend maneja UX de empates (drag & drop)
   * - Backend valida que estadísticas sean correctas
   * - Usuario resuelve empates antes de enviar (no necesita roundtrip)
   *
   * Casos de uso:
   * - Usuario completa predicciones de un grupo
   * - Usuario edita predicciones antes del deadline
   * - Usuario ordena manualmente equipos empatados (drag & drop)
   *
   * @param leagueId - UUID de la liga
   * @param groupId - UUID del grupo (A-L)
   * @param dto - 6 predicciones de partidos + 4 posiciones de tabla
   * @param req - Request con usuario autenticado (JWT)
   * @returns Success message + completion status
   */
  @Post('league/:leagueId/groups/:groupId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save group predictions with standings',
    description:
      'Saves match predictions (6 matches) and group standings (4 teams). Backend validates that standings match the predictions.',
  })
  @ApiParam({
    name: 'leagueId',
    description: 'League UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'groupId',
    description: 'Group UUID (A-L)',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Group predictions saved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Group predictions saved successfully',
        },
        groupsCompleted: {
          type: 'boolean',
          example: false,
          description: 'Whether all 12 groups have been completed',
        },
        totalGroupsCompleted: {
          type: 'number',
          example: 5,
          description: 'Number of groups completed (0-12)',
        },
        bestThirdPlaces: {
          type: 'array',
          description:
            'The 8 best third-placed teams (only included when all 12 groups are completed)',
          nullable: true,
          items: {
            type: 'object',
            properties: {
              teamId: { type: 'string', format: 'uuid' },
              rankingPosition: {
                type: 'number',
                description: 'Ranking position (1-8)',
              },
              points: { type: 'number' },
              goalDifference: { type: 'number' },
              goalsFor: { type: 'number' },
              fromGroupId: { type: 'string', format: 'uuid' },
              hasTiebreakConflict: { type: 'boolean' },
              tiebreakGroup: { type: 'number', nullable: true },
              manualTiebreakOrder: { type: 'number', nullable: true },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input (not 6 matches, not 4 teams, or standings validation failed)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Predictions locked (deadline passed)',
  })
  @ApiResponse({
    status: 404,
    description: 'League, group or prediction not found',
  })
  async saveGroupPredictions(
    @Param('leagueId') leagueId: string,
    @Param('groupId') groupId: string,
    @Body() dto: SaveGroupPredictionsDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    // Preparar datos para el Use Case
    // Si el frontend envía homeTeamId/awayTeamId, se usan (y el backend los validará)
    // Si no los envía, el Use Case los obtendrá desde la BD
    const matchPredictionsWithTeams = dto.matchPredictions.map((mp) => ({
      matchId: mp.matchId,
      homeScore: mp.homeScore,
      awayScore: mp.awayScore,
      homeScoreET: mp.homeScoreET,
      awayScoreET: mp.awayScoreET,
      penaltiesWinner: mp.penaltiesWinner,
      homeTeamId: mp.homeTeamId || '', // Se enriquecerá en Use Case si está vacío
      awayTeamId: mp.awayTeamId || '', // Se enriquecerá en Use Case si está vacío
    }));

    const groupStandingsData = dto.groupStandings.map((gs) => ({
      groupId,
      teamId: gs.teamId,
      position: gs.position,
      points: gs.points,
      played: gs.played,
      wins: gs.wins,
      draws: gs.draws,
      losses: gs.losses,
      goalsFor: gs.goalsFor,
      goalsAgainst: gs.goalsAgainst,
      goalDifference: gs.goalDifference,
    }));

    // Ejecutar Use Case con validación
    const result = await this.saveGroupPredictionsUseCase.execute({
      userId,
      leagueId,
      groupId,
      matchPredictions: matchPredictionsWithTeams,
      groupStandings: groupStandingsData,
    });

    return result;
  }

  /**
   * POST /predictions/:id/knockouts/:phase
   *
   * Guarda las predicciones de una fase de eliminatorias completa.
   *
   * Fases válidas:
   * - ROUND_OF_32 (16 partidos)
   * - ROUND_OF_16 (8 partidos)
   * - QUARTER_FINALS (4 partidos)
   * - SEMI_FINALS (2 partidos)
   * - FINAL (1 partido)
   *
   * Validaciones:
   * - Fase anterior debe estar completa
   * - Equipos deben coincidir con ganadores de la fase anterior
   * - Resultados deben ser consistentes:
   *   * Empate en 90' → prórroga obligatoria
   *   * Empate en prórroga → penaltis obligatorios
   *   * Ganador en 90' → no prórroga ni penaltis
   * - Número de predicciones debe coincidir con la fase
   *
   * Flujo:
   * 1. Frontend obtiene equipos clasificados (de R32 resueltos o fase anterior)
   * 2. Usuario predice resultados (90', prórroga, penaltis)
   * 3. Backend valida que equipos coincidan con ganadores esperados
   * 4. Guarda predicciones (UPSERT - permite editar antes del deadline)
   * 5. Si completó todas las fases, marca knockoutsCompleted = true
   *
   * @param id - UUID de la predicción
   * @param phase - Fase de eliminatorias (ROUND_OF_32, ROUND_OF_16, etc.)
   * @param dto - Array de predicciones de partidos con resultados
   * @returns Success message + completion status
   */
  @Post(':id/knockouts/:phase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save knockout phase predictions',
    description:
      'Saves predictions for a complete knockout phase (R32, R16, QF, SF, Final). Validates that previous phase is complete and teams match expected winners.',
  })
  @ApiParam({
    name: 'id',
    description: 'Prediction UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiParam({
    name: 'phase',
    description: 'Knockout phase',
    enum: ['ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'FINAL'],
  })
  @ApiResponse({
    status: 200,
    description: 'Knockout predictions saved successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Knockout predictions saved successfully',
        },
        phase: {
          type: 'string',
          example: 'ROUND_OF_16',
        },
        matchesSaved: {
          type: 'number',
          example: 8,
          description: 'Number of match predictions saved',
        },
        knockoutsCompleted: {
          type: 'boolean',
          example: false,
          description: 'Whether all knockout phases have been completed',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid phase, previous phase incomplete, teams mismatch, or invalid results',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Predictions locked (deadline passed)',
  })
  @ApiResponse({
    status: 404,
    description: 'Prediction or match not found',
  })
  async saveKnockoutPredictions(
    @Param('id') id: string,
    @Param('phase') phase: string,
    @Body() dto: SaveKnockoutPredictionsDto,
  ) {
    // Validar que la fase del DTO coincida con la del parámetro
    if (dto.phase !== phase) {
      throw new BadRequestException(
        `Phase mismatch: URL parameter is "${phase}" but request body has "${dto.phase}"`,
      );
    }

    // Ejecutar Use Case
    const savedPredictions = await this.saveKnockoutPredictionsUseCase.execute(
      id,
      phase,
      dto.predictions,
    );

    return {
      success: true,
      message: `${phase} predictions saved successfully`,
      phase,
      matchesSaved: savedPredictions.length,
      knockoutsCompleted: false, // TODO: Check if all knockouts are complete
    };
  }

  /**
   * PATCH /predictions/:id/awards
   *
   * Actualiza los premios individuales predichos (Golden Boot, Ball, Glove).
   *
   * Premios:
   * - Golden Boot (Pichichi): Máximo goleador del torneo
   * - Golden Ball (MVP): Mejor jugador del torneo
   * - Golden Glove: Mejor portero del torneo
   *
   * Validaciones:
   * - Golden Glove debe ser portero (position = 'GK')
   * - Predicción debe estar desbloqueada (antes del deadline)
   * - Jugadores deben existir en la BD
   *
   * @param id - UUID de la predicción
   * @param dto - IDs de jugadores para cada premio (opcionales)
   * @returns Predicción actualizada
   */
  @Patch(':id/awards')
  @ApiOperation({
    summary: 'Update individual awards',
    description:
      'Updates predicted individual awards (Golden Boot, Ball, Glove)',
  })
  @ApiParam({
    name: 'id',
    description: 'Prediction UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Awards updated successfully',
    type: PredictionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Golden Glove must be a goalkeeper',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Predictions locked (deadline passed)',
  })
  @ApiResponse({
    status: 404,
    description: 'Prediction or player not found',
  })
  async updateAwards(
    @Param('id') id: string,
    @Body() dto: UpdateAwardsDto,
  ): Promise<PredictionResponseDto> {
    const prediction = await this.updateAwardsUseCase.execute(id, dto);
    return PredictionResponseDto.fromEntity(prediction);
  }

  /**
   * PATCH /predictions/:id/champion
   *
   * Actualiza el campeón predicho del Mundial 2026.
   *
   * Flujo:
   * - Frontend calcula eliminatorias automáticamente según clasificaciones de grupos
   * - Usuario ajusta manualmente si hay desempates no resueltos
   * - Usuario selecciona equipo campeón
   *
   * Validaciones:
   * - Equipo debe existir en la BD
   * - Predicción debe estar desbloqueada (antes del deadline)
   *
   * @param id - UUID de la predicción
   * @param dto - ID del equipo campeón
   * @returns Predicción actualizada
   */
  @Patch(':id/champion')
  @ApiOperation({
    summary: 'Update predicted champion',
    description: 'Updates the team predicted to win the World Cup 2026',
  })
  @ApiParam({
    name: 'id',
    description: 'Prediction UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Champion updated successfully',
    type: PredictionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Predictions locked (deadline passed)',
  })
  @ApiResponse({
    status: 404,
    description: 'Prediction or team not found',
  })
  async updateChampion(
    @Param('id') id: string,
    @Body() dto: UpdateChampionDto,
  ): Promise<PredictionResponseDto> {
    const prediction = await this.updateChampionUseCase.execute(id, {
      championTeamId: dto.championTeamId,
    });
    return PredictionResponseDto.fromEntity(prediction);
  }

  /**
   * GET /predictions/:id/stats
   *
   * Obtiene estadísticas de progreso de una predicción.
   *
   * Métricas:
   * - Partidos predichos vs total (72 grupo + 32 eliminatorias = 104)
   * - Grupos completados (12 grupos)
   * - Si tiene campeón seleccionado
   * - Si tiene todos los premios seleccionados
   * - Porcentaje de completitud global
   *
   * Casos de uso:
   * - Frontend muestra barra de progreso
   * - Avisos de "completa tus predicciones"
   * - Validar antes de bloqueo (deadline)
   *
   * @param id - UUID de la predicción
   * @returns Estadísticas de progreso
   */
  @Get(':id/stats')
  @ApiOperation({
    summary: 'Get prediction statistics',
    description:
      'Retrieves progress statistics for a prediction (completion percentage, etc.)',
  })
  @ApiParam({
    name: 'id',
    description: 'Prediction UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: PredictionStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Prediction not found',
  })
  async getPredictionStats(
    @Param('id') id: string,
  ): Promise<PredictionStatsResponseDto> {
    const stats = await this.getPredictionStatsUseCase.execute(id);
    return stats as PredictionStatsResponseDto;
  }
}
