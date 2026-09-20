import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import ApprovalTimeline from '../components/ApprovalTimeline';

const emptyLodging = () => ({
  checkIn: '', checkOut: '', nights: 1, hotelName: '', city: '',
  cityTier: 'Tier 1', paidBy: 'Employee', amount: 0, proofRef: ''
});
const emptyTransport = () => ({
  date: '', from: '', to: '', mode: 'Cab',
  paidBy: 'Employee', amount: 0, proofRef: ''
});
const emptyOther = () => ({
  date: '', head: 'Meals', description: '',
  paidBy: 'Employee', amount: 0, proofRef: ''
});

export default function SettlementForm() {
  const { travelRequestId, id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const wantsEdit = Boolean(id && searchParams.get('edit') === '1');

  const [mode, setMode] = useState(wantsEdit ? 'edit' : id ? 'view' : 'new'); // 'view' | 'new' | 'edit'
  const [settlement, setSettlement] = useState(null);
  const [travelRequest, setTravelRequest] = useState(null);
  const [lodging, setLodging] = useState([emptyLodging()]);
  const [transport, setTransport] = useState([emptyTransport()]);
  const [other, setOther] = useState([emptyOther()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id || travelRequestId));

  // Load settlement (view/edit) or travel request (new)
  useEffect(() => {
    let active = true;

    if (id) {
      api.get(`/settlements/${id}`).then(async (res) => {
        if (!active) return;
        setSettlement(res.data);
        if (wantsEdit && ['Draft', 'Returned'].includes(res.data.status)) {
          setLodging(res.data.lodging?.length ? res.data.lodging : [emptyLodging()]);
          setTransport(res.data.transportation?.length ? res.data.transportation : [emptyTransport()]);
          setOther(res.data.otherExpenses?.length ? res.data.otherExpenses : [emptyOther()]);
        }
        try {
          const tr = await api.get(`/travel-requests/${res.data.travelRequest}`);
          if (active) setTravelRequest(tr.data);
        } catch { /* optional */ }
      }).catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load settlement');
      }).finally(() => {
        if (active) setLoading(false);
      });
    } else if (travelRequestId) {
      api.get(`/travel-requests/${travelRequestId}`).then(r => {
        if (active) setTravelRequest(r.data);
      }).catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load travel request');
      }).finally(() => {
        if (active) setLoading(false);
      });
    }

    return () => { active = false; };
  }, [id, travelRequestId, wantsEdit]);

  const updateRow = (setter, idx, key, value) =>
    setter(prev => prev.map((row, i) => i === idx ? { ...row, [key]: value } : row));

  const removeRow = (setter, idx) =>
    setter(prev => prev.filter((_, i) => i !== idx));

  // Load current settlement lines into the form for editing
  const startEdit = () => {
    if (!settlement) return;
    setLodging(settlement.lodging?.length ? settlement.lodging : [emptyLodging()]);
    setTransport(settlement.transportation?.length ? settlement.transportation : [emptyTransport()]);
    setOther(settlement.otherExpenses?.length ? settlement.otherExpenses : [emptyOther()]);
    setError('');
    setMode('edit');
  };

  // Save: POST for new, PUT for edit
  const saveDraft = async (e) => {
    if (e) e.preventDefault();
    setError(''); setBusy(true);
    try {
      const linePayload = {
        lodging: lodging.filter(r => r.amount || r.hotelName),
        transportation: transport.filter(r => r.amount || r.from),
        otherExpenses: other.filter(r => r.amount || r.head)
      };

      let data;
      if (mode === 'edit') {
        ({ data } = await api.put(`/settlements/${settlement._id}`, linePayload));
      } else {
        ({ data } = await api.post('/settlements', {
          ...linePayload,
          travelRequestId
        }));
      }
      setSettlement(data);
      setMode('view');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  // Submit for approval
  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const { data } = await api.post(`/settlements/${settlement._id}/submit`);
      setSettlement(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  // ---------- VIEW MODE ----------
  if (loading) return <div className="muted">Loading settlement…</div>;

  if (error && !settlement && !travelRequest) {
    return <div className="error">{error}</div>;
  }

  if (mode === 'view' && settlement) {
    const t = settlement.totals || {};
    const canEdit = ['Draft', 'Returned'].includes(settlement.status);
    const lastReturn = settlement.approvals?.slice().reverse().find(a => a.decision === 'Returned');

    return (
      <div className="card">
        <div className="page-head">
          <div>
            <h2>Settlement {settlement.settlementId}</h2>
            <div className="muted">
              {travelRequest && <>Against {travelRequest.requestId} · {travelRequest.visitingPlace}</>}
            </div>
          </div>
          <StatusBadge status={settlement.status} />
        </div>

        {error && <div className="error">{error}</div>}

        {lastReturn && (
          <div className="flags">
            <strong>Returned by {lastReturn.approverName || lastReturn.role}</strong>
            <div style={{ marginTop: 4 }}>{lastReturn.remarks || 'No remarks provided.'}</div>
          </div>
        )}

        {settlement.flags?.length > 0 && (
          <div className="flags">
            <strong>Flags</strong>
            <ul>{settlement.flags.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        )}

        <Section title="Lodging">
          {(settlement.lodging?.length ?? 0) === 0 ? <div className="muted">No lodging lines.</div> : (
            <table>
              <thead>
                <tr>
                  <th>Hotel</th><th>City</th><th>Tier</th><th>Nights</th>
                  <th>Paid By</th><th className="right">Amount</th><th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {settlement.lodging.map((l, i) => (
                  <tr key={i}>
                    <td>{l.hotelName}</td><td>{l.city}</td><td>{l.cityTier}</td>
                    <td>{l.nights}</td><td>{l.paidBy}</td>
                    <td className="right">₹{l.amount}</td><td>{l.proofRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Transportation">
          {(settlement.transportation?.length ?? 0) === 0 ? <div className="muted">No transport lines.</div> : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>From</th><th>To</th><th>Mode</th>
                  <th>Paid By</th><th className="right">Amount</th><th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {settlement.transportation.map((l, i) => (
                  <tr key={i}>
                    <td>{l.date ? new Date(l.date).toLocaleDateString() : ''}</td>
                    <td>{l.from}</td><td>{l.to}</td><td>{l.mode}</td>
                    <td>{l.paidBy}</td>
                    <td className="right">₹{l.amount}</td><td>{l.proofRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Other Expenses">
          {(settlement.otherExpenses?.length ?? 0) === 0 ? <div className="muted">No other lines.</div> : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Head</th><th>Description</th>
                  <th>Paid By</th><th className="right">Amount</th><th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {settlement.otherExpenses.map((l, i) => (
                  <tr key={i}>
                    <td>{l.date ? new Date(l.date).toLocaleDateString() : ''}</td>
                    <td>{l.head}</td><td>{l.description}</td>
                    <td>{l.paidBy}</td>
                    <td className="right">₹{l.amount}</td><td>{l.proofRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Summary">
          <table className="summary-table">
            <tbody>
              <tr><td>Employee paid</td><td className="right">₹{t.employeePaid}</td></tr>
              <tr><td>Company paid (memo only)</td><td className="right">₹{t.companyPaid}</td></tr>
              <tr><td>Disallowed / non-reimbursable</td><td className="right negative">− ₹{t.disallowed}</td></tr>
              <tr className="row-strong"><td>Net reimbursable</td><td className="right">₹{t.netReimbursable}</td></tr>
              <tr><td>Less: advance drawn</td><td className="right">− ₹{t.advanceAdjusted}</td></tr>
              <tr className="row-strong"><td>Payable to employee</td><td className="right positive">₹{t.payable}</td></tr>
              <tr><td>Recoverable from employee</td><td className="right negative">₹{t.recoverable}</td></tr>
            </tbody>
          </table>
        </Section>

        {settlement.disallowedItems?.length > 0 && (
          <Section title="Disallowed detail">
            <table>
              <thead><tr><th>Head</th><th className="right">Amount</th><th>Reason</th></tr></thead>
              <tbody>
                {settlement.disallowedItems.map((d, i) => (
                  <tr key={i}>
                    <td>{d.head}</td>
                    <td className="right">₹{d.amount}</td>
                    <td>{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section title="Approvals">
          <ApprovalTimeline approvals={settlement.approvals} currentLevel={settlement.currentLevel} />
        </Section>

        <div className="form-actions">
          {canEdit && (
            <>
              <button type="button" className="secondary" onClick={startEdit} disabled={busy}>
                Edit
              </button>
              <button onClick={submit} disabled={busy}>
                {busy ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </>
          )}
          <button className="secondary" onClick={() => navigate('/dashboard')}>Back</button>
        </div>
      </div>
    );
  }

  // ---------- NEW / EDIT MODE ----------
  const isEdit = mode === 'edit';
  const lastReturn = settlement?.approvals?.slice().reverse().find(a => a.decision === 'Returned');

  return (
    <div className="card">
      <div className="page-head">
        <div>
          <h2>{isEdit ? 'Edit Settlement' : 'New Settlement'}</h2>
          {travelRequest && (
            <div className="muted">
              Against {travelRequest.requestId} · {travelRequest.visitingPlace}
              {travelRequest.advanceDisbursed > 0 && <> · Advance drawn ₹{travelRequest.advanceDisbursed}</>}
            </div>
          )}
        </div>
      </div>

      {isEdit && lastReturn && (
        <div className="flags">
          <strong>Returned by {lastReturn.approverName || lastReturn.role}</strong>
          <div style={{ marginTop: 4 }}>{lastReturn.remarks || 'No remarks provided.'}</div>
        </div>
      )}

      {settlement?.flags?.length > 0 && (
        <div className="flags">
          <strong>Flags</strong>
          <ul>{settlement.flags.map((flag, index) => <li key={index}>{flag}</li>)}</ul>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <form onSubmit={saveDraft}>
        {/* ---------- LODGING ---------- */}
        <Section title="Lodging" subtitle="Hotel bills. Tier is used for the per-night limit.">
          {lodging.map((l, i) => (
            <div className="line-card" key={i}>
              <div className="line-card-head">
                <span>Lodging #{i + 1}</span>
                {lodging.length > 1 && (
                  <button type="button" className="link-danger" onClick={() => removeRow(setLodging, i)}>Remove</button>
                )}
              </div>
              <div className="grid-4">
                <Field label="Check-in"><input type="date" value={l.checkIn?.slice(0, 10) || ''} onChange={e => updateRow(setLodging, i, 'checkIn', e.target.value)} /></Field>
                <Field label="Check-out"><input type="date" value={l.checkOut?.slice(0, 10) || ''} onChange={e => updateRow(setLodging, i, 'checkOut', e.target.value)} /></Field>
                <Field label="Nights"><input type="number" min="0" value={l.nights} onChange={e => updateRow(setLodging, i, 'nights', Number(e.target.value))} /></Field>
                <Field label="Hotel name"><input value={l.hotelName} onChange={e => updateRow(setLodging, i, 'hotelName', e.target.value)} /></Field>
                <Field label="City"><input value={l.city} onChange={e => updateRow(setLodging, i, 'city', e.target.value)} /></Field>
                <Field label="City tier">
                  <select value={l.cityTier} onChange={e => updateRow(setLodging, i, 'cityTier', e.target.value)}>
                    <option>Tier 1</option><option>Tier 2</option><option>Tier 3</option>
                  </select>
                </Field>
                <Field label="Paid by">
                  <select value={l.paidBy} onChange={e => updateRow(setLodging, i, 'paidBy', e.target.value)}>
                    <option>Employee</option><option>Company</option>
                  </select>
                </Field>
                <Field label="Amount (₹)"><input type="number" min="0" value={l.amount} onChange={e => updateRow(setLodging, i, 'amount', Number(e.target.value))} /></Field>
                <Field label="Proof reference" full>
                  <input placeholder="e.g. BILL-HTL-001" value={l.proofRef} onChange={e => updateRow(setLodging, i, 'proofRef', e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setLodging([...lodging, emptyLodging()])}>+ Add lodging line</button>
        </Section>

        {/* ---------- TRANSPORT ---------- */}
        <Section title="Transportation" subtitle="Cabs, airport transfers, local travel. Receipt required.">
          {transport.map((l, i) => (
            <div className="line-card" key={i}>
              <div className="line-card-head">
                <span>Transport #{i + 1}</span>
                {transport.length > 1 && (
                  <button type="button" className="link-danger" onClick={() => removeRow(setTransport, i)}>Remove</button>
                )}
              </div>
              <div className="grid-4">
                <Field label="Date"><input type="date" value={l.date?.slice(0, 10) || ''} onChange={e => updateRow(setTransport, i, 'date', e.target.value)} /></Field>
                <Field label="From"><input value={l.from} onChange={e => updateRow(setTransport, i, 'from', e.target.value)} /></Field>
                <Field label="To"><input value={l.to} onChange={e => updateRow(setTransport, i, 'to', e.target.value)} /></Field>
                <Field label="Mode"><input value={l.mode} onChange={e => updateRow(setTransport, i, 'mode', e.target.value)} /></Field>
                <Field label="Paid by">
                  <select value={l.paidBy} onChange={e => updateRow(setTransport, i, 'paidBy', e.target.value)}>
                    <option>Employee</option><option>Company</option>
                  </select>
                </Field>
                <Field label="Amount (₹)"><input type="number" min="0" value={l.amount} onChange={e => updateRow(setTransport, i, 'amount', Number(e.target.value))} /></Field>
                <Field label="Proof reference" full>
                  <input placeholder="e.g. CAB-2026-0910-01" value={l.proofRef} onChange={e => updateRow(setTransport, i, 'proofRef', e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setTransport([...transport, emptyTransport()])}>+ Add transport line</button>
        </Section>

        {/* ---------- OTHER ---------- */}
        <Section title="Other Expenses" subtitle="Meals, business entertainment, misc. Use the head name so policy rules apply.">
          {other.map((l, i) => (
            <div className="line-card" key={i}>
              <div className="line-card-head">
                <span>Other #{i + 1}</span>
                {other.length > 1 && (
                  <button type="button" className="link-danger" onClick={() => removeRow(setOther, i)}>Remove</button>
                )}
              </div>
              <div className="grid-4">
                <Field label="Date"><input type="date" value={l.date?.slice(0, 10) || ''} onChange={e => updateRow(setOther, i, 'date', e.target.value)} /></Field>
                <Field label="Head">
                  <select value={l.head} onChange={e => updateRow(setOther, i, 'head', e.target.value)}>
                    <option>Meals</option>
                    <option>Business Entertainment</option>
                    <option>Laundry</option>
                    <option>Mini Bar</option>
                    <option>Alcohol</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Description"><input value={l.description} onChange={e => updateRow(setOther, i, 'description', e.target.value)} /></Field>
                <Field label="Paid by">
                  <select value={l.paidBy} onChange={e => updateRow(setOther, i, 'paidBy', e.target.value)}>
                    <option>Employee</option><option>Company</option>
                  </select>
                </Field>
                <Field label="Amount (₹)"><input type="number" min="0" value={l.amount} onChange={e => updateRow(setOther, i, 'amount', Number(e.target.value))} /></Field>
                <Field label="Proof reference" full>
                  <input placeholder="e.g. MEAL-0910-L" value={l.proofRef} onChange={e => updateRow(setOther, i, 'proofRef', e.target.value)} />
                </Field>
              </div>
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setOther([...other, emptyOther()])}>+ Add expense line</button>
        </Section>

        <div className="form-actions">
          <button disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Draft'}
          </button>
          {isEdit ? (
            <button type="button" className="secondary" onClick={() => setMode('view')} disabled={busy}>Cancel</button>
          ) : (
            <button type="button" className="secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
          )}
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          {isEdit
            ? 'Save changes, then submit for approval again.'
            : 'Save Draft first. The system computes limits, disallowed items, and totals. Then submit for approval.'}
        </div>
      </form>
    </div>
  );
}

/* ---------- small helpers ---------- */

function Section({ title, subtitle, children }) {
  return (
    <div className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {subtitle && <div className="muted">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}