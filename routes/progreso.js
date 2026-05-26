const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// POST /api/progreso/lecciones/:leccionId
// Alternar el estado de completado para una lección
router.post('/lecciones/:leccionId', async (req, res) => {
  const usuarioId = req.usuario.id;
  const leccionId = req.params.leccionId;
  let { completado } = req.body;

  try {
    // Verificar que la lección exista
    const [lecciones] = await pool.query('SELECT id FROM lecciones WHERE id = ?', [leccionId]);
    if (lecciones.length === 0) {
      return res.status(404).json({ error: 'Lección no encontrada' });
    }

    // Buscar si ya existe el registro de progreso
    const [progreso] = await pool.query(
      'SELECT completado FROM progreso_lecciones WHERE usuario_id = ? AND leccion_id = ?',
      [usuarioId, leccionId]
    );

    if (progreso.length > 0) {
      const nuevoEstado = completado !== undefined ? !!completado : !progreso[0].completado;
      await pool.query(
        'UPDATE progreso_lecciones SET completado = ? WHERE usuario_id = ? AND leccion_id = ?',
        [nuevoEstado, usuarioId, leccionId]
      );
      return res.json({ message: 'Progreso actualizado', completado: nuevoEstado });
    } else {
      const nuevoEstado = completado !== undefined ? !!completado : true;
      await pool.query(
        'INSERT INTO progreso_lecciones (usuario_id, leccion_id, completado) VALUES (?, ?, ?)',
        [usuarioId, leccionId, nuevoEstado]
      );
      return res.json({ message: 'Progreso creado', completado: nuevoEstado });
    }
  } catch (error) {
    console.error('❌ Error al actualizar progreso de lección:', error.message);
    res.status(500).json({ error: 'Error al actualizar progreso' });
  }
});

// GET /api/progreso/cursos/:cursoId
// Obtener el progreso de la alumna para un curso específico
router.get('/cursos/:cursoId', async (req, res) => {
  const usuarioId = req.usuario.id;
  const cursoId = req.params.cursoId;

  try {
    const [progreso] = await pool.query(
      `SELECT pl.leccion_id 
       FROM progreso_lecciones pl
       INNER JOIN lecciones l ON pl.leccion_id = l.id
       WHERE pl.usuario_id = ? AND l.curso_id = ? AND pl.completado = TRUE`,
      [usuarioId, cursoId]
    );

    const leccionesCompletadas = progreso.map(p => p.leccion_id);
    res.json({ leccionesCompletadas });
  } catch (error) {
    console.error('❌ Error al obtener progreso del curso:', error.message);
    res.status(500).json({ error: 'Error al obtener progreso del curso' });
  }
});

module.exports = router;
