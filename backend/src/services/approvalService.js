const User = require('../models/User');
const { requiredApprovalRoles } = require('../config/policy');

async function buildApproverChain(employee) {
  const chain = [];
  const seen = new Set();
  let cursor = employee;
  while (cursor?.reportingManagerCode && !seen.has(cursor.reportingManagerCode)) {
    seen.add(cursor.reportingManagerCode);
    const mgr = await User.findOne({ empCode: cursor.reportingManagerCode });
    if (!mgr) break;
    chain.push(mgr);
    cursor = mgr;
  }
  return chain;
}

async function computeApprovalChain(employee, amount) {
  const requiredRoles = requiredApprovalRoles(amount);
  const chain = await buildApproverChain(employee);
  const out = [];
  const usedIds = new Set();

  for (const role of requiredRoles) {
    const match = chain.find(u =>
      u.role === role &&
      u.empCode !== employee.empCode &&
      !usedIds.has(u._id.toString())
    );
    if (match) {
      usedIds.add(match._id.toString());
      out.push({
        level: out.length + 1,
        role,
        approver: match._id,
        approverName: match.name,
        decision: null
      });
    }
  }
  return out;
}

function applyDecision(entity, userId, decision, remarks, finalStatus = 'Approved') {
  if (entity.status !== 'Pending') throw new Error('Not pending');
  const current = entity.approvals[entity.currentLevel];
  if (!current) throw new Error('No current approver');
  if (current.approver.toString() !== userId.toString()) throw new Error('Not the current approver');

  current.decision = decision;
  current.date = new Date();
  current.remarks = remarks || '';

  if (decision === 'Rejected') {
    entity.status = 'Rejected';
  } else if (decision === 'Returned') {
    entity.status = 'Returned';
  } else {
    entity.currentLevel += 1;
    if (entity.currentLevel >= entity.approvals.length) {
      entity.status = finalStatus;
    }
  }
  return entity;
}

module.exports = { buildApproverChain, computeApprovalChain, applyDecision };