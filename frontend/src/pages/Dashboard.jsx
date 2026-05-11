import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const API = 'http://localhost:5000/api';

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState({ total_predictions: 0, total_points: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [matchRes, predRes, userRes] = await Promise.all([
        axios.get(`${API}/matches`),
        axios.get(`${API}/predictions`, { headers }),
        axios.get(`${API}/users/me`, { headers }),
      ]);
      setMatches(matchRes.data.slice(0, 6));
      setPredictions(predRes.data.slice(0, 3));
      setStats(userRes.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const hasPrediction = (matchId) => predictions.some(p => p.match_id === matchId);

  if (loading) return <div className="dash-loading"><div className="spinner" />Loading...</div>;

  return (
    <div className="dash">
      {/* NAV */}
      <nav className="dash-nav">
        <div className="dash-logo">⚽ World Cup Predictor</div>
        <div className="dash-nav-links">
          <button className="nav-btn active" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="nav-btn" onClick={() => navigate('/predictions')}>My Predictions</button>
          <button className="nav-btn" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        </div>
        <div className="dash-nav-right">
          <span className="dash-username">👤 {user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <div className="dash-content">
        {/* WELCOME BANNER */}
        <div className="dash-banner">
          <div className="banner-text">
            <h1>Welcome back, <span>{user.username}</span> 👋</h1>
            <p>FIFA 2026 World Cup kicks off June 11. Make your predictions before kickoff!</p>
          </div>
          <div className="banner-trophy">🏆</div>
        </div>

        {/* STATS ROW */}
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-num">{stats.total_predictions}</div>
            <div className="stat-lbl">Predictions Made</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{stats.total_points}</div>
            <div className="stat-lbl">Total Points</div>
          </div>
          <div className="stat-box">
            <div className="stat-num">{matches.length}</div>
            <div className="stat-lbl">Upcoming Matches</div>
          </div>
          <div className="stat-box accent">
            <div className="stat-num">3pts</div>
            <div className="stat-lbl">For Exact Score</div>
          </div>
        </div>

        <div className="dash-grid">
          {/* UPCOMING MATCHES */}
          <div className="dash-card">
            <div className="card-header">
              <h2>Upcoming Matches</h2>
              <button className="see-all" onClick={() => navigate('/predictions')}>Predict all →</button>
            </div>
            <div className="match-list">
              {matches.length === 0 && <p className="empty">No matches scheduled yet.</p>}
              {matches.map(m => (
                <div className="match-row" key={m.id}>
                  <div className="match-teams">
                    <span className="team">{m.home_flag} {m.home_team}</span>
                    <span className="vs">vs</span>
                    <span className="team">{m.away_flag} {m.away_team}</span>
                  </div>
                  <div className="match-meta">
                    <span className="match-date">{formatDate(m.match_date)}</span>
                    <span className={`match-stage ${m.stage === 'Group Stage' ? 'group' : 'knockout'}`}>{m.stage}</span>
                  </div>
                  <button
                    className={`predict-btn ${hasPrediction(m.id) ? 'predicted' : ''}`}
                    onClick={() => navigate('/predictions')}
                  >
                    {hasPrediction(m.id) ? '✓ Predicted' : 'Predict'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT PREDICTIONS */}
          <div className="dash-card">
            <div className="card-header">
              <h2>Recent Predictions</h2>
              <button className="see-all" onClick={() => navigate('/predictions')}>View all →</button>
            </div>
            <div className="pred-list">
              {predictions.length === 0 && (
                <div className="empty-pred">
                  <p>No predictions yet!</p>
                  <button className="cta-btn" onClick={() => navigate('/predictions')}>Make your first prediction</button>
                </div>
              )}
              {predictions.map(p => (
                <div className="pred-row" key={p.id}>
                  <div className="pred-teams">
                    <span>{p.home_flag} {p.home_team}</span>
                    <span className="pred-score">{p.predicted_home_score} – {p.predicted_away_score}</span>
                    <span>{p.away_flag} {p.away_team}</span>
                  </div>
                  <div className="pred-footer">
                    <span className="pred-date">{formatDate(p.match_date)}</span>
                    {p.home_score !== null
                      ? <span className="points-badge">{p.points_earned} pts</span>
                      : <span className="pending-badge">Pending</span>
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* LEADERBOARD CTA */}
            <div className="leaderboard-cta" onClick={() => navigate('/leaderboard')}>
              <span>🏅 Check the Leaderboard</span>
              <span>→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
