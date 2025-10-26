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
import { UpdateAwardsUseCase } from '@application/use-cases/predictions/update-awards.use-case';
import { UpdateChampionUseCase } from '@application/use-cases/predictions/update-champion.use-case';
import { GetLeagueRankingUseCase } from '@application/use-cases/predictions/get-league-ranking.use-case';
import { GetPredictionStatsUseCase } from '@application/use-cases/predictions/get-prediction-stats.use-case';
import { GetMatchesWithPredictionsUseCase } from '@application/use-cases/predictions/get-matches-with-predictions.use-case';
import { SaveGroupPredictionsDto } from '@adapters/dtos/prediction/save-group-predictions.dto';
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
   * También retorna el ranking completo de la liga y todos los partidos de fase de grupos con predicciones.
   *
   * Flujo:
   * 1. Extrae userId del JWT
   * 2. Busca predicción existente (userId + leagueId)
   * 3. Si no existe, la crea automáticamente
   * 4. Obtiene ranking de la liga
   * 5. Obtiene todos los partidos de fase de grupos (72)
   * 6. Obtiene predicciones del usuario para esos partidos
   * 7. Combina matches con predicciones (0-0 si no existe predicción)
   * 8. Retorna predicción + ranking + matches
   *
   * Casos de uso:
   * - Usuario accede por primera vez a predicciones de una liga
   * - Usuario consulta su predicción existente
   * - Frontend muestra tabla de clasificación de la liga
   * - Frontend muestra formularios de predicción pre-poblados (0-0 por defecto)
   *
   * @param leagueId - UUID de la liga
   * @param req - Request con usuario autenticado (JWT)
   * @returns Predicción del usuario + ranking de la liga + matches con predicciones
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
      'Prediction, ranking, and matches with predictions retrieved successfully',
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
    const [rankingData, matchesWithPredictions] = await Promise.all([
      this.getLeagueRankingUseCase.execute(leagueId),
      this.getMatchesWithPredictionsUseCase.execute(prediction.id),
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
    };
  }

  /**
   * POST /predictions/league/:leagueId/groups/:groupId
   *
   * Guarda las predicciones de partidos de un grupo (6 partidos).
   * Calcula automáticamente la tabla de posiciones según reglas FIFA.
   *
   * Flujo:
   * 1. Valida que haya exactamente 6 predicciones de partidos
   * 2. Guarda predicciones (UPSERT - permite editar antes del deadline)
   * 3. Calcula tabla de posiciones (4 equipos, ordenados por: puntos → GD → GF)
   * 4. Guarda tabla de posiciones
   * 5. Detecta conflictos de desempate (3 stats idénticos)
   * 6. Retorna predicción actualizada + flags de conflicto
   *
   * Reglas FIFA de desempate:
   * 1. Puntos (victoria: 3, empate: 1, derrota: 0)
   * 2. Diferencia de goles
   * 3. Goles a favor
   * 4. (v1 simplificada: no fair play ni ranking FIFA)
   *
   * Casos de uso:
   * - Usuario completa predicciones de un grupo
   * - Usuario edita predicciones antes del deadline
   * - Frontend detecta desempates y pide al usuario ordenar manualmente
   *
   * @param leagueId - UUID de la liga
   * @param groupId - UUID del grupo (A-L)
   * @param dto - 6 predicciones de partidos con scores
   * @param req - Request con usuario autenticado (JWT)
   * @returns Predicción actualizada + flags de desempate
   */
  @Post('league/:leagueId/groups/:groupId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save group predictions',
    description:
      'Saves match predictions for a group (6 matches) and calculates group standings',
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
        prediction: { type: 'object' },
        tiebreakConflicts: {
          type: 'array',
          description: 'Teams with identical points, GD and GF',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input (not 6 matches, invalid scores)',
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

    // 1. Obtener o crear predicción del usuario para esta liga
    const prediction = await this.getOrCreatePredictionUseCase.execute(
      userId,
      leagueId,
    );

    // 2. Guardar predicciones de grupo (incluye cálculo de tabla)
    const result = await this.saveGroupPredictionsUseCase.execute({
      predictionId: prediction.id,
      groupId,
      matchPredictions: dto.matchPredictions,
    });

    // 3. Obtener predicción actualizada
    const updatedPrediction =
      await this.getOrCreatePredictionUseCase.execute(userId, leagueId);

    // 4. Transformar a DTO
    const predictionDto = PredictionResponseDto.fromEntity(updatedPrediction);

    return {
      prediction: predictionDto,
      tiebreakConflicts: result.tiebreakConflicts,
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
