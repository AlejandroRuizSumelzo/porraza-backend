import { ApiProperty } from '@nestjs/swagger';
import { Stadium } from '@domain/entities/stadium.entity';

/**
 * StadiumResponseDto (Adapters Layer)
 *
 * Data Transfer Object para serializar entidades Stadium en respuestas HTTP.
 * Este DTO pertenece a la capa de adaptadores y define el formato JSON de salida.
 *
 * Responsabilidades:
 * - Definir estructura de respuesta JSON
 * - Documentación OpenAPI/Swagger con decoradores @ApiProperty
 * - Transformar entidades de dominio a formato de API
 *
 * Separación de concerns:
 * - Stadium entity: Lógica de negocio y reglas del dominio
 * - StadiumResponseDto: Formato de presentación en HTTP/JSON
 */
export class StadiumResponseDto {
  @ApiProperty({
    description: 'Identificador único del estadio (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Código único del estadio',
    example: 'SAN_MAMES',
    maxLength: 50,
  })
  code: string;

  @ApiProperty({
    description: 'Nombre del estadio',
    example: 'San Mamés',
    maxLength: 150,
  })
  name: string;

  @ApiProperty({
    description: 'Ciudad donde se ubica el estadio',
    example: 'Bilbao',
    maxLength: 100,
  })
  city: string;

  @ApiProperty({
    description: 'Código de país ISO 3166-1 alpha-3',
    example: 'ESP',
    minLength: 3,
    maxLength: 3,
  })
  country: string;

  @ApiProperty({
    description: 'Zona horaria del estadio (formato IANA)',
    example: 'Europe/Madrid',
    maxLength: 50,
  })
  timezone: string;

  @ApiProperty({
    description: 'Capacidad del estadio (número de espectadores)',
    example: 53289,
    nullable: true,
    required: false,
  })
  capacity: number | null;

  @ApiProperty({
    description: 'Fecha de creación del registro',
    example: '2025-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Fecha de última actualización del registro',
    example: '2025-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  updatedAt: string;

  /**
   * Factory method para crear DTO desde entidad de dominio
   * @param stadium - Entidad Stadium del dominio
   * @returns Instancia de StadiumResponseDto
   */
  static fromEntity(stadium: Stadium): StadiumResponseDto {
    const dto = new StadiumResponseDto();
    dto.id = stadium.id;
    dto.code = stadium.code;
    dto.name = stadium.name;
    dto.city = stadium.city;
    dto.country = stadium.country;
    dto.timezone = stadium.timezone;
    dto.capacity = stadium.capacity;
    dto.createdAt = stadium.createdAt.toISOString();
    dto.updatedAt = stadium.updatedAt.toISOString();
    return dto;
  }

  /**
   * Factory method para crear array de DTOs desde array de entidades
   * @param stadiums - Array de entidades Stadium
   * @returns Array de StadiumResponseDto
   */
  static fromEntities(stadiums: Stadium[]): StadiumResponseDto[] {
    return stadiums.map((stadium) => StadiumResponseDto.fromEntity(stadium));
  }
}
