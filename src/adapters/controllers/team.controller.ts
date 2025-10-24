import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetAllTeamsUseCase } from '@application/use-cases/teams/get-all-teams.use-case';
import { GetTeamByIdUseCase } from '@application/use-cases/teams/get-team-by-id.use-case';
import { TeamResponseDto } from '@adapters/dtos/team.response.dto';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';

/**
 * TeamController (Adapters Layer)
 *
 * Controlador REST que maneja endpoints relacionados con equipos.
 * Pertenece a la capa de adaptadores y es el punto de entrada HTTP.
 *
 * Responsabilidades:
 * - Recibir peticiones HTTP
 * - Validar datos de entrada (DTOs)
 * - Delegar lógica de negocio a Use Cases
 * - Transformar entidades de dominio a DTOs de respuesta
 * - Manejar errores HTTP
 * - Documentar API con Swagger
 *
 * Patrón:
 * HTTP Request → Controller → Use Case → Repository → Database
 * HTTP Response ← Controller ← Use Case ← Repository ← Database
 */
@ApiTags('Teams')
@Controller('teams')
export class TeamController {
  constructor(
    private readonly getAllTeamsUseCase: GetAllTeamsUseCase,
    private readonly getTeamByIdUseCase: GetTeamByIdUseCase,
  ) {}

  /**
   * GET /teams
   * Obtiene la lista de todos los equipos
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los equipos',
    description:
      'Retorna la lista completa de equipos nacionales participantes en la Copa del Mundo FIFA 2026, ordenados alfabéticamente por nombre. Incluye los 48 equipos clasificados más equipos TBD (por definir) para las fases eliminatorias.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de equipos obtenida exitosamente',
    type: [TeamResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async findAll(): Promise<TeamResponseDto[]> {
    // 1. Ejecutar el caso de uso (lógica de negocio)
    const teams = await this.getAllTeamsUseCase.execute();

    // 2. Transformar entidades de dominio a DTOs de respuesta
    return teams.map((team) => TeamResponseDto.fromEntity(team));
  }

  /**
   * GET /teams/:id
   * Obtiene un equipo por su ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un equipo por ID',
    description:
      'Retorna los datos de un equipo específico basado en su identificador único UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del equipo',
    example: '9a391cb4-7a8b-44b3-b3fc-8fabc9c191dd',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipo encontrado exitosamente',
    type: TeamResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 404,
    description: 'Equipo no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async findById(@Param('id') id: string): Promise<TeamResponseDto> {
    // 1. Ejecutar el caso de uso (lógica de negocio)
    const team = await this.getTeamByIdUseCase.execute(id);

    // 2. Verificar si existe el equipo
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    // 3. Transformar entidad de dominio a DTO de respuesta
    return TeamResponseDto.fromEntity(team);
  }
}
