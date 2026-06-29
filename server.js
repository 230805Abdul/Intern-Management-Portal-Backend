// server-with-jwt-updated.js
// Backend with JWT Authentication

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database Connection with SSL for Neon
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'intern_portal',
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('neon') ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.on('connect', () => {
  console.log('✓ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('✗ Unexpected error on idle client', err);
});

// ============================================================================
// JWT Authentication Middleware
// ============================================================================

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Please login first.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.'
      });
    }
    req.user = decoded;
    next();
  });
};

// ============================================================================
// Authentication Routes
// ============================================================================

// Login Route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }

  // Hardcoded credentials (for demo - in production use database)
  const validUsers = {
    'admin': { password: 'admin123', role: 'admin', name: 'Administrator' },
    'manager': { password: 'manager123', role: 'manager', name: 'Manager' },
    'intern': { password: 'intern123', role: 'intern', name: 'Intern' }
  };

  const user = validUsers[username];

  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }

  // Generate JWT Token
  const token = jwt.sign(
    {
      username: username,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || 'your_secret_key',
    { expiresIn: '24h' }
  );

  res.json({
    success: true,
    token: token,
    user: {
      username: username,
      role: user.role,
      name: user.name
    },
    message: 'Login successful',
    expiresIn: '24h'
  });
});

// Verify Token Route
app.post('/api/auth/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: 'Token is valid'
  });
});

// Logout Route
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully. Token removed from client-side.'
  });
});

// ============================================================================
// Protected Routes - Get Interns
// ============================================================================

app.get('/api/interns', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM interns ORDER BY id DESC');
    res.json({
      success: true,
      data: result.rows,
      message: 'Interns retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching interns:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching interns'
    });
  }
});

app.get('/api/interns/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM interns WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Intern retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching intern:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching intern'
    });
  }
});

// ============================================================================
// Protected Routes - Create Intern
// ============================================================================

app.post('/api/interns', verifyToken, async (req, res) => {
  try {
    const { name, email, department, joining_date } = req.body;

    if (!name || !email || !department || !joining_date) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const result = await pool.query(
      'INSERT INTO interns (name, email, department, joining_date, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [name, email, department, joining_date]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Intern created successfully'
    });
  } catch (error) {
    console.error('Error creating intern:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error creating intern'
    });
  }
});

// ============================================================================
// Protected Routes - Update Intern
// ============================================================================

app.put('/api/interns/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, joining_date } = req.body;

    const result = await pool.query(
      'UPDATE interns SET name = $1, email = $2, department = $3, joining_date = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [name, email, department, joining_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Intern updated successfully'
    });
  } catch (error) {
    console.error('Error updating intern:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error updating intern'
    });
  }
});

// ============================================================================
// Protected Routes - Delete Intern
// ============================================================================

app.delete('/api/interns/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM interns WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Intern deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting intern:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error deleting intern'
    });
  }
});

// ============================================================================
// Protected Routes - Get Tasks
// ============================================================================

app.get('/api/tasks', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, i.name as intern_name 
      FROM tasks t 
      LEFT JOIN interns i ON t.intern_id = i.id 
      ORDER BY t.id DESC
    `);
    res.json({
      success: true,
      data: result.rows,
      message: 'Tasks retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching tasks'
    });
  }
});

app.get('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, i.name as intern_name 
      FROM tasks t 
      LEFT JOIN interns i ON t.intern_id = i.id 
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Task retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching task'
    });
  }
});

app.get('/api/interns/:id/tasks', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE intern_id = $1 ORDER BY id DESC', [id]);
    res.json({
      success: true,
      data: result.rows,
      message: 'Tasks retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching tasks'
    });
  }
});

// ============================================================================
// Protected Routes - Create Task
// ============================================================================

app.post('/api/tasks', verifyToken, async (req, res) => {
  try {
    const { intern_id, title, description, status } = req.body;

    if (!intern_id || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const result = await pool.query(
      'INSERT INTO tasks (intern_id, title, description, status, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [intern_id, title, description, status || 'pending']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error creating task'
    });
  }
});

// ============================================================================
// Protected Routes - Update Task
// ============================================================================

app.put('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { intern_id, title, description, status } = req.body;

    const result = await pool.query(
      'UPDATE tasks SET intern_id = $1, title = $2, description = $3, status = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [intern_id, title, description, status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error updating task'
    });
  }
});

// ============================================================================
// Protected Routes - Delete Task
// ============================================================================

app.delete('/api/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error deleting task'
    });
  }
});

// ============================================================================
// Protected Routes - Statistics
// ============================================================================

app.get('/api/statistics', verifyToken, async (req, res) => {
  try {
    const totalInterns = await pool.query('SELECT COUNT(*) FROM interns');
    const totalTasks = await pool.query('SELECT COUNT(*) FROM tasks');
    const completedTasks = await pool.query("SELECT COUNT(*) FROM tasks WHERE status = 'completed'");
    const pendingTasks = await pool.query("SELECT COUNT(*) FROM tasks WHERE status = 'pending'");

    res.json({
      success: true,
      data: {
        totalInterns: parseInt(totalInterns.rows[0].count),
        totalTasks: parseInt(totalTasks.rows[0].count),
        completedTasks: parseInt(completedTasks.rows[0].count),
        pendingTasks: parseInt(pendingTasks.rows[0].count)
      },
      message: 'Statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error fetching statistics'
    });
  }
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`✓ JWT Secret configured: ${process.env.JWT_SECRET ? 'Yes' : 'No (using default)'}`);
  console.log('\n📝 Login Credentials:');
  console.log('   Admin:   admin / admin123');
  console.log('   Manager: manager / manager123');
  console.log('   Intern:  intern / intern123');
  console.log('\n');
});

module.exports = app;