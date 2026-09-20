const Settlement = require('../models/Settlement');
const TravelRequest = require('../models/TravelRequest');
const { evaluateSettlement } = require('../services/policyService');
const { computeApprovalChain, applyDecision } = require('../services/approvalService');
const { SETTLEMENT_WINDOW_DAYS } = require('../config/policy');

async function nextId() {
  const count = await Settlement.countDocuments();
  return `SET-2026-${String(count + 1).padStart(4, '0')}`;
}

function recalc(settlement, travelRequest) {
  const evaluation = evaluateSettlement(settlement, travelRequest);
  settlement.totals = evaluation.totals;
  settlement.disallowedItems = evaluation.disallowedItems;
  settlement.flags = evaluation.flags;
}

// Only Employees may file settlements
function requireEmployee(req, res) {
  if (req.user.role !== 'Employee') {
    res.status(403).json({ message: 'Only employees can file settlements' });
    return false;
  }
  return true;
}

exports.create = async (req, res) => {
  if (!requireEmployee(req, res)) return;

  try {
    const { travelRequestId, lodging = [], transportation = [], otherExpenses = [] } = req.body;

    const tr = await TravelRequest.findById(travelRequestId);
    if (!tr) return res.status(404).json({ message: 'Travel request not found' });
    if (tr.employee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your travel request' });
    }
    if (tr.status !== 'Approved') {
      return res.status(400).json({ message: 'Travel request not approved yet' });
    }

    const existingSettlement = await Settlement.findOne({
      travelRequest: tr._id,
      status: { $in: ['Draft', 'Pending', 'Verified', 'Paid', 'Returned'] }
    });
    if (existingSettlement) {
      return res.status(400).json({
        message: `A settlement already exists for this travel request (${existingSettlement.settlementId}). Edit that one instead.`
      });
    }

    const settlement = new Settlement({
      settlementId: await nextId(),
      travelRequest: tr._id,
      employee: req.user._id,
      lodging, transportation, otherExpenses,
      status: 'Draft'
    });
    recalc(settlement, tr);
    await settlement.save();
    res.status(201).json(settlement);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  if (!requireEmployee(req, res)) return;

  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ message: 'Not found' });
  if (settlement.employee.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not yours' });
  }
  if (!['Draft', 'Returned'].includes(settlement.status)) {
    return res.status(400).json({ message: `Cannot edit in ${settlement.status}` });
  }

  const { lodging, transportation, otherExpenses } = req.body;
  if (lodging) settlement.lodging = lodging;
  if (transportation) settlement.transportation = transportation;
  if (otherExpenses) settlement.otherExpenses = otherExpenses;

  const tr = await TravelRequest.findById(settlement.travelRequest);
  recalc(settlement, tr);
  await settlement.save();
  res.json(settlement);
};

exports.submit = async (req, res) => {
  if (!requireEmployee(req, res)) return;

  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ message: 'Not found' });
  if (settlement.employee.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not yours' });
  }
  if (!['Draft', 'Returned'].includes(settlement.status)) {
    return res.status(400).json({ message: `Cannot submit in ${settlement.status}` });
  }

  const missingProof =
    settlement.lodging.some(l => !l.proofRef) ||
    settlement.transportation.some(l => !l.proofRef) ||
    settlement.otherExpenses.some(l => !l.proofRef);
  if (missingProof) {
    return res.status(400).json({ message: 'Every claim line needs a proof reference' });
  }

  const tr = await TravelRequest.findById(settlement.travelRequest);

  // 7-day submission window (policy §5.1)
  const daysSinceReturn = Math.ceil((Date.now() - new Date(tr.toDate)) / 86400000);
  if (daysSinceReturn > SETTLEMENT_WINDOW_DAYS) {
    settlement.flags = [...(settlement.flags || []),
      `Submitted ${daysSinceReturn} days after return (policy limit ${SETTLEMENT_WINDOW_DAYS})`];
  }

  const chain = await computeApprovalChain(req.user, settlement.totals.netReimbursable);
  chain.push({
    level: chain.length + 1,
    role: 'Finance',
    approver: null,
    approverName: 'Finance Desk',
    decision: null
  });

  settlement.approvals = chain;
  settlement.currentLevel = 0;
  settlement.status = 'Pending';
  await settlement.save();
  res.json(settlement);
};

exports.list = async (req, res) => {
  const filter = {};
  if (req.user.role === 'Employee') filter.employee = req.user._id;
  const list = await Settlement.find(filter).sort({ createdAt: -1 });
  res.json(list);
};

exports.get = async (req, res) => {
  const s = await Settlement.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Not found' });
  res.json(s);
};

exports.act = async (req, res) => {
  const { decision, remarks } = req.body;
  if (!['Approved', 'Returned', 'Rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Invalid decision' });
  }

  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ message: 'Not found' });

  const current = settlement.approvals[settlement.currentLevel];
  if (!current) return res.status(400).json({ message: 'No current approver' });

  let actingUserId = req.user._id;
  if (current.role === 'Finance') {
    if (req.user.role !== 'Finance') return res.status(403).json({ message: 'Finance only' });
    current.approver = req.user._id;
    current.approverName = req.user.name;
  } else if (current.approver.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not the current approver' });
  }

  try {
    applyDecision(settlement, actingUserId, decision, remarks, 'Verified');
    await settlement.save();
    res.json(settlement);
  } catch (err) {
    res.status(403).json({ message: err.message });
  }
};

exports.pay = async (req, res) => {
  if (req.user.role !== 'Finance') return res.status(403).json({ message: 'Finance only' });

  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ message: 'Not found' });
  if (settlement.status !== 'Verified') {
    return res.status(400).json({ message: 'Not yet verified' });
  }
  settlement.status = 'Paid';
  await settlement.save();
  res.json(settlement);
};