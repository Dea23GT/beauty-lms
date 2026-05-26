const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// 1. Listar todos los módulos de un curso
router.get('/cursos/:cursoId/pasos', async (req, res) => {
  const cursoId = req.params.cursoId;
  try {
    const [pasos] = await pool.query(
      'SELECT id, curso_id, titulo, descripcion, miniatura_url, orden FROM pasos WHERE curso_id = ? ORDER BY orden ASC',
      [cursoId]
    );
    res.json(pasos);
  } catch (error) {
    console.error('Error al listar pasos para admin:', error.message);
    res.status(500).json({ error: 'Error al listar módulos' });
  }
});

// 2. Crear un nuevo módulo en un curso
router.post('/cursos/:cursoId/pasos', async (req, res) => {
  const cursoId = req.params.cursoId;
  const { titulo, descripcion, miniatura_url } = req.body;

  if (!titulo) {
    return res.status(400).json({ error: 'El título del módulo es obligatorio' });
  }

  try {
    // Obtener el siguiente número de orden
    const [ordenQuery] = await pool.query(
      'SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM pasos WHERE curso_id = ?',
      [cursoId]
    );
    const siguienteOrden = ordenQuery[0].siguiente;

    const [result] = await pool.query(
      'INSERT INTO pasos (curso_id, titulo, descripcion, miniatura_url, orden) VALUES (?, ?, ?, ?, ?)',
      [cursoId, titulo, descripcion || null, miniatura_url || null, siguienteOrden]
    );

    res.status(201).json({
      message: 'Módulo creado con éxito',
      paso: {
        id: result.insertId,
        curso_id: parseInt(cursoId, 10),
        titulo,
        descripcion: descripcion || null,
        miniatura_url: miniatura_url || null,
        orden: siguienteOrden
      }
    });

  } catch (error) {
    console.error('Error al crear paso:', error.message);
    res.status(500).json({ error: 'Error al crear el módulo' });
  }
});

// 3. Actualizar un módulo
router.put('/pasos/:id', async (req, res) => {
  const pasoId = req.params.id;
  const { titulo, descripcion, miniatura_url } = req.body;

  if (!titulo) {
    return res.status(400).json({ error: 'El título del módulo es obligatorio' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE pasos SET titulo = ?, descripcion = ?, miniatura_url = ? WHERE id = ?',
      [titulo, descripcion || null, miniatura_url || null, pasoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }

    res.json({
      message: 'Módulo actualizado con éxito',
      paso: {
        id: parseInt(pasoId, 10),
        titulo,
        descripcion: descripcion || null,
        miniatura_url: miniatura_url || null
      }
    });

  } catch (error) {
    console.error('Error al actualizar paso:', error.message);
    res.status(500).json({ error: 'Error al actualizar el módulo' });
  }
});

// 4. Eliminar un módulo
router.delete('/pasos/:id', async (req, res) => {
  const pasoId = req.params.id;

  try {
    // 1. Obtener detalles del paso antes de borrar para reordenar los demás
    const [pasos] = await pool.query('SELECT curso_id, orden FROM pasos WHERE id = ?', [pasoId]);
    if (pasos.length === 0) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    const { curso_id, orden } = pasos[0];

    // 2. Eliminar el paso (las lecciones asociadas pasarán a paso_id = NULL por cascada)
    await pool.query('DELETE FROM pasos WHERE id = ?', [pasoId]);

    // 3. Recalcular el orden de los pasos restantes en el curso
    await pool.query(
      'UPDATE pasos SET orden = orden - 1 WHERE curso_id = ? AND orden > ?',
      [curso_id, orden]
    );

    res.json({ message: 'Módulo eliminado con éxito' });

  } catch (error) {
    console.error('Error al eliminar paso:', error.message);
    res.status(500).json({ error: 'Error al eliminar el módulo' });
  }
});

// 5. Reordenar de forma masiva los módulos (Drag-and-Drop)
router.put('/cursos/:cursoId/pasos/reordenar', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'La lista de IDs ordenados es requerida' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (let i = 0; i < ids.length; i++) {
      const id = parseInt(ids[i], 10);
      const nuevoOrden = i + 1;

      await connection.query(
        'UPDATE pasos SET orden = ? WHERE id = ?',
        [nuevoOrden, id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Módulos reordenados correctamente.' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al reordenar módulos:', error.message);
    res.status(500).json({ error: 'Error interno del servidor al reordenar módulos' });
  } finally {
    connection.release();
  }
});

module.exports = router;
