import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetAllMatchesUseCase } from '@application/use-cases/matches/get-all-matches.use-case';
import { GetMatchByIdUseCase } from '@application/use-cases/matches/get-match-by-id.use-case';
import { GetMatchCalendarUseCase } from '@application/use-cases/matches/get-match-calendar.use-case';
import { MatchResponseDto } from '@adapters/dtos/match.response.dto';
import { MatchCalendarResponseDto } from '@adapters/dtos/match-calendar.response.dto';

/**
 * MatchController (Adapters Layer)
 *
 * Controlador REST que maneja endpoints relacionados con partidos.
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
@ApiTags('Matches')
@Controller('matches')
export class MatchController {
  constructor(
    private readonly getAllMatchesUseCase: GetAllMatchesUseCase,
    private readonly getMatchByIdUseCase: GetMatchByIdUseCase,
    private readonly getMatchCalendarUseCase: GetMatchCalendarUseCase,
  ) {}

  /**
   * GET /matches/calendar
   * Obtiene el calendario completo del Mundial con detalles de equipos y estadios
   * IMPORTANTE: Este endpoint debe ir ANTES de GET /matches/:id para evitar conflictos de rutas
   */
  @Get('calendar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener calendario del Mundial',
    description:
      'Retorna el calendario completo de la Copa del Mundo FIFA 2026 (104 partidos) agrupado por fases del torneo. Incluye información detallada de equipos (nombre, código FIFA, confederación) y estadios (nombre, ciudad, país, timezone, capacidad). Los equipos TBD (por definir) muestran sus placeholders descriptivos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendario obtenido exitosamente',
    type: MatchCalendarResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async getCalendar(): Promise<MatchCalendarResponseDto> {
    // Ejecutar el caso de uso que obtiene y agrupa los partidos por fase
    return await this.getMatchCalendarUseCase.execute();
  }

  /**
   * GET /matches
   * Obtiene la lista de todos los partidos
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los partidos',
    description:
      'Retorna la lista completa de partidos de la Copa del Mundo FIFA 2026 (104 partidos), ordenados por número de partido. Incluye partidos de fase de grupos (1-72) y eliminatorias (73-104). Los partidos de eliminatorias pueden tener equipos TBD (por definir) con placeholders descriptivos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de partidos obtenida exitosamente',
    type: [MatchResponseDto],
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async findAll(): Promise<MatchResponseDto[]> {
    // 1. Ejecutar el caso de uso (lógica de negocio)
    const matches = await this.getAllMatchesUseCase.execute();

    // 2. Transformar entidades de dominio a DTOs de respuesta
    return matches.map((match) => MatchResponseDto.fromEntity(match));
  }

  /**
   * GET /matches/:id
   * Obtiene un partido por su ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un partido por ID',
    description:
      'Retorna los datos de un partido específico basado en su identificador único UUID. Incluye información completa del partido: equipos, estadio, fase, horario, resultados (si está jugado), y estado de bloqueo de predicciones.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID del partido',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
  })
  @ApiResponse({
    status: 200,
    description: 'Partido encontrado exitosamente',
    type: MatchResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Partido no encontrado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async findById(@Param('id') id: string): Promise<MatchResponseDto> {
    // 1. Ejecutar el caso de uso (lógica de negocio)
    const match = await this.getMatchByIdUseCase.execute(id);

    // 2. Verificar si existe el partido
    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    // 3. Transformar entidad de dominio a DTO de respuesta
    return MatchResponseDto.fromEntity(match);
  }
}
