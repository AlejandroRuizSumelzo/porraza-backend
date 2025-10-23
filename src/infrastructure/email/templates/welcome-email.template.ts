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

  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cuenta verificada · Porraza</title>
        <style>
          :root {
            color-scheme: light only;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #f3f4f8;
            font-family: 'Poppins', 'Segoe UI', sans-serif;
            color: #1f2937;
          }
          table {
            border-collapse: collapse;
          }
          a {
            color: #2a398d;
          }
          .container {
            width: 100%;
            padding: 24px 0;
          }
          .email-card {
            width: 600px;
            max-width: 600px;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 16px 40px rgba(17, 24, 39, 0.12);
          }
          .header {
            background: linear-gradient(135deg, #2a398d 0%, #3cac3b 100%);
            padding: 48px 40px 40px;
            text-align: left;
          }
          .header-title {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #ffffff;
          }
          .header-subtitle {
            margin: 12px 0 0;
            font-size: 16px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.92);
          }
          .content {
            padding: 40px;
          }
          .content h2 {
            margin: 0 0 16px;
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
          }
          .content p {
            margin: 0 0 20px;
            font-size: 16px;
            line-height: 1.65;
            color: #4b5563;
          }
          .highlights {
            background-color: #f5f7fb;
            border-radius: 12px;
            padding: 24px 28px;
            border: 1px solid rgba(42, 57, 141, 0.08);
            margin: 32px 0;
          }
          .highlights h3 {
            margin: 0 0 16px;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
          }
          .highlights ul {
            margin: 0;
            padding-left: 20px;
            color: #4b5563;
            line-height: 1.75;
            font-size: 15px;
          }
          .cta-wrapper {
            text-align: center;
            padding: 24px 0 8px;
          }
          .cta-button {
            display: inline-block;
            background-color: #2a398d;
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 36px;
            border-radius: 999px;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.01em;
          }
          .closing {
            margin: 32px 0 0;
            font-size: 16px;
            text-align: center;
            color: #1f2937;
          }
          .footer-card {
            margin-top: 16px;
            padding: 32px 40px;
            background-color: #f9fafb;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer-card p {
            margin: 0 0 12px;
            font-size: 13px;
            color: #6b7280;
          }
          .footer-links {
            margin-top: 20px;
            font-size: 13px;
            color: #9ca3af;
          }
          .footer-links a {
            color: #2a398d;
            text-decoration: none;
            margin: 0 8px;
          }
          @media only screen and (max-width: 640px) {
            .email-card {
              width: 100% !important;
              border-radius: 0;
            }
            .header,
            .content,
            .footer-card {
              padding-left: 24px !important;
              padding-right: 24px !important;
            }
          }
        </style>
      </head>
      <body>
        <table role="presentation" width="100%" class="container" cellpadding="0" cellspacing="0" align="center">
          <tr>
            <td align="center">
              <table role="presentation" class="email-card" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <p class="header-title">Porraza</p>
                    <p class="header-subtitle">Tu cuenta ya está lista para competir en el Mundial 2026</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h2>Hola ${name},</h2>
                    <p>
                      ¡Enhorabuena! Tu email se ha verificado correctamente y ya formas parte
                      de la comunidad Porraza. A partir de ahora puedes crear ligas privadas,
                      invitar a tu equipo y seguir la clasificación en tiempo real.
                    </p>
                    <div class="highlights">
                      <h3>¿Qué puedes hacer ahora mismo?</h3>
                      <ul>
                        <li>Iniciar sesión y configurar tu primera liga privada.</li>
                        <li>Invitar a tus compañeros mediante un enlace único.</li>
                        <li>Seguir los partidos, estadísticas y rankings en tiempo real.</li>
                        <li>Personalizar reglas, predicciones especiales y premios.</li>
                      </ul>
                    </div>
                    <div class="cta-wrapper">
                      <a href="${frontendUrl}/login" class="cta-button">Iniciar sesión</a>
                    </div>
                    <p class="closing">
                      Nos vemos en la clasificación. ¡Que gane la mejor porra!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="footer-card">
                    <p>¿Necesitas ayuda? Responde a este email y te atenderemos lo antes posible.</p>
                    <p>Porraza · porraza.com · contacto@porraza.com · +34 667 80 99 50</p>
                    <p class="footer-links">
                      <a href="https://porraza.com/legal-advise">Aviso legal</a> ·
                      <a href="https://porraza.com/privacy-policy">Política de privacidad</a> ·
                      <a href="https://porraza.com/cookies-policy">Política de cookies</a>
                    </p>
                    <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
                      © ${currentYear} Porraza. Todos los derechos reservados. 50011 Miralbueno, Zaragoza.
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
