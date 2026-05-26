const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'beauty_lms';

async function init() {
  console.log('🔄 Iniciando inicialización de la base de datos...');

  // 1. Conexión inicial sin base de datos para crearla si no existe
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword
    });

    console.log(`🔨 Creando base de datos "${dbName}"...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    await connection.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.end();
  } catch (error) {
    console.error('❌ Error al verificar/crear la base de datos:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }

  // 2. Conectarse a la base de datos específica habilitando múltiples sentencias
  try {
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      multipleStatements: true // Habilitar ejecución de archivos .sql completos
    });

    // 3. Ejecutar schema.sql
    console.log('📖 Cargando tablas desde schema.sql...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('✅ Tablas creadas con éxito.');

    // 4. Ejecutar seed.sql
    console.log('🌱 Insertando datos semilla desde seed.sql...');
    const seedPath = path.join(__dirname, 'database', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await connection.query(seedSql);
      console.log('✅ Datos semilla insertados con éxito.');
    } else {
      console.log('⚠️ No se encontró el archivo seed.sql, omitiendo datos semilla.');
    }

    await connection.end();
    console.log('🎉 Inicialización de Base de Datos completada exitosamente.');
  } catch (error) {
    console.error('❌ Error durante la ejecución del script SQL:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

init();
