import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import * as bcrypt from 'bcrypt';
import type {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
  UpdatePasswordData,
  UpdatePaymentStatusParams,
} from '@domain/repositories/user.repository.interface';
import { User, type UserDatabaseRow } from '@domain/entities/user.entity';

/**
 * UserRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del IUserRepository usando PostgreSQL con pg.
 * Esta clase pertenece a la capa de infraestructura y ejecuta SQL queries nativas.
 *
 * Patrón de Inyección de Dependencias:
 * 1. Implementa la interface IUserRepository (del dominio)
 * 2. Inyecta el Pool de pg usando el token 'DATABASE_POOL'
 * 3. Se registra como provider en UserModule
 *
 * Responsabilidades:
 * - Ejecutar SQL queries con pg
 * - Hash de contraseñas con bcrypt (cost factor 10)
 * - Mapear resultados de BD a entidades de dominio (User)
 * - Manejar errores de base de datos (unique constraint, not found, etc.)
 *
 * Seguridad:
 * - Passwords hasheados con bcrypt antes de INSERT/UPDATE
 * - SQL parametrizado ($1, $2, etc.) para prevenir SQL injection
 * - password_hash nunca se expone directamente (responsabilidad de DTOs)
 */
@Injectable()
export class UserRepository implements IUserRepository {
  private readonly BCRYPT_SALT_ROUNDS = 10;

  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  /**
   * Busca un usuario por su ID
   */
  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        password_hash,
        name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at,
        has_paid,
        payment_date,
        stripe_customer_id,
        stripe_session_id
      FROM users
      WHERE id = $1
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return User.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching user with id ${id}:`, error);
      throw new Error('Failed to fetch user by ID from database');
    }
  }

  /**
   * Busca un usuario por su email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT
        id,
        email,
        password_hash,
        name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at,
        has_paid,
        payment_date,
        stripe_customer_id,
        stripe_session_id
      FROM users
      WHERE email = $1
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        [email.toLowerCase().trim()], // Normalizar email
      );

      if (result.rows.length === 0) {
        return null;
      }

      return User.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching user with email ${email}:`, error);
      throw new Error('Failed to fetch user by email from database');
    }
  }

  /**
   * Obtiene todos los usuarios
   * NOTA: En producción, considerar paginación
   */
  async findAll(): Promise<User[]> {
    const query = `
      SELECT
        id,
        email,
        password_hash,
        name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at,
        has_paid,
        payment_date,
        stripe_customer_id,
        stripe_session_id
      FROM users
      ORDER BY created_at DESC
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(query);

      return result.rows.map((row) => User.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw new Error('Failed to fetch users from database');
    }
  }

  /**
   * Crea un nuevo usuario
   * - Hashea la contraseña con bcrypt
   * - Normaliza el email (lowercase)
   * - Retorna el usuario creado con id generado
   */
  async create(data: CreateUserData): Promise<User> {
    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(
      data.password,
      this.BCRYPT_SALT_ROUNDS,
    );

    const query = `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        email,
        password_hash,
        name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at,
        has_paid,
        payment_date,
        stripe_customer_id,
        stripe_session_id
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        [
          data.email.toLowerCase().trim(), // Normalizar email
          passwordHash,
          data.name.trim(),
        ],
      );

      return User.fromDatabase(result.rows[0]);
    } catch (error: any) {
      // Manejar error de email duplicado (unique constraint)
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new Error('Email already exists');
      }

      // Manejar error de validación de email (check constraint)
      if (error.code === '23514' && error.constraint === 'users_email_check') {
        throw new Error('Invalid email format');
      }

      // Manejar error de validación de name (check constraint)
      if (error.code === '23514' && error.constraint === 'users_name_check') {
        throw new Error('Name must be at least 2 characters long');
      }

      console.error('Error creating user:', error);
      throw new Error('Failed to create user in database');
    }
  }

  /**
   * Actualiza los datos de un usuario
   * - Solo actualiza campos proporcionados (UPDATE dinámico)
   * - updated_at se actualiza automáticamente por trigger de BD
   */
  async update(id: string, data: UpdateUserData): Promise<User> {
    // Construir query dinámicamente según campos proporcionados
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email.toLowerCase().trim());
    }

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name.trim());
    }

    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(data.isActive);
    }

    // Si no hay campos para actualizar, retornar usuario sin cambios
    if (fields.length === 0) {
      const user = await this.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    }

    // Agregar id como último parámetro
    values.push(id);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        email,
        password_hash,
        name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at,
        has_paid,
        payment_date,
        stripe_customer_id,
        stripe_session_id
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        values,
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return User.fromDatabase(result.rows[0]);
    } catch (error: any) {
      // Manejar error de email duplicado
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new Error('Email already exists');
      }

      // Si el error ya es "User not found", re-lanzarlo
      if (error.message === 'User not found') {
        throw error;
      }

      console.error(`Error updating user with id ${id}:`, error);
      throw new Error('Failed to update user in database');
    }
  }

  /**
   * Actualiza la contraseña de un usuario
   * - Hashea la nueva contraseña con bcrypt
   */
  async updatePassword(data: UpdatePasswordData): Promise<User> {
    // Hash de la nueva contraseña
    const passwordHash = await bcrypt.hash(
      data.newPassword,
      this.BCRYPT_SALT_ROUNDS,
    );

    const query = `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      RETURNING
        id,
        email,
        password_hash,
        name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at,
        has_paid,
        payment_date,
        stripe_customer_id,
        stripe_session_id
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        [passwordHash, data.userId],
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return User.fromDatabase(result.rows[0]);
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw error;
      }

      console.error(`Error updating password for user ${data.userId}:`, error);
      throw new Error('Failed to update password in database');
    }
  }

  /**
   * Actualiza el timestamp de último login
   */
  async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw error;
      }

      console.error(`Error updating last login for user ${id}:`, error);
      throw new Error('Failed to update last login in database');
    }
  }

  /**
   * Marca el email de un usuario como verificado
   *
   * IMPORTANTE: Esta operación es atómica y protegida contra race conditions.
   * Solo actualiza si email_verified = FALSE, evitando múltiples actualizaciones
   * simultáneas que causarían envío duplicado de welcome emails.
   */
  async verifyEmail(id: string): Promise<User> {
    const query = `
      UPDATE users
      SET email_verified = TRUE
      WHERE id = $1
        AND email_verified = FALSE
      RETURNING
        id,
        email,
        password_hash,
        name,
        is_active,
        email_verified,
        created_at,
        updated_at,
        last_login_at,
        has_paid,
        payment_date,
        stripe_customer_id,
        stripe_session_id
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        // El usuario no existe O ya estaba verificado
        // Buscar el usuario para determinar cuál es el caso
        const user = await this.findById(id);
        if (!user) {
          throw new Error('User not found');
        }
        // Si el usuario existe pero no se actualizó, es porque ya estaba verificado
        // Retornar el usuario existente (idempotencia)
        return user;
      }

      return User.fromDatabase(result.rows[0]);
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw error;
      }

      console.error(`Error verifying email for user ${id}:`, error);
      throw new Error('Failed to verify email in database');
    }
  }

  /**
   * Elimina un usuario de la base de datos
   * NOTA: Eliminación física (hard delete). Considerar soft delete en el futuro.
   */
  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM users
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw error;
      }

      console.error(`Error deleting user with id ${id}:`, error);
      throw new Error('Failed to delete user from database');
    }
  }

  /**
   * Verifica si un email ya está registrado
   */
  async emailExists(email: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists
    `;

    try {
      const result = await this.pool.query(query, [email.toLowerCase().trim()]);

      return result.rows[0].exists;
    } catch (error) {
      console.error(`Error checking if email exists ${email}:`, error);
      throw new Error('Failed to check email existence in database');
    }
  }

  /**
   * Actualiza el estado de pago de un usuario
   * Se ejecuta cuando Stripe confirma un pago exitoso via webhook
   */
  async updatePaymentStatus(
    userId: string,
    params: UpdatePaymentStatusParams,
  ): Promise<void> {
    const query = `
      UPDATE users
      SET
        has_paid = $1,
        payment_date = $2,
        stripe_customer_id = $3,
        stripe_session_id = $4,
        updated_at = NOW()
      WHERE id = $5
    `;

    try {
      const result = await this.pool.query(query, [
        params.hasPaid,
        params.paymentDate,
        params.stripeCustomerId,
        params.stripeSessionId,
        userId,
      ]);

      if (result.rowCount === 0) {
        throw new Error('User not found');
      }
    } catch (error: any) {
      if (error.message === 'User not found') {
        throw error;
      }

      console.error(`Error updating payment status for user ${userId}:`, error);
      throw new Error('Failed to update payment status in database');
    }
  }
}
