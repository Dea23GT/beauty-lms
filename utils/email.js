const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '465', 10);
const secure = process.env.SMTP_SECURE === 'true' || port === 465;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

let transporter = null;

if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
  console.log('✉️ Nodemailer SMTP configurado correctamente.');
} else {
  console.log('⚠️ Nodemailer SMTP no configurado. Se usará el fallback de logs en consola.');
}

/**
 * Envia un correo electrónico utilizando SMTP o fallback en consola
 * @param {Object} options
 * @param {string} options.to - Dirección destino
 * @param {string} options.subject - Asunto del correo
 * @param {string} options.text - Versión texto plano
 * @param {string} options.html - Versión HTML
 */
async function enviarCorreo({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || `"Blush Pro Academy" <${user || 'info@blushproacademy.com'}>`;

  if (!transporter) {
    console.log('\n=================== 📨 CORREO ELECTRÓNICO SIMULADO ===================');
    console.log(`DE:     ${from}`);
    console.log(`PARA:   ${to}`);
    console.log(`ASUNTO: ${subject}`);
    console.log('---------------------------------------------------------------------');
    console.log('TEXTO PLANO:');
    console.log(text);
    console.log('---------------------------------------------------------------------');
    console.log('HTML (Renderizado preliminar):');
    console.log(html);
    console.log('=====================================================================\n');
    return { mock: true, message: 'Correo impreso en la consola por falta de configuración SMTP' };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });
    console.log(`✅ Correo enviado con éxito a ${to}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Error al enviar correo SMTP a ${to}:`, error.message);
    throw error;
  }
}

/**
 * Plantilla de correo para verificación de cuenta (Registro)
 */
function getTemplateVerificacion({ nombre, verificationLink }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=initial-scale=1.0">
  <title>Verifica tu Cuenta - Blush Pro Academy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0d0d; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #141414; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Encabezado / Logo -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #0f0f0f; border-bottom: 1px solid #222222;">
              <h1 style="color: #d4af37; font-family: Georgia, serif; font-size: 26px; font-weight: normal; margin: 0; letter-spacing: 3px; text-transform: uppercase;">
                Blush Pro Academy
              </h1>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center;">
              <h2 style="color: #ffffff; font-size: 22px; font-weight: 300; margin-top: 0; margin-bottom: 20px; letter-spacing: 0.5px;">
                ¡Hola, ${nombre}!
              </h2>
              <p style="color: #bbbbbb; font-size: 16px; line-height: 1.6; margin-bottom: 30px; font-weight: 300;">
                Te damos la bienvenida a nuestra academia de estética y belleza. Para activar tu cuenta, comenzar tu aprendizaje y acceder a tus cursos, por favor haz clic en el siguiente botón:
              </p>
              
              <!-- Botón de acción -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 30px auto;">
                <tr>
                  <td align="center" style="border-radius: 4px; background-color: #d4af37; padding: 12px 32px;">
                    <a href="${verificationLink}" target="_blank" style="font-size: 16px; font-weight: bold; color: #000000; text-decoration: none; display: inline-block;">
                      VERIFICAR MI CUENTA
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 14px; margin-bottom: 10px;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="color: #d4af37; font-size: 13px; word-break: break-all; margin: 0; font-family: monospace;">
                ${verificationLink}
              </p>
            </td>
          </tr>

          <!-- Divisor -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #222222;"></div>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <p style="color: #555555; font-size: 11px; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 1px;">
                Este es un mensaje automático enviado por Blush Pro Academy.<br>
                Si no te has registrado en nuestro sitio web, puedes ignorar este mensaje.
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

/**
 * Plantilla de correo para recuperación de contraseña (Forgot Password)
 */
function getTemplateRecuperacion({ token }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=initial-scale=1.0">
  <title>Restablecer Contraseña - Blush Pro Academy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0d0d; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #141414; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Encabezado / Logo -->
          <tr>
            <td style="padding: 30px 40px; text-align: center; background-color: #0f0f0f; border-bottom: 1px solid #222222;">
              <h1 style="color: #d4af37; font-family: Georgia, serif; font-size: 26px; font-weight: normal; margin: 0; letter-spacing: 3px; text-transform: uppercase;">
                Blush Pro Academy
              </h1>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center;">
              <h2 style="color: #ffffff; font-size: 22px; font-weight: 300; margin-top: 0; margin-bottom: 20px; letter-spacing: 0.5px;">
                Restablecer Contraseña
              </h2>
              <p style="color: #bbbbbb; font-size: 16px; line-height: 1.6; margin-bottom: 35px; font-weight: 300;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Por favor, introduce el siguiente código de verificación en la página de recuperación:
              </p>
              
              <!-- Código de verificación -->
              <div style="background-color: #0f0f0f; border: 1px dashed #d4af37; border-radius: 4px; padding: 15px 30px; display: inline-block; margin-bottom: 30px;">
                <span style="color: #d4af37; font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">
                  ${token}
                </span>
              </div>

              <p style="color: #888888; font-size: 14px; margin: 0;">
                Este código tiene una validez de **1 hora** por razones de seguridad.
              </p>
            </td>
          </tr>

          <!-- Divisor -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="border-top: 1px solid #222222;"></div>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding: 30px 40px; text-align: center;">
              <p style="color: #555555; font-size: 11px; margin: 0; line-height: 1.5; text-transform: uppercase; letter-spacing: 1px;">
                Si no has solicitado este cambio, puedes ignorar este correo de forma segura.<br>
                Tu contraseña actual no sufrirá ningún cambio.
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

module.exports = {
  enviarCorreo,
  getTemplateVerificacion,
  getTemplateRecuperacion
};
