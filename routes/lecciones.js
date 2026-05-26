const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// Obtener lección segura por su ID (Solo alumnas activas o admin)
router.get('/:id', verificarToken, async (req, res) => {
  const leccionId = req.params.id;
  const usuarioId = req.usuario.id;
  const usuarioRol = req.usuario.role || req.usuario.rol; // Soporta rol o role en el payload del JWT

  try {
    // 1. Obtener la lección solicitada
    const [lecciones] = await pool.query(
      'SELECT id, curso_id, titulo, orden, youtube_id FROM lecciones WHERE id = ?',
      [leccionId]
    );

    if (lecciones.length === 0) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'La lección especificada no existe'
      });
    }

    const leccion = lecciones[0];
    const cursoId = leccion.curso_id;

    // 2. Si es administrador, permitir acceso completo
    if (usuarioRol === 'admin') {
      return res.json(leccion);
    }

    // 3. Si es alumna, verificar si tiene una inscripción activa para este curso
    const [inscripciones] = await pool.query(
      'SELECT es_activo FROM inscripciones WHERE usuario_id = ? AND curso_id = ?',
      [usuarioId, cursoId]
    );

    if (inscripciones.length === 0 || !inscripciones[0].es_activo) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No cuentas con una inscripción activa en este curso para ver el contenido'
      });
    }

    // 4. Retornar lección completa (con youtube_id seguro)
    res.json(leccion);

  } catch (error) {
    console.error(`❌ Error al recuperar lección ${leccionId}:`, error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo recuperar la lección segura'
    });
  }
});

module.exports = router;
