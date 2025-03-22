const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Base de datos
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
  const mysql = require('mysql2/promise');
  db = mysql.createPool(dbConfig);
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
          ['Tarea de ejemplo', 'Esta es una tarea de ejemplo para mostrar que la base de datos funciona correctamente']
        );
        console.log('Tarea de ejemplo creada en PostgreSQL');
      }
    } else {
      // MySQL
      await db.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Insertar una tarea de ejemplo si la tabla está vacía
      const [result] = await db.query('SELECT COUNT(*) as count FROM tasks');
      if (parseInt(result[0].count) === 0) {
        await db.query(
          'INSERT INTO tasks (title, description) VALUES (?, ?)',
          ['Tarea de ejemplo', 'Esta es una tarea de ejemplo para mostrar que la base de datos funciona correctamente']
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

// Rutas
app.get('/', async (req, res) => {
  try {
    let tasks;
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL
      const result = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
      tasks = result.rows;
    } else {
      // MySQL
      const [rows] = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
      tasks = rows;
    }
    
    res.render('index', { 
      tasks,
      environment: process.env.NODE_ENV,
      dbType: process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'MySQL',
      webServer: process.env.NODE_ENV === 'production' ? 'Nginx' : 'Apache'
    });
  } catch (err) {
    console.error('Error al obtener tareas:', err);
    res.status(500).send('Error al obtener las tareas');
  }
});

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

// Mejorar manejo de errores en la ruta principal
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
        const [rows] = await db.query('SELECT * FROM tasks ORDER BY created_at DESC');
        tasks = rows;
      }
    } catch (dbErr) {
      console.error('Error al obtener tareas de la base de datos:', dbErr);
      dbError = true;
      tasks = [];
    }
    
    res.render('index', { 
      tasks,
      environment: process.env.NODE_ENV,
      dbType: process.env.NODE_ENV === 'production' ? 'PostgreSQL' : 'MySQL',
      webServer: process.env.NODE_ENV === 'production' ? 'Nginx' : 'Apache',
      dbError
    });
  } catch (err) {
    console.error('Error general al procesar la solicitud:', err);
    res.status(500).send('Error interno del servidor');
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