import { Injectable, Inject } from '@nestjs/common';
import type { ITeamRepository } from '@domain/repositories/team.repository.interface';
import { Team } from '@domain/entities/team.entity';

/**
 * GetAllTeamsUseCase (Application Layer)
 *
 * Caso de uso que encapsula la lógica de negocio para obtener todos los equipos.
 * En este caso simple, solo delega al repositorio, pero en casos más complejos
 * podría incluir:
 * - Validaciones de negocio
 * - Orquestación de múltiples repositorios
 * - Aplicación de reglas de negocio
 * - Transformaciones de datos
 * - Logging de auditoría
 *
 * Patrón de Inyección de Dependencias:
 * - Depende de ITeamRepository (ABSTRACCIÓN), no de la implementación
 * - Inyecta el repositorio usando el token 'ITeamRepository'
 * - No conoce si se usa pg, Prisma o cualquier otra tecnología
 *
 * Ventaja: Si cambias la implementación del repositorio (pg → Prisma),
 * este use case NO necesita modificación.
 */
@Injectable()
export class GetAllTeamsUseCase {
  constructor(
    @Inject('ITeamRepository')
    private readonly teamRepository: ITeamRepository,
  ) {}

  /**
   * Ejecuta el caso de uso: obtener todos los equipos
   * @returns Promise con array de entidades Team
   */
  async execute(): Promise<Team[]> {
    const teams = await this.teamRepository.findAll();
    return teams;
  }
}
