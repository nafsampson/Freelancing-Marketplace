const mongoose = require('mongoose');

const validateObjectIdParam = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    next();
};

const validateCreateBooking = (req, res, next) => {
    const { gigId } = req.body || {};

    if (!gigId) {
        return res.status(400).json({ error: 'gigId is required' });
    }

    if (typeof gigId !== 'string' || !mongoose.isValidObjectId(gigId)) {
        return res.status(400).json({ error: 'gigId must be a valid id' });
    }

    req.body = { gigId };
    next();

};
module.exports = { validateObjectIdParam, validateCreateBooking };

