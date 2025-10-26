import { ApiProperty } from '@nestjs/swagger';

/**
 * StadiumBasicDto
 *
 * DTO ligero con información esencial de un estadio.
 * Se usa en respuestas anidadas (dentro de MatchResponseDto).
 *
 * Campos incluidos:
 * - id: UUID del estadio
 * - code: Código único ("MEX_CDMX_AZTECA", "USA_NY_METLIFE")
 * - name: Nombre del estadio ("Estadio Azteca", "MetLife Stadium")
 * - city: Ciudad ("Mexico City", "East Rutherford")
 * - country: Código ISO del país ("MEX", "USA", "CAN")
 * - capacity: Capacidad de espectadores
 */
export class StadiumBasicDto {
  @ApiProperty({
    description: 'Stadium unique identifier (UUID)',
    example: 'fd2c4c48-1a2d-4404-8a61-3c463e3e1604',
  })
  id!: string;

  @ApiProperty({
    description: 'Stadium unique code',
    example: 'MEX_CDMX_AZTECA',
  })
  code!: string;

  @ApiProperty({
    description: 'Stadium name',
    example: 'Estadio Azteca',
  })
  name!: string;

  @ApiProperty({
    description: 'City where stadium is located',
    example: 'Mexico City',
  })
  city!: string;

  @ApiProperty({
    description: 'Country ISO code (MEX, USA, CAN)',
    example: 'MEX',
    maxLength: 3,
  })
  country!: string;

  @ApiProperty({
    description: 'Stadium capacity (number of seats)',
    example: 83000,
    nullable: true,
  })
  capacity!: number | null;
}
