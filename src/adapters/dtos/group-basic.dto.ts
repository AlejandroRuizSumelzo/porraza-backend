import { ApiProperty } from '@nestjs/swagger';

/**
 * GroupBasicDto
 *
 * DTO ligero con información esencial de un grupo.
 * Se usa en respuestas anidadas (dentro de MatchResponseDto).
 *
 * Campos incluidos:
 * - id: UUID del grupo
 * - name: Nombre del grupo (letra de A-L)
 */
export class GroupBasicDto {
  @ApiProperty({
    description: 'Group unique identifier (UUID)',
    example: '3cbeb5b0-65b6-4c5c-b18b-7d495e8d8ada',
  })
  id!: string;

  @ApiProperty({
    description: 'Group name (A-L)',
    example: 'A',
    minLength: 1,
    maxLength: 1,
    pattern: '^[A-L]$',
  })
  name!: string;
}
