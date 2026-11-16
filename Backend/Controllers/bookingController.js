const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const Gig = require('../models/Gig');
const logger = require('../utils/logger');
 

const createBooking = async (req, res, next) => {
    try {
        const { booking, transaction } = await mongoose.connection.transaction(async (session) => {
            const gig = await Gig.findById(req.body.gigId).session(session);

            if (!gig) {
                const error = new Error('Gig not found');
                error.statusCode = 404;
                throw error;
            }

            // Both records belong to one transaction. Never trust a client-supplied price or owner.
            const [booking] = await Booking.create([{
                gigId: gig._id,
                clientId: req.user.id,
                freelancerId: gig.freelancerId,
                amount: gig.price
            }], { session });

            const [transaction] = await Transaction.create([{
                bookingId: booking._id,
                clientId: booking.clientId,
                freelancerId: booking.freelancerId,
                amount: booking.amount
            }], { session });

            return { booking, transaction };
        });

        // The callback may be retried. Report success only after the transaction commits.
        (req.log || logger).info('booking_created', { bookingId: String(booking._id), gigId: String(booking.gigId), userId: req.user.id });
        (req.log || logger).info('transaction_created', { transactionId: String(transaction._id), bookingId: String(booking._id), userId: req.user.id });

        return res.status(201).json({
            message: 'Booking created',
            data: { booking, transaction }
        });

    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        if (
            error.name === 'ValidationError' ||
            error.name === 'CastError'
        ) {
            return res.status(400).json({
                error: 'Invalid booking data'
            });
        }

        next(error);
    }
};

const getBookings = async (req, res, next) => {
    try {
        let filter;

        if (req.user.role === 'Client') {
            filter = { clientId: req.user.id };
        } else if (req.user.role === 'Freelancer') {
            filter = { freelancerId: req.user.id };
        } else {
            filter = {};
        }

        const bookings = await Booking.find(filter)
            .populate('gigId', 'title category price')
            .populate('clientId', 'fullName email')
            .populate('freelancerId', 'fullName email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: bookings.length,
            data: bookings
        });
    } catch (error) {
        next(error);
    }
};

const getBookingById = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('gigId', 'title category price')
            .populate('clientId', 'fullName email')
            .populate('freelancerId', 'fullName email');

        const allowed =
            booking &&
            (
                req.user.role === 'Admin' ||
                String(booking.clientId?._id ?? booking.clientId) === req.user.id ||
                String(booking.freelancerId?._id ?? booking.freelancerId) === req.user.id
            );

            if (!allowed) {
                (req.log || logger).warn('booking_access_denied', {
                    bookingId: req.params.id,
                    userId: req.user.id
                });

                return res.status(404).json({
                    error: 'Booking not found'
                });
            }

        return res.status(200).json({ data: booking });
    } catch (error) {
        next(error);
    }
};

/**
 * Updates a booking and its linked transaction together.
 *
 * Allowed transitions:
 * Pending -> Accepted
 * Pending -> Cancelled (rejected)
 * Accepted -> Completed
 */
const updateBookingStatus = async (
    req,
    res,
    next,
    nextStatus,
    allowedCurrentStatus,
    successMessage,
    transactionStatus
) => {
    try {
        const result = await mongoose.connection.transaction(async (session) => {
            // Scope the booking to the authenticated freelancer.
            // This prevents one freelancer changing another freelancer's booking.
            const booking = await Booking.findOne({
                _id: req.params.id,
                freelancerId: req.user.id
            }).session(session);

            if (!booking) {
                const error = new Error('Booking not found.');
                error.statusCode = 404;
                throw error;
            }

            if (booking.status !== allowedCurrentStatus) {
                const error = new Error(
                    `This booking cannot be changed from ${booking.status} to ${nextStatus}.`
                );
                error.statusCode = 409;
                throw error;
            }

            const transaction = await Transaction.findOne({
                bookingId: booking._id,
                freelancerId: req.user.id
            }).session(session);

            if (!transaction) {
                const error = new Error(
                    'The transaction linked to this booking could not be found.'
                );
                error.statusCode = 409;
                throw error;
            }

            if (transaction.status !== 'Pending') {
                const error = new Error(
                    'The linked transaction is no longer pending.'
                );
                error.statusCode = 409;
                throw error;
            }

            booking.status = nextStatus;
            transaction.status = transactionStatus;
            if (transactionStatus === 'Completed') transaction.completedAt = new Date();

            await booking.save({ session });
            await transaction.save({ session });

            return { booking, transaction };
        });

        return res.status(200).json({
            message: successMessage,
            data: result
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: error.message
            });
        }

        next(error);
    }
};

const acceptBooking = async (req, res, next) => {
    return updateBookingStatus(
        req,
        res,
        next,
        'Accepted',
        'Pending',
        'Booking accepted successfully.',
        'Pending'
    );
};

const rejectBooking = async (req, res, next) => {
    return updateBookingStatus(
        req,
        res,
        next,
        'Cancelled',
        'Pending',
        'Booking rejected successfully.',
        'Cancelled'
    );
};

const completeBooking = async (req, res, next) => {
    return updateBookingStatus(
        req,
        res,
        next,
        'Completed',
        'Accepted',
        'Booking marked as completed successfully.',
        'Completed'
    );
};

module.exports = {
    createBooking,
    getBookings,
    getBookingById,
    acceptBooking,
    rejectBooking,
    completeBooking
};
