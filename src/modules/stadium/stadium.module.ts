import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { StadiumController } from '@adapters/controllers/stadium.controller';
import { GetAllStadiumsUseCase } from '@application/use-cases/stadium/get-all-stadiums.use-case';
import { StadiumRepository } from '@infrastructure/persistence/repositories/stadium.repository';

/**
 * StadiumModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad de estadios.
 * Este módulo es el "pegamento" que conecta todas las capas mediante
 * el patrón de Inyección de Dependencias de NestJS.
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS EXPLICADO:
 *
 * 1. DatabaseModule (importado):
 *    - Proporciona 'DATABASE_POOL' (Pool de pg)
 *    - StadiumRepository lo inyecta con @Inject('DATABASE_POOL')
 *
 * 2. StadiumRepository (provider):
 *    - Token: 'IStadiumRepository' (string único)
 *    - Clase: StadiumRepository (implementación con pg)
 *    - GetAllStadiumsUseCase lo inyecta con @Inject('IStadiumRepository')
 *
 * 3. GetAllStadiumsUseCase (provider):
 *    - Se inyecta automáticamente en StadiumController por su clase
 *
 * 4. StadiumController (controller):
 *    - Recibe GetAllStadiumsUseCase vía constructor
 *
 * FLUJO DE INYECCIÓN:
 * DatabaseModule.DATABASE_POOL → StadiumRepository → GetAllStadiumsUseCase → StadiumController
 *
 * VENTAJAS DEL PATRÓN:
 * - Inversión de dependencias: Use cases dependen de abstracciones (IStadiumRepository)
 * - Fácil testing: Mock de providers con tokens
 * - Cambio de implementación: Solo cambiar el 'useClass' del provider
 * - Desacoplamiento: Capas no conocen implementaciones concretas
 */
@Module({
  imports: [
    DatabaseModule, // Importar para tener acceso a DATABASE_POOL
  ],
  controllers: [
    StadiumController, // Controlador REST que maneja GET /stadiums
  ],
  providers: [
    // Use Case: Se inyecta directamente por su clase
    GetAllStadiumsUseCase,

    // Repository: Se inyecta con token personalizado (Inversión de Dependencias)
    {
      provide: 'IStadiumRepository', // Token: Nombre de la interface
      useClass: StadiumRepository, // Implementación: Clase con SQL nativo (pg)
    },

    /**
     * ¿Por qué usamos token 'IStadiumRepository'?
     *
     * - TypeScript interfaces NO existen en runtime (se borran al compilar)
     * - NestJS necesita tokens únicos para inyectar dependencias
     * - Usamos string 'IStadiumRepository' como identificador
     * - GetAllStadiumsUseCase usa @Inject('IStadiumRepository')
     *
     * Alternativa válida: Usar Symbol
     * export const STADIUM_REPOSITORY = Symbol('IStadiumRepository');
     * provide: STADIUM_REPOSITORY,
     * @Inject(STADIUM_REPOSITORY)
     */
  ],
  exports: [
    // Si otros módulos necesitan usar GetAllStadiumsUseCase, exportarlo aquí
    // GetAllStadiumsUseCase,
  ],
})
export class StadiumModule {}
