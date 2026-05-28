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

// Middleware para redirigir URLs con .html a sus versiones limpias (Clean URLs)
app.use((req, res, next) => {
  if (req.method === 'GET') {
    if (req.path.endsWith('/index.html')) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, '/' + query);
    }
    if (req.path.endsWith('.html')) {
      const newPath = req.path.slice(0, -5);
      const query = req.url.slice(req.path.length);
      return res.redirect(301, newPath + query);
    }
  }
  next();
});

// Servir archivos estáticos permitiendo cargar archivos .html sin la extensión en la URL
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html', 'htm']
}));

// Rutas de la API
const authRouter = require('./routes/auth');
const cursosRouter = require('./routes/cursos');
const leccionesRouter = require('./routes/lecciones');
const pagosRouter = require('./routes/pagos');
const adminRouter = require('./routes/admin');
const progresoRouter = require('./routes/progreso');
const blogsRouter = require('./routes/blogs');
const contactoRouter = require('./routes/contacto');
const { verificarToken, verificarRol } = require('./middleware/auth');

app.use('/api/auth', authRouter);
app.use('/api/cursos', cursosRouter);
app.use('/api/lecciones', leccionesRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/blogs', blogsRouter);
app.use('/api/contacto', contactoRouter);
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

    try {
      console.log('🔄 Verificando esquema de la base de datos (blogs)...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS \`blogs\` (
          \`id\` INT AUTO_INCREMENT,
          \`titulo\` VARCHAR(255) NOT NULL,
          \`categoria\` VARCHAR(50) NOT NULL,
          \`extracto\` TEXT NOT NULL,
          \`contenido\` TEXT NOT NULL,
          \`imagen_url\` VARCHAR(2083) NOT NULL,
          \`fecha_creacion\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ Base de datos actualizada: tabla blogs verificada/creada.');
      
      const [blogsCount] = await pool.query('SELECT COUNT(*) AS count FROM `blogs`');
      if (blogsCount[0].count === 0) {
        console.log('🔄 Sembrando blogs iniciales...');
        await pool.query(`
          INSERT INTO \`blogs\` (\`id\`, \`titulo\`, \`categoria\`, \`extracto\`, \`contenido\`, \`imagen_url\`, \`fecha_creacion\`) VALUES
          (1, 'Diseño de Rutina Facial Pro: Identificación de Activos', 'Skincare', 
           'Aprende a combinar principios activos como el ácido hialurónico, retinol y vitamina C sin causar irritaciones, personalizando la rutina según el tipo de piel de tu cliente.', 
           'Para diseñar una rutina facial profesional, es vital identificar el fototipo y estado cutáneo del cliente. Activos clave como la Vitamina C aportan luminosidad por la mañana, mientras que el Retinol estimula la renovación celular por la noche. El ácido hialurónico sirve como puente hidratante de alta absorción y es compatible con la mayoría de ingredientes. Es indispensable educar al cliente en el uso diario de protector solar FPS 50+ de amplio espectro, ya que muchos activos sensibilizan la piel al sol.', 
           'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600', '2026-05-24 12:00:00'),
          (2, 'La Regla de Oro en Colorimetría: Neutralización de Subtonos', 'Colorimetría', 
           'Domina el círculo cromático capilar para formular tonos perfectos. Descubre cómo corregir reflejos no deseados amarillos, naranjas o verdosos en decoloraciones.', 
           'La colorimetría capilar se basa en la neutralización de los reflejos residuales. La regla de oro dicta que los colores opuestos en el círculo cromático se neutralizan entre sí. El tono violeta contrarresta el fondo de aclaración amarillo (nivel 9-10), el azul neutraliza los tonos naranja cobrizos (nivel 7-8), y el rojo contrarresta los tonos verdosos. Al formular, la precisión milimétrica del peróxido y la elección del matizante determinan el éxito del rubio platinado o cenizo perfecto sin maltratar la fibra capilar.', 
           'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=600', '2026-05-18 12:00:00'),
          (3, 'Looks Nupciales 2026: Maquillaje de Novia de Alta Duración', 'Maquillaje', 
           'Secretos profesionales de fijación, preparación de la piel en climas cálidos y técnicas de ojos difuminados elegantes que lucen espectaculares tanto en persona como ante la cámara.', 
           'El maquillaje nupcial moderno exige una preparación de piel impecable. El uso de brumas fijadoras hidratantes, primers siliconados o matificantes según la zona, y la aplicación de bases de cobertura construible a toques garantizan resistencia al sudor y las lágrimas. Para la fotografía digital, es fundamental evitar polvos traslúcidos con flashback y optar por técnicas de ojos difuminados en tonos tierra o rosáceos con pestañas individuales que den una mirada fresca, natural y sofisticada.', 
           'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=600', '2026-05-10 12:00:00');
        `);
        console.log('✅ Blogs iniciales sembrados con éxito.');
      }
    } catch (err) {
      console.warn('⚠️ Advertencia en migración/siembra de base de datos (blogs):', err.message);
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

