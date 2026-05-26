const mysql = require('mysql2/promise');
require('dotenv').config(); // Asegura carga de variables de entorno si se usa fuera de app.js

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'beauty_lms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función auxiliar para verificar la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a la base de datos MySQL establecida correctamente.');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos MySQL:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection
};
