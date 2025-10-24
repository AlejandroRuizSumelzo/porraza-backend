import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GetAllStadiumsUseCase } from '@application/use-cases/stadium/get-all-stadiums.use-case';
import { StadiumResponseDto } from '@adapters/dtos/stadium-response.dto';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';

/**
 * StadiumController (Adapters Layer)
 *
 * Controlador REST que maneja endpoints relacionados con estadios.
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
@ApiTags('Stadiums')
@Controller('stadiums')
export class StadiumController {
  constructor(private readonly getAllStadiumsUseCase: GetAllStadiumsUseCase) {}

  /**
   * GET /stadiums
   * Obtiene la lista de todos los estadios
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los estadios',
    description:
      'Retorna la lista completa de estadios registrados en el sistema, ordenados alfabéticamente por nombre.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de estadios obtenida exitosamente',
    type: [StadiumResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor',
  })
  async findAll(): Promise<StadiumResponseDto[]> {
    // 1. Ejecutar el caso de uso (lógica de negocio)
    const stadiums = await this.getAllStadiumsUseCase.execute();

    // 2. Transformar entidades de dominio a DTOs de respuesta
    return StadiumResponseDto.fromEntities(stadiums);
  }
}
