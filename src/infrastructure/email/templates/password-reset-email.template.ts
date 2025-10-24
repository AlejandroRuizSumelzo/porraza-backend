/**
 * Password Reset Email Template
 *
 * Template HTML para el email de restablecimiento de contraseña.
 * Se envía cuando el usuario solicita restablecer su contraseña olvidada.
 *
 * @param name - Nombre del usuario
 * @param resetUrl - URL completa con el token de reset
 * @returns HTML string del email
 */
export function getPasswordResetEmailTemplate(
  name: string,
  resetUrl: string,
): string {
  const currentYear = new Date().getFullYear();

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recupera tu contraseña · Porraza</title>
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
          .warning-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 20px 24px;
            margin: 24px 0;
          }
          .warning-box p {
            margin: 0;
            font-size: 15px;
            font-weight: 500;
            color: #92400e;
          }
          .cta-wrapper {
            text-align: center;
            padding: 32px 0 16px;
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
          .security-notice {
            background-color: #f0f9ff;
            border-radius: 12px;
            padding: 24px;
            margin: 32px 0;
            border: 1px solid rgba(42, 57, 141, 0.08);
          }
          .security-notice p {
            margin: 0 0 8px;
            font-size: 14px;
            color: #1e40af;
          }
          .security-notice p:last-child {
            margin-bottom: 0;
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
                    <p class="header-subtitle">Recupera el acceso a tu cuenta</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h2>Hola ${name},</h2>
                    <p>
                      Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Porraza.
                      Haz clic en el botón de abajo para crear una nueva contraseña.
                    </p>
                    <div class="warning-box">
                      <p>⏱️ Este enlace expira en 1 hora por seguridad.</p>
                    </div>
                    <div class="cta-wrapper">
                      <a href="${resetUrl}" class="cta-button">Restablecer contraseña</a>
                    </div>
                    <div class="security-notice">
                      <p><strong>🔒 Consejos de seguridad:</strong></p>
                      <p>• Si no solicitaste este cambio, ignora este correo.</p>
                      <p>• Tu contraseña actual permanecerá sin cambios.</p>
                      <p>• Nunca compartas este enlace con nadie.</p>
                    </div>
                    <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
                      Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                      <a href="${resetUrl}" style="word-break: break-all; font-size: 13px;">${resetUrl}</a>
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
