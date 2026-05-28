const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Obtener todas las entradas de blog (Público)
router.get('/', async (req, res) => {
  try {
    const [blogs] = await pool.query(
      'SELECT id, titulo, categoria, extracto, contenido, imagen_url, fecha_creacion FROM blogs ORDER BY fecha_creacion DESC'
    );
    res.json(blogs);
  } catch (error) {
    console.error('❌ Error al obtener los blogs:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo recuperar la lista de artículos de blog'
    });
  }
});

// Obtener una entrada de blog específica (Público)
router.get('/:id', async (req, res) => {
  const blogId = req.params.id;
  try {
    const [blogs] = await pool.query(
      'SELECT id, titulo, categoria, extracto, contenido, imagen_url, fecha_creacion FROM blogs WHERE id = ?',
      [blogId]
    );

    if (blogs.length === 0) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'El artículo de blog especificado no existe'
      });
    }

    res.json(blogs[0]);
  } catch (error) {
    console.error(`❌ Error al obtener el blog ${blogId}:`, error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo recuperar el artículo de blog'
    });
  }
});

module.exports = router;
