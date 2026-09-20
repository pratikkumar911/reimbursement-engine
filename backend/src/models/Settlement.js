const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  level: Number,
  role: String,
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approverName: String,
  decision: { type: String, enum: ['Approved', 'Returned', 'Rejected', null], default: null },
  date: Date,
  remarks: String
}, { _id: false });

const lodgingLine = new mongoose.Schema({
  checkIn: Date, checkOut: Date, nights: Number,
  hotelName: String, city: String, cityTier: String,
  paidBy: { type: String, enum: ['Employee', 'Company'] },
  amount: Number, proofRef: String
}, { _id: false });

const transportLine = new mongoose.Schema({
  date: Date, from: String, to: String, mode: String,
  paidBy: { type: String, enum: ['Employee', 'Company'] },
  amount: Number, proofRef: String
}, { _id: false });

const otherLine = new mongoose.Schema({
  date: Date, head: String, description: String,
  paidBy: { type: String, enum: ['Employee', 'Company'] },
  amount: Number, proofRef: String
}, { _id: false });

const settlementSchema = new mongoose.Schema({
  settlementId: { type: String, unique: true },
  travelRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'TravelRequest', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  settlementDate: { type: Date, default: Date.now },

  lodging: [lodgingLine],
  transportation: [transportLine],
  otherExpenses: [otherLine],

  totals: {
    employeePaid: { type: Number, default: 0 },
    companyPaid: { type: Number, default: 0 },
    disallowed: { type: Number, default: 0 },
    netReimbursable: { type: Number, default: 0 },
    advanceAdjusted: { type: Number, default: 0 },
    payable: { type: Number, default: 0 },
    recoverable: { type: Number, default: 0 }
  },

  disallowedItems: [{ head: String, amount: Number, reason: String }],

  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Verified', 'Paid', 'Rejected', 'Returned'],
    default: 'Draft'
  },
  currentLevel: { type: Number, default: 0 },
  approvals: [approvalSchema],
  flags: [String]
}, { timestamps: true });

module.exports = mongoose.model('Settlement', settlementSchema);