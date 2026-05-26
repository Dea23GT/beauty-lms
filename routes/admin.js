const express = require('express');
const router = express.Router();

router.use('/', require('./admin/cursos'));
router.use('/', require('./admin/lecciones'));
router.use('/', require('./admin/inscripciones'));
router.use('/', require('./admin/cupones'));
router.use('/', require('./admin/usuarios'));
router.use('/', require('./admin/config'));
router.use('/', require('./admin/ventas'));
router.use('/', require('./admin/pasos'));
router.use('/', require('./admin/upload'));

module.exports = router;
