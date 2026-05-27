// Script de validación automatizada de la API - Fase 2
const http = require('http');

const PORT = 3000;
const testEmail = `alumna_${Date.now()}@beautyboutique.com`;
const testPassword = 'AlumnaPassword123!';
const testName = 'Camila Valenzuela';

// Función helper para hacer peticiones HTTP
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando pruebas de validación de endpoints...');
  
  try {
    // 1. Validar listado de cursos
    console.log('\n--- Test 1: Obtener catálogo de cursos (GET /api/cursos) ---');
    const catalogRes = await request('GET', '/api/cursos');
    console.log('Código de estado:', catalogRes.status);
    console.log('Cursos encontrados:', catalogRes.body.length);
    if (catalogRes.status !== 200 || !Array.isArray(catalogRes.body)) {
      throw new Error('El listado de cursos falló');
    }
    console.log('✅ Catálogo verificado con éxito.');

    // 2. Validar detalle de un curso específico
    console.log('\n--- Test 2: Obtener detalle de curso (GET /api/cursos/1) ---');
    const courseRes = await request('GET', '/api/cursos/1');
    console.log('Código de estado:', courseRes.status);
    console.log('Título del curso:', courseRes.body.titulo);
    let lecciones = courseRes.body.lecciones;
    if (!lecciones && courseRes.body.pasos) {
      lecciones = [];
      courseRes.body.pasos.forEach(p => {
        if (p.lecciones) lecciones.push(...p.lecciones);
      });
    }
    console.log('Número de lecciones:', lecciones ? lecciones.length : 0);
    if (courseRes.status !== 200 || !lecciones) {
      throw new Error('El detalle del curso o lecciones falló');
    }
    // Asegurarse de que no se exponga la propiedad "youtube_id" por seguridad
    const hasYoutubeId = lecciones.some(l => l.youtube_id !== undefined);
    if (hasYoutubeId) {
      throw new Error('VULNERABILIDAD: youtube_id expuesto públicamente en catálogo');
    }
    console.log('✅ Detalle de curso verificado (Seguridad de lecciones OK).');

    // 3. Validar registro de usuaria
    console.log('\n--- Test 3: Registro de alumna (POST /api/auth/register) ---');
    const registerRes = await request('POST', '/api/auth/register', {
      nombre: testName,
      correo: testEmail,
      password: testPassword
    });
    console.log('Código de estado:', registerRes.status);
    console.log('Respuesta:', registerRes.body);
    if (registerRes.status !== 201) {
      throw new Error('El registro de usuaria falló');
    }

    console.log('✅ Registro de usuaria verificado con éxito.');

    // 4. Validar login
    console.log('\n--- Test 4: Inicio de sesión (POST /api/auth/login) ---');
    const loginRes = await request('POST', '/api/auth/login', {
      correo: testEmail,
      password: testPassword
    });
    console.log('Código de estado:', loginRes.status);
    console.log('JWT generado:', loginRes.body.token ? 'Sí (Token presente)' : 'No');
    console.log('Datos de usuaria devueltos:', loginRes.body.user);
    if (loginRes.status !== 200 || !loginRes.body.token) {
      throw new Error('El inicio de sesión falló');
    }
    console.log('✅ Inicio de sesión verificado con éxito.');

    console.log('\n🎉 ¡TODOS LOS ENDPOINTS DE LA FASE 2 SE HAN VALIDADO CON ÉXITO! 🎉');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante las pruebas de validación:', error.message);
    process.exit(1);
  }
}

// Dar un pequeño delay para asegurar que el servidor levantó
setTimeout(runTests, 1000);
