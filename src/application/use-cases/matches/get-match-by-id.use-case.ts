import { Injectable, Inject } from '@nestjs/common';
import type { IMatchRepository } from '@domain/repositories/match.repository.interface';
import { Match } from '@domain/entities/match.entity';

/**
 * GetMatchByIdUseCase (Application Layer)
 *
 * Caso de uso que encapsula la lógica de negocio para obtener un partido por ID.
 * En este caso simple, solo delega al repositorio, pero en casos más complejos
 * podría incluir:
 * - Validaciones de negocio (validar formato UUID)
 * - Orquestación de múltiples repositorios
 * - Aplicación de reglas de negocio
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
export class GetMatchByIdUseCase {
  constructor(
    @Inject('IMatchRepository')
    private readonly matchRepository: IMatchRepository,
  ) {}

  /**
   * Ejecuta el caso de uso: obtener un partido por su ID
   * @param id - UUID del partido
   * @returns Promise con la entidad Match o null si no existe
   */
  async execute(id: string): Promise<Match | null> {
    const match = await this.matchRepository.findById(id);
    return match;
  }
}
