import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
} from 'class-validator';

/**
 * UpdateLeagueDto (Adapters Layer)
 *
 * DTO para actualizar una liga existente.
 * Todos los campos son opcionales (solo se actualizan los proporcionados).
 *
 * Campos:
 * - name: Nuevo nombre (opcional)
 * - description: Nueva descripción (opcional)
 * - type: Nuevo tipo (opcional)
 *
 * Notas:
 * - Solo el admin puede actualizar
 * - Si se cambia de 'public' a 'private', se genera invite_code automáticamente
 * - updated_at se actualiza automáticamente
 */
export class UpdateLeagueDto {
  @ApiProperty({
    description: 'League name',
    example: 'World Cup 2026 Friends - Updated',
    minLength: 3,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'League name must be at least 3 characters long' })
  @MaxLength(100, { message: 'League name must not exceed 100 characters' })
  name?: string;

  @ApiProperty({
    description: 'League description',
    example: 'Nueva descripción de la liga',
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
    example: 'private',
    enum: ['public', 'private'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['public', 'private'], {
    message: 'Type must be either public or private',
  })
  type?: 'public' | 'private';
}
