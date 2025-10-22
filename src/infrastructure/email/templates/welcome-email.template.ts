/**
 * Welcome Email Template
 *
 * Template HTML para el email de bienvenida.
 * Se envía después de que el usuario verifica su cuenta exitosamente.
 *
 * @param name - Nombre del usuario
 * @returns HTML string del email
 */
export function getWelcomeEmailTemplate(name: string): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Bienvenido a Porraza!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px;">
                      🎉
                    </h1>
                    <h2 style="color: #ffffff; margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">
                      ¡Cuenta Verificada!
                    </h2>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">
                      ¡Hola, ${name}!
                    </h2>

                    <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                      Tu cuenta ha sido <strong>verificada exitosamente</strong>. Ya eres parte de la comunidad de Porraza para el Mundial 2026.
                    </p>

                    <div style="background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 20px; margin: 30px 0;">
                      <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 18px;">
                        ¿Qué puedes hacer ahora?
                      </h3>
                      <ul style="color: #666666; margin: 0; padding-left: 20px; line-height: 1.8;">
                        <li>Hacer predicciones de los partidos del Mundial 2026</li>
                        <li>Unirte a ligas públicas o crear tu propia liga privada</li>
                        <li>Competir con amigos en el ranking global</li>
                        <li>Predecir al Pichichi y MVP del torneo</li>
                      </ul>
                    </div>

                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${frontendUrl}/login"
                             style="display: inline-block; background-color: #4CAF50; color: #ffffff;
                                    padding: 16px 40px; text-decoration: none; border-radius: 6px;
                                    font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(76, 175, 80, 0.3);">
                            Iniciar Sesión
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666666; line-height: 1.6; margin: 30px 0 0 0; font-size: 16px; text-align: center;">
                      ¡Que gane el mejor predictor! ⚽🏆
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px; text-align: center;
                             border-top: 1px solid #eeeeee;">
                    <p style="color: #999999; margin: 0 0 10px 0; font-size: 13px;">
                      ¿Necesitas ayuda? Contáctanos respondiendo a este email.
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
