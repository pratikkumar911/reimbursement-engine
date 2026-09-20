const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/travelRequestController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.post('/:id/submit', ctrl.submit);
router.post('/:id/act', ctrl.act);
router.post('/:id/advance/disburse', ctrl.disburseAdvance);

module.exports = router;