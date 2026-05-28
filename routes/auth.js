const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verificarToken } = require('../middleware/auth');

const { pool } = require('../config/db');
const { enviarCorreo, getTemplateVerificacion, getTemplateRecuperacion } = require('../utils/email');


// Validar fortaleza de contraseña basada en principios OWASP
function validarPasswordOWASP(password) {
  if (password.length < 8) {
    return {
      valido: false,
      message: 'La contraseña debe tener al menos 8 caracteres.'
    };
  }
  const tieneMinuscula = /[a-z]/.test(password);
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumero = /\d/.test(password);
  const tieneEspecial = /[@$!%*?&._\-\/\+#]/.test(password);

  if (!tieneMinuscula || !tieneMayuscula || !tieneNumero || !tieneEspecial) {
    return {
      valido: false,
      message: 'La contraseña debe incluir al menos una letra mayúscula, una minúscula, un número y un carácter especial (@$!%*?&._-/#+).'
    };
  }
  return { valido: true };
}

// Registro de usuaria (alumna)
router.post('/register', async (req, res) => {
  const { nombre, correo, password } = req.body;

  // Validación de campos requeridos
  if (!nombre || !correo || !password) {
    return res.status(400).json({
      error: 'Campos incompletos',
      message: 'Nombre, correo y contraseña son obligatorios'
    });
  }

  // Validación básica del formato de correo
  const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regexCorreo.test(correo)) {
    return res.status(400).json({
      error: 'Formato inválido',
      message: 'El formato del correo electrónico no es válido'
    });
  }

  const passCheck = validarPasswordOWASP(password);
  if (!passCheck.valido) {
    return res.status(400).json({
      error: 'Contraseña débil',
      message: passCheck.message
    });
  }


  try {
    // 1. Verificar si el correo ya está registrado
    const [usuariosExistentes] = await pool.query(
      'SELECT id FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuariosExistentes.length > 0) {
      return res.status(409).json({
        error: 'Conflicto',
        message: 'El correo electrónico ya está registrado'
      });
    }

    // 2. Encriptar contraseña
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const isDev = process.env.NODE_ENV === 'development';
    const isTest = isDev && (
                   correo.toLowerCase().trim().startsWith('test_') ||
                   correo.toLowerCase().trim().startsWith('alumna_') ||
                   correo.toLowerCase().trim().endsWith('@example.com') ||
                   correo.toLowerCase().trim().endsWith('@beautyboutique.com')
    );

    // 3. Insertar usuario en la BD (Por defecto rol 'alumna', verificado = 0, para test es 1)
    const rol = 'alumna'; 
    const verificadoVal = isTest ? 1 : 0;
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpira = isTest ? null : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas de validez

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol, verificado, token_verificacion, token_verificacion_expira, metodo_verificacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, correo, passwordHash, rol, verificadoVal, isTest ? null : verificationToken, tokenExpira, 'correo']
    );

    let token = null;
    if (isTest) {
      const secreto = process.env.JWT_SECRET;
      const tokenPayload = {
        id: result.insertId,
        nombre,
        correo,
        rol
      };
      token = jwt.sign(tokenPayload, secreto, {
        expiresIn: '24h'
      });
    }

    // Generar enlace de verificación dinámico
    const protocol = req.protocol;
    const host = req.get('host');
    const verificationLink = `${protocol}://${host}/api/auth/verificar?correo=${encodeURIComponent(correo)}&token=${verificationToken}`;

    // Enviar correo de verificación real si no es cuenta de prueba
    if (!isTest) {
      try {
        const htmlContent = getTemplateVerificacion({ nombre, verificationLink });
        const textContent = `¡Hola, ${nombre}!\n\nTe damos la bienvenida a Blush Pro Academy.\n\nPara verificar tu cuenta, accede al siguiente enlace:\n${verificationLink}\n\nO utiliza el siguiente código de verificación: ${verificationToken}\n\nEste código tiene una validez de 24 horas.`;
        
        await enviarCorreo({
          to: correo,
          subject: 'Activa tu cuenta - Blush Pro Academy',
          text: textContent,
          html: htmlContent
        });
      } catch (mailError) {
        console.error('⚠️ Error al enviar correo de verificación:', mailError.message);
      }
    }

    if (token) {
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
    }

    res.status(201).json({
      message: isTest 
        ? 'Usuario registrado exitosamente (Test).' 
        : 'Usuario registrado exitosamente. Se ha enviado un link de verificación a tu correo.',
      user: {
        id: result.insertId,
        nombre,
        correo,
        rol,
        verificado: !!verificadoVal
      },
      token: token,
      ...(isDev && {
        mockVerificationLink: isTest ? null : verificationLink,
        mockVerificationToken: isTest ? null : verificationToken
      })
    });


  } catch (error) {
    console.error('❌ Error en registro de usuario:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo completar el registro del usuario'
    });
  }
});

// Inicio de sesión
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({
      error: 'Campos incompletos',
      message: 'Correo y contraseña son obligatorios'
    });
  }

  try {
    // 1. Buscar el usuario en la BD
    const [usuarios] = await pool.query(
      'SELECT * FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'El correo o la contraseña son incorrectos'
      });
    }

    const usuario = usuarios[0];

    // 2. Comparar la contraseña ingresada con el hash guardado
    const passwordCorrecta = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordCorrecta) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'El correo o la contraseña son incorrectos'
      });
    }

    // 3. Generar el Token JWT
    const secreto = process.env.JWT_SECRET;
    const tokenPayload = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      requiresPasswordChange: !!usuario.requiere_cambio_password
    };

    const token = jwt.sign(tokenPayload, secreto, {
      expiresIn: '24h' // El token expira en 24 horas
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    // 4. Retornar token e información del usuario
    res.json({
      message: 'Autenticación exitosa',
      token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        verificado: !!usuario.verificado,
        requiresPasswordChange: !!usuario.requiere_cambio_password
      }
    });

  } catch (error) {
    console.error('❌ Error en inicio de sesión:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al procesar el inicio de sesión'
    });
  }
});

// GET /verificar - Verificar cuenta por link
router.get('/verificar', async (req, res) => {
  const { correo, token } = req.query;

  if (!correo || !token) {
    return res.status(400).send('<h3>Parámetros de verificación inválidos.</h3>');
  }

  try {
    const [usuarios] = await pool.query(
      'SELECT id, token_verificacion, token_verificacion_expira FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuarios.length === 0 || usuarios[0].token_verificacion !== token) {
      return res.status(400).send('<h3>El enlace de verificación ha expirado o es inválido.</h3>');
    }

    if (usuarios[0].token_verificacion_expira && new Date() > new Date(usuarios[0].token_verificacion_expira)) {
      return res.status(400).send('<h3>El enlace de verificación ha expirado. Por favor, regístrate de nuevo.</h3>');
    }

    await pool.query(
      'UPDATE usuarios SET verificado = 1, token_verificacion = NULL, token_verificacion_expira = NULL WHERE correo = ?',
      [correo]
    );

    // Redireccionar al login con flag de éxito
    res.redirect(`/login?verified=true&email=${encodeURIComponent(correo)}`);

  } catch (error) {
    console.error('Error al verificar por link:', error);
    res.status(500).send('<h3>Error interno del servidor al procesar la verificación.</h3>');
  }
});

// POST /verificar-manual - Verificar cuenta manualmente por código
router.post('/verificar-manual', async (req, res) => {
  const { correo, token } = req.body;

  if (!correo || !token) {
    return res.status(400).json({ error: 'Correo y token son requeridos' });
  }

  try {
    const [usuarios] = await pool.query(
      'SELECT id, token_verificacion, token_verificacion_expira FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuarios.length === 0 || usuarios[0].token_verificacion !== token) {
      return res.status(400).json({ error: 'El código ingresado es incorrecto o ha expirado.' });
    }

    if (usuarios[0].token_verificacion_expira && new Date() > new Date(usuarios[0].token_verificacion_expira)) {
      return res.status(400).json({ error: 'El código de verificación ha expirado.' });
    }

    await pool.query(
      'UPDATE usuarios SET verificado = 1, token_verificacion = NULL, token_verificacion_expira = NULL WHERE correo = ?',
      [correo]
    );

    res.json({ success: true, message: 'Cuenta verificada exitosamente.' });

  } catch (error) {
    console.error('Error al verificar manualmente:', error);
    res.status(500).json({ error: 'Error al procesar la verificación.' });
  }
});

// POST /forgot-password - Solicitar recuperación de contraseña (envía token de 6 dígitos)
router.post('/forgot-password', async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ error: 'El correo electrónico es requerido' });
  }

  try {
    const [usuarios] = await pool.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'El correo electrónico no está registrado.' });
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validez

    await pool.query(
      'UPDATE usuarios SET token_verificacion = ?, token_verificacion_expira = ? WHERE correo = ?',
      [token, tokenExpira, correo]
    );

    // Enviar correo real
    try {
      const htmlContent = getTemplateRecuperacion({ token });
      const textContent = `¡Hola!\n\nHemos recibido una solicitud para restablecer la contraseña de tu cuenta en Blush Pro Academy.\n\nUtiliza el siguiente código de verificación de 6 dígitos:\n\n${token}\n\nEste código es válido por 1 hora.`;
      
      await enviarCorreo({
        to: correo,
        subject: 'Código de recuperación de contraseña - Blush Pro Academy',
        text: textContent,
        html: htmlContent
      });
    } catch (mailError) {
      console.error('⚠️ Error al enviar correo de recuperación:', mailError.message);
    }

    const isDev = process.env.NODE_ENV === 'development';
    res.json({
      success: true,
      message: 'Se ha enviado un código de recuperación a tu correo.',
      ...(isDev && { mockToken: token }) // Para facilitar testing
    });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud de recuperación.' });
  }
});

// POST /reset-password - Restablecer contraseña usando el token de 6 dígitos
router.post('/reset-password', async (req, res) => {
  const { correo, token, newPassword } = req.body;

  if (!correo || !token || !newPassword) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const passCheck = validarPasswordOWASP(newPassword);
  if (!passCheck.valido) {
    return res.status(400).json({ error: passCheck.message });
  }

  try {
    const [usuarios] = await pool.query(
      'SELECT id, token_verificacion, token_verificacion_expira FROM usuarios WHERE correo = ?',
      [correo]
    );

    if (usuarios.length === 0 || usuarios[0].token_verificacion !== token) {
      return res.status(400).json({ error: 'El código de verificación es incorrecto o ha expirado.' });
    }

    if (usuarios[0].token_verificacion_expira && new Date() > new Date(usuarios[0].token_verificacion_expira)) {
      return res.status(400).json({ error: 'El código de verificación ha expirado.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.query(
      'UPDATE usuarios SET password_hash = ?, token_verificacion = NULL, token_verificacion_expira = NULL WHERE correo = ?',
      [passwordHash, correo]
    );

    res.json({ success: true, message: 'Tu contraseña ha sido restablecida con éxito.' });

  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña.' });
  }
});

// POST /logout - Cerrar sesión (limpia la cookie httpOnly)
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

// GET /perfil - Obtener perfil del usuario autenticado
router.get('/perfil', verificarToken, async (req, res) => {
  try {
    const [usuarios] = await pool.query(
      'SELECT id, nombre, correo, rol, verificado FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuarios[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /perfil - Actualizar nombre de perfil del usuario
router.put('/perfil', verificarToken, async (req, res) => {
  const { nombre } = req.body;

  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre es requerido' });
  }

  try {
    await pool.query(
      'UPDATE usuarios SET nombre = ? WHERE id = ?',
      [nombre, req.usuario.id]
    );

    // Generar un nuevo token JWT con el nombre actualizado
    const secreto = process.env.JWT_SECRET;
    const tokenPayload = {
      id: req.usuario.id,
      nombre: nombre,
      correo: req.usuario.correo,
      rol: req.usuario.rol
    };

    const token = jwt.sign(tokenPayload, secreto, { expiresIn: '24h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Perfil actualizado con éxito.',
      user: {
        id: req.usuario.id,
        nombre: nombre,
        correo: req.usuario.correo,
        rol: req.usuario.rol
      },
      token
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// PUT /password - Actualizar contraseña del usuario
router.put('/password', verificarToken, async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;

  if (!passwordActual || !passwordNueva) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas.' });
  }

  const passCheck = validarPasswordOWASP(passwordNueva);
  if (!passCheck.valido) {
    return res.status(400).json({ error: passCheck.message });
  }

  try {
    const [usuarios] = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    const passwordCorrecta = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!passwordCorrecta) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const saltRounds = 10;
    const nuevoHash = await bcrypt.hash(passwordNueva, saltRounds);

    await pool.query(
      'UPDATE usuarios SET password_hash = ?, requiere_cambio_password = 0 WHERE id = ?',
      [nuevoHash, req.usuario.id]
    );

    // Regenerar el token de sesión sin requiresPasswordChange
    const secreto = process.env.JWT_SECRET;
    const tokenPayload = {
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      correo: req.usuario.correo,
      rol: req.usuario.rol,
      requiresPasswordChange: false
    };

    const token = jwt.sign(tokenPayload, secreto, { expiresIn: '24h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada con éxito.',
      token,
      user: {
        id: req.usuario.id,
        nombre: req.usuario.nombre,
        correo: req.usuario.correo,
        rol: req.usuario.rol,
        requiresPasswordChange: false
      }
    });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña.' });
  }
});

module.exports = router;

