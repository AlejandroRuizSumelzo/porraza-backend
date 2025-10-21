import { ApiProperty } from '@nestjs/swagger';
import { Team } from '../../domain/entities/team.entity';

export class TeamResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the team',
    example: '9a391cb4-7a8b-44b3-b3fc-8fabc9c191dd',
  })
  id: string;

  @ApiProperty({
    description: 'Full name of the team',
    example: 'Canada',
  })
  name: string;

  @ApiProperty({
    description: 'FIFA three-letter code',
    example: 'CAN',
  })
  fifaCode: string;

  @ApiProperty({
    description: 'Confederation the team belongs to',
    example: 'CONCACAF',
    enum: ['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC', 'UEFA', 'TBD'],
  })
  confederation: string;

  @ApiProperty({
    description: 'Whether the team is a host nation (Mexico, USA, or Canada)',
    example: true,
  })
  isHost: boolean;

  @ApiProperty({
    description: 'Timestamp when the team was created',
    example: '2025-10-21T10:55:00.013+02:00',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the team was last updated',
    example: '2025-10-21T10:55:00.013+02:00',
  })
  updatedAt: Date;

  static fromEntity(team: Team): TeamResponseDto {
    const dto = new TeamResponseDto();
    dto.id = team.id;
    dto.name = team.name;
    dto.fifaCode = team.fifaCode;
    dto.confederation = team.confederation;
    dto.isHost = team.isHost;
    dto.createdAt = team.createdAt;
    dto.updatedAt = team.updatedAt;
    return dto;
  }
}
