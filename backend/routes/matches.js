const express = require('express');
const router = express.Router();
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

router.get('/', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.football-data.org/v4/competitions/WC/matches',
      { headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY } }
    );
    res.json(response.data.matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not fetch matches.' });
  }
});

module.exports = router;