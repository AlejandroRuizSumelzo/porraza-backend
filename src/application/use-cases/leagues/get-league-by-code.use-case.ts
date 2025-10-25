import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ILeagueRepository } from '@domain/repositories/league.repository.interface';
import type { League } from '@domain/entities/league.entity';

/**
 * GetLeagueByCodeUseCase (Application Layer)
 *
 * Caso de uso para obtener una liga por su código único.
 *
 * Responsabilidades:
 * 1. Buscar la liga por código (públicas y privadas)
 * 2. Lanzar excepción si no existe
 * 3. Retornar la liga
 *
 * Casos de uso:
 * - Permitir a usuarios descubrir ligas mediante código compartido
 * - Validar que una liga existe antes de intentar unirse
 * - Implementar deep linking con URLs tipo /leagues/find/:code
 * - Funciona tanto para ligas públicas como privadas
 */
@Injectable()
export class GetLeagueByCodeUseCase {
  constructor(
    @Inject('ILeagueRepository')
    private readonly leagueRepository: ILeagueRepository,
  ) {}

  /**
   * Ejecuta el caso de uso
   *
   * @param code - Código único de la liga (será normalizado a mayúsculas)
   * @returns Liga encontrada
   * @throws NotFoundException si la liga no existe o el código es inválido
   */
  async execute(code: string): Promise<League> {
    // Normalizar código a mayúsculas (el repo ya lo hace, pero es buena práctica)
    const normalizedCode = code.trim().toUpperCase();

    const league = await this.leagueRepository.findByCode(normalizedCode);

    if (!league) {
      throw new NotFoundException(
        `League with code ${normalizedCode} not found`,
      );
    }

    return league;
  }
}
