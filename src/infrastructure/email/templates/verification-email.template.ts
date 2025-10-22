/**
 * Verification Email Template
 *
 * Template HTML para el email de verificación de cuenta.
 * Se envía cuando el usuario se registra por primera vez.
 *
 * @param name - Nombre del usuario
 * @param verificationUrl - URL completa con token de verificación
 * @returns HTML string del email
 */
export function getVerificationEmailTemplate(
  name: string,
  verificationUrl: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica tu cuenta de Porraza</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                      ⚽ Porraza
                    </h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                      Mundial 2026 - Predicciones
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">
                      ¡Bienvenido, ${name}!
                    </h2>

                    <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                      Gracias por registrarte en <strong>Porraza</strong>, la plataforma de predicciones para el Mundial 2026.
                    </p>

                    <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                      Para completar tu registro y comenzar a hacer predicciones, por favor verifica tu cuenta haciendo clic en el siguiente botón:
                    </p>

                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${verificationUrl}"
                             style="display: inline-block; background-color: #4CAF50; color: #ffffff;
                                    padding: 16px 40px; text-decoration: none; border-radius: 6px;
                                    font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(76, 175, 80, 0.3);">
                            Verificar mi cuenta
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #999999; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;
                               border-top: 1px solid #eeeeee; padding-top: 20px;">
                      <strong>¿No funciona el botón?</strong><br>
                      Copia y pega este enlace en tu navegador:<br>
                      <a href="${verificationUrl}"
                         style="color: #4CAF50; word-break: break-all;">
                        ${verificationUrl}
                      </a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px; text-align: center;
                             border-top: 1px solid #eeeeee;">
                    <p style="color: #999999; margin: 0 0 10px 0; font-size: 13px;">
                      Este enlace expira en <strong>24 horas</strong>.
                    </p>
                    <p style="color: #999999; margin: 0; font-size: 13px;">
                      Si no creaste esta cuenta, puedes ignorar este email.
                    </p>
                    <p style="color: #cccccc; margin: 20px 0 0 0; font-size: 12px;">
                      © ${new Date().getFullYear()} Porraza - Todos los derechos reservados
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
