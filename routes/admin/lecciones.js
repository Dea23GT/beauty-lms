const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// --- CRUD LECCIONES ---

// 1. Obtener lecciones de un curso
router.get('/cursos/:cursoId/lecciones', async (req, res) => {
  const cursoId = req.params.cursoId;
  try {
    const [lecciones] = await pool.query(
      'SELECT id, curso_id, paso_id, titulo, orden, youtube_id FROM lecciones WHERE curso_id = ? ORDER BY orden ASC',
      [cursoId]
    );
    res.json(lecciones);
  } catch (error) {
    console.error('Error al listar lecciones para admin:', error.message);
    res.status(500).json({ error: 'Error al listar lecciones' });
  }
});

// 2. Crear lección en un curso
router.post('/cursos/:cursoId/lecciones', async (req, res) => {
  const cursoId = req.params.cursoId;
  const { titulo, orden, youtube_id, paso_id } = req.body;

  if (!titulo || orden === undefined || !youtube_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const pasoIdVal = paso_id ? parseInt(paso_id, 10) : null;
    const [result] = await pool.query(
      'INSERT INTO lecciones (curso_id, paso_id, titulo, orden, youtube_id) VALUES (?, ?, ?, ?, ?)',
      [cursoId, pasoIdVal, titulo, parseInt(orden, 10), youtube_id]
    );

    res.status(201).json({
      message: 'Lección creada con éxito',
      leccion: { id: result.insertId, curso_id: parseInt(cursoId, 10), paso_id: pasoIdVal, titulo, orden, youtube_id }
    });
  } catch (error) {
    console.error('Error al crear lección:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una lección con ese número de orden en este módulo' });
    }
    res.status(500).json({ error: 'Error al crear la lección' });
  }
});

// 3. Actualizar una lección
router.put('/lecciones/:id', async (req, res) => {
  const leccionId = req.params.id;
  const { titulo, orden, youtube_id, paso_id } = req.body;

  if (!titulo || orden === undefined || !youtube_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const pasoIdVal = paso_id ? parseInt(paso_id, 10) : null;
    const [result] = await pool.query(
      'UPDATE lecciones SET titulo = ?, orden = ?, youtube_id = ?, paso_id = ? WHERE id = ?',
      [titulo, parseInt(orden, 10), youtube_id, pasoIdVal, leccionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lección no encontrada' });
    }

    res.json({
      message: 'Lección actualizada con éxito',
      leccion: { id: parseInt(leccionId, 10), paso_id: pasoIdVal, titulo, orden, youtube_id }
    });
  } catch (error) {
    console.error('Error al actualizar lección:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe otra lección con ese número de orden en este módulo' });
    }
    res.status(500).json({ error: 'Error al actualizar la lección' });
  }
});

// 4. Eliminar una lección
router.delete('/lecciones/:id', async (req, res) => {
  const leccionId = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM lecciones WHERE id = ?', [leccionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Lección no encontrada' });
    }

    res.json({ message: 'Lección eliminada con éxito' });
  } catch (error) {
    console.error('Error al eliminar lección:', error.message);
    res.status(500).json({ error: 'Error al eliminar la lección' });
  }
});

// 5. Reordenar de forma masiva las lecciones (Drag-and-Drop)
router.put('/cursos/:cursoId/lecciones/reordenar', async (req, res) => {
  const { lecciones } = req.body;

  if (!lecciones || !Array.isArray(lecciones)) {
    return res.status(400).json({ error: 'La lista de lecciones es requerida' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Temporarily set all orders to negative values to avoid duplicate key conflicts
    await connection.query(
      'UPDATE lecciones SET orden = -id WHERE curso_id = ?',
      [req.params.cursoId]
    );

    // 2. Update each lesson with its new order and paso_id
    for (const leccion of lecciones) {
      const { id, orden, paso_id } = leccion;
      await connection.query(
        'UPDATE lecciones SET orden = ?, paso_id = ? WHERE id = ?',
        [parseInt(orden, 10), paso_id ? parseInt(paso_id, 10) : null, parseInt(id, 10)]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Clases reordenadas correctamente.' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al reordenar lecciones:', error.message);
    res.status(500).json({ error: 'Error interno del servidor al reordenar clases' });
  } finally {
    connection.release();
  }
});

module.exports = router;

