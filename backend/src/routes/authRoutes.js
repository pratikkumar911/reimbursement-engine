const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', auth.optional, ctrl.me);

module.exports = router;