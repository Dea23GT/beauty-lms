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

// Obtener todos los banners (incluyendo inactivos)
router.get('/config/banners', async (req, res) => {
  try {
    const [config] = await pool.query(
      'SELECT valor FROM configuraciones WHERE clave = ?',
      ['banners_list']
    );

    if (config.length === 0) {
      // Intentar migrar el banner antiguo si existe
      const [oldBanner] = await pool.query(
        'SELECT valor FROM configuraciones WHERE clave = ?',
        ['banner_promocional']
      );
      const text = oldBanner.length > 0 ? oldBanner[0].valor : '';
      const initialBanners = text ? [{ texto: text, activo: true }] : [];
      return res.json({ banners: initialBanners });
    }

    res.json({ banners: JSON.parse(config[0].valor) });
  } catch (error) {
    console.error('❌ Error al obtener banners:', error.message);
    res.status(500).json({ error: 'Error al obtener banners' });
  }
});

// Guardar o actualizar la lista de banners
router.put('/config/banners', async (req, res) => {
  const { banners } = req.body;

  if (!Array.isArray(banners)) {
    return res.status(400).json({ error: 'El parámetro banners debe ser un arreglo' });
  }

  try {
    // 1. Guardar la lista completa como JSON
    const jsonStr = JSON.stringify(banners);
    await pool.query(
      `INSERT INTO configuraciones (clave, valor) 
       VALUES ('banners_list', ?) 
       ON DUPLICATE KEY UPDATE valor = ?`,
      [jsonStr, jsonStr]
    );

    // 2. Unir los banners activos y guardarlo en la clave compatible antigua
    const activeBannersText = banners
      .filter(b => b.activo)
      .map(b => b.texto)
      .join('   📢   ');

    await pool.query(
      `INSERT INTO configuraciones (clave, valor) 
       VALUES ('banner_promocional', ?) 
       ON DUPLICATE KEY UPDATE valor = ?`,
      [activeBannersText, activeBannersText]
    );

    res.json({ 
      message: 'Configuración de banners guardada con éxito', 
      banners,
      valor: activeBannersText 
    });
  } catch (error) {
    console.error('❌ Error al guardar banners:', error.message);
    res.status(500).json({ error: 'Error al guardar configuración de banners' });
  }
});

module.exports = router;
