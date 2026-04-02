const express = require('express');
const router = express.Router();
const { getBookings, createBooking, updateBookingStatus, deleteBooking } = require('../controllers/bookingController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/',       requireAuth, getBookings);           // user sees own, admin sees all
router.post('/',      requireAuth, createBooking);         // any logged-in user can book
router.put('/:id',    requireAuth, updateBookingStatus);   // user cancel own, admin approve/cancel
router.delete('/:id', requireAuth, requireAdmin, deleteBooking); // admin only

module.exports = router;
