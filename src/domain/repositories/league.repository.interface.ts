import type { League } from '@domain/entities/league.entity';
import type { User } from '@domain/entities/user.entity';

/**
 * Datos necesarios para crear una liga
 * No incluye id, created_at, updated_at (generados por BD)
 * code se genera automáticamente si no se proporciona
 */
export interface CreateLeagueData {
  name: string;
  description?: string;
  type: 'public' | 'private';
  adminUserId: string;
  maxMembers?: number; // Opcional, default 200 en BD
  code?: string; // Opcional: si no se proporciona, se genera automáticamente
}

/**
 * Datos opcionales para actualizar una liga
 * Solo permite actualizar campos que el admin puede modificar
 */
export interface UpdateLeagueData {
  name?: string;
  description?: string;
  type?: 'public' | 'private';
}

/**
 * ILeagueRepository (Domain Layer - Port)
 *
 * Interface que define el contrato que debe cumplir cualquier implementación
 * de repositorio de ligas. Esta interface pertenece a la capa de dominio
 * y NO depende de detalles de implementación (pg, TypeORM, etc.).
 *
 * Patrón: Dependency Inversion Principle (DIP)
 * - El dominio define QUÉ necesita (esta interface)
 * - La infraestructura implementa CÓMO lo hace (LeagueRepository con pg)
 * - Los Use Cases dependen de esta abstracción, no de implementaciones concretas
 *
 * Responsabilidades:
 * - Operaciones CRUD básicas para ligas
 * - Búsquedas por diferentes criterios (id, tipo, código de invitación, admin)
 * - Gestión de miembros (agregar, eliminar, listar, contar)
 * - Transferencia de administrador
 */
export interface ILeagueRepository {
  // =========================================================================
  // OPERACIONES CRUD DE LIGAS
  // =========================================================================

  /**
   * Busca una liga por su ID
   * @param id - UUID de la liga
   * @returns League si existe, null si no se encuentra
   */
  findById(id: string): Promise<League | null>;

  /**
   * Obtiene todas las ligas del sistema
   * @returns Array de ligas (puede estar vacío)
   * @note En producción, considerar paginación
   */
  findAll(): Promise<League[]>;

  /**
   * Obtiene solo las ligas públicas
   * @returns Array de ligas públicas
   * @note Útil para mostrar ligas disponibles para unirse
   */
  findPublicLeagues(): Promise<League[]>;

  /**
   * Obtiene todas las ligas donde el usuario es miembro
   * @param userId - UUID del usuario
   * @returns Array de ligas del usuario
   */
  findByUserId(userId: string): Promise<League[]>;

  /**
   * Busca una liga por su código único
   * @param code - Código único de la liga (públicas y privadas)
   * @returns League si existe, null si no se encuentra
   * @note Aplica para todas las ligas (públicas y privadas)
   */
  findByCode(code: string): Promise<League | null>;

  /**
   * Obtiene todas las ligas administradas por un usuario
   * @param adminUserId - UUID del usuario administrador
   * @returns Array de ligas donde el usuario es admin
   */
  findByAdminUserId(adminUserId: string): Promise<League[]>;

  /**
   * Crea una nueva liga en la base de datos
   * @param data - Datos de la liga (name, description, type, adminUserId, code opcional)
   * @returns Liga creada con id y timestamps generados
   * @throws Error si el adminUserId no existe
   * @note Si no se proporciona 'code', se genera automáticamente un código único
   * @note El admin se agrega automáticamente como primer miembro
   */
  create(data: CreateLeagueData): Promise<League>;

  /**
   * Actualiza los datos de una liga existente
   * @param id - UUID de la liga a actualizar
   * @param data - Datos a actualizar (name, description, type)
   * @returns Liga actualizada
   * @throws Error si la liga no existe
   * @note updated_at se actualiza automáticamente por trigger de BD
   * @note El código no se puede modificar una vez creada la liga
   */
  update(id: string, data: UpdateLeagueData): Promise<League>;

  /**
   * Elimina una liga de la base de datos
   * @param id - UUID de la liga a eliminar
   * @returns void
   * @throws Error si la liga no existe
   * @note Eliminación física (hard delete) con CASCADE
   * @note Se eliminan automáticamente: miembros, predicciones asociadas (futuro)
   */
  delete(id: string): Promise<void>;

  /**
   * Transfiere el rol de administrador a otro usuario
   * @param leagueId - UUID de la liga
   * @param newAdminUserId - UUID del nuevo administrador
   * @returns void
   * @throws Error si la liga no existe
   * @throws Error si el nuevo admin no es miembro de la liga
   * @note El nuevo admin debe ser miembro activo de la liga
   */
  transferAdmin(leagueId: string, newAdminUserId: string): Promise<void>;

  // =========================================================================
  // GESTIÓN DE MIEMBROS
  // =========================================================================

  /**
   * Agrega un usuario como miembro de una liga
   * @param leagueId - UUID de la liga
   * @param userId - UUID del usuario
   * @returns void
   * @throws Error si la liga no existe
   * @throws Error si el usuario no existe
   * @throws Error si el usuario ya es miembro
   * @throws Error si la liga ha alcanzado max_members
   * @note joined_at se establece automáticamente a NOW()
   */
  addMember(leagueId: string, userId: string): Promise<void>;

  /**
   * Elimina un usuario de una liga
   * @param leagueId - UUID de la liga
   * @param userId - UUID del usuario
   * @returns void
   * @throws Error si la liga no existe
   * @throws Error si el usuario no es miembro
   * @note También elimina las predicciones del usuario en esa liga (futuro)
   */
  removeMember(leagueId: string, userId: string): Promise<void>;

  /**
   * Verifica si un usuario es miembro de una liga
   * @param leagueId - UUID de la liga
   * @param userId - UUID del usuario
   * @returns true si es miembro, false si no lo es
   */
  isMember(leagueId: string, userId: string): Promise<boolean>;

  /**
   * Obtiene el número de miembros actuales de una liga
   * @param leagueId - UUID de la liga
   * @returns Número de miembros
   * @note Útil para validar límite max_members antes de agregar
   */
  getMemberCount(leagueId: string): Promise<number>;

  /**
   * Obtiene todos los miembros de una liga
   * @param leagueId - UUID de la liga
   * @returns Array de usuarios miembros (ordenados por joined_at ASC)
   * @note El orden es importante para seleccionar nuevo admin si el actual sale
   */
  getMembers(leagueId: string): Promise<User[]>;

  /**
   * Obtiene el miembro más antiguo de una liga (excluyendo a un usuario específico)
   * @param leagueId - UUID de la liga
   * @param excludeUserId - UUID del usuario a excluir (típicamente el admin actual)
   * @returns User del miembro más antiguo, null si no hay otros miembros
   * @note Usado para transferir admin cuando el admin actual sale de la liga
   */
  getOldestMember(
    leagueId: string,
    excludeUserId: string,
  ): Promise<User | null>;
}
