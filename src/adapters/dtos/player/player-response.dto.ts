import { ApiProperty } from '@nestjs/swagger';
import type { Player, PlayerPosition } from '@domain/entities/player.entity';

/**
 * PlayerResponseDto
 *
 * DTO de respuesta para entidad Player.
 * Transforma la entidad de dominio a formato HTTP response.
 *
 * Usado en:
 * - GET /players/team/:teamId
 * - GET /players/goalkeepers
 *
 * Campos incluidos:
 * - Identificación: id, name, teamId
 * - Detalles: position, jerseyNumber
 * - Metadata: createdAt, updatedAt
 */
export class PlayerResponseDto {
  @ApiProperty({
    description: 'Player unique identifier (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'Player full name',
    example: 'Lionel Messi',
    minLength: 2,
    maxLength: 150,
  })
  name!: string;

  @ApiProperty({
    description: 'Team UUID this player belongs to',
    example: '650e8400-e29b-41d4-a716-446655440000',
  })
  teamId!: string;

  @ApiProperty({
    description: 'Player position on the field',
    enum: ['goalkeeper', 'defender', 'midfielder', 'forward'],
    example: 'forward',
  })
  position!: PlayerPosition;

  @ApiProperty({
    description: 'Jersey number (1-99)',
    example: 10,
    minimum: 1,
    maximum: 99,
  })
  jerseyNumber!: number;

  @ApiProperty({
    description: 'Timestamp when player was created in the system',
    example: '2025-10-24T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when player was last updated',
    example: '2025-10-24T12:00:00.000Z',
  })
  updatedAt!: Date;

  /**
   * Factory method para crear DTO desde entidad de dominio
   *
   * @param player - Entidad Player del dominio
   * @returns PlayerResponseDto para HTTP response
   */
  static fromEntity(player: Player): PlayerResponseDto {
    const dto = new PlayerResponseDto();
    dto.id = player.id;
    dto.name = player.name;
    dto.teamId = player.teamId;
    dto.position = player.position;
    dto.jerseyNumber = player.jerseyNumber;
    dto.createdAt = player.createdAt;
    dto.updatedAt = player.updatedAt;
    return dto;
  }
}
