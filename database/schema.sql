-- Creación de la estructura relacional estricta para Beauty LMS

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol` ENUM('admin', 'alumna') NOT NULL DEFAULT 'alumna',
  `verificado` BOOLEAN NOT NULL DEFAULT FALSE,
  `token_verificacion` VARCHAR(6) NULL,
  `token_verificacion_expira` DATETIME NULL,
  `metodo_verificacion` VARCHAR(20) DEFAULT 'correo',
  `requiere_cambio_password` BOOLEAN NOT NULL DEFAULT FALSE,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_correo_unico` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Cursos
CREATE TABLE IF NOT EXISTS `cursos` (
  `id` INT AUTO_INCREMENT,
  `titulo` VARCHAR(150) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `precio` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `miniatura_url` VARCHAR(2083) NOT NULL,
  `trailer_youtube_id` VARCHAR(50) DEFAULT 'dQw4w9WgXcQ',
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Lecciones
-- Tabla de Pasos (Secciones de un Curso)
CREATE TABLE IF NOT EXISTS `pasos` (
  `id` INT AUTO_INCREMENT,
  `curso_id` INT NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `descripcion` TEXT NULL,
  `miniatura_url` VARCHAR(2083) NULL,
  `orden` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_pasos_cursos` 
    FOREIGN KEY (`curso_id`) 
    REFERENCES `cursos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Lecciones
CREATE TABLE IF NOT EXISTS `lecciones` (
  `id` INT AUTO_INCREMENT,
  `curso_id` INT NOT NULL,
  `paso_id` INT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `orden` INT NOT NULL DEFAULT 1,
  `youtube_id` VARCHAR(50) NOT NULL,
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_lecciones_cursos` 
    FOREIGN KEY (`curso_id`) 
    REFERENCES `cursos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_lecciones_pasos` 
    FOREIGN KEY (`paso_id`) 
    REFERENCES `pasos` (`id`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Inscripciones (Relación Muchos a Muchos entre Usuarios y Cursos)
CREATE TABLE IF NOT EXISTS `inscripciones` (
  `id` INT AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `curso_id` INT NOT NULL,
  `es_activo` BOOLEAN NOT NULL DEFAULT FALSE,
  `fecha_inscripcion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_usuario_curso_unico` (`usuario_id`, `curso_id`),
  CONSTRAINT `fk_inscripciones_usuarios` 
    FOREIGN KEY (`usuario_id`) 
    REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_inscripciones_cursos` 
    FOREIGN KEY (`curso_id`) 
    REFERENCES `cursos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Progreso de Lecciones
CREATE TABLE IF NOT EXISTS `progreso_lecciones` (
  `id` INT AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `leccion_id` INT NOT NULL,
  `completado` BOOLEAN NOT NULL DEFAULT TRUE,
  `fecha_completado` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_usuario_leccion` (`usuario_id`, `leccion_id`),
  CONSTRAINT `fk_progreso_usuarios` 
    FOREIGN KEY (`usuario_id`) 
    REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_progreso_lecciones` 
    FOREIGN KEY (`leccion_id`) 
    REFERENCES `lecciones` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Códigos Promocionales (Cupones)
CREATE TABLE IF NOT EXISTS `codigos_promocionales` (
  `id` INT AUTO_INCREMENT,
  `codigo` VARCHAR(50) NOT NULL,
  `tipo` ENUM('gratis', 'descuento') NOT NULL DEFAULT 'descuento',
  `descuento_porcentaje` DECIMAL(5, 2) DEFAULT 0.00,
  `curso_id` INT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `fecha_expiracion` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_codigo_unico` (`codigo`),
  CONSTRAINT `fk_codigos_cursos` 
    FOREIGN KEY (`curso_id`) 
    REFERENCES `cursos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Configuraciones Globales
CREATE TABLE IF NOT EXISTS `configuraciones` (
  `clave` VARCHAR(50) NOT NULL,
  `valor` TEXT NOT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Ventas (Ingresos y Reportería)
CREATE TABLE IF NOT EXISTS `ventas` (
  `id` INT AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `curso_id` INT NOT NULL,
  `precio_pagado` DECIMAL(10, 2) NOT NULL,
  `metodo_pago` VARCHAR(50) NOT NULL,
  `referencia` VARCHAR(100) NULL,
  `fecha_venta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ventas_usuarios` 
    FOREIGN KEY (`usuario_id`) 
    REFERENCES `usuarios` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ventas_cursos` 
    FOREIGN KEY (`curso_id`) 
    REFERENCES `cursos` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
