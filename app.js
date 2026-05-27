const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR FATAL: La variable de entorno JWT_SECRET no está configurada en el archivo .env.');
  process.exit(1);
}

const { testConnection } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar cabeceras de seguridad con Helmet (sin CSP restrictivo para no romper YouTube e iconos)
app.use(helmet({
  contentSecurityPolicy: false
}));

// Configuración restrictiva de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Permitir peticiones locales o de scripts de consola
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por políticas CORS de Blush Pro Academy'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Limitación de tasa para endpoints sensibles (Previene fuerza bruta y abuso de registro)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 20 : 1000, // aumentar límite en desarrollo/test
  message: {
    error: 'Demasiadas peticiones',
    message: 'Se han realizado demasiados intentos desde esta dirección IP. Intente de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API
const authRouter = require('./routes/auth');
const cursosRouter = require('./routes/cursos');
const leccionesRouter = require('./routes/lecciones');
const pagosRouter = require('./routes/pagos');
const adminRouter = require('./routes/admin');
const progresoRouter = require('./routes/progreso');
const { verificarToken, verificarRol } = require('./middleware/auth');

app.use('/api/auth', authRouter);
app.use('/api/cursos', cursosRouter);
app.use('/api/lecciones', leccionesRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/progreso', verificarToken, progresoRouter);
app.use('/api/admin', verificarToken, verificarRol(['admin']), adminRouter);






// Endpoint de Salud y Verificación de Conexión de BD
app.get('/api/health', async (req, res, next) => {
  try {
    await testConnection();
    res.json({
      status: 'UP',
      timestamp: new Date(),
      services: {
        database: 'OK',
        server: 'OK'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date(),
      services: {
        database: 'ERROR',
        server: 'OK'
      },
      error: error.message
    });
  }
});

// Manejo de Rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Ruta no encontrada'
  });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error no controlado en la aplicación:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Inicializar Servidor e Intentar conectar a la BD
async function startServer() {
  try {
    console.log('🔄 Probando conexión a la base de datos antes de iniciar...');
    await testConnection();

    // Migración automática de esquema (Añadir token_verificacion_expira si no existe)
    const { pool } = require('./config/db');
    try {
      console.log('🔄 Verificando esquema de la base de datos (usuarios)...');
      await pool.query("ALTER TABLE `usuarios` ADD COLUMN `token_verificacion_expira` DATETIME NULL AFTER `token_verificacion`");
      console.log('✅ Base de datos actualizada: columna token_verificacion_expira añadida.');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && !err.message.includes('duplicate') && !err.message.includes('already exists')) {
        console.warn('⚠️ Advertencia en migración de base de datos (usuarios):', err.message);
      }
    }

    // Migración automática de esquema para la tabla `pasos` (añadir descripción e imagen)
    try {
      console.log('🔄 Verificando esquema de la base de datos (pasos - descripcion)...');
      await pool.query("ALTER TABLE `pasos` ADD COLUMN `descripcion` TEXT NULL AFTER `titulo`");
      console.log('✅ Base de datos actualizada: columna descripcion añadida a pasos.');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && !err.message.includes('duplicate') && !err.message.includes('already exists')) {
        console.warn('⚠️ Advertencia en migración de base de datos (pasos - descripcion):', err.message);
      }
    }

    try {
      console.log('🔄 Verificando esquema de la base de datos (pasos - miniatura_url)...');
      await pool.query("ALTER TABLE `pasos` ADD COLUMN `miniatura_url` VARCHAR(2083) NULL AFTER `descripcion`");
      console.log('✅ Base de datos actualizada: columna miniatura_url añadida a pasos.');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && !err.message.includes('duplicate') && !err.message.includes('already exists')) {
        console.warn('⚠️ Advertencia en migración de base de datos (pasos - miniatura_url):', err.message);
      }
    }

    try {
      console.log('🔄 Verificando esquema de la base de datos (usuarios - requiere_cambio_password)...');
      await pool.query("ALTER TABLE `usuarios` ADD COLUMN `requiere_cambio_password` BOOLEAN NOT NULL DEFAULT FALSE AFTER `metodo_verificacion`");
      console.log('✅ Base de datos actualizada: columna requiere_cambio_password añadida a usuarios.');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME' && !err.message.includes('duplicate') && !err.message.includes('already exists')) {
        console.warn('⚠️ Advertencia en migración de base de datos (usuarios - requiere_cambio_password):', err.message);
      }
    }

    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor Express iniciado y corriendo en http://localhost:${PORT}`);
      console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ No se pudo iniciar el servidor debido a un fallo en la conexión con la base de datos.');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();

