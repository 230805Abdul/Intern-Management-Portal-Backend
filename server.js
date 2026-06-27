// server.js - Main Express Server File
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database Connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'intern_portal',
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('neon') ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Database connected successfully');
  }
});

// ==================== INTERNS ENDPOINTS ====================

// GET all interns
app.get('/api/interns', async (req, res) => {
  try {
    const query = 'SELECT * FROM interns ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Interns retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching interns:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching interns',
      error: error.message
    });
  }
});

// GET single intern by ID
app.get('/api/interns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid intern ID'
      });
    }

    const query = 'SELECT * FROM interns WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Intern retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching intern:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching intern',
      error: error.message
    });
  }
});

// POST create new intern
app.post('/api/interns', async (req, res) => {
  try {
    const { name, email, department, joining_date } = req.body;

    // Validation
    if (!name || !email || !department || !joining_date) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, department, joining_date'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email already exists
    const checkEmail = await pool.query('SELECT id FROM interns WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Insert intern
    const query = `
      INSERT INTO interns (name, email, department, joining_date, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [name, email, department, joining_date]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Intern created successfully'
    });
  } catch (error) {
    console.error('Error creating intern:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating intern',
      error: error.message
    });
  }
});

// PUT update intern
app.put('/api/interns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department, joining_date } = req.body;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid intern ID'
      });
    }

    // Validation
    if (!name || !email || !department || !joining_date) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, email, department, joining_date'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if intern exists
    const checkIntern = await pool.query('SELECT id FROM interns WHERE id = $1', [id]);
    if (checkIntern.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    // Check if email already exists (for other interns)
    const checkEmail = await pool.query(
      'SELECT id FROM interns WHERE email = $1 AND id != $2',
      [email, id]
    );
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Update intern
    const query = `
      UPDATE interns
      SET name = $1, email = $2, department = $3, joining_date = $4
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(query, [name, email, department, joining_date, id]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Intern updated successfully'
    });
  } catch (error) {
    console.error('Error updating intern:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating intern',
      error: error.message
    });
  }
});

// DELETE intern
app.delete('/api/interns/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid intern ID'
      });
    }

    // Check if intern exists
    const checkIntern = await pool.query('SELECT id FROM interns WHERE id = $1', [id]);
    if (checkIntern.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    // Delete associated tasks first
    await pool.query('DELETE FROM tasks WHERE intern_id = $1', [id]);

    // Delete intern
    const query = 'DELETE FROM interns WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Intern deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting intern:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting intern',
      error: error.message
    });
  }
});

// ==================== TASKS ENDPOINTS ====================

// GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const query = 'SELECT * FROM tasks ORDER BY created_at DESC';
    const result = await pool.query(query);
    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Tasks retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
});

// GET tasks by intern
app.get('/api/interns/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid intern ID'
      });
    }

    const query = 'SELECT * FROM tasks WHERE intern_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Tasks retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
});

// POST create task
app.post('/api/tasks', async (req, res) => {
  try {
    const { intern_id, title, description, status } = req.body;

    // Validation
    if (!intern_id || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: intern_id, title, description'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed'];
    const taskStatus = status || 'pending';
    if (!validStatuses.includes(taskStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: pending, in_progress, or completed'
      });
    }

    // Check if intern exists
    const checkIntern = await pool.query('SELECT id FROM interns WHERE id = $1', [intern_id]);
    if (checkIntern.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    // Insert task
    const query = `
      INSERT INTO tasks (intern_id, title, description, status, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [intern_id, title, description, taskStatus]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
});

// GET single task
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Task retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
});

// PUT update task
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Check if task exists
    const checkTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (checkTask.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be: pending, in_progress, or completed'
        });
      }
    }

    // Update task
    const taskTitle = title || checkTask.rows[0].title;
    const taskDescription = description || checkTask.rows[0].description;
    const taskStatus = status || checkTask.rows[0].status;

    const query = `
      UPDATE tasks
      SET title = $1, description = $2, status = $3
      WHERE id = $4
      RETURNING *
    `;
    const result = await pool.query(query, [taskTitle, taskDescription, taskStatus, id]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
});

// DELETE task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }

    // Check if task exists
    const checkTask = await pool.query('SELECT id FROM tasks WHERE id = $1', [id]);
    if (checkTask.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Delete task
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);

    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
});

// ==================== STATISTICS ENDPOINT ====================

// GET dashboard statistics
app.get('/api/statistics', async (req, res) => {
  try {
    const totalInterns = await pool.query('SELECT COUNT(*) as count FROM interns');
    const totalTasks = await pool.query('SELECT COUNT(*) as count FROM tasks');
    const completedTasks = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'");
    const pendingTasks = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'");

    res.status(200).json({
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
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// ==================== ERROR HANDLING ====================

// 404 Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   Intern Management Portal - Backend Server  ║
║             Server Running Successfully      ║
╚══════════════════════════════════════════════╝

✓ Server is running on http://localhost:${PORT}
✓ Database: ${process.env.DB_NAME || 'intern_portal'}
✓ CORS enabled for frontend communication

Available Endpoints:
  GET    /api/interns              - Get all interns
  GET    /api/interns/:id          - Get single intern
  POST   /api/interns              - Create intern
  PUT    /api/interns/:id          - Update intern
  DELETE /api/interns/:id          - Delete intern
  
  GET    /api/tasks                - Get all tasks
  GET    /api/tasks/:id            - Get single task
  GET    /api/interns/:id/tasks    - Get intern's tasks
  POST   /api/tasks                - Create task
  PUT    /api/tasks/:id            - Update task
  DELETE /api/tasks/:id            - Delete task
  
  GET    /api/statistics           - Get dashboard stats

  `);
});

module.exports = app;
