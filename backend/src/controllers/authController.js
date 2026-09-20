const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  secure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

function sign(user) {
  return jwt.sign(
    { id: user._id, role: user.role, empCode: user.empCode },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  res.cookie(COOKIE_NAME, sign(user), COOKIE_OPTS);
  res.json({
    user: {
      id: user._id, empCode: user.empCode, name: user.name,
      email: user.email, role: user.role,
      department: user.department, costCentre: user.costCentre
    }
  });
};

exports.logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ ok: true });
};

exports.me = (req, res) => res.json({ user: req.user || null });