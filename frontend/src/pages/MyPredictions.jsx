import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyPredictions.css';

const API = 'http://localhost:5000/api';

function MyPredictions() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [scores, setScores] = useState({});
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matchRes, predRes] = await Promise.all([
        axios.get(`${API}/matches`),
        axios.get(`${API}/predictions`, { headers }),
      ]);
      setMatches(matchRes.data);
      setPredictions(predRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPrediction = (matchId) =>
    predictions.find(p => p.match_id === matchId);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleScoreChange = (matchId, side, value) => {
    const val = Math.max(0, parseInt(value) || 0);
    setScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [side]: val }
    }));
  };

  const initScore = (matchId, homeScore = 0, awayScore = 0) => {
    setScores(prev => ({
      ...prev,
      [matchId]: { home: homeScore, away: awayScore }
    }));
  };

  // CREATE
  const handleSubmit = async (matchId) => {
    const s = scores[matchId];
    if (s?.home === undefined || s?.away === undefined) {
      showMessage('Please enter both scores.', 'error'); return;
    }
    try {
      await axios.post(`${API}/predictions`, {
        match_id: matchId,
        predicted_home_score: s.home,
        predicted_away_score: s.away,
      }, { headers });
      showMessage('Prediction saved! ✓');
      fetchData();
      setScores(prev => { const n = {...prev}; delete n[matchId]; return n; });
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to save.', 'error');
    }
  };

  // UPDATE
  const handleUpdate = async (predictionId, matchId) => {
    const s = scores[matchId];
    if (s?.home === undefined || s?.away === undefined) {
      showMessage('Please enter both scores.', 'error'); return;
    }
    try {
      await axios.put(`${API}/predictions/${predictionId}`, {
        predicted_home_score: s.home,
        predicted_away_score: s.away,
      }, { headers });
      showMessage('Prediction updated! ✓');
      setEditingId(null);
      fetchData();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to update.', 'error');
    }
  };

  // DELETE
  const handleDelete = async (predictionId) => {
    if (!window.confirm('Delete this prediction?')) return;
    try {
      await axios.delete(`${API}/predictions/${predictionId}`, { headers });
      showMessage('Prediction deleted.');
      fetchData();
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to delete.', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isUpcoming = (dateStr) => new Date(dateStr) > new Date();

  const upcomingMatches = matches.filter(m => isUpcoming(m.match_date));
  const pastMatches = matches.filter(m => !isUpcoming(m.match_date));

  if (loading) return <div className="pred-loading"><div className="spinner" />Loading...</div>;

  return (
    <div className="pred-page">
      {/* NAV */}
      <nav className="pred-nav">
        <div className="pred-logo">⚽ World Cup Predictor</div>
        <div className="pred-nav-links">
          <button className="nav-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="nav-btn active" onClick={() => navigate('/predictions')}>My Predictions</button>
          <button className="nav-btn" onClick={() => navigate('/leaderboard')}>Leaderboard</button>
        </div>
        <div className="pred-nav-right">
          <span className="pred-username">👤 {user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <div className="pred-content">
        <div className="pred-header">
          <div>
            <h1>My Predictions</h1>
            <p>{predictions.length} prediction{predictions.length !== 1 ? 's' : ''} made · {upcomingMatches.length} matches remaining</p>
          </div>
          <div className="scoring-guide">
            <span className="guide-item exact">🎯 Exact score = 3pts</span>
            <span className="guide-item correct">✓ Correct result = 1pt</span>
          </div>
        </div>

        {/* TOAST MESSAGE */}
        {message.text && (
          <div className={`toast ${message.type}`}>{message.text}</div>
        )}

        {/* UPCOMING MATCHES */}
        <div className="section-title">Upcoming Matches — Make Your Predictions</div>
        <div className="matches-grid">
          {upcomingMatches.length === 0 && <p className="empty">No upcoming matches.</p>}
          {upcomingMatches.map(m => {
            const pred = getPrediction(m.id);
            const isEditing = editingId === m.id;
            const currentScore = scores[m.id];

            return (
              <div className={`match-card ${pred ? 'has-pred' : ''}`} key={m.id}>
                <div className="mc-stage">{m.stage}</div>
                <div className="mc-date">{formatDate(m.match_date)}</div>

                <div className="mc-teams">
                  <div className="mc-team">
                    <span className="mc-flag">{m.home_flag}</span>
                    <span className="mc-name">{m.home_team}</span>
                  </div>
                  <span className="mc-vs">VS</span>
                  <div className="mc-team right">
                    <span className="mc-flag">{m.away_flag}</span>
                    <span className="mc-name">{m.away_team}</span>
                  </div>
                </div>

                {/* No prediction yet — show input */}
                {!pred && (
                  <div className="mc-input-row">
                    <input
                      type="number" min="0" max="20"
                      placeholder="0"
                      value={currentScore?.home ?? ''}
                      onChange={e => handleScoreChange(m.id, 'home', e.target.value)}
                      onFocus={() => !currentScore && initScore(m.id)}
                      className="score-input"
                    />
                    <span className="score-dash">–</span>
                    <input
                      type="number" min="0" max="20"
                      placeholder="0"
                      value={currentScore?.away ?? ''}
                      onChange={e => handleScoreChange(m.id, 'away', e.target.value)}
                      onFocus={() => !currentScore && initScore(m.id)}
                      className="score-input"
                    />
                    <button className="save-btn" onClick={() => handleSubmit(m.id)}>Save</button>
                  </div>
                )}

                {/* Has prediction — show it */}
                {pred && !isEditing && (
                  <div className="mc-pred-row">
                    <div className="mc-pred-score">
                      Your pick: <strong>{pred.predicted_home_score} – {pred.predicted_away_score}</strong>
                    </div>
                    <div className="mc-pred-actions">
                      <button className="edit-btn" onClick={() => {
                        setEditingId(m.id);
                        initScore(m.id, pred.predicted_home_score, pred.predicted_away_score);
                      }}>Edit</button>
                      <button className="del-btn" onClick={() => handleDelete(pred.id)}>Delete</button>
                    </div>
                  </div>
                )}

                {/* Editing */}
                {pred && isEditing && (
                  <div className="mc-input-row">
                    <input
                      type="number" min="0" max="20"
                      value={currentScore?.home ?? pred.predicted_home_score}
                      onChange={e => handleScoreChange(m.id, 'home', e.target.value)}
                      className="score-input"
                    />
                    <span className="score-dash">–</span>
                    <input
                      type="number" min="0" max="20"
                      value={currentScore?.away ?? pred.predicted_away_score}
                      onChange={e => handleScoreChange(m.id, 'away', e.target.value)}
                      className="score-input"
                    />
                    <button className="save-btn" onClick={() => handleUpdate(pred.id, m.id)}>Update</button>
                    <button className="cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* PAST MATCHES */}
        {pastMatches.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: '32px' }}>Past Matches — Results</div>
            <div className="matches-grid">
              {pastMatches.map(m => {
                const pred = getPrediction(m.id);
                return (
                  <div className="match-card past" key={m.id}>
                    <div className="mc-stage">{m.stage}</div>
                    <div className="mc-date">{formatDate(m.match_date)}</div>
                    <div className="mc-teams">
                      <div className="mc-team">
                        <span className="mc-flag">{m.home_flag}</span>
                        <span className="mc-name">{m.home_team}</span>
                      </div>
                      <div className="final-score">
                        {m.home_score !== null
                          ? `${m.home_score} – ${m.away_score}`
                          : 'TBD'}
                      </div>
                      <div className="mc-team right">
                        <span className="mc-flag">{m.away_flag}</span>
                        <span className="mc-name">{m.away_team}</span>
                      </div>
                    </div>
                    {pred && (
                      <div className="past-pred">
                        Your pick: {pred.predicted_home_score} – {pred.predicted_away_score}
                        <span className={`pts-badge ${pred.points_earned > 0 ? 'earned' : 'zero'}`}>
                          {pred.points_earned} pts
                        </span>
                      </div>
                    )}
                    {!pred && <div className="no-pred">No prediction made</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MyPredictions;
