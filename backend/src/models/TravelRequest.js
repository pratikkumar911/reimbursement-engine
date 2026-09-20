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

const travelRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeCode: String,

  fromDate: Date,
  toDate: Date,
  days: Number,
  category: { type: String, default: 'Domestic - Tier 1' },
  visitingPlace: String,
  company: String,
  purpose: String,
  mode: String,

  estimated: {
    airRail: { type: Number, default: 0 },
    lodging: { type: Number, default: 0 },
    localConveyance: { type: Number, default: 0 },
    meals: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },

  advanceRequested: { type: Number, default: 0 },
  advanceDisbursed: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Returned'],
    default: 'Draft'
  },
  currentLevel: { type: Number, default: 0 },
  approvals: [approvalSchema],
  flags: [String]
}, { timestamps: true });

module.exports = mongoose.model('TravelRequest', travelRequestSchema);
