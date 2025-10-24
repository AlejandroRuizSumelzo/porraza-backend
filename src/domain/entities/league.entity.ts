/**
 * Interfaz para los datos de liga desde la base de datos
 */
export interface LeagueDatabaseRow {
  id: string;
  name: string;
  description: string | null;
  type: 'public' | 'private';
  admin_user_id: string;
  max_members: number;
  invite_code: string | null;
  logo_url: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * League Entity (Domain Layer)
 *
 * Entidad de dominio pura que representa una liga en el sistema.
 * Esta clase NO tiene dependencias de frameworks externos (NestJS, pg, etc.).
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM o NestJS
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Inmutable (readonly properties)
 *
 * Notas importantes:
 * - name debe tener al menos 3 caracteres y máximo 100
 * - type puede ser 'public' (cualquiera puede unirse) o 'private' (requiere invite_code)
 * - admin_user_id es el UUID del usuario administrador (único admin por liga)
 * - max_members define el límite de usuarios permitidos (default 200, configurable en BD)
 * - invite_code es único y solo requerido para ligas privadas
 * - logo_url almacenará la URL de S3 del logo (implementación futura)
 */
export class League {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly type: 'public' | 'private',
    public readonly adminUserId: string,
    public readonly maxMembers: number,
    public readonly inviteCode: string | null,
    public readonly logoUrl: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {
    this.validate();
  }

  /**
   * Validaciones de negocio (Domain Rules)
   */
  private validate(): void {
    // Validar ID
    if (!this.id || this.id.trim() === '') {
      throw new Error('League ID is required');
    }

    // Validar nombre
    if (!this.name || this.name.trim() === '') {
      throw new Error('League name is required');
    }

    if (this.name.trim().length < 3) {
      throw new Error('League name must be at least 3 characters long');
    }

    if (this.name.length > 100) {
      throw new Error('League name must not exceed 100 characters');
    }

    // Validar tipo
    if (this.type !== 'public' && this.type !== 'private') {
      throw new Error('League type must be public or private');
    }

    // Validar que ligas privadas tengan código de invitación
    if (this.type === 'private' && !this.inviteCode) {
      throw new Error('Private leagues must have an invite code');
    }

    // Validar admin user ID
    if (!this.adminUserId || this.adminUserId.trim() === '') {
      throw new Error('League admin user ID is required');
    }

    // Validar max members
    if (this.maxMembers <= 0) {
      throw new Error('Max members must be greater than 0');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   * Convierte snake_case de PostgreSQL a camelCase de TypeScript
   */
  static fromDatabase(data: LeagueDatabaseRow): League {
    return new League(
      data.id,
      data.name,
      data.description,
      data.type,
      data.admin_user_id,
      data.max_members,
      data.invite_code,
      data.logo_url,
      new Date(data.created_at),
      new Date(data.updated_at),
    );
  }

  /**
   * Verifica si la liga es pública
   */
  isPublic(): boolean {
    return this.type === 'public';
  }

  /**
   * Verifica si la liga es privada
   */
  isPrivate(): boolean {
    return this.type === 'private';
  }

  /**
   * Verifica si un usuario es el administrador de la liga
   * @param userId - UUID del usuario a verificar
   */
  isAdmin(userId: string): boolean {
    return this.adminUserId === userId;
  }

  /**
   * Verifica si la liga requiere código de invitación para unirse
   */
  requiresInviteCode(): boolean {
    return this.type === 'private';
  }

  /**
   * Obtiene el nombre normalizado (trim)
   */
  getNormalizedName(): string {
    return this.name.trim();
  }

  /**
   * Verifica si la liga tiene descripción
   */
  hasDescription(): boolean {
    return this.description !== null && this.description.trim() !== '';
  }

  /**
   * Verifica si la liga tiene logo
   */
  hasLogo(): boolean {
    return this.logoUrl !== null && this.logoUrl.trim() !== '';
  }

  /**
   * Convierte la entidad a un objeto plano (sin métodos)
   * Útil para serialización
   */
  toObject(): {
    id: string;
    name: string;
    description: string | null;
    type: 'public' | 'private';
    adminUserId: string;
    maxMembers: number;
    inviteCode: string | null;
    logoUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      adminUserId: this.adminUserId,
      maxMembers: this.maxMembers,
      inviteCode: this.inviteCode,
      logoUrl: this.logoUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Representación en string para debugging
   */
  toString(): string {
    return `League #${this.id.substring(0, 8)}: ${this.name} (${this.type}) - Admin: ${this.adminUserId.substring(0, 8)}`;
  }
}
