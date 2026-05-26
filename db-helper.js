const { pool } = require('./config/db');
const action = process.argv[2];
const email = process.argv[3];
const cursoId = process.argv[4];

async function run() {
  try {
    if (action === 'enroll') {
      const [users] = await pool.query('SELECT id FROM usuarios WHERE correo = ?', [email]);
      if (users.length === 0) {
        console.error('Error: User not found');
        process.exit(1);
      }
      const userId = users[0].id;
      await pool.query(
        'INSERT INTO inscripciones (usuario_id, curso_id, es_activo) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE es_activo = 1',
        [userId, cursoId]
      );
      console.log(`Success: Enrolled user ${userId} in course ${cursoId}`);
      process.exit(0);
    } else if (action === 'promote') {
      await pool.query('UPDATE usuarios SET rol = "admin" WHERE correo = ?', [email]);
      console.log(`Success: Promoted user ${email} to admin`);
      process.exit(0);
    } else if (action === 'cleanup') {
      await pool.query('DELETE FROM inscripciones');
      await pool.query('DELETE FROM usuarios WHERE correo LIKE "test_%"');
      console.log('Success: Cleaned up test data');
      process.exit(0);
    } else {
      console.error('Error: Unknown action');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error executing database operation:', err.message);
    process.exit(1);
  }
}

run();
