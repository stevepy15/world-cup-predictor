import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginData.email || !loginData.password) {
      setLoginError('Please fill in all fields.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', loginData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setLoginError('Incorrect email or password.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    if (!registerData.username || !registerData.email || !registerData.password || !registerData.confirmPassword) {
      setRegisterError('Please fill in all fields.');
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }
    if (registerData.password.length < 8) {
      setRegisterError('Password must be at least 8 characters.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', registerData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setRegisterError(err.response?.data?.message || 'Registration failed. Try again.');
    }
  };

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-logo">
          <span className="logo-icon">&#9917;</span>
          World Cup Predictor
        </div>
        <span className="badge-green">2026 Edition</span>
      </nav>

      <div className="hero">
        <h1>Predict every match. Climb the leaderboard.</h1>
        <p>Submit score predictions for every 2026 FIFA World Cup fixture. Earn points for correct results and exact scores.</p>

        <div className="stat-row">
          <div className="stat-card"><div className="num">48</div><div className="lbl">Group matches</div></div>
          <div className="stat-card"><div className="num">16</div><div className="lbl">Knockout games</div></div>
          <div className="stat-card"><div className="num">3pts</div><div className="lbl">Exact score</div></div>
          <div className="stat-card"><div className="num">1pt</div><div className="lbl">Correct result</div></div>
        </div>

        <div className="how-row">
          <div className="how-step"><div className="how-icon">&#128100;</div><strong>Register</strong><p>Create your free account</p></div>
          <div className="how-step"><div className="how-icon">&#9999;</div><strong>Predict</strong><p>Submit scores before kickoff</p></div>
          <div className="how-step"><div className="how-icon">&#127942;</div><strong>Compete</strong><p>Track your rank live</p></div>
        </div>
      </div>

      <div className="auth-section">
        <div className="tabs">
          <button className={activeTab === 'login' ? 'tab active' : 'tab'} onClick={() => setActiveTab('login')}>Log in</button>
          <button className={activeTab === 'register' ? 'tab active' : 'tab'} onClick={() => setActiveTab('register')}>Create account</button>
        </div>

        {activeTab === 'login' && (
          <form className="form-card" onSubmit={handleLogin}>
            {loginError && <div className="error-msg">{loginError}</div>}
            <div className="form-row">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            </div>
            <button type="submit" className="submit-btn">Log in</button>
            <p className="form-footer">Don't have an account? <span onClick={() => setActiveTab('register')}>Register free</span></p>
          </form>
        )}

        {activeTab === 'register' && (
          <form className="form-card" onSubmit={handleRegister}>
            {registerError && <div className="error-msg">{registerError}</div>}
            <div className="form-row">
              <label>Username</label>
              <input type="text" placeholder="e.g. golazo_99" value={registerData.username} onChange={e => setRegisterData({...registerData, username: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" placeholder="you@example.com" value={registerData.email} onChange={e => setRegisterData({...registerData, email: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Password</label>
              <input type="password" placeholder="At least 8 characters" value={registerData.password} onChange={e => setRegisterData({...registerData, password: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Confirm password</label>
              <input type="password" placeholder="••••••••" value={registerData.confirmPassword} onChange={e => setRegisterData({...registerData, confirmPassword: e.target.value})} />
            </div>
            <button type="submit" className="submit-btn">Create account</button>
            <p className="form-footer">Already have an account? <span onClick={() => setActiveTab('login')}>Log in</span></p>
          </form>
        )}
      </div>
    </div>
  );
}

export default LandingPage;