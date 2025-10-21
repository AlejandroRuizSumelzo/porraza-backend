import { Injectable, Inject } from '@nestjs/common';
import type { IMatchRepository } from '@domain/repositories/match.repository.interface';
import { Match } from '@domain/entities/match.entity';

/**
 * GetAllMatchesUseCase (Application Layer)
 *
 * Caso de uso que encapsula la lógica de negocio para obtener todos los partidos.
 * En este caso simple, solo delega al repositorio, pero en casos más complejos
 * podría incluir:
 * - Validaciones de negocio
 * - Orquestación de múltiples repositorios
 * - Aplicación de reglas de negocio
 * - Transformaciones de datos
 * - Logging de auditoría
 *
 * Patrón de Inyección de Dependencias:
 * - Depende de IMatchRepository (ABSTRACCIÓN), no de la implementación
 * - Inyecta el repositorio usando el token 'IMatchRepository'
 * - No conoce si se usa pg, Prisma o cualquier otra tecnología
 *
 * Ventaja: Si cambias la implementación del repositorio (pg → Prisma),
 * este use case NO necesita modificación.
 */
@Injectable()
export class GetAllMatchesUseCase {
  constructor(
    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,
  ) {}

  /**
   * Ejecuta el caso de uso: obtener todos los partidos
   * @returns Promise con array de entidades Match ordenadas por match_number
   */
  async execute(): Promise<Match[]> {
    const matches = await this.matchRepository.findAll();
    return matches;
  }
}
