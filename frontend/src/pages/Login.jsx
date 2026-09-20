import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO = [
  ['chaitanya.reddy@nortexindustries.com', 'Employee'],
  ['suresh.iyer@nortexindustries.com', 'Reporting Manager'],
  ['meera.krishnan@nortexindustries.com', 'HOD'],
  ['arvind.rao@nortexindustries.com', 'HODiv'],
  ['ravi.menon@nortexindustries.com', 'Finance'],
  ['nandita.shah@nortexindustries.com', 'MD'],
  ['admin@nortexindustries.com', 'Admin']
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card">
        <h2>Nortex Reimbursement</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="muted" style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 6 }}>Demo accounts (all password <code>password123</code>):</div>
          {DEMO.map(([em, r]) => (
            <div key={em} style={{ cursor: 'pointer' }} onClick={() => { setEmail(em); setPassword('password123'); }}>
              {em} — <em>{r}</em>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}