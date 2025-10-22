import { Module } from '@nestjs/common';
import { DatabaseModule } from '@infrastructure/persistence/database.module';
import { UserController } from '@adapters/controllers/user.controller';
import { CreateUserUseCase } from '@application/use-cases/users/create-user.use-case';
import { GetUserByIdUseCase } from '@application/use-cases/users/get-user-by-id.use-case';
import { GetUserByEmailUseCase } from '@application/use-cases/users/get-user-by-email.use-case';
import { GetAllUsersUseCase } from '@application/use-cases/users/get-all-users.use-case';
import { UpdateUserUseCase } from '@application/use-cases/users/update-user.use-case';
import { UpdatePasswordUseCase } from '@application/use-cases/users/update-password.use-case';
import { DeleteUserUseCase } from '@application/use-cases/users/delete-user.use-case';
import { UserRepository } from '@infrastructure/persistence/repositories/user.repository';

/**
 * UserModule
 *
 * Módulo NestJS que encapsula toda la funcionalidad de usuarios.
 * Este módulo es el "pegamento" que conecta todas las capas mediante
 * el patrón de Inyección de Dependencias de NestJS.
 *
 * PATRÓN DE INYECCIÓN DE DEPENDENCIAS EXPLICADO:
 *
 * 1. DatabaseModule (importado):
 *    - Proporciona 'DATABASE_POOL' (Pool de pg)
 *    - UserRepository lo inyecta con @Inject('DATABASE_POOL')
 *
 * 2. UserRepository (provider):
 *    - Token: 'IUserRepository' (string único)
 *    - Clase: UserRepository (implementación con pg + bcrypt)
 *    - Los Use Cases lo inyectan con @Inject('IUserRepository')
 *
 * 3. Use Cases (providers):
 *    - Cada Use Case se inyecta automáticamente en UserController por su clase
 *    - Todos dependen de IUserRepository (inversión de dependencias)
 *
 * 4. UserController (controller):
 *    - Recibe todos los Use Cases vía constructor
 *    - Delega lógica de negocio a los Use Cases
 *
 * FLUJO DE INYECCIÓN:
 * DatabaseModule.DATABASE_POOL → UserRepository → Use Cases → UserController
 *
 * VENTAJAS DEL PATRÓN:
 * - Inversión de dependencias: Use Cases dependen de abstracciones (IUserRepository)
 * - Fácil testing: Mock de providers con tokens
 * - Cambio de implementación: Solo cambiar el 'useClass' del provider
 * - Desacoplamiento: Capas no conocen implementaciones concretas
 *
 * EJEMPLO DE TESTING:
 * {
 *   provide: 'IUserRepository',
 *   useValue: mockUserRepository  // Mock para tests
 * }
 */
@Module({
  imports: [
    DatabaseModule, // Importar para tener acceso a DATABASE_POOL
  ],
  controllers: [
    UserController, // Controlador REST que maneja los endpoints HTTP
  ],
  providers: [
    // Use Cases: Se inyectan directamente por su clase
    CreateUserUseCase,
    GetUserByIdUseCase,
    GetUserByEmailUseCase,
    GetAllUsersUseCase,
    UpdateUserUseCase,
    UpdatePasswordUseCase,
    DeleteUserUseCase,

    // Repository: Se inyecta con token personalizado (Inversión de Dependencias)
    {
      provide: 'IUserRepository', // Token: Nombre de la interface
      useClass: UserRepository, // Implementación: Clase con SQL nativo (pg) + bcrypt
    },

    /**
     * ¿Por qué usamos token 'IUserRepository'?
     *
     * - TypeScript interfaces NO existen en runtime (se borran al compilar)
     * - NestJS necesita tokens únicos para inyectar dependencias
     * - Usamos string 'IUserRepository' como identificador
     * - Los Use Cases usan @Inject('IUserRepository')
     *
     * Alternativa válida: Usar Symbol
     * export const USER_REPOSITORY = Symbol('IUserRepository');
     * provide: USER_REPOSITORY,
     * @Inject(USER_REPOSITORY)
     */
  ],
  exports: [
    // Exportar Use Cases si otros módulos necesitan usarlos
    // Por ejemplo, si un módulo de autenticación necesita GetUserByEmailUseCase
    GetUserByEmailUseCase,
    GetUserByIdUseCase,
    // Exportar el repositorio si otros módulos necesitan acceso directo
    // 'IUserRepository',
  ],
})
export class UserModule {}
