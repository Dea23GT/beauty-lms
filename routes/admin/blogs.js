const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// --- CRUD BLOGS ---

// 1. Obtener todos los blogs
router.get('/blogs', async (req, res) => {
  try {
    const [blogs] = await pool.query(
      'SELECT id, titulo, categoria, extracto, contenido, imagen_url, fecha_creacion FROM blogs ORDER BY id DESC'
    );
    res.json(blogs);
  } catch (error) {
    console.error('Error al listar blogs para admin:', error.message);
    res.status(500).json({ error: 'Error al listar blogs' });
  }
});

// 2. Crear un nuevo blog
router.post('/blogs', async (req, res) => {
  const { titulo, categoria, extracto, contenido, imagen_url } = req.body;

  if (!titulo || !categoria || !extracto || !contenido || !imagen_url) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO blogs (titulo, categoria, extracto, contenido, imagen_url) VALUES (?, ?, ?, ?, ?)',
      [titulo, categoria, extracto, contenido, imagen_url]
    );

    res.status(201).json({
      message: 'Artículo de blog creado con éxito',
      blog: { id: result.insertId, titulo, categoria, extracto, contenido, imagen_url }
    });
  } catch (error) {
    console.error('Error al crear blog:', error.message);
    res.status(500).json({ error: 'Error al crear el artículo de blog' });
  }
});

// 3. Actualizar un blog
router.put('/blogs/:id', async (req, res) => {
  const blogId = req.params.id;
  const { titulo, categoria, extracto, contenido, imagen_url } = req.body;

  if (!titulo || !categoria || !extracto || !contenido || !imagen_url) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE blogs SET titulo = ?, categoria = ?, extracto = ?, contenido = ?, imagen_url = ? WHERE id = ?',
      [titulo, categoria, extracto, contenido, imagen_url, blogId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Artículo de blog no encontrado' });
    }

    res.json({
      message: 'Artículo de blog actualizado con éxito',
      blog: { id: parseInt(blogId, 10), titulo, categoria, extracto, contenido, imagen_url }
    });
  } catch (error) {
    console.error('Error al actualizar blog:', error.message);
    res.status(500).json({ error: 'Error al actualizar el artículo de blog' });
  }
});

// 4. Eliminar un blog
router.delete('/blogs/:id', async (req, res) => {
  const blogId = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM blogs WHERE id = ?', [blogId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Artículo de blog no encontrado' });
    }

    res.json({ message: 'Artículo de blog eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar blog:', error.message);
    res.status(500).json({ error: 'Error al eliminar el artículo de blog' });
  }
});

module.exports = router;
