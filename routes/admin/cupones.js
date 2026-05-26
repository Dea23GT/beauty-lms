const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');

// --- CRUD CUPONES (CÓDIGOS PROMOCIONALES) ---

// 1. Obtener todos los cupones
router.get('/cupones', async (req, res) => {
  try {
    const [cupones] = await pool.query(`
      SELECT cp.*, c.titulo AS curso_titulo 
      FROM codigos_promocionales cp
      LEFT JOIN cursos c ON cp.curso_id = c.id
      ORDER BY cp.id DESC
    `);
    res.json(cupones);
  } catch (error) {
    console.error('Error al listar cupones:', error.message);
    res.status(500).json({ error: 'Error al listar cupones' });
  }
});

// 2. Crear un nuevo cupón
router.post('/cupones', async (req, res) => {
  const { codigo, tipo, descuento_porcentaje, curso_id, activo, fecha_expiracion } = req.body;

  if (!codigo || !tipo) {
    return res.status(400).json({ error: 'El código y el tipo son obligatorios' });
  }

  try {
    const cursoIdVal = curso_id && curso_id !== '' ? parseInt(curso_id, 10) : null;
    const descuentoVal = tipo === 'gratis' ? 0.00 : parseFloat(descuento_porcentaje || 0);
    const activoVal = activo !== undefined ? (activo ? 1 : 0) : 1;
    const expiracionVal = fecha_expiracion && fecha_expiracion !== '' ? fecha_expiracion : null;

    const [result] = await pool.query(
      `INSERT INTO codigos_promocionales 
       (codigo, tipo, descuento_porcentaje, curso_id, activo, fecha_expiracion) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [codigo.toUpperCase().trim(), tipo, descuentoVal, cursoIdVal, activoVal, expiracionVal]
    );

    res.status(201).json({
      message: 'Cupón creado con éxito',
      cupon: {
        id: result.insertId,
        codigo: codigo.toUpperCase().trim(),
        tipo,
        descuento_porcentaje: descuentoVal,
        curso_id: cursoIdVal,
        activo: activoVal,
        fecha_expiracion: expiracionVal
      }
    });
  } catch (error) {
    console.error('Error al crear cupón:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El código promocional ya existe' });
    }
    res.status(500).json({ error: 'Error al crear el cupón' });
  }
});

// 3. Actualizar un cupón
router.put('/cupones/:id', async (req, res) => {
  const cuponId = req.params.id;
  const { codigo, tipo, descuento_porcentaje, curso_id, activo, fecha_expiracion } = req.body;

  if (!codigo || !tipo) {
    return res.status(400).json({ error: 'El código y el tipo son obligatorios' });
  }

  try {
    const cursoIdVal = curso_id && curso_id !== '' ? parseInt(curso_id, 10) : null;
    const descuentoVal = tipo === 'gratis' ? 0.00 : parseFloat(descuento_porcentaje || 0);
    const activoVal = activo !== undefined ? (activo ? 1 : 0) : 1;
    const expiracionVal = fecha_expiracion && fecha_expiracion !== '' ? fecha_expiracion : null;

    const [result] = await pool.query(
      `UPDATE codigos_promocionales 
       SET codigo = ?, tipo = ?, descuento_porcentaje = ?, curso_id = ?, activo = ?, fecha_expiracion = ? 
       WHERE id = ?`,
      [codigo.toUpperCase().trim(), tipo, descuentoVal, cursoIdVal, activoVal, expiracionVal, cuponId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }

    res.json({
      message: 'Cupón actualizado con éxito',
      cupon: {
        id: parseInt(cuponId, 10),
        codigo: codigo.toUpperCase().trim(),
        tipo,
        descuento_porcentaje: descuentoVal,
        curso_id: cursoIdVal,
        activo: activoVal,
        fecha_expiracion: expiracionVal
      }
    });
  } catch (error) {
    console.error('Error al actualizar cupón:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El código promocional ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar el cupón' });
  }
});

// 4. Eliminar un cupón
router.delete('/cupones/:id', async (req, res) => {
  const cuponId = req.params.id;

  try {
    const [result] = await pool.query('DELETE FROM codigos_promocionales WHERE id = ?', [cuponId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cupón no encontrado' });
    }

    res.json({ message: 'Cupón eliminado con éxito' });
  } catch (error) {
    console.error('Error al eliminar cupón:', error.message);
    res.status(500).json({ error: 'Error al eliminar el cupón' });
  }
});

module.exports = router;
