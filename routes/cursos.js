const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');

// Obtener catálogo de cursos (Público)
router.get('/', async (req, res) => {
  try {
    const [cursos] = await pool.query(
      'SELECT id, titulo, descripcion, precio, miniatura_url, trailer_youtube_id FROM cursos ORDER BY id ASC'
    );
    res.json(cursos);
  } catch (error) {
    console.error('❌ Error al obtener catálogo de cursos:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo recuperar la lista de cursos'
    });
  }
});

// Obtener texto de la barra promocional superior (Público)
router.get('/config/banner', async (req, res) => {
  try {
    const [config] = await pool.query(
      'SELECT valor FROM configuraciones WHERE clave = ?',
      ['banner_promocional']
    );
    
    if (config.length === 0) {
      return res.json({ valor: '' });
    }
    
    res.json({ valor: config[0].valor });
  } catch (error) {
    console.error('❌ Error al obtener configuración del banner:', error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo recuperar la configuración del banner'
    });
  }
});

// Obtener detalle de un curso específico y sus lecciones agrupadas por pasos (Público)
// NOTA DE SEGURIDAD: Este endpoint NO incluye los campos youtube_id de las lecciones,
// ya que esos se validarán de forma estricta en la Fase 3 tras verificar la inscripción activa.
router.get('/:id', async (req, res) => {
  const cursoId = req.params.id;

  try {
    // 1. Obtener datos del curso
    const [cursos] = await pool.query(
      'SELECT id, titulo, descripcion, precio, miniatura_url, trailer_youtube_id FROM cursos WHERE id = ?',
      [cursoId]
    );

    if (cursos.length === 0) {
      return res.status(404).json({
        error: 'No encontrado',
        message: 'El curso especificado no existe'
      });
    }

    const curso = cursos[0];

    // 2. Obtener los pasos
    const [pasos] = await pool.query(
      'SELECT id, titulo, descripcion, miniatura_url, orden FROM pasos WHERE curso_id = ? ORDER BY orden ASC',
      [cursoId]
    );

    // 3. Obtener la lista de lecciones del curso (títulos y orden, excluyendo youtube_id)
    const [lecciones] = await pool.query(
      'SELECT id, paso_id, titulo, orden FROM lecciones WHERE curso_id = ? ORDER BY orden ASC',
      [cursoId]
    );

    // Agrupar lecciones por paso
    const pasosMapeados = pasos.map(paso => {
      return {
        id: paso.id,
        titulo: paso.titulo,
        orden: paso.orden,
        descripcion: paso.descripcion,
        miniatura_url: paso.miniatura_url,
        lecciones: lecciones.filter(l => l.paso_id === paso.id)
      };
    });

    // Agregar lecciones que no pertenezcan a ningún paso por seguridad/retrocompatibilidad
    const leccionesSinPaso = lecciones.filter(l => l.paso_id === null);
    if (leccionesSinPaso.length > 0) {
      pasosMapeados.push({
        id: null,
        titulo: 'Otras Lecciones',
        orden: 999,
        lecciones: leccionesSinPaso
      });
    }

    res.json({
      ...curso,
      pasos: pasosMapeados
    });

  } catch (error) {
    console.error(`❌ Error al obtener detalle del curso ${cursoId}:`, error.message);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo recuperar la información del curso'
    });
  }
});

module.exports = router;
