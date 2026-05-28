const express = require('express');
const router = express.Router();
const { enviarCorreo } = require('../utils/email');

// Regex simple para validar email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Endpoint POST /api/contacto
router.post('/', async (req, res) => {
  const { nombre, correo, asunto, mensaje } = req.body;

  // 1. Validación de campos obligatorios
  if (!nombre || !correo || !asunto || !mensaje) {
    return res.status(400).json({ error: 'Todos los campos (nombre, correo, asunto, mensaje) son obligatorios.' });
  }

  // 2. Validación de formato de correo
  if (!EMAIL_REGEX.test(correo.trim())) {
    return res.status(400).json({ error: 'La dirección de correo electrónico no es válida.' });
  }

  try {
    const adminEmail = process.env.SMTP_USER || 'academy@bluspro.net';
    const emailSubject = `[Consulta Web LMS] - ${asunto.trim()}`;

    // Construcción del contenido en texto plano
    const textContent = `
Nueva Consulta Recibida - Blush Pro Academy LMS
=============================================

Nombre: ${nombre.trim()}
Correo del Remitente: ${correo.trim()}
Asunto: ${asunto.trim()}

Mensaje:
---------------------------------------------
${mensaje.trim()}
---------------------------------------------
    `;

    // Construcción del contenido en HTML con estilo elegante (negro/dorado) consistente con Blush Pro
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Nueva Consulta de Contacto</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0d0d; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #141414; border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Encabezado / Logo -->
          <tr>
            <td style="padding: 25px 30px; text-align: center; background-color: #0f0f0f; border-bottom: 1px solid #222222;">
              <h1 style="color: #d4af37; font-family: Georgia, serif; font-size: 24px; font-weight: normal; margin: 0; letter-spacing: 2px; text-transform: uppercase;">
                Blush Pro Academy
              </h1>
              <span style="color: #888888; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; display: block; margin-top: 5px;">
                Notificación de Consulta Web
              </span>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 30px 35px;">
              <h2 style="color: #ffffff; font-size: 18px; font-weight: 400; margin-top: 0; margin-bottom: 20px; border-bottom: 1px solid #222222; padding-bottom: 10px; letter-spacing: 0.5px;">
                Detalles del Mensaje Recibido
              </h2>
              
              <table width="100%" style="margin-bottom: 25px; font-size: 15px;">
                <tr>
                  <td width="30%" style="color: #888888; padding: 6px 0; font-weight: bold; vertical-align: top;">Remitente:</td>
                  <td width="70%" style="color: #ffffff; padding: 6px 0;">${nombre.trim()}</td>
                </tr>
                <tr>
                  <td style="color: #888888; padding: 6px 0; font-weight: bold; vertical-align: top;">Correo:</td>
                  <td style="color: #d4af37; padding: 6px 0;"><a href="mailto:${correo.trim()}" style="color: #d4af37; text-decoration: none;">${correo.trim()}</a></td>
                </tr>
                <tr>
                  <td style="color: #888888; padding: 6px 0; font-weight: bold; vertical-align: top;">Asunto:</td>
                  <td style="color: #ffffff; padding: 6px 0; font-weight: 500;">${asunto.trim()}</td>
                </tr>
              </table>

              <div style="background-color: #0f0f0f; border-left: 3px solid #d4af37; border-radius: 4px; padding: 20px; margin-bottom: 10px;">
                <h4 style="color: #888888; margin-top: 0; margin-bottom: 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Mensaje Escrito:</h4>
                <p style="color: #dddddd; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${mensaje.trim()}</p>
              </div>
            </td>
          </tr>

          <!-- Divisor -->
          <tr>
            <td style="padding: 0 35px;">
              <div style="border-top: 1px solid #222222;"></div>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="padding: 20px 35px; text-align: center; background-color: #0f0f0f;">
              <p style="color: #555555; font-size: 11px; margin: 0; line-height: 1.4;">
                Este correo fue generado automáticamente por la plataforma Blush Pro Academy LMS.<br>
                Para responder a la alumna, puedes hacer clic directamente en su correo arriba.
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

    // Envío del correo usando nodemailer helper
    await enviarCorreo({
      to: adminEmail,
      subject: emailSubject,
      text: textContent,
      html: htmlContent
    });

    res.json({ success: true, message: 'Tu consulta ha sido enviada con éxito. Nos comunicaremos contigo a la brevedad.' });

  } catch (error) {
    console.error('❌ Error al procesar y enviar el formulario de contacto:', error);
    res.status(500).json({ error: 'Hubo un error al intentar enviar tu consulta. Por favor, intenta de nuevo más tarde.' });
  }
});

module.exports = router;
