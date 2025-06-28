const request = require('supertest');
const { Pool } = require('pg'); // Usamos el driver de PostgreSQL

// La URL base de nuestra aplicación corriendo en Docker
const APP_URL = 'http://localhost:3000';

// Configuración para conectarnos directamente a la BD de pruebas PostgreSQL
const dbConfig = {
  host: '127.0.0.1',
  port: 5433, // El puerto que expusimos en el docker-compose.test.yml
  user: 'test_user',
  password: 'testpassword',
  database: 'test_db_integration'
};

let pool;

// Suite de pruebas de integración
describe('Integration Tests for Tasks with PostgreSQL', () => {

  // Antes de todas las pruebas, creamos el pool de conexiones
  beforeAll(() => {
    pool = new Pool(dbConfig);
  });

  // Después de cada prueba, limpiamos la tabla de tareas
  afterEach(async () => {
    // TRUNCATE ... RESTART IDENTITY es el comando correcto para PostgreSQL
    await pool.query('TRUNCATE TABLE tasks RESTART IDENTITY;');
  });
  
  // Al final de todo, cerramos el pool de conexiones
  afterAll(async () => {
    await pool.end();
  });

  it('should create a task, save it to the database, and display it', async () => {
    // 1. Crear una nueva tarea a través de la API
    const response = await request(APP_URL)
      .post('/tasks')
      .type('form')
      .send({ title: 'Integration Test Task (PG)', description: 'This is a real PG DB test' });

    // Verificamos que la API nos redirige
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');

    // 2. Verificar que la tarea fue creada en la base de datos
    const dbResult = await pool.query('SELECT * FROM tasks WHERE title = $1', ['Integration Test Task (PG)']);
    
    // En pg, los resultados están en la propiedad 'rows'
    expect(dbResult.rows).toHaveLength(1);
    expect(dbResult.rows[0].description).toBe('This is a real PG DB test');

    // 3. Verificar que la tarea se muestra en la página principal
    const getResponse = await request(APP_URL).get('/');
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.text).toContain('Integration Test Task (PG)');
  });
});
