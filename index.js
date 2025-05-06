const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

let db;
if (process.env.NODE_ENV === 'production') {
  // PostgreSQL para producción
  const { Pool } = require('pg');
  db = new Pool(dbConfig);
  console.log('Conectado a PostgreSQL en modo producción');
} else {
  // MySQL para desarrollo
  const mysql = require('mysql');
  db = mysql.createPool({
    ...dbConfig,
    insecureAuth: true
  });

  // Convertir las funciones de callback a promesas para mantener consistencia
  const util = require('util');
  db.query = util.promisify(db.query).bind(db);

  console.log('Conectado a MySQL en modo desarrollo');
}

// Configuración de Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Función para intentar la conexión a la base de datos con reintentos
async function connectWithRetry(maxRetries = 25, delay = 15000) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`Intento de conexión a la base de datos ${retries + 1}/${maxRetries}...`);

      if (process.env.NODE_ENV === 'production') {
        // Probar conexión a PostgreSQL
        await db.query('SELECT NOW()');
      } else {
        // Probar conexión a MySQL
        await db.query('SELECT 1');
      }

      console.log('Conexión a la base de datos establecida correctamente');
      return true;
    } catch (err) {
      console.error(`Error al conectar a la base de datos (intento ${retries + 1}):`, err);
      retries++;

      if (retries >= maxRetries) {
        console.error('Número máximo de intentos alcanzado. No se pudo conectar a la base de datos.');
        return false;
      }

      console.log(`Reintentando en ${delay/1000} segundos...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
}

// Inicializar tabla de tareas
async function initializeDatabase() {
  try {
    // Primero intentar conectar con reintentos
    const connected = await connectWithRetry();

    if (!connected) {
      console.error('No se pudo inicializar la base de datos debido a problemas de conexión');
      return false;
    }

    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      await db.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insertar una tarea de ejemplo si la tabla está vacía
      const result = await db.query('SELECT COUNT(*) FROM tasks');
      if (parseInt(result.rows[0].count) === 0) {
        await db.query(
          'INSERT INTO tasks (title, description) VALUES ($1, $2)',
          ['Tarea de ejemplo', 'Esta es una tarea de ejemplo para mostrar que la base de datos funciona correctamente en producción']
        );
        console.log('Tarea de ejemplo creada en PostgreSQL');
      }
    } else {
      // MySQL para desarrollo
      await db.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Insertar una tarea de ejemplo si la tabla está vacía
      const result = await db.query('SELECT COUNT(*) as count FROM tasks');
      const count = result[0]?.count || 0;

      if (count === 0) {
        await db.query(
          'INSERT INTO tasks (title, description) VALUES (?, ?)',
          ['Tarea de ejemplo', 'Esta es una tarea de ejemplo para mostrar que la base de datos funciona correctamente en desarrollo']
        );
        console.log('Tarea de ejemplo creada en MySQL');
      }
    }

    console.log('Base de datos inicializada correctamente');
    return true;
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
    return false;
  }
}

// Rutas - Ruta principal única
app.get('/', async (req, res) => {
  try {
    let tasks = [];
    let dbError = false;

    try {
      if (process.env.NODE_ENV === 'production') {
        // PostgreSQL
        const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
        tasks = result.rows;
      } else {
        // MySQL
        tasks = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
      }
    } catch (dbErr) {
      console.error('Error al obtener tareas de la base de datos:', dbErr);
      dbError = true;
      tasks = [];
    }

    res.render('index', {
      tasks,
      environment: process.env.NODE_ENV,
      dbType: process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'MariaDB',
      webServer: process.env.NODE_ENV === 'production' ? 'Nginx' : 'Traefik',
      dbError
    });
  } catch (err) {
    console.error('Error general al procesar la solicitud:', err);
    res.status(500).send('Error interno del servidor');
  }
});

// Ruta para crear nuevas tareas
app.post('/tasks', async (req, res) => {
  const { title, description } = req.body;

  try {
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      await db.query(
        'INSERT INTO tasks (title, description) VALUES ($1, $2)',
        [title, description]
      );
    } else {
      // MySQL
      await db.query(
        'INSERT INTO tasks (title, description) VALUES (?, ?)',
        [title, description]
      );
    }

    res.redirect('/');
  } catch (err) {
    console.error('Error al crear tarea:', err);
    res.status(500).send('Error al crear la tarea');
  }
});

// Iniciar servidor
const startServer = async () => {
  const dbInitialized = await initializeDatabase();

  app.listen(port, () => {
    console.log(`Servidor ejecutándose en el puerto ${port}`);
    console.log(`Entorno: ${process.env.NODE_ENV}`);
    console.log(`Base de datos inicializada correctamente: ${dbInitialized ? 'Sí' : 'No'}`);
  });
};

startServer();
