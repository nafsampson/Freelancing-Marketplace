const logger = require('../utils/logger');
const errorHandler = (err, req, res, next) => {

    // Default error messages if none of the others are applicable
    let statusCode = 500;
    let message = 'Something went wrong';

    // handles the mongoose cast error
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Incorrect ID format';
    }

    // handles the mongoose validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const messages = Object.values(err.errors).map((val) => val.message);
        message = messages.join(', ');
    }

    // handles the mongoose error when there is a duplicate key for example when a user registers with an email that already exists
    if (err.code === 11000) {
        statusCode = 409;
        message = 'Resource already exists';
    }

    // handling incorrect json format, used for testing in postman
    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Invalid JSON in request body';
    }

    // Log errors securely without exposing sensitive information
    const log = req.log || logger;

    const errorDetails = {
        statusCode,
        method: req.method,
        path: (req.originalUrl || '').split('?')[0],
        userId: req.user?.id,
        errorName: err.name,
        error: logger.scrubText(err.message || '')
    };

    if (statusCode >= 500) {
        log.error('application_error', {
            ...errorDetails,
            stack: logger.scrubText(err.stack || '')
        });
    } else {
        log.warn('application_error', errorDetails);
    }

    // Return a safe error response with the request ID
    return res.status(statusCode).json({
        success: false,
        message: message,
        requestId: req.id
    });
};

module.exports = errorHandler; 