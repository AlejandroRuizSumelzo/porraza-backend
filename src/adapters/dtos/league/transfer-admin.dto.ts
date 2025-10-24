import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

/**
 * TransferAdminDto (Adapters Layer)
 *
 * DTO para transferir el rol de administrador a otro usuario.
 *
 * Campos:
 * - newAdminUserId: UUID del nuevo administrador
 *
 * Notas:
 * - leagueId se extrae de los params de la URL (:id)
 * - currentAdminId se extrae del JWT (req.user.id)
 * - El nuevo admin debe ser miembro activo de la liga
 */
export class TransferAdminDto {
  @ApiProperty({
    description: 'UUID of the new admin user (must be a league member)',
    example: 'e096dcb1-9f20-4ce5-89ac-740d41283fb9',
    format: 'uuid',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4', { message: 'New admin user ID must be a valid UUID' })
  newAdminUserId: string;
}
