import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ApprovalTimeline from '../components/ApprovalTimeline';
import { useAuth } from '../context/AuthContext';

export default function Approvals() {
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

  const isMineToAct = (entity) => {
    if (entity.status !== 'Pending') return false;
    const cur = entity.approvals?.[entity.currentLevel];
    if (!cur) return false;
    if (cur.role === 'Finance') return false;
    return cur.approver === user._id || cur.approver?._id === user._id;
  };

  const act = async (kind, id, decision) => {
    setError('');
    try {
      await api.post(`/${kind}/${id}/act`, { decision, remarks: remarks[id] || '' });
      setRemarks({ ...remarks, [id]: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  const pendingTravel = travel.filter(isMineToAct);
  const pendingSettlements = settlements.filter(isMineToAct);

  const renderApprovalBlock = (kind, entity) => (
    <div className="card" key={entity._id}>
      <h3>
        {kind === 'travel-requests' ? entity.requestId : entity.settlementId} <StatusBadge status={entity.status} />
      </h3>
      <div className="muted">
        {kind === 'travel-requests'
          ? `${entity.visitingPlace} · ${new Date(entity.fromDate).toLocaleDateString()} → ${new Date(entity.toDate).toLocaleDateString()} · ₹${entity.estimated.total}`
          : `Net reimbursable ₹${entity.totals.netReimbursable} · Payable ₹${entity.totals.payable} · Recoverable ₹${entity.totals.recoverable}`}
      </div>

      {entity.flags?.length > 0 && (
        <div className="flags"><strong>Flags</strong>
          <ul>{entity.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}

      <div className="section-title">Approvals</div>
      <ApprovalTimeline approvals={entity.approvals} currentLevel={entity.currentLevel} />

      <div className="field" style={{ marginTop: 12 }}>
        <label>Remarks (optional for approve, needed for return / reject)</label>
        <input
          value={remarks[entity._id] || ''}
          onChange={e => setRemarks({ ...remarks, [entity._id]: e.target.value })}
          placeholder="Add a note"
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => act(kind, entity._id, 'Approved')}>Approve</button>
        <button className="secondary" onClick={() => act(kind, entity._id, 'Returned')}>Return</button>
        <button className="danger" onClick={() => act(kind, entity._id, 'Rejected')}>Reject</button>
      </div>
    </div>
  );

  if (loading) return <div className="muted">Loading…</div>;

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Pending Travel Requests</h2>
        {pendingTravel.length === 0
          ? <div className="muted">Nothing waiting on you.</div>
          : pendingTravel.map(e => renderApprovalBlock('travel-requests', e))}
      </div>

      <div className="card">
        <h2>Pending Settlements</h2>
        {pendingSettlements.length === 0
          ? <div className="muted">Nothing waiting on you.</div>
          : pendingSettlements.map(e => renderApprovalBlock('settlements', e))}
      </div>
    </>
  );
}