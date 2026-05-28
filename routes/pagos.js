const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../config/db');
const { verificarToken } = require('../middleware/auth');

// 1. Iniciar flujo de compra (Generar link de checkout simulado)
router.post('/checkout', verificarToken, async (req, res) => {
  const { cursoId } = req.body;
  const usuarioId = req.usuario.id;

  if (!cursoId) {
    return res.status(400).json({ error: 'Falta cursoId' });
  }

  try {
    // Verificar que el curso exista
    const [cursos] = await pool.query('SELECT id, titulo, precio FROM cursos WHERE id = ?', [cursoId]);
    if (cursos.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    const curso = cursos[0];

    // Crear una firma digital de seguridad para prevenir tampering
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'beauty_boutique_webhook_secret_2026';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${usuarioId}:${cursoId}`)
      .digest('hex');

    // Generar la URL de redirección al simulador
    const checkoutUrl = `/checkout-simulador?user_id=${usuarioId}&curso_id=${cursoId}&sig=${signature}`;

    res.json({
      checkoutUrl,
      curso: {
        id: curso.id,
        titulo: curso.titulo,
        precio: curso.precio
      }
    });

  } catch (error) {
    console.error('Error al generar checkout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 2. Webhook asíncrono para notificaciones de pago
router.post('/webhook', async (req, res) => {
  const { user_id, curso_id, sig, status } = req.body;
  
  // Obtener firma / secreto desde cabecera o query
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'beauty_boutique_webhook_secret_2026';
  const clientSecretQuery = req.query.secret;
  const clientSigHeader = req.headers['x-webhook-signature'];

  // Validar autenticidad del webhook
  // Opción A: Secreto simple por URL query (ej. ?secret=...)
  // Opción B: Firma de payload
  let isAutentico = false;

  if (clientSecretQuery === webhookSecret) {
    isAutentico = true;
  } else if (clientSigHeader) {
    // Validar firma enviada en headers con los datos recibidos
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${user_id}:${curso_id}`)
      .digest('hex');
    
    if (clientSigHeader === expectedSig) {
      isAutentico = true;
    }
  }

  if (!isAutentico) {
    return res.status(401).json({
      error: 'No autorizado',
      message: 'Firma o secreto de webhook inválido'
    });
  }

  // Validar campos requeridos
  if (!user_id || !curso_id || !status) {
    return res.status(400).json({
      error: 'Petición incorrecta',
      message: 'Faltan parámetros obligatorios en la notificación'
    });
  }

  try {
    if (status === 'completed') {
      // Realizar upsert de la inscripción activa
      await pool.query(
        `INSERT INTO inscripciones (usuario_id, curso_id, es_activo) 
         VALUES (?, ?, 1) 
         ON DUPLICATE KEY UPDATE es_activo = 1`,
        [parseInt(user_id, 10), parseInt(curso_id, 10)]
      );
      
      console.log(`[WEBHOOK] Pago exitoso procesado para usuario ${user_id} en curso ${curso_id}`);
      return res.json({ success: true, message: 'Inscripción activada con éxito' });
    } else {
      console.log(`[WEBHOOK] Transacción recibida con estado no completado: ${status}`);
      return res.json({ success: false, message: 'Transacción no completada. No se activa inscripción.' });
    }

  } catch (error) {
    console.error('❌ Error en el webhook de pago:', error);
    res.status(500).json({ error: 'Error interno del servidor', message: error.message });
  }
});

// 3. Verificar código promocional
router.post('/verificar-codigo', verificarToken, async (req, res) => {
  const { codigo, curso_id } = req.body;

  if (!codigo || !curso_id) {
    return res.status(400).json({ error: 'Código y curso_id son requeridos' });
  }

  try {
    // 1. Obtener precio del curso
    const [cursos] = await pool.query('SELECT precio, titulo FROM cursos WHERE id = ?', [curso_id]);
    if (cursos.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }
    const curso = cursos[0];
    const precioOriginal = parseFloat(curso.precio);

    // 2. Buscar código promocional
    const [cupones] = await pool.query(
      'SELECT * FROM codigos_promocionales WHERE codigo = ?',
      [codigo]
    );

    if (cupones.length === 0) {
      return res.status(404).json({ error: 'El código promocional no es válido' });
    }

    const cupon = cupones[0];

    // Verificar si está activo
    if (!cupon.activo) {
      return res.status(400).json({ error: 'El código promocional ya no está activo' });
    }

    // Verificar expiración
    if (cupon.fecha_expiracion && new Date(cupon.fecha_expiracion) < new Date()) {
      return res.status(400).json({ error: 'El código promocional ha expirado' });
    }

    // Verificar si está restringido a un curso específico
    if (cupon.curso_id !== null && parseInt(cupon.curso_id, 10) !== parseInt(curso_id, 10)) {
      return res.status(400).json({ error: 'Este código promocional no aplica para este curso' });
    }

    let descuento = 0;
    let precioFinal = precioOriginal;

    if (cupon.tipo === 'gratis') {
      descuento = precioOriginal;
      precioFinal = 0;
    } else if (cupon.tipo === 'descuento') {
      const porcentaje = parseFloat(cupon.descuento_porcentaje);
      descuento = parseFloat(((precioOriginal * porcentaje) / 100).toFixed(2));
      precioFinal = parseFloat((precioOriginal - descuento).toFixed(2));
    }

    res.json({
      valido: true,
      tipo: cupon.tipo,
      descuento,
      descuento_porcentaje: cupon.descuento_porcentaje,
      precioOriginal,
      precioFinal,
      mensaje: cupon.tipo === 'gratis' ? '¡Curso gratis!' : `Descuento del ${cupon.descuento_porcentaje}% aplicado.`
    });

  } catch (error) {
    console.error('Error al verificar código promocional:', error);
    res.status(500).json({ error: 'Error interno del servidor al verificar el código' });
  }
});

// 4. Aplicar código promocional de tipo gratis para inscripción inmediata
router.post('/aplicar-codigo-gratis', verificarToken, async (req, res) => {
  const { codigo, curso_id } = req.body;
  const usuarioId = req.usuario.id;

  if (!codigo || !curso_id) {
    return res.status(400).json({ error: 'Código y curso_id son requeridos' });
  }

  try {
    // 1. Buscar el cupón y verificar validez
    const [cupones] = await pool.query(
      'SELECT * FROM codigos_promocionales WHERE codigo = ?',
      [codigo]
    );

    if (cupones.length === 0) {
      return res.status(404).json({ error: 'El código promocional no es válido' });
    }

    const cupon = cupones[0];

    if (!cupon.activo) {
      return res.status(400).json({ error: 'El código promocional ya no está activo' });
    }

    if (cupon.fecha_expiracion && new Date(cupon.fecha_expiracion) < new Date()) {
      return res.status(400).json({ error: 'El código promocional ha expirado' });
    }

    if (cupon.curso_id !== null && parseInt(cupon.curso_id, 10) !== parseInt(curso_id, 10)) {
      return res.status(400).json({ error: 'Este código promocional no aplica para este curso' });
    }

    if (cupon.tipo !== 'gratis') {
      return res.status(400).json({ error: 'Este endpoint es exclusivo para cupones gratuitos' });
    }

    // 2. Inscribir directamente a la alumna con es_activo = 1
    await pool.query(
      `INSERT INTO inscripciones (usuario_id, curso_id, es_activo) 
       VALUES (?, ?, 1) 
       ON DUPLICATE KEY UPDATE es_activo = 1`,
      [usuarioId, parseInt(curso_id, 10)]
    );

    console.log(`[PAGOS] Cupón gratis ${codigo} aplicado con éxito. Usuaria ${usuarioId} inscrita en curso ${curso_id}`);
    res.json({ success: true, message: 'Inscripción gratuita realizada con éxito' });

  } catch (error) {
    console.error('Error al aplicar código gratuito:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar la inscripción' });
  }
});

module.exports = router;
