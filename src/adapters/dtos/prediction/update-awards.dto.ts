import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * UpdateAwardsDto (Adapters Layer)
 *
 * DTO para actualizar premios individuales (Golden Boot/Ball/Glove).
 */
export class UpdateAwardsDto {
  @ApiProperty({
    description: 'UUID of the player for Golden Boot (top scorer)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Golden Boot player ID must be a valid UUID' })
  goldenBootPlayerId?: string | null;

  @ApiProperty({
    description: 'UUID of the player for Golden Ball (best overall player)',
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Golden Ball player ID must be a valid UUID' })
  goldenBallPlayerId?: string | null;

  @ApiProperty({
    description: 'UUID of the player for Golden Glove (best goalkeeper)',
    example: '550e8400-e29b-41d4-a716-446655440002',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Golden Glove player ID must be a valid UUID' })
  goldenGlovePlayerId?: string | null;
}
