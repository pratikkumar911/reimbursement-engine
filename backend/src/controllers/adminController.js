const User = require('../models/User');
const TravelRequest = require('../models/TravelRequest');
const Settlement = require('../models/Settlement');

exports.users = async (req, res) => {
  res.json(await User.find().select('-passwordHash').sort({ empCode: 1 }));
};

exports.travelRequests = async (req, res) => {
  res.json(await TravelRequest.find().sort({ createdAt: -1 }));
};

exports.settlements = async (req, res) => {
  res.json(await Settlement.find().sort({ createdAt: -1 }));
};

exports.stats = async (req, res) => {
  const [users, trs, sets, pendingTR, pendingSET] = await Promise.all([
    User.countDocuments(),
    TravelRequest.countDocuments(),
    Settlement.countDocuments(),
    TravelRequest.countDocuments({ status: 'Pending' }),
    Settlement.countDocuments({ status: 'Pending' })
  ]);
  res.json({ users, travelRequests: trs, settlements: sets, pendingTravelRequests: pendingTR, pendingSettlements: pendingSET });
};