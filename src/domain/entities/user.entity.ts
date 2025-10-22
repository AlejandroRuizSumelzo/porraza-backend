/**
 * Interfaz para los datos de usuario desde la base de datos
 */
export interface UserDatabaseRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * User Entity (Domain Layer)
 *
 * Entidad de dominio pura que representa un usuario en el sistema.
 * Esta clase NO tiene dependencias de frameworks externos (NestJS, pg, bcrypt, etc.).
 *
 * Principios de Clean Architecture:
 * - Sin decoradores de ORM o NestJS
 * - Sin lógica de persistencia
 * - Solo reglas de negocio y validaciones del dominio
 * - Inmutable (readonly properties)
 *
 * Notas importantes:
 * - password_hash se almacena hasheado con bcrypt (responsabilidad del repositorio)
 * - email debe ser único (validado en base de datos)
 * - is_active permite suspender cuentas sin eliminarlas
 * - email_verified indica si el usuario ha verificado su email
 * - last_login_at se actualiza en cada login exitoso
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name: string,
    public readonly isActive: boolean,
    public readonly isEmailVerified: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly lastLoginAt: Date | null,
  ) {
    this.validate();
  }

  /**
   * Validaciones de negocio (Domain Rules)
   */
  private validate(): void {
    // Validar ID
    if (!this.id || this.id.trim() === '') {
      throw new Error('User ID is required');
    }

    // Validar email
    if (!this.email || this.email.trim() === '') {
      throw new Error('User email is required');
    }

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(this.email)) {
      throw new Error('Invalid email format');
    }

    // Validar password hash
    if (!this.passwordHash || this.passwordHash.trim() === '') {
      throw new Error('User password hash is required');
    }

    // Validar nombre
    if (!this.name || this.name.trim() === '') {
      throw new Error('User name is required');
    }

    if (this.name.trim().length < 2) {
      throw new Error('User name must be at least 2 characters long');
    }

    if (this.name.length > 150) {
      throw new Error('User name must not exceed 150 characters');
    }
  }

  /**
   * Factory method para crear instancia desde datos de base de datos
   * Convierte snake_case de PostgreSQL a camelCase de TypeScript
   */
  static fromDatabase(data: UserDatabaseRow): User {
    return new User(
      data.id,
      data.email,
      data.password_hash,
      data.name,
      data.is_active,
      data.email_verified,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.last_login_at ? new Date(data.last_login_at) : null,
    );
  }

  /**
   * Verifica si el usuario está activo
   * Un usuario inactivo no puede hacer login
   */
  isUserActive(): boolean {
    return this.isActive;
  }

  /**
   * Verifica si el usuario puede hacer login
   * Combina todas las reglas de negocio para login
   * IMPORTANTE: Usuario DEBE tener email verificado Y estar activo
   */
  canLogin(): boolean {
    return this.isActive && this.isEmailVerified;
  }

  /**
   * Verifica si el email del usuario ha sido verificado
   */
  hasVerifiedEmail(): boolean {
    return this.isEmailVerified;
  }

  /**
   * Verifica si el usuario necesita verificar su email
   */
  needsEmailVerification(): boolean {
    return !this.isEmailVerified;
  }

  /**
   * Obtiene el email normalizado (lowercase)
   */
  getNormalizedEmail(): string {
    return this.email.toLowerCase().trim();
  }

  /**
   * Obtiene las iniciales del nombre del usuario
   * Útil para avatares
   */
  getInitials(): string {
    const words = this.name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  /**
   * Verifica si el usuario ha iniciado sesión alguna vez
   */
  hasLoggedIn(): boolean {
    return this.lastLoginAt !== null;
  }

  /**
   * Convierte la entidad a un objeto plano (sin métodos)
   * Útil para serialización
   */
  toObject(): {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date | null;
  } {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
    };
  }

  /**
   * Representación en string para debugging
   * NO incluye password_hash por seguridad
   */
  toString(): string {
    return `User #${this.id.substring(0, 8)}: ${this.name} (${this.email}) - ${this.isActive ? 'Active' : 'Inactive'}`;
  }
}
