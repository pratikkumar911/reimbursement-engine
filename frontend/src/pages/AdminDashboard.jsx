import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [travel, setTravel] = useState([]);
  const [settlements, setSettlements] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, u, tr, st] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/travel-requests'),
        api.get('/admin/settlements')
      ]);
      setStats(s.data); setUsers(u.data);
      setTravel(tr.data); setSettlements(st.data);
    })();
  }, []);

  if (!stats) return <div className="muted">Loading…</div>;

  return (
    <>
      <div className="stats">
        <div className="stat"><div className="num">{stats.users}</div><div className="lbl">Users</div></div>
        <div className="stat"><div className="num">{stats.travelRequests}</div><div className="lbl">Travel Requests</div></div>
        <div className="stat"><div className="num">{stats.settlements}</div><div className="lbl">Settlements</div></div>
        <div className="stat"><div className="num">{stats.pendingTravelRequests}</div><div className="lbl">Pending TRs</div></div>
        <div className="stat"><div className="num">{stats.pendingSettlements}</div><div className="lbl">Pending SETs</div></div>
      </div>

      <div className="card">
        <h2>Users</h2>
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Role</th><th>Dept</th><th>City</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id}>
                <td>{u.empCode}</td><td>{u.name}</td><td>{u.email}</td>
                <td>{u.role}</td><td>{u.department}</td><td>{u.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>All Travel Requests</h2>
        <table>
          <thead><tr><th>ID</th><th>Employee</th><th>Place</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {travel.map(t => (
              <tr key={t._id}>
                <td>{t.requestId}</td><td>{t.employeeCode}</td><td>{t.visitingPlace}</td>
                <td>₹{t.estimated.total}</td><td><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>All Settlements</h2>
        <table>
          <thead><tr><th>ID</th><th>Net</th><th>Payable</th><th>Recoverable</th><th>Status</th></tr></thead>
          <tbody>
            {settlements.map(s => (
              <tr key={s._id}>
                <td>{s.settlementId}</td>
                <td>₹{s.totals.netReimbursable}</td>
                <td>₹{s.totals.payable}</td>
                <td>₹{s.totals.recoverable}</td>
                <td><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}