import { ApiProperty } from '@nestjs/swagger';

/**
 * TeamBasicDto
 *
 * DTO ligero con información esencial de un equipo.
 * Se usa en respuestas anidadas (dentro de MatchResponseDto) para evitar responses muy grandes.
 *
 * Campos incluidos:
 * - id: UUID del equipo
 * - name: Nombre completo ("México", "Argentina", etc.)
 * - fifaCode: Código FIFA de 3 letras ("MEX", "ARG", "BRA")
 * - confederation: Confederación ("CONCACAF", "CONMEBOL", "UEFA", etc.)
 */
export class TeamBasicDto {
  @ApiProperty({
    description: 'Team unique identifier (UUID)',
    example: 'd8357f2b-e7be-47ad-8e06-997d09017409',
  })
  id!: string;

  @ApiProperty({
    description: 'Team name',
    example: 'Mexico',
  })
  name!: string;

  @ApiProperty({
    description: 'FIFA 3-letter code',
    example: 'MEX',
    maxLength: 3,
  })
  fifaCode!: string;

  @ApiProperty({
    description: 'Continental confederation',
    example: 'CONCACAF',
    enum: ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC', 'TBD'],
  })
  confederation!: string;
}
