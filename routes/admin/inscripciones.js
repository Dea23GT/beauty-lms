const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// --- CRUD SUSCRIPCIONES ---

// 1. Obtener todas las suscripciones
router.get('/inscripciones', async (req, res) => {
  try {
    const [inscripciones] = await pool.query(`
      SELECT i.id, i.usuario_id, i.curso_id, i.es_activo, i.fecha_inscripcion, 
             u.nombre AS usuario_nombre, u.correo AS usuario_correo, 
             c.titulo AS curso_titulo 
      FROM inscripciones i
      JOIN usuarios u ON i.usuario_id = u.id
      JOIN cursos c ON i.curso_id = c.id
      ORDER BY i.fecha_inscripcion DESC
    `);
    res.json(inscripciones);
  } catch (error) {
    console.error('Error al listar inscripciones para admin:', error.message);
    res.status(500).json({ error: 'Error al listar inscripciones' });
  }
});

// 2. Crear una suscripción manual por correo de usuario
router.post('/inscripciones', async (req, res) => {
  const { correo, curso_id, es_activo } = req.body;

  if (!correo || !curso_id) {
    return res.status(400).json({ error: 'Correo y curso_id son requeridos' });
  }

  try {
    // Buscar al usuario por correo
    const [usuarios] = await pool.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'El correo electrónico ingresado no pertenece a ningún usuario registrado' });
    }

    const usuarioId = usuarios[0].id;
    const esActivoVal = es_activo ? 1 : 0;

    const [result] = await pool.query(
      `INSERT INTO inscripciones (usuario_id, curso_id, es_activo) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE es_activo = ?`,
      [usuarioId, parseInt(curso_id, 10), esActivoVal, esActivoVal]
    );

    res.status(201).json({
      message: 'Inscripción procesada con éxito',
      inscripcion: {
        id: result.insertId || null,
        usuario_id: usuarioId,
        curso_id: parseInt(curso_id, 10),
        es_activo: esActivoVal
      }
    });

  } catch (error) {
    console.error('Error al crear inscripción manual:', error.message);
    res.status(500).json({ error: 'Error al crear la inscripción' });
  }
});

// 3. Modificar estado de una suscripción
router.put('/inscripciones/:id', async (req, res) => {
  const inscripcionId = req.params.id;
  const { es_activo } = req.body;

  if (es_activo === undefined) {
    return res.status(400).json({ error: 'El estado es_activo es requerido' });
  }

  try {
    const esActivoVal = es_activo ? 1 : 0;
    const [result] = await pool.query(
      'UPDATE inscripciones SET es_activo = ? WHERE id = ?',
      [esActivoVal, inscripcionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    res.json({
      message: 'Estado de suscripción actualizado',
      inscripcion: { id: parseInt(inscripcionId, 10), es_activo: esActivoVal }
    });

  } catch (error) {
    console.error('Error al actualizar inscripción:', error.message);
    res.status(500).json({ error: 'Error al actualizar la inscripción' });
  }
});

// 4. Revocar/Eliminar una suscripción
router.delete('/inscripciones/:id', async (req, res) => {
  const inscripcionId = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM inscripciones WHERE id = ?', [inscripcionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    res.json({ message: 'Suscripción revocada con éxito' });
  } catch (error) {
    console.error('Error al revocar inscripción:', error.message);
    res.status(500).json({ error: 'Error al revocar la inscripción' });
  }
});

module.exports = router;
