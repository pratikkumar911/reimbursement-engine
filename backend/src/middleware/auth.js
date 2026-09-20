const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function getUser(req) {
  const token = req.cookies?.token;
  if (!token) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return User.findById(decoded.id).select('-passwordHash');
}

module.exports = async function auth(req, res, next) {
  try {
    const user = await getUser(req);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid user' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Auth failed' });
  }
};

module.exports.optional = async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    const user = await getUser(req);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid user' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Auth failed' });
  }
};