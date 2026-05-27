const jwt = require('jsonwebtoken');

// Middleware para verificar la validez del token JWT
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if ((!token || token === 'null' || token === 'undefined') && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Acceso denegado',
      message: 'Token de autenticación no proporcionado'
    });
  }

  try {
    const secreto = process.env.JWT_SECRET;
    const verificado = jwt.verify(token, secreto);

    
    // Adjuntar los datos de la usuaria decodificados a la solicitud
    req.usuario = verificado;

    // Bloquear accesos si requiere cambiar contraseña
    const fullPath = (req.baseUrl || '') + (req.path || '');
    if (verificado.requiresPasswordChange && fullPath !== '/api/auth/password' && fullPath !== '/api/auth/logout') {
      return res.status(412).json({
        error: 'Cambio de contraseña requerido',
        requiresPasswordChange: true,
        message: 'Debes cambiar tu contraseña temporal antes de continuar utilizando la plataforma.'
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Token inválido',
      message: 'El token proporcionado no es válido o ha expirado'
    });
  }
}

// Middleware para verificar que la usuaria posee uno de los roles requeridos
function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Debe autenticarse primero'
      });
    }

    const tieneRolPermitido = rolesPermitidos.includes(req.usuario.rol);
    if (!tieneRolPermitido) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes los permisos necesarios para realizar esta acción'
      });
    }

    next();
  };
}

module.exports = {
  verificarToken,
  verificarRol
};
