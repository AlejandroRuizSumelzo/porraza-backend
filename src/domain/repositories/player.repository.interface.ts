import type { Player } from '@domain/entities/player.entity';
import type { PlayerPosition } from '@domain/entities/player.entity';

/**
 * Filtros para búsqueda de jugadores
 */
export interface PlayerFilters {
  teamId?: string;
  position?: PlayerPosition;
  name?: string; // Búsqueda parcial (LIKE)
}

/**
 * IPlayerRepository (Domain Layer - Port)
 *
 * Interface que define el contrato para operaciones con jugadores.
 *
 * Patrón: Dependency Inversion Principle (DIP)
 * - El dominio define QUÉ necesita (esta interface)
 * - La infraestructura implementa CÓMO lo hace (PlayerRepository con pg)
 *
 * Responsabilidades:
 * - Consultas de jugadores por equipo, posición
 * - Búsqueda de jugadores para selección de premios
 * - Filtrado por porteros (Golden Glove), delanteros (Golden Boot candidates)
 *
 * Notas:
 * - Los jugadores son datos maestros (seed), no se crean/editan por usuarios
 * - Solo operaciones de lectura (findById, findAll, findByTeam)
 * - Admin puede actualizar nombres reales después del seed inicial
 */
export interface IPlayerRepository {
  /**
   * Busca un jugador por su ID
   * @param id - UUID del jugador
   * @returns Player si existe, null si no se encuentra
   */
  findById(id: string): Promise<Player | null>;

  /**
   * Obtiene todos los jugadores de un equipo
   * @param teamId - UUID del equipo
   * @returns Array de jugadores del equipo (23 jugadores)
   */
  findByTeam(teamId: string): Promise<Player[]>;

  /**
   * Obtiene jugadores filtrados por criterios
   * @param filters - Filtros opcionales (teamId, position, name)
   * @returns Array de jugadores que coinciden con los filtros
   */
  findByFilters(filters: PlayerFilters): Promise<Player[]>;

  /**
   * Obtiene todos los porteros (para selección de Golden Glove)
   * @returns Array de porteros de todos los equipos
   */
  findAllGoalkeepers(): Promise<Player[]>;

  /**
   * Obtiene porteros de equipos específicos
   * @param teamIds - Array de UUIDs de equipos
   * @returns Array de porteros de los equipos especificados
   */
  findGoalkeepersByTeams(teamIds: string[]): Promise<Player[]>;

  /**
   * Obtiene todos los jugadores (para selección de Golden Boot/Ball)
   * @returns Array de todos los jugadores
   * @note Considerar paginación en producción (1104 jugadores)
   */
  findAll(): Promise<Player[]>;

  /**
   * Obtiene jugadores de múltiples equipos
   * Útil para obtener solo jugadores de equipos clasificados
   * @param teamIds - Array de UUIDs de equipos
   * @returns Array de jugadores de los equipos especificados
   */
  findByTeams(teamIds: string[]): Promise<Player[]>;

  /**
   * Verifica si un jugador existe
   * @param id - UUID del jugador
   * @returns true si existe, false si no
   */
  exists(id: string): Promise<boolean>;
}
