import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ApprovalTimeline from '../components/ApprovalTimeline';
import { useAuth } from '../context/AuthContext';

export default function FinanceDashboard() {
  const { user } = useAuth();
  const [travel, setTravel] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [remarks, setRemarks] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [tr, st] = await Promise.all([
      api.get('/travel-requests'),
      api.get('/settlements')
    ]);
    setTravel(tr.data);
    setSettlements(st.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendingAdvance = travel.filter(t => t.status === 'Approved' && t.advanceRequested > 0 && !t.advanceDisbursed);
  const pendingFinanceVerify = settlements.filter(s =>
    s.status === 'Pending' &&
    s.approvals?.[s.currentLevel]?.role === 'Finance'
  );
  const verified = settlements.filter(s => s.status === 'Verified');

  const disburse = async (id) => {
    setError('');
    try {
      await api.post(`/travel-requests/${id}/advance/disburse`);
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const act = async (id, decision) => {
    setError('');
    try {
      await api.post(`/settlements/${id}/act`, { decision, remarks: remarks[id] || '' });
      setRemarks({ ...remarks, [id]: '' });
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const pay = async (id) => {
    setError('');
    try {
      await api.post(`/settlements/${id}/pay`);
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="muted">Loading…</div>;

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Advance Disbursement</h2>
        {pendingAdvance.length === 0 ? <div className="muted">Nothing pending.</div> : (
          <table>
            <thead><tr><th>Request</th><th>Employee</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {pendingAdvance.map(t => (
                <tr key={t._id}>
                  <td>{t.requestId}</td>
                  <td>{t.employeeCode}</td>
                  <td>₹{t.advanceRequested}</td>
                  <td><button onClick={() => disburse(t._id)}>Disburse</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Finance Verification</h2>
        {pendingFinanceVerify.length === 0 ? <div className="muted">Nothing pending.</div> : pendingFinanceVerify.map(s => (
          <div key={s._id} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 16 }}>
            <h3>{s.settlementId} <StatusBadge status={s.status} /></h3>
            <div className="muted">Employee Paid ₹{s.totals.employeePaid} · Disallowed ₹{s.totals.disallowed} · Net ₹{s.totals.netReimbursable}</div>
            {s.flags?.length > 0 && <div className="flags"><ul>{s.flags.map((f, i) => <li key={i}>{f}</li>)}</ul></div>}
            <ApprovalTimeline approvals={s.approvals} currentLevel={s.currentLevel} />
            <div className="field" style={{ marginTop: 8 }}>
              <input
                placeholder="Remarks"
                value={remarks[s._id] || ''}
                onChange={e => setRemarks({ ...remarks, [s._id]: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => act(s._id, 'Approved')}>Verify</button>
              <button className="secondary" onClick={() => act(s._id, 'Returned')}>Return</button>
              <button className="danger" onClick={() => act(s._id, 'Rejected')}>Reject</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Ready for Payment</h2>
        {verified.length === 0 ? <div className="muted">Nothing verified yet.</div> : (
          <table>
            <thead><tr><th>Settlement</th><th>Payable</th><th>Recoverable</th><th></th></tr></thead>
            <tbody>
              {verified.map(s => (
                <tr key={s._id}>
                  <td>{s.settlementId}</td>
                  <td>₹{s.totals.payable}</td>
                  <td>₹{s.totals.recoverable}</td>
                  <td><button onClick={() => pay(s._id)}>Mark Paid</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}