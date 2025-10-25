import { ApiProperty } from '@nestjs/swagger';
import type { League } from '@domain/entities/league.entity';

/**
 * LeagueResponseDto (Adapters Layer)
 *
 * DTO para retornar información de una liga al cliente.
 * Transforma la entidad League de dominio a formato JSON para API REST.
 *
 * Campos calculados:
 * - isAdmin: Indica si el usuario actual es admin (se calcula en runtime)
 * - isMember: Indica si el usuario actual es miembro (se calcula en runtime)
 * - currentMembers: Número actual de miembros (se inyecta desde controller)
 *
 * Seguridad:
 * - inviteCode solo se muestra al admin de la liga (null para otros usuarios)
 */
export class LeagueResponseDto {
  @ApiProperty({
    description: 'League ID',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'League name',
    example: 'World Cup 2026 Friends',
  })
  name: string;

  @ApiProperty({
    description: 'League description',
    example: 'Liga pública para todos los fans',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'League type (public or private)',
    example: 'public',
    enum: ['public', 'private'],
  })
  type: 'public' | 'private';

  @ApiProperty({
    description: 'UUID of the admin user',
    example: 'd8357f2b-e7be-47ad-8e06-997d09017409',
    format: 'uuid',
  })
  adminUserId: string;

  @ApiProperty({
    description: 'Maximum number of members allowed',
    example: 200,
  })
  maxMembers: number;

  @ApiProperty({
    description: 'Current number of members',
    example: 15,
  })
  currentMembers: number;

  @ApiProperty({
    description:
      'Unique code for the league (both public and private leagues)',
    example: 'PORRAZA2026',
  })
  code: string;

  @ApiProperty({
    description: 'Logo URL (S3 URL - future implementation)',
    example: 'https://s3.amazonaws.com/porraza/leagues/logo.png',
    nullable: true,
  })
  logoUrl: string | null;

  @ApiProperty({
    description: 'Indicates if the current user is the admin of this league',
    example: true,
  })
  isAdmin: boolean;

  @ApiProperty({
    description: 'Indicates if the current user is a member of this league',
    example: true,
  })
  isMember: boolean;

  @ApiProperty({
    description: 'League creation date',
    example: '2025-01-24T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'League last update date',
    example: '2025-01-24T10:30:00.000Z',
  })
  updatedAt: Date;

  /**
   * Factory method para crear DTO desde entidad League
   *
   * @param league - Entidad de dominio
   * @param userId - ID del usuario actual (para calcular isAdmin/isMember)
   * @param isMember - Indica si el usuario es miembro
   * @param memberCount - Número actual de miembros
   * @returns LeagueResponseDto
   */
  static fromEntity(
    league: League,
    userId: string | null = null,
    isMember: boolean = false,
    memberCount: number = 0,
  ): LeagueResponseDto {
    const dto = new LeagueResponseDto();
    dto.id = league.id;
    dto.name = league.name;
    dto.description = league.description;
    dto.type = league.type;
    dto.adminUserId = league.adminUserId;
    dto.maxMembers = league.maxMembers;
    dto.currentMembers = memberCount;
    dto.logoUrl = league.logoUrl;
    dto.createdAt = league.createdAt;
    dto.updatedAt = league.updatedAt;

    // Calcular si el usuario actual es admin
    dto.isAdmin = userId ? league.isAdmin(userId) : false;

    // Calcular si el usuario actual es miembro
    dto.isMember = isMember;

    // Mostrar código siempre (todas las ligas tienen código)
    dto.code = league.code;

    return dto;
  }

  /**
   * Factory method para crear array de DTOs desde array de entidades
   *
   * @param leagues - Array de entidades
   * @param userId - ID del usuario actual
   * @param membershipMap - Map<leagueId, boolean> indicando membresía
   * @param memberCountMap - Map<leagueId, number> con conteo de miembros
   * @returns Array de LeagueResponseDto
   */
  static fromEntities(
    leagues: League[],
    userId: string | null = null,
    membershipMap: Map<string, boolean> = new Map(),
    memberCountMap: Map<string, number> = new Map(),
  ): LeagueResponseDto[] {
    return leagues.map((league) =>
      LeagueResponseDto.fromEntity(
        league,
        userId,
        membershipMap.get(league.id) || false,
        memberCountMap.get(league.id) || 0,
      ),
    );
  }
}
