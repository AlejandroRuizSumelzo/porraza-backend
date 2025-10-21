import { Injectable, Inject } from '@nestjs/common';
import type { IStadiumRepository } from '@domain/repositories/stadium.repository.interface';
import { Stadium } from '@domain/entities/stadium.entity';

/**
 * GetAllStadiumsUseCase (Application Layer)
 *
 * Caso de uso que encapsula la lógica de negocio para obtener todos los estadios.
 * En este caso simple, solo delega al repositorio, pero en casos más complejos
 * podría incluir:
 * - Validaciones de negocio
 * - Orquestación de múltiples repositorios
 * - Aplicación de reglas de negocio
 * - Transformaciones de datos
 * - Logging de auditoría
 *
 * Patrón de Inyección de Dependencias:
 * - Depende de IStadiumRepository (ABSTRACCIÓN), no de la implementación
 * - Inyecta el repositorio usando el token 'IStadiumRepository'
 * - No conoce si se usa pg, Prisma o cualquier otra tecnología
 *
 * Ventaja: Si cambias la implementación del repositorio (pg → Prisma),
 * este use case NO necesita modificación.
 */
@Injectable()
export class GetAllStadiumsUseCase {
  constructor(
    @Inject('IStadiumRepository')
    private readonly stadiumRepository: IStadiumRepository,
  ) {}

  /**
   * Ejecuta el caso de uso: obtener todos los estadios
   * @returns Promise con array de entidades Stadium
   */
  async execute(): Promise<Stadium[]> {
    const stadiums = await this.stadiumRepository.findAll();
    return stadiums;
  }
}
