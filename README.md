# Intern Management Portal — Backend API

A RESTful API built with **Node.js**, **Express**, and **PostgreSQL** to manage interns and their assigned tasks.

---

## Tech Stack

- **Runtime:** Node.js (>=14.0.0)
- **Framework:** Express.js
- **Database:** PostgreSQL (via `pg`)
- **Other:** dotenv, cors, body-parser, express-validator

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/intern-management-portal.git
cd intern-management-portal/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
PORT=5000
NODE_ENV=development

DB_USER=postgres
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=intern_portal

FRONTEND_URL=http://localhost:3000
API_TIMEOUT=30000
```

### 4. Set up the database

Make sure PostgreSQL is running, then create the database and tables:

```sql
CREATE DATABASE intern_portal;

CREATE TABLE interns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(255) NOT NULL,
  joining_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  intern_id INTEGER REFERENCES interns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Run the server

```bash
# Development (with auto-restart)
npm run dev

# Production
npm start
```

Server will be live at: `http://localhost:5000`

---

## API Endpoints

### Interns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/interns` | Get all interns |
| GET | `/api/interns/:id` | Get a single intern |
| POST | `/api/interns` | Create a new intern |
| PUT | `/api/interns/:id` | Update an intern |
| DELETE | `/api/interns/:id` | Delete an intern |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks/:id` | Get a single task |
| GET | `/api/interns/:id/tasks` | Get all tasks for an intern |
| POST | `/api/tasks` | Create a new task |
| PUT | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/statistics` | Get dashboard stats (total interns, tasks, completed, pending) |

---

## Request & Response Examples

### POST `/api/interns` — Create Intern

**Request Body:**
```json
{
  "name": "Ali Hassan",
  "email": "ali@example.com",
  "department": "Engineering",
  "joining_date": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Ali Hassan",
    "email": "ali@example.com",
    "department": "Engineering",
    "joining_date": "2024-01-15",
    "created_at": "2024-01-15T10:00:00.000Z"
  },
  "message": "Intern created successfully"
}
```

---

### POST `/api/tasks` — Create Task

**Request Body:**
```json
{
  "intern_id": 1,
  "title": "Build login page",
  "description": "Create a responsive login page using React",
  "status": "pending"
}
```

Valid status values: `pending` · `in_progress` · `completed`

---

### GET `/api/statistics` — Dashboard Stats

**Response:**
```json
{
  "success": true,
  "data": {
    "totalInterns": 10,
    "totalTasks": 25,
    "completedTasks": 12,
    "pendingTasks": 8
  },
  "message": "Statistics retrieved successfully"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Description of the error"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request (missing/invalid fields) |
| 404 | Resource not found |
| 500 | Internal server error |

---

## Project Structure

```
backend/
├── server.js          # Main Express app & all API routes
├── package.json       # Dependencies & scripts
├── .env               # Environment variables (not committed)
├── .env.example       # Environment variable template
└── .gitignore
```

---

## Scripts

```bash
npm start        # Start the server
npm run dev      # Start with nodemon (auto-restart on changes)
npm test         # Run tests with Jest
npm run setup    # Run database setup script
```

---

## Deployment (Render)

1. Push your backend folder to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Set **root directory** to `backend`
4. Set **build command:** `npm install`
5. Set **start command:** `node server.js`
6. Add the following environment variables under **Environment**:

```
PORT=5000
NODE_ENV=production
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=5432
DB_NAME=intern_portal
FRONTEND_URL=https://your-frontend.vercel.app
```

> **Tip:** Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) for a free hosted PostgreSQL database.

---