import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateUserDto } from '@adapters/dtos/user/create-user.dto';
import { UpdateUserDto } from '@adapters/dtos/user/update-user.dto';
import { UpdatePasswordDto } from '@adapters/dtos/user/update-password.dto';
import { UserResponseDto } from '@adapters/dtos/user/user-response.dto';
import { CreateUserUseCase } from '@application/use-cases/users/create-user.use-case';
import { GetUserByIdUseCase } from '@application/use-cases/users/get-user-by-id.use-case';
import { GetUserByEmailUseCase } from '@application/use-cases/users/get-user-by-email.use-case';
import { GetAllUsersUseCase } from '@application/use-cases/users/get-all-users.use-case';
import { UpdateUserUseCase } from '@application/use-cases/users/update-user.use-case';
import { UpdatePasswordUseCase } from '@application/use-cases/users/update-password.use-case';
import { DeleteUserUseCase } from '@application/use-cases/users/delete-user.use-case';
import { JwtAuthGuard } from '@adapters/guards/jwt-auth.guard';
import type { User } from '@domain/entities/user.entity';
import type { Request } from 'express';

/**
 * Extend Express Request para incluir user
 * Después de pasar por JwtAuthGuard, request.user contiene el User de dominio
 */
interface RequestWithUser extends Request {
  user: User;
}

/**
 * UserController (Adapters Layer)
 *
 * Controlador REST que maneja los endpoints HTTP relacionados con usuarios.
 *
 * Responsabilidades:
 * 1. Recibir requests HTTP y validar DTOs
 * 2. Delegar lógica de negocio a Use Cases
 * 3. Transformar entidades User a UserResponseDto (ocultar password_hash)
 * 4. Retornar respuestas HTTP con códigos de estado apropiados
 *
 * Endpoints disponibles:
 * - POST   /users              - Crear usuario (registro)
 * - GET    /users              - Listar todos los usuarios
 * - GET    /users/:id          - Obtener usuario por ID
 * - GET    /users/email/:email - Obtener usuario por email
 * - PATCH  /users/:id          - Actualizar perfil
 * - PATCH  /users/:id/password - Cambiar contraseña
 * - DELETE /users/:id          - Eliminar cuenta
 *
 * Validación automática:
 * - NestJS valida automáticamente los DTOs usando class-validator
 * - Si falla la validación, retorna 400 Bad Request automáticamente
 *
 * Manejo de errores:
 * - NotFoundException (use cases) → 404 Not Found (automático por NestJS)
 * - ConflictException (use cases) → 409 Conflict (automático por NestJS)
 * - Otros errores → 500 Internal Server Error (automático por NestJS)
 */
@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getUserByEmailUseCase: GetUserByEmailUseCase,
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updatePasswordUseCase: UpdatePasswordUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  /**
   * POST /users
   * Crear un nuevo usuario (registro)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Register a new user account in the Porraza platform. The password will be securely hashed using bcrypt before storing in the database. The email must be unique across all users.',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User registration data',
    examples: {
      example1: {
        summary: 'Valid user registration',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123',
          name: 'John Doe',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Validation failed (invalid email format, weak password, name too short, etc.)',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Email must be a valid email address',
          'Password must be at least 8 characters long',
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already registered',
    schema: {
      example: {
        statusCode: 409,
        message: 'User with email john.doe@example.com already exists',
        error: 'Conflict',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.createUserUseCase.execute(createUserDto);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * GET /users
   * Obtener lista de todos los usuarios
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Retrieve a list of all registered users in the system. Returns complete user information except passwords. NOTE: Consider implementing pagination in production environments.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.getAllUsersUseCase.execute();
    return UserResponseDto.fromEntities(users);
  }

  /**
   * GET /users/:id
   * Obtener un usuario por su ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Retrieve detailed information about a specific user by their unique identifier (UUID). Returns all user data except password.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User does not exist',
    schema: {
      example: {
        statusCode: 404,
        message: 'User with id e096dcb1-9f20-4ce5-89ac-740d41283fb9 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.getUserByIdUseCase.execute(id);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * GET /users/email/:email
   * Obtener un usuario por su email
   */
  @Get('email/:email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user by email',
    description:
      'Retrieve user information by their email address. Useful for login flows and email verification. Requires authentication.',
  })
  @ApiParam({
    name: 'email',
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    type: String,
    format: 'email',
  })
  @ApiResponse({
    status: 200,
    description: 'User found successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User with this email does not exist',
    schema: {
      example: {
        statusCode: 404,
        message: 'User with email john.doe@example.com not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async findByEmail(@Param('email') email: string): Promise<UserResponseDto> {
    const user = await this.getUserByEmailUseCase.execute(email);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * PATCH /users/:id
   * Actualizar perfil de usuario
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Update user profile information (name, email, account status). All fields are optional - only provided fields will be updated. Password updates use a separate endpoint for security reasons.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to update',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
    type: String,
    format: 'uuid',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User update data (all fields optional)',
    examples: {
      updateName: {
        summary: 'Update only name',
        value: {
          name: 'Jane Smith',
        },
      },
      updateEmail: {
        summary: 'Update only email',
        value: {
          email: 'jane.smith@example.com',
        },
      },
      updateMultiple: {
        summary: 'Update multiple fields',
        value: {
          email: 'jane.smith@example.com',
          name: 'Jane Smith',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: ['Email must be a valid email address'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User does not exist',
    schema: {
      example: {
        statusCode: 404,
        message: 'User with id e096dcb1-9f20-4ce5-89ac-740d41283fb9 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - New email is already in use by another user',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email jane.smith@example.com is already in use',
        error: 'Conflict',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateUserUseCase.execute(id, updateUserDto);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * PATCH /users/:id/password
   * Cambiar contraseña de usuario (requiere autenticación)
   */
  @Patch(':id/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user password (requires authentication)',
    description:
      'Change the password for the authenticated user account. Requires current password verification (security measure). The new password will be securely hashed using bcrypt before storing. Sends email notification after successful change. NOTE: JWT tokens are stateless and remain valid until expiration (active sessions continue working).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user (must match authenticated user)',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
    type: String,
    format: 'uuid',
  })
  @ApiBody({
    type: UpdatePasswordDto,
    description: 'Current password and new password',
    examples: {
      example1: {
        summary: 'Valid password update',
        value: {
          currentPassword: 'CurrentPass123',
          newPassword: 'NewSecurePass456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Password updated successfully. Notification email sent. User can login with new password.',
    schema: {
      example: {
        message: 'Password updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - New password does not meet security requirements or is same as current password',
    schema: {
      example: {
        statusCode: 400,
        message: 'New password must be different from current password',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Missing/invalid JWT token or current password is incorrect',
    schema: {
      example: {
        statusCode: 401,
        message: 'Current password is incorrect',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Trying to change password of another user (users can only change their own password)',
    schema: {
      example: {
        statusCode: 403,
        message: 'You can only change your own password',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User does not exist',
    schema: {
      example: {
        statusCode: 404,
        message: 'User with id e096dcb1-9f20-4ce5-89ac-740d41283fb9 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
    @Req() req: RequestWithUser,
  ): Promise<{ message: string }> {
    // Validar que el usuario solo pueda cambiar su propia contraseña (seguridad)
    if (req.user.id !== id) {
      throw new ForbiddenException('You can only change your own password');
    }

    // Ejecutar use case con contraseña actual y nueva contraseña
    return this.updatePasswordUseCase.execute(
      id,
      updatePasswordDto.currentPassword,
      updatePasswordDto.newPassword,
    );
  }

  /**
   * DELETE /users/:id
   * Eliminar cuenta de usuario
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user account',
    description:
      'Permanently delete a user account from the system. NOTE: This performs a hard delete (physical deletion). Consider implementing soft delete in the future for data recovery and audit purposes.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the user to delete',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully (No Content)',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token inválido o no proporcionado',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User does not exist',
    schema: {
      example: {
        statusCode: 404,
        message: 'User with id e096dcb1-9f20-4ce5-89ac-740d41283fb9 not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async delete(@Param('id') id: string): Promise<void> {
    await this.deleteUserUseCase.execute(id);
  }
}
