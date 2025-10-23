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
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica tu cuenta de Porraza</title>
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
          .cta-wrapper {
            text-align: center;
            padding: 24px 0 8px;
          }
          .divider {
            border-top: 1px solid #e5e7eb;
            margin: 32px 0;
          }
          .footer-card {
            margin-top: 16px;
            padding: 32px 40px;
            background-color: #f9fafb;
            text-align: center;
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
                    <p class="header-subtitle">Activa tu cuenta y únete a la porra del Mundial 2026</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h2>Hola ${name},</h2>
                    <p>
                      Gracias por registrarte en <strong>Porraza</strong>. Para completar tu cuenta y comenzar
                      a crear ligas privadas o unirte a las de tu equipo, verifica tu email en menos de un minuto.
                    </p>
                    <div class="cta-wrapper">
                      <a href="${verificationUrl}" class="cta-button">Verificar mi cuenta</a>
                    </div>
                    <p style="margin-top: 32px;">
                      ¿No puedes hacer clic en el botón? Copia y pega esta dirección en tu navegador:
                      <br>
                      <a href="${verificationUrl}" style="color: #2a398d; word-break: break-all;">
                        ${verificationUrl}
                      </a>
                    </p>
                    <div class="divider"></div>
                    <p style="font-size: 14px; color: #6b7280;">
                      Este enlace tiene una validez de <strong>24 horas</strong>. Si no iniciaste este registro,
                      ignora el mensaje y borra el email para mantener tu cuenta segura.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td class="footer-card">
                    <p>Porraza · porraza.com</p>
                    <p>
                      50011 Miralbueno, Zaragoza · contacto@porraza.com · +34 667 80 99 50
                    </p>
                    <p class="footer-links">
                      <a href="https://porraza.com/legal-advise">Aviso legal</a> ·
                      <a href="https://porraza.com/privacy-policy">Política de privacidad</a> ·
                      <a href="https://porraza.com/cookies-policy">Política de cookies</a>
                    </p>
                    <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
                      © ${currentYear} Porraza. Todos los derechos reservados.
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
