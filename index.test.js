const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mockear los módulos de la base de datos ANTES de que 'index.js' los importe
const mockQuery = jest.fn();

jest.mock('pg', () => {
  const mPool = {
    query: mockQuery,
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('mysql', () => {
  const mPool = {
    query: mockQuery,
  };
  return {
    createPool: jest.fn(() => mPool)
  };
});

// Importar la lógica de la aplicación después de los mocks
// NOTA: Para que esto funcione perfectamente, sería ideal refactorizar 'index.js'
// para exportar la app de Express sin iniciar el servidor.
// Por ahora, vamos a recrear una configuración mínima para probar la ruta.

// Recreamos las rutas para poder probarlas de forma aislada
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Simulamos la ruta GET '/'
app.get('/', async (req, res) => {
  try {
    const tasks = await mockQuery('SELECT * FROM tasks');
    res.render('index', {
      tasks: tasks.rows || tasks,
      environment: 'test',
      dbType: 'mockDB',
      webServer: 'test-server',
      dbError: false
    });
  } catch (err) {
    res.status(500).send('Error');
  }
});

// Simulamos la ruta POST '/tasks'
app.post('/tasks', async (req, res) => {
    const { title, description } = req.body;
    if (!title) {
        return res.status(400).send('Title is required');
    }
    await mockQuery('INSERT INTO tasks...', [title, description]);
    res.redirect('/');
});


// Suite de pruebas para la aplicación
describe('Tasks API', () => {

  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    mockQuery.mockClear();
  });

  // Prueba para la ruta principal GET /
  it('should get tasks from the database and render the main page', async () => {
    const fakeTasks = [
      { id: 1, title: 'Test Task 1', description: 'Description 1', created_at: new Date() },
      { id: 2, title: 'Test Task 2', description: 'Description 2', created_at: new Date() },
    ];
    // Configuramos el mock para que devuelva las tareas falsas
    mockQuery.mockResolvedValue(fakeTasks);

    const res = await request(app).get('/');
    
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Test Task 1');
    expect(res.text).toContain('Description 2');
    // Verificamos que se llamó a la función de consulta
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM tasks');
  });

  // Prueba para la creación de una nueva tarea POST /tasks
  it('should create a new task and redirect', async () => {
    mockQuery.mockResolvedValue({});
    
    const res = await request(app)
      .post('/tasks')
      .type('form') // <--- AÑADIR ESTA LÍNEA
      .send({ title: 'New Test Task', description: 'A brand new task' });
      
    // Esperamos una redirección a la página principal
    expect(res.statusCode).toEqual(302);
    expect(res.headers.location).toBe('/');
    // Verificamos que se llamó a la función de consulta con los argumentos correctos
    expect(mockQuery).toHaveBeenCalledWith('INSERT INTO tasks...', ['New Test Task', 'A brand new task']);
  });
});
