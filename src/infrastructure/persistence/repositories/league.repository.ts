import { Injectable, Inject } from '@nestjs/common';
import type { Pool, QueryResult } from 'pg';
import type {
  ILeagueRepository,
  CreateLeagueData,
  UpdateLeagueData,
} from '@domain/repositories/league.repository.interface';
import { League, type LeagueDatabaseRow } from '@domain/entities/league.entity';
import { User, type UserDatabaseRow } from '@domain/entities/user.entity';

/**
 * LeagueRepository (Infrastructure Layer - Adapter)
 *
 * Implementación concreta del ILeagueRepository usando PostgreSQL con pg.
 * Esta clase pertenece a la capa de infraestructura y ejecuta SQL queries nativas.
 *
 * Patrón de Inyección de Dependencias:
 * 1. Implementa la interface ILeagueRepository (del dominio)
 * 2. Inyecta el Pool de pg usando el token 'DATABASE_POOL'
 * 3. Se registra como provider en LeagueModule
 *
 * Responsabilidades:
 * - Ejecutar SQL queries con pg
 * - Generar códigos de invitación únicos para ligas privadas
 * - Mapear resultados de BD a entidades de dominio (League, User)
 * - Manejar errores de base de datos (unique constraint, FK violations, etc.)
 *
 * Seguridad:
 * - SQL parametrizado ($1, $2, etc.) para prevenir SQL injection
 * - Validación de FK constraints (admin_user_id, league_id, user_id)
 */
@Injectable()
export class LeagueRepository implements ILeagueRepository {
  /**
   * Caracteres permitidos para códigos de invitación
   * Sin O, 0, I, 1 para evitar confusión visual
   */
  private readonly INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private readonly INVITE_CODE_LENGTH = 8;

  constructor(
    @Inject('DATABASE_POOL')
    private readonly pool: Pool,
  ) {}

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Genera un código de invitación único aleatorio
   * Formato: 8 caracteres alfanuméricos (ej: XK7M9P2T)
   * Valida unicidad consultando la BD
   */
  private async generateUniqueInviteCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Generar código aleatorio
      let code = '';
      for (let i = 0; i < this.INVITE_CODE_LENGTH; i++) {
        const randomIndex = Math.floor(
          Math.random() * this.INVITE_CODE_CHARS.length,
        );
        code += this.INVITE_CODE_CHARS[randomIndex];
      }

      // Verificar si el código ya existe
      const query = `SELECT EXISTS(SELECT 1 FROM leagues WHERE invite_code = $1) as exists`;
      const result = await this.pool.query(query, [code]);

      if (!result.rows[0].exists) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      'Failed to generate unique invite code after multiple attempts',
    );
  }

  // =========================================================================
  // CRUD OPERATIONS
  // =========================================================================

  /**
   * Busca una liga por su ID
   */
  async findById(id: string): Promise<League | null> {
    const query = `
      SELECT
        id,
        name,
        description,
        type,
        admin_user_id,
        max_members,
        invite_code,
        logo_url,
        created_at,
        updated_at
      FROM leagues
      WHERE id = $1
    `;

    try {
      const result: QueryResult<LeagueDatabaseRow> = await this.pool.query(
        query,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return League.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(`Error fetching league with id ${id}:`, error);
      throw new Error('Failed to fetch league by ID from database');
    }
  }

  /**
   * Obtiene todas las ligas
   */
  async findAll(): Promise<League[]> {
    const query = `
      SELECT
        id,
        name,
        description,
        type,
        admin_user_id,
        max_members,
        invite_code,
        logo_url,
        created_at,
        updated_at
      FROM leagues
      ORDER BY created_at DESC
    `;

    try {
      const result: QueryResult<LeagueDatabaseRow> =
        await this.pool.query(query);

      return result.rows.map((row) => League.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching all leagues:', error);
      throw new Error('Failed to fetch leagues from database');
    }
  }

  /**
   * Obtiene solo las ligas públicas
   */
  async findPublicLeagues(): Promise<League[]> {
    const query = `
      SELECT
        id,
        name,
        description,
        type,
        admin_user_id,
        max_members,
        invite_code,
        logo_url,
        created_at,
        updated_at
      FROM leagues
      WHERE type = 'public'
      ORDER BY created_at DESC
    `;

    try {
      const result: QueryResult<LeagueDatabaseRow> =
        await this.pool.query(query);

      return result.rows.map((row) => League.fromDatabase(row));
    } catch (error) {
      console.error('Error fetching public leagues:', error);
      throw new Error('Failed to fetch public leagues from database');
    }
  }

  /**
   * Obtiene todas las ligas donde el usuario es miembro
   */
  async findByUserId(userId: string): Promise<League[]> {
    const query = `
      SELECT
        l.id,
        l.name,
        l.description,
        l.type,
        l.admin_user_id,
        l.max_members,
        l.invite_code,
        l.logo_url,
        l.created_at,
        l.updated_at
      FROM leagues l
      INNER JOIN league_members lm ON l.id = lm.league_id
      WHERE lm.user_id = $1
      ORDER BY lm.joined_at DESC
    `;

    try {
      const result: QueryResult<LeagueDatabaseRow> = await this.pool.query(
        query,
        [userId],
      );

      return result.rows.map((row) => League.fromDatabase(row));
    } catch (error) {
      console.error(`Error fetching leagues for user ${userId}:`, error);
      throw new Error('Failed to fetch user leagues from database');
    }
  }

  /**
   * Busca una liga por su código de invitación
   */
  async findByInviteCode(inviteCode: string): Promise<League | null> {
    const query = `
      SELECT
        id,
        name,
        description,
        type,
        admin_user_id,
        max_members,
        invite_code,
        logo_url,
        created_at,
        updated_at
      FROM leagues
      WHERE invite_code = $1
    `;

    try {
      const result: QueryResult<LeagueDatabaseRow> = await this.pool.query(
        query,
        [inviteCode.toUpperCase()], // Normalizar a mayúsculas
      );

      if (result.rows.length === 0) {
        return null;
      }

      return League.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(
        `Error fetching league with invite code ${inviteCode}:`,
        error,
      );
      throw new Error('Failed to fetch league by invite code from database');
    }
  }

  /**
   * Obtiene todas las ligas administradas por un usuario
   */
  async findByAdminUserId(adminUserId: string): Promise<League[]> {
    const query = `
      SELECT
        id,
        name,
        description,
        type,
        admin_user_id,
        max_members,
        invite_code,
        logo_url,
        created_at,
        updated_at
      FROM leagues
      WHERE admin_user_id = $1
      ORDER BY created_at DESC
    `;

    try {
      const result: QueryResult<LeagueDatabaseRow> = await this.pool.query(
        query,
        [adminUserId],
      );

      return result.rows.map((row) => League.fromDatabase(row));
    } catch (error) {
      console.error(`Error fetching leagues for admin ${adminUserId}:`, error);
      throw new Error('Failed to fetch admin leagues from database');
    }
  }

  /**
   * Crea una nueva liga
   * - Genera invite_code si type es 'private'
   * - Agrega al admin como primer miembro automáticamente
   */
  async create(data: CreateLeagueData): Promise<League> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generar invite_code si es liga privada
      const inviteCode =
        data.type === 'private' ? await this.generateUniqueInviteCode() : null;

      // Insertar liga
      const insertLeagueQuery = `
        INSERT INTO leagues (name, description, type, admin_user_id, max_members, invite_code)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          name,
          description,
          type,
          admin_user_id,
          max_members,
          invite_code,
          logo_url,
          created_at,
          updated_at
      `;

      const leagueResult: QueryResult<LeagueDatabaseRow> = await client.query(
        insertLeagueQuery,
        [
          data.name.trim(),
          data.description?.trim() || null,
          data.type,
          data.adminUserId,
          data.maxMembers || 200,
          inviteCode,
        ],
      );

      const league = League.fromDatabase(leagueResult.rows[0]);

      // Agregar admin como primer miembro
      const insertMemberQuery = `
        INSERT INTO league_members (league_id, user_id)
        VALUES ($1, $2)
      `;

      await client.query(insertMemberQuery, [league.id, data.adminUserId]);

      await client.query('COMMIT');

      return league;
    } catch (error: any) {
      await client.query('ROLLBACK');

      // Manejar error de FK constraint (admin_user_id no existe)
      if (
        error.code === '23503' &&
        error.constraint === 'leagues_admin_user_id_fkey'
      ) {
        throw new Error('Admin user does not exist');
      }

      console.error('Error creating league:', error);
      throw new Error('Failed to create league in database');
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza una liga existente
   * - Si se cambia de 'public' a 'private', genera invite_code
   */
  async update(id: string, data: UpdateLeagueData): Promise<League> {
    // Construir query dinámicamente según campos proporcionados
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name.trim());
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description?.trim() || null);
    }

    // Si no hay campos para actualizar, retornar liga sin cambios
    if (fields.length === 0 && data.type === undefined) {
      const league = await this.findById(id);
      if (!league) {
        throw new Error('League not found');
      }
      return league;
    }

    // Manejar cambio de tipo (si pasa de public a private, generar invite_code)
    let inviteCode: string | null = null;
    if (data.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(data.type);

      // Si cambia a 'private', generar invite_code
      if (data.type === 'private') {
        const currentLeague = await this.findById(id);
        if (currentLeague && !currentLeague.inviteCode) {
          inviteCode = await this.generateUniqueInviteCode();
          fields.push(`invite_code = $${paramIndex++}`);
          values.push(inviteCode);
        }
      }
    }

    // Agregar id como último parámetro
    values.push(id);

    const query = `
      UPDATE leagues
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id,
        name,
        description,
        type,
        admin_user_id,
        max_members,
        invite_code,
        logo_url,
        created_at,
        updated_at
    `;

    try {
      const result: QueryResult<LeagueDatabaseRow> = await this.pool.query(
        query,
        values,
      );

      if (result.rows.length === 0) {
        throw new Error('League not found');
      }

      return League.fromDatabase(result.rows[0]);
    } catch (error: any) {
      if (error.message === 'League not found') {
        throw error;
      }

      console.error(`Error updating league with id ${id}:`, error);
      throw new Error('Failed to update league in database');
    }
  }

  /**
   * Elimina una liga
   * Cascada automática elimina: members, predictions (futuro)
   */
  async delete(id: string): Promise<void> {
    const query = `
      DELETE FROM leagues
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new Error('League not found');
      }
    } catch (error: any) {
      if (error.message === 'League not found') {
        throw error;
      }

      console.error(`Error deleting league with id ${id}:`, error);
      throw new Error('Failed to delete league from database');
    }
  }

  /**
   * Transfiere el rol de administrador a otro usuario
   */
  async transferAdmin(leagueId: string, newAdminUserId: string): Promise<void> {
    const query = `
      UPDATE leagues
      SET admin_user_id = $1
      WHERE id = $2
    `;

    try {
      const result = await this.pool.query(query, [newAdminUserId, leagueId]);

      if (result.rowCount === 0) {
        throw new Error('League not found');
      }
    } catch (error: any) {
      if (error.message === 'League not found') {
        throw error;
      }

      // Manejar error de FK constraint (new admin no existe)
      if (error.code === '23503') {
        throw new Error('New admin user does not exist');
      }

      console.error(`Error transferring admin for league ${leagueId}:`, error);
      throw new Error('Failed to transfer admin in database');
    }
  }

  // =========================================================================
  // MEMBER MANAGEMENT
  // =========================================================================

  /**
   * Agrega un usuario como miembro de una liga
   */
  async addMember(leagueId: string, userId: string): Promise<void> {
    const query = `
      INSERT INTO league_members (league_id, user_id)
      VALUES ($1, $2)
    `;

    try {
      await this.pool.query(query, [leagueId, userId]);
    } catch (error: any) {
      // Manejar error de duplicado (usuario ya es miembro)
      if (error.code === '23505') {
        throw new Error('User is already a member of this league');
      }

      // Manejar error de FK constraint (league o user no existe)
      if (error.code === '23503') {
        if (error.constraint === 'league_members_league_id_fkey') {
          throw new Error('League not found');
        }
        if (error.constraint === 'league_members_user_id_fkey') {
          throw new Error('User not found');
        }
      }

      console.error(
        `Error adding member ${userId} to league ${leagueId}:`,
        error,
      );
      throw new Error('Failed to add member to league in database');
    }
  }

  /**
   * Elimina un usuario de una liga
   */
  async removeMember(leagueId: string, userId: string): Promise<void> {
    const query = `
      DELETE FROM league_members
      WHERE league_id = $1 AND user_id = $2
    `;

    try {
      const result = await this.pool.query(query, [leagueId, userId]);

      if (result.rowCount === 0) {
        throw new Error('User is not a member of this league');
      }
    } catch (error: any) {
      if (error.message === 'User is not a member of this league') {
        throw error;
      }

      console.error(
        `Error removing member ${userId} from league ${leagueId}:`,
        error,
      );
      throw new Error('Failed to remove member from league in database');
    }
  }

  /**
   * Verifica si un usuario es miembro de una liga
   */
  async isMember(leagueId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM league_members
        WHERE league_id = $1 AND user_id = $2
      ) as exists
    `;

    try {
      const result = await this.pool.query(query, [leagueId, userId]);
      return result.rows[0].exists;
    } catch (error) {
      console.error(
        `Error checking membership for user ${userId} in league ${leagueId}:`,
        error,
      );
      throw new Error('Failed to check membership in database');
    }
  }

  /**
   * Obtiene el número de miembros de una liga
   */
  async getMemberCount(leagueId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM league_members
      WHERE league_id = $1
    `;

    try {
      const result = await this.pool.query(query, [leagueId]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      console.error(
        `Error getting member count for league ${leagueId}:`,
        error,
      );
      throw new Error('Failed to get member count from database');
    }
  }

  /**
   * Obtiene todos los miembros de una liga
   * Ordenados por fecha de ingreso (más antiguo primero)
   */
  async getMembers(leagueId: string): Promise<User[]> {
    const query = `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.name,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.has_paid,
        u.payment_date,
        u.stripe_customer_id,
        u.stripe_session_id
      FROM users u
      INNER JOIN league_members lm ON u.id = lm.user_id
      WHERE lm.league_id = $1
      ORDER BY lm.joined_at ASC
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        [leagueId],
      );

      return result.rows.map((row) => User.fromDatabase(row));
    } catch (error) {
      console.error(`Error fetching members for league ${leagueId}:`, error);
      throw new Error('Failed to fetch league members from database');
    }
  }

  /**
   * Obtiene el miembro más antiguo de una liga (excluyendo a un usuario)
   * Usado para transferir admin cuando el admin actual sale
   */
  async getOldestMember(
    leagueId: string,
    excludeUserId: string,
  ): Promise<User | null> {
    const query = `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.name,
        u.is_active,
        u.email_verified,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.has_paid,
        u.payment_date,
        u.stripe_customer_id,
        u.stripe_session_id
      FROM users u
      INNER JOIN league_members lm ON u.id = lm.user_id
      WHERE lm.league_id = $1 AND lm.user_id != $2
      ORDER BY lm.joined_at ASC
      LIMIT 1
    `;

    try {
      const result: QueryResult<UserDatabaseRow> = await this.pool.query(
        query,
        [leagueId, excludeUserId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return User.fromDatabase(result.rows[0]);
    } catch (error) {
      console.error(
        `Error fetching oldest member for league ${leagueId}:`,
        error,
      );
      throw new Error('Failed to fetch oldest member from database');
    }
  }
}
