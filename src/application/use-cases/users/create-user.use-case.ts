import { Injectable, Inject, ConflictException } from '@nestjs/common';
import type { IUserRepository } from '@domain/repositories/user.repository.interface';
import type { User } from '@domain/entities/user.entity';
import type { CreateUserDto } from '@adapters/dtos/user/create-user.dto';

/**
 * CreateUserUseCase (Application Layer)
 *
 * Caso de uso para crear un nuevo usuario (registro).
 *
 * Responsabilidades:
 * 1. Validar que el email no esté en uso
 * 2. Delegar la creación al repositorio (que hashea la contraseña)
 * 3. Retornar el usuario creado
 *
 * Flujo:
 * CreateUserDto (HTTP) → CreateUserUseCase → UserRepository → Database
 *
 * Inyección de dependencias:
 * - Inyecta IUserRepository con @Inject('IUserRepository')
 * - No conoce la implementación concreta (UserRepository)
 * - Cumple Dependency Inversion Principle
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  /**
   * Ejecuta el caso de uso de creación de usuario
   *
   * @param createUserDto - Datos del usuario (email, password, name)
   * @returns Usuario creado
   * @throws ConflictException si el email ya existe
   */
  async execute(createUserDto: CreateUserDto): Promise<User> {
    // 1. Validar que el email no esté en uso
    const existingUser = await this.userRepository.findByEmail(
      createUserDto.email,
    );

    if (existingUser) {
      throw new ConflictException(
        `User with email ${createUserDto.email} already exists`,
      );
    }

    // 2. Crear el usuario (el repositorio hashea la contraseña)
    try {
      const user = await this.userRepository.create({
        email: createUserDto.email,
        password: createUserDto.password,
        name: createUserDto.name,
      });

      return user;
    } catch (error: any) {
      // Si el repositorio lanza error de email duplicado (race condition)
      if (error.message === 'Email already exists') {
        throw new ConflictException(
          `User with email ${createUserDto.email} already exists`,
        );
      }

      // Re-lanzar otros errores
      throw error;
    }
  }
}
