const TravelRequest = require('../models/TravelRequest');
const Settlement = require('../models/Settlement');
const { computeApprovalChain, applyDecision } = require('../services/approvalService');
const { ADVANCE_PERCENT } = require('../config/policy');

async function nextId() {
  const count = await TravelRequest.countDocuments();
  return `TRQ-2026-${String(count + 1).padStart(4, '0')}`;
}

// Only Employees may raise travel requests
function requireEmployee(req, res) {
  if (req.user.role !== 'Employee') {
    res.status(403).json({ message: 'Only employees can raise travel requests' });
    return false;
  }
  return true;
}

exports.create = async (req, res) => {
  if (!requireEmployee(req, res)) return;

  try {
    const {
      fromDate, toDate, category, visitingPlace, company, purpose, mode,
      estimated = {}, advanceRequested = 0
    } = req.body;

    // date validation server-side (mirrors frontend)
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'From and To dates are required' });
    }
    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ message: 'To date must be on or after From date' });
    }

    const total = ['airRail', 'lodging', 'localConveyance', 'meals', 'other']
      .reduce((s, k) => s + (Number(estimated[k]) || 0), 0);

    const employeeBorne = (Number(estimated.localConveyance) || 0)
                        + (Number(estimated.meals) || 0)
                        + (Number(estimated.other) || 0);
    const advanceCap = Math.floor(employeeBorne * ADVANCE_PERCENT);

    const flags = [];
    if (advanceRequested > advanceCap) {
      flags.push(`Advance requested ₹${advanceRequested} exceeds 60% cap ₹${advanceCap}`);
    }

    const days = fromDate && toDate
      ? Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1
      : 0;

    const tr = await TravelRequest.create({
      requestId: await nextId(),
      employee: req.user._id,
      employeeCode: req.user.empCode,
      fromDate, toDate, days, category, visitingPlace, company, purpose, mode,
      estimated: { ...estimated, total },
      advanceRequested,
      status: 'Draft',
      flags
    });

    res.status(201).json(tr);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.submit = async (req, res) => {
  if (!requireEmployee(req, res)) return;

  const tr = await TravelRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: 'Not found' });
  if (tr.employee.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not your request' });
  }
  if (!['Draft', 'Returned'].includes(tr.status)) {
    return res.status(400).json({ message: `Cannot submit from ${tr.status}` });
  }

  const chain = await computeApprovalChain(req.user, tr.estimated.total);
  if (chain.length === 0) {
    return res.status(400).json({ message: 'No approvers found for this request' });
  }

  tr.approvals = chain;
  tr.currentLevel = 0;
  tr.status = 'Pending';
  await tr.save();
  res.json(tr);
};

exports.list = async (req, res) => {
  const filter = {};
  if (req.user.role === 'Employee') filter.employee = req.user._id;
  const list = await TravelRequest.find(filter).sort({ createdAt: -1 }).lean();

  if (req.user.role === 'Employee') {
    const settlements = await Settlement.find({
      travelRequest: { $in: list.map(tr => tr._id) }
    }).select('travelRequest').lean();
    const settledTravelRequestIds = new Set(
      settlements.map(settlement => settlement.travelRequest.toString())
    );
    return res.json(list.map(tr => ({
      ...tr,
      hasSettlement: settledTravelRequestIds.has(tr._id.toString())
    })));
  }

  res.json(list);
};

exports.get = async (req, res) => {
  const tr = await TravelRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: 'Not found' });
  res.json(tr);
};

exports.act = async (req, res) => {
  const { decision, remarks } = req.body;
  if (!['Approved', 'Returned', 'Rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Invalid decision' });
  }

  const tr = await TravelRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: 'Not found' });

  try {
    applyDecision(tr, req.user._id, decision, remarks, 'Approved');
    await tr.save();
    res.json(tr);
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
};

exports.disburseAdvance = async (req, res) => {
  const tr = await TravelRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: 'Not found' });
  if (!['Finance', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Finance only' });
  }
  if (tr.status !== 'Approved') {
    return res.status(400).json({ message: 'Travel request not approved' });
  }
  if (!tr.advanceRequested) {
    return res.status(400).json({ message: 'No advance requested' });
  }
  tr.advanceDisbursed = tr.advanceRequested;
  await tr.save();
  res.json(tr);
};

exports.update = async (req, res) => {
  if (!requireEmployee(req, res)) return;

  const tr = await TravelRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: 'Not found' });
  if (tr.employee.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not your request' });
  }
  if (!['Draft', 'Returned'].includes(tr.status)) {
    return res.status(400).json({ message: `Cannot edit in ${tr.status}` });
  }

  const {
    fromDate, toDate, category, visitingPlace, company, purpose, mode,
    estimated = {}, advanceRequested = 0
  } = req.body;

  if (!fromDate || !toDate) {
    return res.status(400).json({ message: 'From and To dates are required' });
  }
  if (new Date(toDate) < new Date(fromDate)) {
    return res.status(400).json({ message: 'To date must be on or after From date' });
  }

  const total = ['airRail', 'lodging', 'localConveyance', 'meals', 'other']
    .reduce((s, k) => s + (Number(estimated[k]) || 0), 0);

  const employeeBorne = (Number(estimated.localConveyance) || 0)
                      + (Number(estimated.meals) || 0)
                      + (Number(estimated.other) || 0);
  const advanceCap = Math.floor(employeeBorne * ADVANCE_PERCENT);

  const flags = [];
  if (advanceRequested > advanceCap) {
    flags.push(`Advance requested ₹${advanceRequested} exceeds 60% cap ₹${advanceCap}`);
  }

  const days = Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;

  Object.assign(tr, {
    fromDate, toDate, days, category, visitingPlace, company, purpose, mode,
    estimated: { ...estimated, total },
    advanceRequested,
    flags
  });

  await tr.save();
  res.json(tr);
};