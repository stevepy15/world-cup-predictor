const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM predictions WHERE user_id = ?',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.post('/', auth, async (req, res) => {
  const { match_id, home_score, away_score } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO predictions (user_id, match_id, home_score, away_score) VALUES (?, ?, ?, ?)',
      [req.user.id, match_id, home_score, away_score]
    );
    res.status(201).json({ id: result.insertId, match_id, home_score, away_score });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const { home_score, away_score } = req.body;
  try {
    await db.query(
      'UPDATE predictions SET home_score = ?, away_score = ? WHERE id = ? AND user_id = ?',
      [home_score, away_score, req.params.id, req.user.id]
    );
    res.json({ message: 'Prediction updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM predictions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Prediction deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;