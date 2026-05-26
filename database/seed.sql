-- Datos semilla iniciales para probar Blush Pro Academy

-- Usuarios predeterminados para validación (verificados por defecto para no romper tests)
-- Contraseña admin@beauty.com: admin123
-- Contraseña alumna@beauty.com: alumna123
INSERT INTO `usuarios` (`id`, `nombre`, `correo`, `password_hash`, `rol`, `verificado`) VALUES
(1, 'Administradora Blush', 'admin@beauty.com', '$2b$10$CsWsnFwL4ZCpNimvwRmwteomJZjhQAIY2GK5siTE7lBqjc7.x08ay', 'admin', 1),
(2, 'Alumna de Prueba', 'alumna@beauty.com', '$2b$10$y/ivJ92NoqHuE7UzA1wI8OOTxI2TeF8tPf6MMTwipFG4myqSt2s5S', 'alumna', 1);

-- Cursos de Prueba (Blush Pro Academy)
INSERT INTO `cursos` (`id`, `titulo`, `descripcion`, `precio`, `miniatura_url`, `trailer_youtube_id`) VALUES
(1, 'Masterclass en Maquillaje Editorial', 'Aprende las técnicas más avanzadas para pasarelas, sesiones fotográficas y producciones de alta costura.', 49.99, 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=600', 'dQw4w9WgXcQ'),
(2, 'Colorimetría Avanzada para Estilistas', 'Entiende los secretos del círculo cromático, reflejos y matices para un tinte perfecto en cabello.', 79.99, 'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600', 'kJQP7kiw5Fk'),
(3, 'Cuidado de la Piel: Rutinas y Skincare Pro', 'Guía completa sobre tipos de piel, principios activos y diseño de tratamientos faciales.', 29.99, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600', '9bZkp7q19f0'),
(4, 'Maquillaje de Novias: El Día Perfecto', 'Especialízate en looks nupciales duraderos, fotografía de bodas y atención personalizada.', 59.99, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600', 'dQw4w9WgXcQ'),
(5, 'Diseño de Cejas y Pestañas HD', 'Aprende visagismo, depilación con hilo, tinte de cejas con henna y la técnica perfecta de laminado y lifting.', 149.99, 'https://images.unsplash.com/photo-1522337094189-6a922644babc?q=80&w=600', 'dQw4w9WgXcQ'),
(6, 'Uñas Acrílicas y Nail Art Premium', 'Domina el esculpido en acrílico, aplicación de tips, encapsulado y las tendencias de decoración más cotizadas.', 199.99, 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=600', 'kJQP7kiw5Fk');

-- Pasos para los cursos
INSERT INTO `pasos` (`id`, `curso_id`, `titulo`, `orden`) VALUES
(1, 1, 'Fundamentos y Preparación', 1),
(2, 1, 'Técnicas de Aplicación', 2),
(3, 2, 'Teoría del Color', 1),
(4, 2, 'Práctica en Modelos', 2),
(5, 3, 'Tipos de Piel', 1),
(6, 4, 'Consultoría y Pruebas', 1),
(7, 4, 'Look de Día y de Noche', 2),
(8, 5, 'Visagismo y Diseño', 1),
(9, 6, 'Preparación y Esculpido', 1);

-- Lecciones para Curso 1 (Masterclass en Maquillaje Editorial)
INSERT INTO `lecciones` (`id`, `curso_id`, `paso_id`, `titulo`, `orden`, `youtube_id`) VALUES
(1, 1, 1, 'Introducción al Maquillaje Editorial y Herramientas', 1, 'dQw4w9WgXcQ'),
(2, 1, 1, 'Preparación de la Piel y Efecto Glow', 2, '9bZkp7q19f0'),
(3, 1, 2, 'Diseño de Cejas y Ojos Dramáticos', 3, 'kJQP7kiw5Fk');

-- Lecciones para Curso 2 (Colorimetría Avanzada)
INSERT INTO `lecciones` (`id`, `curso_id`, `paso_id`, `titulo`, `orden`, `youtube_id`) VALUES
(4, 2, 3, 'Bases de la Colorimetría Capilar', 1, 'dQw4w9WgXcQ'),
(5, 2, 3, 'Formulación de Tintes y Oxidantes', 2, 'kJQP7kiw5Fk'),
(6, 2, 4, 'Técnica Balayage Paso a Paso', 3, '9bZkp7q19f0');

-- Lecciones para Curso 3 (Skincare)
INSERT INTO `lecciones` (`id`, `curso_id`, `paso_id`, `titulo`, `orden`, `youtube_id`) VALUES
(7, 3, 5, 'Anatomía de la Piel and Tipologías', 1, '9bZkp7q19f0'),
(8, 3, 5, 'Rutina Diaria e Ingredientes Activos', 2, 'dQw4w9WgXcQ');

-- Lecciones para Curso 4 (Maquillaje de Novias)
INSERT INTO `lecciones` (`id`, `curso_id`, `paso_id`, `titulo`, `orden`, `youtube_id`) VALUES
(9, 4, 6, 'Entrevista de Diagnóstico con la Novia', 1, 'kJQP7kiw5Fk'),
(10, 4, 7, 'Maquillaje Clásico Nupcial (Día)', 2, 'dQw4w9WgXcQ'),
(11, 4, 7, 'Intensificación del Look para Recepción (Noche)', 3, '9bZkp7q19f0');

-- Lecciones para Curso 5 (Diseño de Cejas y Pestañas HD)
INSERT INTO `lecciones` (`id`, `curso_id`, `paso_id`, `titulo`, `orden`, `youtube_id`) VALUES
(12, 5, 8, 'Introducción al Visagismo de Cejas', 1, 'dQw4w9WgXcQ'),
(13, 5, 8, 'Laminado de Cejas Paso a Paso', 2, '9bZkp7q19f0');

-- Lecciones para Curso 6 (Uñas Acrílicas y Nail Art Premium)
INSERT INTO `lecciones` (`id`, `curso_id`, `paso_id`, `titulo`, `orden`, `youtube_id`) VALUES
(14, 6, 9, 'Preparación Física y Química de la Uña', 1, 'kJQP7kiw5Fk'),
(15, 6, 9, 'Técnica de Reversa y Encapsulado', 2, 'dQw4w9WgXcQ');

-- Inscripciones Iniciales (Alumna inscrita en varios cursos según compras históricas)
INSERT INTO `inscripciones` (`usuario_id`, `curso_id`, `es_activo`) VALUES
(2, 1, 1),
(2, 3, 1),
(2, 4, 1),
(2, 2, 1);

-- Códigos Promocionales Semilla
INSERT INTO `codigos_promocionales` (`id`, `codigo`, `tipo`, `descuento_porcentaje`, `curso_id`, `activo`, `fecha_expiracion`) VALUES
(1, 'BELLEZAFREE', 'gratis', 0.00, NULL, 1, NULL),
(2, 'BELLEZA50', 'descuento', 50.00, 2, 1, NULL),
(3, 'NOVIA30', 'descuento', 30.00, 4, 1, NULL),
(4, 'GLOBAL10', 'descuento', 10.00, NULL, 1, NULL);

-- Configuraciones Iniciales
INSERT INTO `configuraciones` (`clave`, `valor`) VALUES
('banner_promocional', '🎉 ¡Gran Apertura! Usa el código BELLEZA50 para obtener un 50% de descuento en el curso de Colorimetría Capilar.');

-- Ventas Semilla (Para visualización en el dashboard administrativo)
INSERT INTO `ventas` (`id`, `usuario_id`, `curso_id`, `precio_pagado`, `metodo_pago`, `referencia`, `fecha_venta`) VALUES
(1, 2, 1, 49.99, 'tarjeta', 'REF-92841029', '2026-05-18 10:15:30'),
(2, 2, 3, 29.99, 'transferencia', 'BOLETA-882910', '2026-05-20 14:22:45'),
(3, 2, 4, 59.99, 'visalink', 'VL-33921820', '2026-05-21 09:05:12'),
(4, 2, 2, 39.99, 'gratis', 'CUPON-BELLEZA50', '2026-05-22 11:30:00');
