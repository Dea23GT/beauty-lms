const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// --- REPORTES Y VENTAS ---

// Obtener todas las ventas registradas
router.get('/ventas', async (req, res) => {
  try {
    const [ventas] = await pool.query(`
      SELECT v.id, v.usuario_id, v.curso_id, v.precio_pagado, v.metodo_pago, v.referencia, v.fecha_venta,
             u.nombre AS usuario_nombre, u.correo AS usuario_correo,
             c.titulo AS curso_titulo
      FROM ventas v
      JOIN usuarios u ON v.usuario_id = u.id
      JOIN cursos c ON v.curso_id = c.id
      ORDER BY v.fecha_venta DESC
    `);
    res.json(ventas);
  } catch (error) {
    console.error('Error al listar ventas para admin:', error.message);
    res.status(500).json({ error: 'Error al listar ventas' });
  }
});

// Obtener estadísticas y reportes de ventas
router.get('/reportes/ventas', async (req, res) => {
  try {
    // 1. Ingresos totales y cantidad total de ventas
    const [totalesQuery] = await pool.query(`
      SELECT 
        COALESCE(SUM(precio_pagado), 0) AS ingresos_totales,
        COUNT(*) AS total_ventas
      FROM ventas
    `);
    const { ingresos_totales, total_ventas } = totalesQuery[0];

    // 2. Ventas por curso
    const [porCurso] = await pool.query(`
      SELECT 
        c.id AS curso_id,
        c.titulo AS curso_titulo,
        COUNT(v.id) AS cantidad_ventas,
        COALESCE(SUM(v.precio_pagado), 0) AS ingresos
      FROM cursos c
      LEFT JOIN ventas v ON c.id = v.curso_id
      GROUP BY c.id, c.titulo
      ORDER BY ingresos DESC
    `);

    // 3. Ventas por método de pago
    const [porMetodo] = await pool.query(`
      SELECT 
        metodo_pago,
        COUNT(*) AS cantidad_ventas,
        COALESCE(SUM(precio_pagado), 0) AS ingresos
      FROM ventas
      GROUP BY metodo_pago
      ORDER BY ingresos DESC
    `);

    res.json({
      ingresos_totales: parseFloat(ingresos_totales),
      total_ventas: parseInt(total_ventas, 10),
      por_curso: porCurso.map(item => ({
        ...item,
        cantidad_ventas: parseInt(item.cantidad_ventas, 10),
        ingresos: parseFloat(item.ingresos)
      })),
      por_metodo: porMetodo.map(item => ({
        ...item,
        cantidad_ventas: parseInt(item.cantidad_ventas, 10),
        ingresos: parseFloat(item.ingresos)
      }))
    });
  } catch (error) {
    console.error('Error al obtener reportes de ventas:', error.message);
    res.status(500).json({ error: 'Error al obtener reportes de ventas' });
  }
});

module.exports = router;
