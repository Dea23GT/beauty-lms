const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// --- CONFIGURACIÓN DE BANNER ---

// Guardar o actualizar la configuración del banner promocional
router.put('/config/banner', async (req, res) => {
  const { valor } = req.body;

  if (valor === undefined) {
    return res.status(400).json({ error: 'El valor de la configuración es requerido' });
  }

  try {
    await pool.query(
      `INSERT INTO configuraciones (clave, valor) 
       VALUES ('banner_promocional', ?) 
       ON DUPLICATE KEY UPDATE valor = ?`,
      [valor, valor]
    );

    res.json({ message: 'Configuración del banner guardada con éxito', valor });
  } catch (error) {
    console.error('Error al guardar configuración del banner:', error.message);
    res.status(500).json({ error: 'Error al guardar configuración del banner' });
  }
});

module.exports = router;
