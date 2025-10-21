import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { databaseConfig } from '@infrastructure/config/database.config';

/**
 * DatabaseModule
 *
 * Módulo de infraestructura que proporciona el Pool de conexiones de PostgreSQL.
 * Este módulo sigue el patrón de inyección de dependencias de NestJS.
 *
 * El Pool se exporta con el token 'DATABASE_POOL' para ser inyectado en repositorios.
 */
@Module({
  providers: [
    {
      provide: 'DATABASE_POOL',
      useFactory: () => {
        const pool = new Pool(databaseConfig);

        // Event listener para errores críticos
        pool.on('error', (err) => {
          console.error('❌ PostgreSQL: Error inesperado en pool', err);
          process.exit(-1);
        });

        return pool;
      },
    },
  ],
  exports: ['DATABASE_POOL'], // Exportar para usar en otros módulos
})
export class DatabaseModule {}
