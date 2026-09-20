const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/settlementController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', ctrl.update);
router.post('/:id/submit', ctrl.submit);
router.post('/:id/act', ctrl.act);
router.post('/:id/pay', ctrl.pay);

module.exports = router;