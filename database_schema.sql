-- database_schema.sql
-- PostgreSQL Database Schema for Intern Management Portal

-- Create interns table
CREATE TABLE IF NOT EXISTS interns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  intern_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_interns_email ON interns(email);
CREATE INDEX IF NOT EXISTS idx_interns_department ON interns(department);
CREATE INDEX IF NOT EXISTS idx_tasks_intern_id ON tasks(intern_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Insert sample data
INSERT INTO interns (name, email, department, joining_date, created_at) 
VALUES 
  ('Abdul Basit', 'abdul basit@gmail.com', 'Engineering', '2024-01-15', NOW()),
  ('Ahmed', 'ahmed@gmail.com', 'Marketing', '2024-02-01', NOW()),
  ('Qasim', 'qasim@gmail.com', 'Engineering', '2024-02-15', NOW()),
  ('Fawad', 'fawad@gmail.com', 'Sales', '2024-03-01', NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert sample tasks
INSERT INTO tasks (intern_id, title, description, status, created_at)
VALUES 
  (1, 'API Development', 'Build REST APIs for portal', 'in_progress', NOW()),
  (1, 'Database Design', 'Design database schema', 'completed', NOW()),
  (2, 'Social Media Campaign', 'Create social media strategy', 'pending', NOW()),
  (3, 'Frontend Development', 'Create React components', 'in_progress', NOW()),
  (4, 'Client Outreach', 'Contact new clients', 'pending', NOW())
ON CONFLICT DO NOTHING;