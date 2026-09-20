const router = require('express').Router();
const auth = require('../middleware/auth');
const allowRoles = require('../middleware/roles');
const ctrl = require('../controllers/adminController');

router.use(auth, allowRoles('Admin'));

router.get('/users', ctrl.users);
router.get('/stats', ctrl.stats);
router.get('/travel-requests', ctrl.travelRequests);
router.get('/settlements', ctrl.settlements);

module.exports = router;