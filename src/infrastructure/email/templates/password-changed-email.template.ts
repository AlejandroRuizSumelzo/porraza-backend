/**
 * Password Changed Email Template
 *
 * Template HTML para el email de notificación de cambio de contraseña.
 * Se envía cuando el usuario cambia su contraseña exitosamente (ya sea por reset o change password).
 *
 * @param name - Nombre del usuario
 * @returns HTML string del email
 */
export function getPasswordChangedEmailTemplate(name: string): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contraseña actualizada · Porraza</title>
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
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
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
          .info-box {
            background-color: #f0fdf4;
            border-left: 4px solid #10b981;
            border-radius: 8px;
            padding: 20px 24px;
            margin: 24px 0;
          }
          .info-box p {
            margin: 0 0 8px;
            font-size: 15px;
            color: #065f46;
          }
          .info-box p:last-child {
            margin-bottom: 0;
          }
          .alert-box {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            padding: 20px 24px;
            margin: 32px 0;
          }
          .alert-box p {
            margin: 0 0 8px;
            font-size: 15px;
            color: #991b1b;
          }
          .alert-box p:last-child {
            margin-bottom: 0;
          }
          .alert-box strong {
            font-weight: 600;
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
            padding: 14px 32px;
            border-radius: 999px;
            font-size: 15px;
            font-weight: 600;
            letter-spacing: 0.01em;
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
                    <p class="header-subtitle">Tu contraseña ha sido actualizada</p>
                  </td>
                </tr>
                <tr>
                  <td class="content">
                    <h2>Hola ${name},</h2>
                    <p>
                      Te confirmamos que la contraseña de tu cuenta en Porraza ha sido
                      actualizada correctamente.
                    </p>
                    <div class="info-box">
                      <p><strong>✓ Cambio exitoso</strong></p>
                      <p>📅 Fecha: ${currentDate}</p>
                      <p>🔐 Tu cuenta está protegida con la nueva contraseña</p>
                    </div>
                    <p>
                      Tus sesiones activas en otros dispositivos seguirán funcionando
                      hasta que caduquen o cierres sesión manualmente.
                    </p>
                    <div class="alert-box">
                      <p><strong>⚠️ ¿No fuiste tú?</strong></p>
                      <p>
                        Si no realizaste este cambio, tu cuenta puede estar comprometida.
                        <strong>Contacta inmediatamente con soporte en contacto@porraza.com</strong>
                        o responde a este email.
                      </p>
                    </div>
                    <div class="cta-wrapper">
                      <a href="${frontendUrl}/login" class="cta-button">Iniciar sesión</a>
                    </div>
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
