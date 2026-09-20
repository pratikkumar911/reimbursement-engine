function requiredApprovalRoles(amount) {
  if (amount <= 25000) return ['Reporting Manager'];
  if (amount <= 75000) return ['Reporting Manager', 'Head of Department'];
  if (amount <= 200000) return ['Reporting Manager', 'Head of Department', 'Head of Division'];
  return ['Reporting Manager', 'Head of Department', 'Head of Division', 'MD'];
}

module.exports = {
  LODGING_LIMIT: { 'Tier 1': 6000, 'Tier 2': 4000, 'Tier 3': 2800 },
  MEAL_LIMIT_PER_DAY: { 'Tier 1': 1500, 'Tier 2': 1000, 'Tier 3': 1000 },
  ADVANCE_PERCENT: 0.6,
  SETTLEMENT_WINDOW_DAYS: 7,
  MEAL_BILL_THRESHOLD: 500,
  NON_REIMBURSABLE: [
    'laundry', 'mini bar', 'in-room entertainment', 'spa', 'gym',
    'personal phone', 'data charge', 'alcohol', 'fine', 'penalty',
    'traffic challan', 'travel insurance'
  ],
  requiredApprovalRoles
};