// ============================================================
// server.js — FIFA 2026 World Cup Match Predictor API
// ============================================================
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const mysql      = require('mysql2/promise');

const app  = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'worldcup2026_secret_key';

// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ------------------------------------------------------------
// Database connection pool
// ------------------------------------------------------------
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || 'SQLAdmin',
  database: process.env.DB_NAME     || 'worldcup_predictor',
  waitForConnections: true,
  connectionLimit:    10,
});

// ------------------------------------------------------------
// Auth middleware — verifies JWT on protected routes
// ------------------------------------------------------------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hash]
    );
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: result.insertId, username, email } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// TEAMS ROUTES
// ============================================================

// GET /api/teams — all teams
app.get('/api/teams', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM teams ORDER BY group_name, name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teams/:id
app.get('/api/teams/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Team not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// MATCHES ROUTES
// ============================================================

// GET /api/matches — all matches with team info
app.get('/api/matches', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        m.id, m.match_date, m.stage,
        m.home_score, m.away_score,
        ht.id   AS home_id,   ht.name AS home_team, ht.flag_emoji AS home_flag,
        at.id   AS away_id,   at.name AS away_team, at.flag_emoji AS away_flag
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      ORDER BY m.match_date
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matches/:id
app.get('/api/matches/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        m.id, m.match_date, m.stage,
        m.home_score, m.away_score,
        ht.id AS home_id, ht.name AS home_team, ht.flag_emoji AS home_flag,
        at.id AS away_id, at.name AS away_team, at.flag_emoji AS away_flag
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/matches/:id/score — update final score (admin/demo only)
app.put('/api/matches/:id/score', authMiddleware, async (req, res) => {
  const { home_score, away_score } = req.body;
  if (home_score == null || away_score == null)
    return res.status(400).json({ error: 'home_score and away_score are required' });

  try {
    await pool.execute(
      'UPDATE matches SET home_score = ?, away_score = ? WHERE id = ?',
      [home_score, away_score, req.params.id]
    );

    // Award points to predictions for this match
    await awardPoints(req.params.id, home_score, away_score);

    res.json({ message: 'Score updated and points awarded' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// PREDICTIONS ROUTES  (full CRUD — satisfies requirement)
// ============================================================

// GET /api/predictions — current user's predictions
app.get('/api/predictions', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        p.id, p.predicted_home_score, p.predicted_away_score,
        p.points_earned, p.created_at, p.updated_at,
        m.match_date, m.stage,
        ht.name AS home_team, ht.flag_emoji AS home_flag,
        at.name AS away_team, at.flag_emoji AS away_flag,
        m.home_score, m.away_score
      FROM predictions p
      JOIN matches m ON p.match_id = m.id
      JOIN teams ht  ON m.home_team_id = ht.id
      JOIN teams at  ON m.away_team_id = at.id
      WHERE p.user_id = ?
      ORDER BY m.match_date
    `, [req.user.id]);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/predictions — create a new prediction
app.post('/api/predictions', authMiddleware, async (req, res) => {
  const { match_id, predicted_home_score, predicted_away_score } = req.body;

  if (match_id == null || predicted_home_score == null || predicted_away_score == null)
    return res.status(400).json({ error: 'match_id, predicted_home_score, predicted_away_score are required' });

  if (predicted_home_score < 0 || predicted_away_score < 0)
    return res.status(400).json({ error: 'Scores cannot be negative' });

  try {
    // Verify match exists and hasn't started
    const [matches] = await pool.execute(
      'SELECT * FROM matches WHERE id = ?', [match_id]
    );
    if (matches.length === 0)
      return res.status(404).json({ error: 'Match not found' });

    if (new Date(matches[0].match_date) <= new Date())
      return res.status(400).json({ error: 'Cannot predict a match that has already started' });

    const [result] = await pool.execute(
      `INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, match_id, predicted_home_score, predicted_away_score]
    );
    res.status(201).json({ id: result.insertId, message: 'Prediction saved' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'You already have a prediction for this match — use PUT to update it' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/predictions/:id — update an existing prediction
app.put('/api/predictions/:id', authMiddleware, async (req, res) => {
  const { predicted_home_score, predicted_away_score } = req.body;

  if (predicted_home_score == null || predicted_away_score == null)
    return res.status(400).json({ error: 'predicted_home_score and predicted_away_score are required' });

  try {
    const [rows] = await pool.execute(
      'SELECT p.*, m.match_date FROM predictions p JOIN matches m ON p.match_id = m.id WHERE p.id = ? AND p.user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Prediction not found' });

    if (new Date(rows[0].match_date) <= new Date())
      return res.status(400).json({ error: 'Cannot edit a prediction after the match has started' });

    await pool.execute(
      'UPDATE predictions SET predicted_home_score = ?, predicted_away_score = ? WHERE id = ?',
      [predicted_home_score, predicted_away_score, req.params.id]
    );
    res.json({ message: 'Prediction updated' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/predictions/:id — delete a prediction
app.delete('/api/predictions/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT p.*, m.match_date FROM predictions p JOIN matches m ON p.match_id = m.id WHERE p.id = ? AND p.user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: 'Prediction not found' });

    if (new Date(rows[0].match_date) <= new Date())
      return res.status(400).json({ error: 'Cannot delete a prediction after the match has started' });

    await pool.execute('DELETE FROM predictions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Prediction deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// LEADERBOARD ROUTE
// ============================================================

// GET /api/leaderboard — top 20 users by total points
app.get('/api/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT
        u.id, u.username,
        COALESCE(SUM(p.points_earned), 0) AS total_points,
        COUNT(p.id) AS total_predictions,
        RANK() OVER (ORDER BY COALESCE(SUM(p.points_earned), 0) DESC) AS rank_pos
      FROM users u
      LEFT JOIN predictions p ON u.id = p.user_id
      GROUP BY u.id, u.username
      ORDER BY total_points DESC
      LIMIT 20
    `);
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// USERS ROUTES
// ============================================================

// GET /api/users/me — profile + stats for logged-in user
app.get('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const [userRows] = await pool.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const [statsRows] = await pool.execute(`
      SELECT
        COUNT(*)                          AS total_predictions,
        COALESCE(SUM(points_earned), 0)  AS total_points,
        COALESCE(MAX(points_earned), 0)  AS best_prediction
      FROM predictions WHERE user_id = ?
    `, [req.user.id]);

    res.json({ ...userRows[0], stats: statsRows[0] });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/me — update username or password
app.put('/api/users/me', authMiddleware, async (req, res) => {
  const { username, password } = req.body;
  try {
    if (username) {
      await pool.execute('UPDATE users SET username = ? WHERE id = ?', [username, req.user.id]);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    }
    res.json({ message: 'Profile updated' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/me — delete own account
app.delete('/api/users/me', authMiddleware, async (req, res) => {
  try {
    await pool.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// HELPER — award points after a match result is entered
// ============================================================
async function awardPoints(matchId, homeScore, awayScore) {
  const [predictions] = await pool.execute(
    'SELECT * FROM predictions WHERE match_id = ?', [matchId]
  );

  for (const pred of predictions) {
    let points = 0;
    const correctResult =
      Math.sign(pred.predicted_home_score - pred.predicted_away_score) ===
      Math.sign(homeScore - awayScore);
    const exactScore =
      pred.predicted_home_score === homeScore &&
      pred.predicted_away_score === awayScore;

    if (exactScore)        points = 3;   // exact score
    else if (correctResult) points = 1;  // correct outcome only

    await pool.execute(
      'UPDATE predictions SET points_earned = ? WHERE id = ?',
      [points, pred.id]
    );
  }
}

// ============================================================
// Start server
// ============================================================
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
