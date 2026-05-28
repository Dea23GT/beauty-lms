const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// --- CRUD CURSOS ---

// 1. Obtener todos los cursos
router.get('/cursos', async (req, res) => {
  try {
    const [cursos] = await pool.query(
      'SELECT id, titulo, descripcion, precio, miniatura_url, trailer_youtube_id, fecha_creacion FROM cursos ORDER BY id DESC'
    );
    res.json(cursos);
  } catch (error) {
    console.error('Error al listar cursos para admin:', error.message);
    res.status(500).json({ error: 'Error al listar cursos' });
  }
});

// 2. Crear un nuevo curso
router.post('/cursos', async (req, res) => {
  const { titulo, descripcion, precio, miniatura_url, trailer_youtube_id } = req.body;

  if (!titulo || !descripcion || precio === undefined || !miniatura_url) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO cursos (titulo, descripcion, precio, miniatura_url, trailer_youtube_id) VALUES (?, ?, ?, ?, ?)',
      [titulo, descripcion, parseFloat(precio), miniatura_url, trailer_youtube_id || 'dQw4w9WgXcQ']
    );

    res.status(201).json({
      message: 'Curso creado con éxito',
      curso: { id: result.insertId, titulo, descripcion, precio, miniatura_url, trailer_youtube_id: trailer_youtube_id || 'dQw4w9WgXcQ' }
    });
  } catch (error) {
    console.error('Error al crear curso:', error.message);
    res.status(500).json({ error: 'Error al crear el curso' });
  }
});

// 3. Actualizar un curso
router.put('/cursos/:id', async (req, res) => {
  const cursoId = req.params.id;
  const { titulo, descripcion, precio, miniatura_url, trailer_youtube_id } = req.body;

  if (!titulo || !descripcion || precio === undefined || !miniatura_url) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE cursos SET titulo = ?, descripcion = ?, precio = ?, miniatura_url = ?, trailer_youtube_id = ? WHERE id = ?',
      [titulo, descripcion, parseFloat(precio), miniatura_url, trailer_youtube_id || 'dQw4w9WgXcQ', cursoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json({
      message: 'Curso actualizado con éxito',
      curso: { id: parseInt(cursoId, 10), titulo, descripcion, precio, miniatura_url, trailer_youtube_id: trailer_youtube_id || 'dQw4w9WgXcQ' }
    });
  } catch (error) {
    console.error('Error al actualizar curso:', error.message);
    res.status(500).json({ error: 'Error al actualizar el curso' });
  }
});

// 4. Eliminar un curso
router.delete('/cursos/:id', async (req, res) => {
  const cursoId = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM cursos WHERE id = ?', [cursoId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json({ message: 'Curso eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar curso:', error.message);
    res.status(500).json({ error: 'Error al eliminar el curso' });
  }
});

module.exports = router;
