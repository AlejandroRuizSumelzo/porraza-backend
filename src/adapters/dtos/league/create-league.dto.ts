import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsIn,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';

/**
 * CreateLeagueDto (Adapters Layer)
 *
 * DTO para crear una nueva liga.
 * Valida los datos de entrada del cliente HTTP.
 *
 * Campos:
 * - name: Nombre de la liga (3-100 caracteres)
 * - description: Descripción opcional
 * - type: 'public' o 'private'
 * - code: Código único opcional (6-20 caracteres alfanuméricos mayúsculas)
 *
 * Notas:
 * - adminUserId se extrae del JWT (req.user.id)
 * - code se genera automáticamente si no se proporciona
 * - maxMembers tiene default 200 en BD
 */
export class CreateLeagueDto {
  @ApiProperty({
    description: 'League name',
    example: 'World Cup 2026 Friends',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'League name must be at least 3 characters long' })
  @MaxLength(100, { message: 'League name must not exceed 100 characters' })
  name: string;

  @ApiProperty({
    description: 'League description (optional)',
    example: 'Liga pública para todos los fans del Mundial 2026',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Description must not exceed 1000 characters',
  })
  description?: string;

  @ApiProperty({
    description: 'League type (public or private)',
    example: 'public',
    enum: ['public', 'private'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['public', 'private'], {
    message: 'Type must be either public or private',
  })
  type: 'public' | 'private';

  @ApiProperty({
    description:
      'Custom league code (optional, 6-20 uppercase alphanumeric characters). If not provided, a random code will be generated.',
    example: 'MUNDIAL2026',
    required: false,
    minLength: 6,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(6, 20, {
    message: 'Code must be between 6 and 20 characters',
  })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'Code must contain only uppercase letters and numbers',
  })
  code?: string;
}
