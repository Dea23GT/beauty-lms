const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const bcrypt = require('bcryptjs');

// --- LECTURA DE USUARIOS ---

// 1. Obtener lista de usuarias registradas
router.get('/usuarios', async (req, res) => {
  try {
    const [usuarios] = await pool.query(
      'SELECT id, nombre, correo, rol, fecha_creacion FROM usuarios ORDER BY id DESC'
    );
    res.json(usuarios);
  } catch (error) {
    console.error('Error al listar usuarios para admin:', error.message);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
});

// --- GESTIÓN DE CURSOS POR USUARIO ---

// 1. Obtener cursos del catálogo con indicación de si la usuaria está inscrita
router.get('/usuarios/:id/cursos', async (req, res) => {
  const usuarioId = req.params.id;

  try {
    // Validar que el usuario exista
    const [usuarios] = await pool.query('SELECT id, nombre FROM usuarios WHERE id = ?', [usuarioId]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [cursos] = await pool.query(
      `SELECT c.id, c.titulo, c.precio, i.es_activo AS inscrito 
       FROM cursos c
       LEFT JOIN inscripciones i ON c.id = i.curso_id AND i.usuario_id = ?
       ORDER BY c.id ASC`,
      [usuarioId]
    );

    res.json(cursos);
  } catch (error) {
    console.error('Error al obtener cursos del usuario:', error.message);
    res.status(500).json({ error: 'Error al obtener cursos de la usuaria' });
  }
});

// 2. Asignar/Inscribir a una usuaria en un curso
router.post('/usuarios/:id/cursos', async (req, res) => {
  const usuarioId = req.params.id;
  const { curso_id, precio_pagado, metodo_pago, referencia } = req.body;

  if (!curso_id) {
    return res.status(400).json({ error: 'El curso_id es requerido' });
  }

  try {
    // Verificar que el usuario exista
    const [usuarios] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [usuarioId]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que el curso exista
    const [cursos] = await pool.query('SELECT id, precio FROM cursos WHERE id = ?', [curso_id]);
    if (cursos.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    const curso = cursos[0];
    const precioPagado = precio_pagado !== undefined ? parseFloat(precio_pagado) : curso.precio;
    const metodoPago = metodo_pago || 'Gratis';
    const refVal = referencia || null;

    // Realizar upsert de inscripción
    await pool.query(
      `INSERT INTO inscripciones (usuario_id, curso_id, es_activo) 
       VALUES (?, ?, 1) 
       ON DUPLICATE KEY UPDATE es_activo = 1`,
      [usuarioId, parseInt(curso_id, 10)]
    );

    // Registrar venta
    await pool.query(
      `INSERT INTO ventas (usuario_id, curso_id, precio_pagado, metodo_pago, referencia)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, parseInt(curso_id, 10), precioPagado, metodoPago, refVal]
    );

    res.json({ message: 'Curso asignado con éxito y venta registrada' });
  } catch (error) {
    console.error('Error al asignar curso a usuario:', error.message);
    res.status(500).json({ error: 'Error al asignar curso' });
  }
});

// 3. Revocar/Eliminar inscripción de una usuaria en un curso
router.delete('/usuarios/:id/cursos/:cursoId', async (req, res) => {
  const usuarioId = req.params.id;
  const cursoId = req.params.cursoId;

  try {
    const [result] = await pool.query(
      'DELETE FROM inscripciones WHERE usuario_id = ? AND curso_id = ?',
      [usuarioId, cursoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'El usuario no tiene una inscripción a este curso' });
    }

    res.json({ message: 'Curso revocado con éxito' });
  } catch (error) {
    console.error('Error al revocar curso de usuario:', error.message);
    res.status(500).json({ error: 'Error al revocar curso' });
  }
});

// 4. Reiniciar contraseña de una usuaria (Genera contraseña temporal y exige cambio en login)
router.put('/usuarios/:id/password-reset', async (req, res) => {
  const usuarioId = req.params.id;

  try {
    // Verificar que el usuario exista
    const [usuarios] = await pool.query('SELECT id, nombre, correo FROM usuarios WHERE id = ?', [usuarioId]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generar contraseña temporal segura que cumpla las reglas OWASP
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "@$!%*?&_";
    const all = uppercase + lowercase + numbers + special;
    
    let tempPassword = "";
    tempPassword += uppercase[Math.floor(Math.random() * uppercase.length)];
    tempPassword += lowercase[Math.floor(Math.random() * lowercase.length)];
    tempPassword += numbers[Math.floor(Math.random() * numbers.length)];
    tempPassword += special[Math.floor(Math.random() * special.length)];
    
    for (let i = 0; i < 8; i++) {
      tempPassword += all[Math.floor(Math.random() * all.length)];
    }
    
    // Mezclar
    tempPassword = tempPassword.split('').sort(() => 0.5 - Math.random()).join('');

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    // Actualizar en base de datos marcando que requiere cambio
    await pool.query(
      'UPDATE usuarios SET password_hash = ?, requiere_cambio_password = 1 WHERE id = ?',
      [passwordHash, usuarioId]
    );

    res.json({
      success: true,
      message: 'Contraseña reiniciada con éxito',
      passwordTemporal: tempPassword
    });

  } catch (error) {
    console.error('Error al reiniciar contraseña de usuario:', error.message);
    res.status(500).json({ error: 'Error al reiniciar contraseña' });
  }
});

module.exports = router;

