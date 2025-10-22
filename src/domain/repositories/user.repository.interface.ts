import type { User } from '@domain/entities/user.entity';

/**
 * Datos necesarios para crear un usuario
 * No incluye id, created_at, updated_at (generados por BD)
 * No incluye is_active, last_login_at (valores por defecto)
 */
export interface CreateUserData {
  email: string;
  password: string; // Password en texto plano, será hasheado por el repositorio
  name: string;
}

/**
 * Datos opcionales para actualizar un usuario
 * Solo permite actualizar campos que el usuario puede modificar
 */
export interface UpdateUserData {
  name?: string;
  email?: string;
  isActive?: boolean;
}

/**
 * Datos para actualizar la contraseña
 * Separado de UpdateUserData por seguridad
 */
export interface UpdatePasswordData {
  userId: string;
  newPassword: string; // Password en texto plano, será hasheado por el repositorio
}

/**
 * IUserRepository (Domain Layer - Port)
 *
 * Interface que define el contrato que debe cumplir cualquier implementación
 * de repositorio de usuarios. Esta interface pertenece a la capa de dominio
 * y NO depende de detalles de implementación (pg, TypeORM, etc.).
 *
 * Patrón: Dependency Inversion Principle (DIP)
 * - El dominio define QUÉ necesita (esta interface)
 * - La infraestructura implementa CÓMO lo hace (UserRepository con pg)
 * - Los Use Cases dependen de esta abstracción, no de implementaciones concretas
 *
 * Responsabilidades:
 * - Operaciones CRUD básicas para usuarios
 * - Búsquedas por diferentes criterios (id, email)
 * - Actualización de password (con hash)
 * - Actualización de last_login_at
 *
 * Notas importantes:
 * - Los métodos async retornan Promise (standard de Node.js/TypeScript)
 * - findById y findByEmail retornan null si no encuentran el usuario
 * - create y update retornan el User completo después de la operación
 * - delete no retorna nada (void) - puede lanzar error si falla
 * - El hash de password es responsabilidad de la implementación (UserRepository)
 */
export interface IUserRepository {
  /**
   * Busca un usuario por su ID
   * @param id - UUID del usuario
   * @returns User si existe, null si no se encuentra
   */
  findById(id: string): Promise<User | null>;

  /**
   * Busca un usuario por su email
   * @param email - Email del usuario (único en BD)
   * @returns User si existe, null si no se encuentra
   * @note Útil para login y verificación de email único
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Obtiene todos los usuarios del sistema
   * @returns Array de usuarios (puede estar vacío)
   * @note Usar con precaución en producción, considerar paginación
   */
  findAll(): Promise<User[]>;

  /**
   * Crea un nuevo usuario en la base de datos
   * @param data - Datos del usuario (email, password, name)
   * @returns Usuario creado con id y timestamps generados
   * @throws Error si el email ya existe
   * @note El password debe ser hasheado antes de guardar
   */
  create(data: CreateUserData): Promise<User>;

  /**
   * Actualiza los datos de un usuario existente
   * @param id - UUID del usuario a actualizar
   * @param data - Datos a actualizar (name, email, isActive)
   * @returns Usuario actualizado
   * @throws Error si el usuario no existe
   * @throws Error si el nuevo email ya está en uso
   * @note updated_at se actualiza automáticamente por trigger de BD
   */
  update(id: string, data: UpdateUserData): Promise<User>;

  /**
   * Actualiza la contraseña de un usuario
   * @param data - userId y newPassword
   * @returns Usuario actualizado
   * @throws Error si el usuario no existe
   * @note El password debe ser hasheado antes de guardar
   */
  updatePassword(data: UpdatePasswordData): Promise<User>;

  /**
   * Actualiza el timestamp de último login
   * @param id - UUID del usuario
   * @returns void
   * @note Se ejecuta después de un login exitoso
   */
  updateLastLogin(id: string): Promise<void>;

  /**
   * Marca el email de un usuario como verificado
   * @param id - UUID del usuario
   * @returns Usuario actualizado
   * @throws Error si el usuario no existe
   * @note Se ejecuta después de verificar el email (ej: click en link de verificación)
   */
  verifyEmail(id: string): Promise<User>;

  /**
   * Elimina un usuario de la base de datos
   * @param id - UUID del usuario a eliminar
   * @returns void
   * @throws Error si el usuario no existe
   * @note Eliminación física (hard delete), considerar soft delete en el futuro
   */
  delete(id: string): Promise<void>;

  /**
   * Verifica si un email ya está registrado
   * @param email - Email a verificar
   * @returns true si el email existe, false si está disponible
   * @note Útil para validación antes de crear usuario
   */
  emailExists(email: string): Promise<boolean>;
}
