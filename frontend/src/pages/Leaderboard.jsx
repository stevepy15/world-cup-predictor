import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Leaderboard.css';

const API = 'http://localhost:5000/api';

function Leaderboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/leaderboard`);
      setLeaders(res.data);
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

  const myRank = leaders.find(l => l.username === user.username);

  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  if (loading) return <div className="lb-loading"><div className="spinner" />Loading...</div>;

  return (
    <div className="lb-page">
      {/* NAV */}
      <nav className="lb-nav">
        <div className="lb-logo">⚽ World Cup Predictor</div>
        <div className="lb-nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="nav-btn" onClick={() => navigate('/predictions')}>My Predictions</button>
          <button className="nav-btn active" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        </div>
        <div className="lb-nav-right">
          <span className="lb-username">👤 {user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <div className="lb-content">
        {/* HEADER */}
        <div className="lb-header">
          <div>
            <h1>🏆 Leaderboard</h1>
            <p>Top predictors for the 2026 FIFA World Cup</p>
          </div>
          <div className="scoring-guide">
            <span className="guide-item exact">🎯 Exact score = 3pts</span>
            <span className="guide-item correct">✓ Correct result = 1pt</span>
          </div>
        </div>

        {/* YOUR RANK BANNER */}
        {myRank && (
          <div className="my-rank-banner">
            <div className="my-rank-left">
              <span className="my-rank-pos">#{myRank.rank_pos}</span>
              <div>
                <div className="my-rank-label">Your current rank</div>
                <div className="my-rank-name">{user.username}</div>
              </div>
            </div>
            <div className="my-rank-right">
              <div className="my-rank-stat">
                <span className="my-rank-num">{myRank.total_points}</span>
                <span className="my-rank-unit">pts</span>
              </div>
              <div className="my-rank-pred">{myRank.total_predictions} predictions</div>
            </div>
          </div>
        )}

        {/* TOP 3 PODIUM */}
        {leaders.length >= 3 && (
          <div className="podium">
            {/* 2nd place */}
            <div className="podium-item second">
              <div className="podium-medal">🥈</div>
              <div className="podium-name">{leaders[1].username}</div>
              <div className="podium-pts">{leaders[1].total_points} pts</div>
              <div className="podium-block silver">2</div>
            </div>
            {/* 1st place */}
            <div className="podium-item first">
              <div className="podium-medal">🥇</div>
              <div className="podium-name">{leaders[0].username}</div>
              <div className="podium-pts">{leaders[0].total_points} pts</div>
              <div className="podium-block gold">1</div>
            </div>
            {/* 3rd place */}
            <div className="podium-item third">
              <div className="podium-medal">🥉</div>
              <div className="podium-name">{leaders[2].username}</div>
              <div className="podium-pts">{leaders[2].total_points} pts</div>
              <div className="podium-block bronze">3</div>
            </div>
          </div>
        )}

        {/* FULL TABLE */}
        <div className="lb-table-wrap">
          <div className="lb-table-header">
            <span className="col-rank">Rank</span>
            <span className="col-player">Player</span>
            <span className="col-preds">Predictions</span>
            <span className="col-pts">Points</span>
          </div>

          {leaders.length === 0 && (
            <div className="lb-empty">No predictions have been made yet. Be the first!</div>
          )}

          {leaders.map((l, i) => {
            const isMe = l.username === user.username;
            const medal = getMedal(l.rank_pos);
            return (
              <div className={`lb-row ${isMe ? 'is-me' : ''} ${i < 3 ? 'top-three' : ''}`} key={l.id}>
                <span className="col-rank">
                  {medal
                    ? <span className="medal">{medal}</span>
                    : <span className="rank-num">{l.rank_pos}</span>
                  }
                </span>
                <span className="col-player">
                  <span className="player-avatar">{l.username.charAt(0).toUpperCase()}</span>
                  <span className="player-name">{l.username}</span>
                  {isMe && <span className="you-badge">You</span>}
                </span>
                <span className="col-preds">{l.total_predictions}</span>
                <span className="col-pts">
                  <span className="pts-pill">{l.total_points} pts</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="lb-cta" onClick={() => navigate('/predictions')}>
          <span>✏️ Make more predictions to climb the leaderboard</span>
          <span>→</span>
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;
