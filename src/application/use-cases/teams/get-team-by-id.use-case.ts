import { Injectable, Inject } from '@nestjs/common';
import type { ITeamRepository } from '@domain/repositories/team.repository.interface';
import { Team } from '@domain/entities/team.entity';

/**
 * GetTeamByIdUseCase (Application Layer)
 *
 * Caso de uso que encapsula la lógica de negocio para obtener un equipo por ID.
 * En este caso simple, solo delega al repositorio, pero en casos más complejos
 * podría incluir:
 * - Validaciones de negocio (validar formato UUID)
 * - Orquestación de múltiples repositorios
 * - Aplicación de reglas de negocio
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
export class GetTeamByIdUseCase {
  constructor(
    @Inject('ITeamRepository')
    private readonly teamRepository: ITeamRepository,
  ) {}

  /**
   * Ejecuta el caso de uso: obtener un equipo por su ID
   * @param id - UUID del equipo
   * @returns Promise con la entidad Team o null si no existe
   */
  async execute(id: string): Promise<Team | null> {
    const team = await this.teamRepository.findById(id);
    return team;
  }
}
