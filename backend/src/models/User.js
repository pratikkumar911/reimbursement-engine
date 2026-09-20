const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  empCode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  designation: String,
  department: String,
  costCentre: String,
  city: String,
  reportingManagerCode: String,
  role: {
    type: String,
    enum: ['Employee', 'Reporting Manager', 'Head of Department', 'Head of Division', 'Finance', 'MD', 'Admin'],
    default: 'Employee'
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
