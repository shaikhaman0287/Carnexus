const express = require('express');
const router = express.Router();
const { getCars, getCar, addCar, updateCarStatus, deleteCar } = require('../controllers/carController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', getCars);
router.get('/:id', getCar);
router.post('/', requireAuth, requireAdmin, addCar);
router.put('/:id/status', requireAuth, requireAdmin, updateCarStatus);
router.delete('/:id', requireAuth, requireAdmin, deleteCar);

module.exports = router;
