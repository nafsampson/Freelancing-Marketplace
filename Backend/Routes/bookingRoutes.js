const express = require('express');
const router = express.Router();

const {
    createBooking,
    getBookings,
    getBookingById,
    acceptBooking,
    rejectBooking,
    completeBooking
} = require('../Controllers/bookingController');

const {
    validateCreateBooking,
    validateObjectIdParam
} = require('../Middleware/validateBookingInput');

const {
    protect,
    authorizeRoles
} = require('../Middleware/authMiddleware');

const { bookingLimiter } = require('../Middleware/rateLimiters');

router.use(protect);

// Freelancer booking actions
router.patch(
    '/:id/accept',
    validateObjectIdParam,
    authorizeRoles('Freelancer'),
    acceptBooking
);

router.patch(
    '/:id/reject',
    validateObjectIdParam,
    authorizeRoles('Freelancer'),
    rejectBooking
);

router.patch(
    '/:id/complete',
    validateObjectIdParam,
    authorizeRoles('Freelancer'),
    completeBooking
);

// Existing booking functionality
router.get('/:id', validateObjectIdParam, getBookingById);

router.post(
    '/',
    bookingLimiter,
    authorizeRoles('Client'),
    validateCreateBooking,
    createBooking
);

router.get('/', getBookings);

module.exports = router;
