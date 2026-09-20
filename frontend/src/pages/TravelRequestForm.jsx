import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const EMPTY = {
  fromDate: '', toDate: '', category: 'Domestic - Tier 1',
  visitingPlace: '', company: '', purpose: '', mode: 'Flight',
  airRail: 0, lodging: 0, localConveyance: 0, meals: 0, other: 0,
  advanceRequested: 0
};

export default function TravelRequestForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [f, setF] = useState(EMPTY);
  const [existing, setExisting] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.get(`/travel-requests/${id}`).then(({ data }) => {
      setExisting(data);
      setF({
        fromDate: data.fromDate?.slice(0, 10) || '',
        toDate: data.toDate?.slice(0, 10) || '',
        category: data.category || 'Domestic - Tier 1',
        visitingPlace: data.visitingPlace || '',
        company: data.company || '',
        purpose: data.purpose || '',
        mode: data.mode || 'Flight',
        airRail: data.estimated?.airRail || 0,
        lodging: data.estimated?.lodging || 0,
        localConveyance: data.estimated?.localConveyance || 0,
        meals: data.estimated?.meals || 0,
        other: data.estimated?.other || 0,
        advanceRequested: data.advanceRequested || 0
      });
    });
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    if (!f.fromDate || !f.toDate) return 'Both dates are required.';
    if (new Date(f.toDate) < new Date(f.fromDate)) return 'To date must be on or after From date.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }

    setError(''); setBusy(true);
    try {
      const payload = {
        fromDate: f.fromDate, toDate: f.toDate, category: f.category,
        visitingPlace: f.visitingPlace, company: f.company,
        purpose: f.purpose, mode: f.mode,
        estimated: {
          airRail: Number(f.airRail) || 0,
          lodging: Number(f.lodging) || 0,
          localConveyance: Number(f.localConveyance) || 0,
          meals: Number(f.meals) || 0,
          other: Number(f.other) || 0
        },
        advanceRequested: Number(f.advanceRequested) || 0
      };

      let id2;
      if (isEdit) {
        const { data } = await api.put(`/travel-requests/${id}`, payload);
        id2 = data._id;
      } else {
        const { data } = await api.post('/travel-requests', payload);
        id2 = data._id;
      }
      await api.post(`/travel-requests/${id2}/submit`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const eb = Number(f.localConveyance) + Number(f.meals) + Number(f.other);
  const cap = Math.floor(eb * 0.6);
  const totalEst = ['airRail', 'lodging', 'localConveyance', 'meals', 'other']
    .reduce((s, k) => s + (Number(f[k]) || 0), 0);

  const lastReturn = existing?.approvals?.slice().reverse()
    .find(a => a.decision === 'Returned');

  return (
    <div className="card">
      <h2>{isEdit ? 'Edit Travel Request' : 'New Travel Request'}</h2>

      {lastReturn && (
        <div className="flags">
          <strong>Returned by {lastReturn.approverName || lastReturn.role}</strong>
          <div style={{ marginTop: 4 }}>{lastReturn.remarks || 'No remarks provided.'}</div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <form onSubmit={submit}>
        <div className="row">
          <div className="field"><label>From Date</label>
            <input type="date" value={f.fromDate} onChange={set('fromDate')} required />
          </div>
          <div className="field"><label>To Date</label>
            <input type="date" value={f.toDate} onChange={set('toDate')} required />
          </div>
        </div>

        <div className="row">
          <div className="field">
            <label>Category</label>
            <select value={f.category} onChange={set('category')}>
              <option>Domestic - Tier 1</option>
              <option>Domestic - Tier 2</option>
              <option>Domestic - Tier 3</option>
            </select>
          </div>
          <div className="field"><label>Mode</label>
            <select value={f.mode} onChange={set('mode')}>
              <option>Flight</option><option>Train</option><option>Car</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div className="field"><label>Visiting Place</label>
            <input value={f.visitingPlace} onChange={set('visitingPlace')} required />
          </div>
          <div className="field"><label>Company</label>
            <input value={f.company} onChange={set('company')} />
          </div>
        </div>

        <div className="field"><label>Purpose</label>
          <input value={f.purpose} onChange={set('purpose')} />
        </div>

        <div className="section-title">Estimated Cost</div>
        <div className="row-3">
          <div className="field"><label>Air / Rail (company)</label><input type="number" value={f.airRail} onChange={set('airRail')} /></div>
          <div className="field"><label>Lodging (company)</label><input type="number" value={f.lodging} onChange={set('lodging')} /></div>
          <div className="field"><label>Local Conveyance</label><input type="number" value={f.localConveyance} onChange={set('localConveyance')} /></div>
        </div>
        <div className="row-3">
          <div className="field"><label>Meals</label><input type="number" value={f.meals} onChange={set('meals')} /></div>
          <div className="field"><label>Other</label><input type="number" value={f.other} onChange={set('other')} /></div>
          <div className="field"><label>Total (auto)</label><input value={`₹${totalEst}`} disabled /></div>
        </div>

        <div className="field">
          <label>Travel advance requested</label>
          <input type="number" value={f.advanceRequested} onChange={set('advanceRequested')} />
          <div className="muted">Employee-borne estimate ₹{eb} → cap ₹{cap}</div>
        </div>

        <div className="form-actions">
          <button disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save and Resubmit' : 'Submit for Approval'}
          </button>
          <button type="button" className="secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}