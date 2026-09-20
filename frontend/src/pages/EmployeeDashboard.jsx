import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';

function lastRemark(entity) {
  if (!entity.approvals?.length) return null;
  const rev = entity.approvals.slice().reverse();
  const last = rev.find(a => a.decision);
  return last ? { decision: last.decision, remarks: last.remarks, by: last.approverName || last.role } : null;
}

export default function EmployeeDashboard() {
  const [requests, setRequests] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [tr, st] = await Promise.all([
      api.get('/travel-requests'),
      api.get('/settlements')
    ]);
    setRequests(tr.data);
    setSettlements(st.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="muted">Loading…</div>;

  return (
    <>
      <div className="card">
        <h2>My Travel Requests</h2>
        {requests.length === 0 ? (
          <div className="muted">No requests yet. <Link to="/travel-requests/new">Create one</Link>.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>From</th><th>To</th><th>Place</th>
                <th>Est. Total</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => {
                const note = lastRemark(r);
                const editable = ['Draft', 'Returned'].includes(r.status);
                const canSettle = r.status === 'Approved';
                return (
                  <tr key={r._id}>
                    <td>{r.requestId}</td>
                    <td>{new Date(r.fromDate).toLocaleDateString()}</td>
                    <td>{new Date(r.toDate).toLocaleDateString()}</td>
                    <td>{r.visitingPlace}</td>
                    <td>₹{r.estimated.total}</td>
                    <td>
                      <StatusBadge status={r.status} />
                      {note && note.decision === 'Returned' && (
                        <div className="muted" style={{ marginTop: 4 }}>
                          "{note.remarks || 'No remarks'}" — {note.by}
                        </div>
                      )}
                    </td>
                    <td>
                      {editable && (
                        <Link to={`/travel-requests/${r._id}/edit`}>
                          <button className="secondary">
                            {r.status === 'Returned' ? 'Fix & Resubmit' : 'Edit'}
                          </button>
                        </Link>
                      )}
                      {canSettle && (
                        <Link to={`/settlements/new/${r._id}`}>
                          <button className="secondary">Settle</button>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>My Settlements</h2>
        {settlements.length === 0 ? (
          <div className="muted">No settlements yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Date</th><th>Net Reimbursable</th>
                <th>Payable</th><th>Recoverable</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => {
                const note = lastRemark(s);
                const editable = ['Draft', 'Returned'].includes(s.status);
                return (
                  <tr key={s._id}>
                    <td>{s.settlementId}</td>
                    <td>{new Date(s.settlementDate).toLocaleDateString()}</td>
                    <td>₹{s.totals.netReimbursable}</td>
                    <td>₹{s.totals.payable}</td>
                    <td>₹{s.totals.recoverable}</td>
                    <td>
                      <StatusBadge status={s.status} />
                      {note && note.decision === 'Returned' && (
                        <div className="muted" style={{ marginTop: 4 }}>
                          "{note.remarks || 'No remarks'}" — {note.by}
                        </div>
                      )}
                    </td>
                    <td>
                      <Link to={editable ? `/settlements/${s._id}?edit=1` : `/settlements/${s._id}`}>
                        <button className="secondary">
                          {editable ? 'Open / Edit' : 'View'}
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}