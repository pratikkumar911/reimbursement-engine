const {
  LODGING_LIMIT,
  MEAL_LIMIT_PER_DAY,
  NON_REIMBURSABLE
} = require('../config/policy');

function checkDuplicate(seen, ref, flags) {
  if (seen.has(ref)) flags.push(`Duplicate proof ref: ${ref}`);
  else seen.add(ref);
}

function evaluateSettlement(settlement, travelRequest) {
  const disallowedItems = [];
  const flags = [];
  const seenProof = new Set();

  let employeePaid = 0;
  let companyPaid = 0;
  let disallowed = 0;

  // --- Lodging ---
  for (const line of settlement.lodging || []) {
    if (!line.proofRef) { flags.push(`Missing proof: lodging ${line.hotelName || ''}`); continue; }
    checkDuplicate(seenProof, line.proofRef, flags);

    const limit = LODGING_LIMIT[line.cityTier] || LODGING_LIMIT['Tier 3'];
    const allowed = (line.nights || 0) * limit;
    const excess = Math.max(0, (line.amount || 0) - allowed);

    if (line.paidBy === 'Employee') employeePaid += line.amount || 0;
    else companyPaid += line.amount || 0;

    if (excess > 0) {
      disallowed += excess;
      disallowedItems.push({
        head: `Lodging - ${line.hotelName || ''}`,
        amount: excess,
        reason: `Exceeds ${line.cityTier} limit of ₹${limit}/night`
      });
    }
  }

  // --- Transport ---
  for (const line of settlement.transportation || []) {
    if (!line.proofRef) { flags.push(`Missing proof: transport ${line.from}→${line.to}`); continue; }
    checkDuplicate(seenProof, line.proofRef, flags);

    if (line.paidBy === 'Employee') employeePaid += line.amount || 0;
    else companyPaid += line.amount || 0;
  }

  // --- Other ---
  for (const line of settlement.otherExpenses || []) {
    if (!line.proofRef) { flags.push(`Missing proof: ${line.head || 'other'}`); continue; }
    checkDuplicate(seenProof, line.proofRef, flags);

    const text = `${line.head || ''} ${line.description || ''}`.toLowerCase();
    const isNonReimbursable = NON_REIMBURSABLE.some(k => text.includes(k));

    if (isNonReimbursable) {
      if (line.paidBy === 'Employee') {
        disallowed += line.amount || 0;
        disallowedItems.push({
          head: line.head,
          amount: line.amount,
          reason: 'Non-reimbursable'
        });
      }
      continue;
    }

    // Meal cap
    if (text.includes('meal')) {
      const tier = settlement.cityTier || 'Tier 1';
      const cap = MEAL_LIMIT_PER_DAY[tier] || 1000;
      const excess = Math.max(0, (line.amount || 0) - cap);
      if (excess > 0) {
        disallowed += excess;
        disallowedItems.push({
          head: line.head,
          amount: excess,
          reason: `Meal exceeds ₹${cap} per-day cap`
        });
      }
    }

    if (line.paidBy === 'Employee') employeePaid += line.amount || 0;
    else companyPaid += line.amount || 0;
  }

  // --- Advance adjustment ---
  const advance = travelRequest.advanceDisbursed || 0;
  const netReimbursable = Math.max(0, employeePaid - disallowed);
  const payable = Math.max(0, netReimbursable - advance);
  const recoverable = Math.max(0, advance - netReimbursable);

  return {
    totals: {
      employeePaid, companyPaid, disallowed,
      netReimbursable, advanceAdjusted: advance,
      payable, recoverable
    },
    disallowedItems,
    flags
  };
}

module.exports = { evaluateSettlement };