import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * VerifyEmailDto (Adapters Layer)
 *
 * DTO para el endpoint de verificación de email.
 * Se usa en el endpoint POST /auth/verify-email.
 *
 * El token es un JWT que contiene:
 * - sub: userId
 * - email: userEmail
 * - type: 'email_verification'
 * - exp: 24 horas desde la emisión
 *
 * Flujo:
 * 1. Usuario hace clic en link del email: /verify-email?token=xxx
 * 2. Frontend extrae el token y llama a POST /auth/verify-email
 * 3. Backend valida el token y marca email_verified = TRUE
 * 4. Usuario puede hacer login
 */
export class VerifyEmailDto {
  /**
   * Token JWT de verificación
   * - Contiene userId y email
   * - Expira en 24 horas
   * - Si ya fue usado, aún funciona (idempotente)
   */
  @ApiProperty({
    description:
      'Email verification token (JWT) received in the verification email',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMDk2ZGNiMS05ZjIwLTRjZTUtODlhYy03NDBkNDEyODNmYjkiLCJlbWFpbCI6ImpvaG4uZG9lQGV4YW1wbGUuY29tIiwidHlwZSI6ImVtYWlsX3ZlcmlmaWNhdGlvbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MzI1NDIyfQ.xxxxx',
    type: String,
  })
  @IsNotEmpty({ message: 'Verification token is required' })
  @IsString({ message: 'Verification token must be a string' })
  token: string;
}
