import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';
import { GetPlayersByTeamUseCase } from '@application/use-cases/players/get-players-by-team.use-case';
import { GetAllGoalkeepersUseCase } from '@application/use-cases/players/get-all-goalkeepers.use-case';
import { PlayerResponseDto } from '@adapters/dtos/player/player-response.dto';

/**
 * PlayerController (Adapters Layer)
 *
 * Controlador REST para gestión de jugadores del Mundial 2026.
 * Proporciona endpoints para consultar jugadores por equipo y porteros.
 *
 * Endpoints:
 * - GET /players/team/:teamId - Obtiene jugadores de un equipo
 * - GET /players/goalkeepers - Obtiene todos los porteros
 *
 * Autenticación:
 * - Requiere JWT válido en todos los endpoints
 * - Usuario debe estar autenticado (isActive && isEmailVerified)
 *
 * Responsabilidades:
 * - Validar parámetros de entrada
 * - Delegar a Use Cases
 * - Transformar entidades a DTOs de respuesta
 * - Documentar API con Swagger
 */
@ApiTags('players')
@ApiBearerAuth('JWT-auth')
@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(
    private readonly getPlayersByTeamUseCase: GetPlayersByTeamUseCase,
    private readonly getAllGoalkeepersUseCase: GetAllGoalkeepersUseCase,
  ) {}

  /**
   * GET /players/team/:teamId
   *
   * Obtiene todos los jugadores de un equipo específico.
   * Retorna los 23 jugadores convocados (1 GK + 22 jugadores de campo).
   *
   * Casos de uso:
   * - Frontend necesita lista de jugadores para selección de premios (Pichichi, MVP)
   * - Filtrar jugadores por equipo en fase de grupos
   *
   * @param teamId - UUID del equipo
   * @returns Lista de 23 jugadores del equipo ordenados por número de camiseta
   */
  @Get('team/:teamId')
  @ApiOperation({
    summary: 'Get players by team',
    description:
      'Retrieves all 23 players from a specific team, ordered by jersey number',
  })
  @ApiParam({
    name: 'teamId',
    description: 'Team UUID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Players retrieved successfully',
    type: [PlayerResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Team not found',
  })
  async getPlayersByTeam(
    @Param('teamId') teamId: string,
  ): Promise<PlayerResponseDto[]> {
    const players = await this.getPlayersByTeamUseCase.execute(teamId);
    return players.map((player) => PlayerResponseDto.fromEntity(player));
  }

  /**
   * GET /players/goalkeepers
   *
   * Obtiene todos los porteros del Mundial 2026.
   * Útil para premios individuales (Guante de Oro).
   *
   * Casos de uso:
   * - Frontend muestra lista de porteros candidatos a Golden Glove
   * - Filtrado específico por posición GK
   *
   * @returns Lista de 48 porteros (1 por equipo) ordenados por equipo
   */
  @Get('goalkeepers')
  @ApiOperation({
    summary: 'Get all goalkeepers',
    description:
      'Retrieves all goalkeepers from all 48 teams for Golden Glove award selection',
  })
  @ApiResponse({
    status: 200,
    description: 'Goalkeepers retrieved successfully',
    type: [PlayerResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getAllGoalkeepers(): Promise<PlayerResponseDto[]> {
    const goalkeepers = await this.getAllGoalkeepersUseCase.execute();
    return goalkeepers.map((player) => PlayerResponseDto.fromEntity(player));
  }
}
