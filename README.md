# ⚽ FIFA 2026 World Cup Match Predictor

A full-stack web application that allows users to predict scores for every 2026 FIFA World Cup match, earn points for correct predictions, and compete on a live leaderboard.

---

## 🚀 Installation Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MySQL](https://www.mysql.com/) / MySQL Workbench
- [npm](https://www.npmjs.com/)

### 1. Clone or Download the Project
```
world-cup-predictor/
├── frontend/
└── backend/
```

### 2. Set Up the Database
1. Open **MySQL Workbench** and connect to your local instance
2. Go to **File → Open SQL Script** and open `database.sql`
3. Click the **⚡ Execute** button to run the script
4. A database called `worldcup_predictor` will be created with all tables and seed data

### 3. Configure the Backend
1. Open `backend/server.js`
2. Find the database connection section and update your MySQL password:
```js
const pool = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: 'YOUR_MYSQL_PASSWORD',
  database: 'worldcup_predictor',
});
```

### 4. Start the Backend
```bash
cd backend
npm install
node server.js
```
You should see: `✅ Server running at http://localhost:5000`

### 5. Start the Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm start
```
The app will open at `http://localhost:3000`

---

## 🏗️ System Architecture

### Frontend–Backend Communication
The frontend is built with **React** and communicates with the backend via **REST API calls** using the `axios` library. All API requests are sent to `http://localhost:5000/api`. Protected routes include a JWT token in the `Authorization` header.

```
React (port 3000)  ──→  Express API (port 5000)  ──→  MySQL Database
```

### Routing Logic (Three Pages)
Client-side routing is handled by **React Router v6**. Protected routes redirect unauthenticated users to the landing page.

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Login and registration forms |
| `/dashboard` | Dashboard | Welcome banner, upcoming matches, recent predictions, stats |
| `/predictions` | My Predictions | Full CRUD — submit, view, edit, and delete predictions |
| `/leaderboard` | Leaderboard | Rankings table, podium, and personal rank banner |

### State Management
- `useState` manages local component state (form inputs, loaded data, edit mode)
- `useEffect` triggers data fetching on component mount
- `localStorage` persists the JWT token and user object across browser refreshes, keeping the user logged in

---

## 📡 API Documentation

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in and receive a JWT token |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/teams` | Get all 48 World Cup teams |
| GET | `/api/teams/:id` | Get a single team by ID |

### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | Get all matches with team info |
| GET | `/api/matches/:id` | Get a single match |
| PUT | `/api/matches/:id/score` | Update a match's final score (protected) |

### Predictions *(Full CRUD)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/predictions` | Get all predictions for logged-in user (protected) |
| POST | `/api/predictions` | Create a new prediction (protected) |
| PUT | `/api/predictions/:id` | Update an existing prediction (protected) |
| DELETE | `/api/predictions/:id` | Delete a prediction (protected) |

### Leaderboard & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get top 20 users ranked by points |
| GET | `/api/users/me` | Get logged-in user profile and stats (protected) |
| PUT | `/api/users/me` | Update username or password (protected) |
| DELETE | `/api/users/me` | Delete account (protected) |

> **Protected** routes require an `Authorization: Bearer <token>` header.

---

## 🗄️ Database Schema

```
users         — id, username, email, password, created_at
teams         — id, name, group_name, flag_emoji
matches       — id, home_team_id, away_team_id, match_date, stage, home_score, away_score
predictions   — id, user_id, match_id, predicted_home_score, predicted_away_score, points_earned
```

### Points System
- 🎯 **3 points** — exact score predicted correctly
- ✓ **1 point** — correct match result (win/draw/loss) but wrong score

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Axios |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | JSON Web Tokens (JWT), bcrypt |

---

## 📁 Project Structure

```
world-cup-predictor/
├── backend/
│   ├── server.js          # Main Express server and all API routes
│   ├── package.json       # Backend dependencies
│   └── database.sql       # MySQL schema and seed data
└── frontend/
    ├── public/
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx   # Login / Register
        │   ├── LandingPage.css
        │   ├── Dashboard.jsx     # Home dashboard
        │   ├── Dashboard.css
        │   ├── MyPredictions.jsx # CRUD predictions
        │   ├── MyPredictions.css
        │   ├── Leaderboard.jsx   # Rankings
        │   └── Leaderboard.css
        ├── App.js                # Routing configuration
        └── index.js
```
