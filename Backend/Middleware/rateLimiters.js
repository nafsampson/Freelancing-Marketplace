const rateLimit = require('express-rate-limit'); 
const logger = require('../utils/logger'); 

// Reference: INSY7314 Module Manual pg 95
const onLimit = (req, res, next, options) => {                   
    (req.log || logger).warn('rate_limit_exceeded', { path: req.originalUrl.split('?')[0], ip: req.ip });
    res.status(options.statusCode).json(options.message);
}

// Dedicated limiter for registration: protects against automated mass-account creation
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 20,                  // up to 20 registrations per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: onLimit,
    message: { success: false, message: 'Too many registration attempts. Please try again in 15 minutes.' }
});


//reference pg 95 of module manual
const authenticationLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, //creating a 15 minute window
        max: 5, //max amount of 5 attempts
        handler: onLimit,                                        
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' } //message when user attempts too many times
    

});

// Dedicated limiter for login: protects against brute-force password guessing
// skipSuccessfulRequests: true ensures legitimate user logins do NOT count against the threshold,
// meaning only failed login attempts consume the allowance.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 7,                   // allows 7 failed attempts before temporary lockout
    skipSuccessfulRequests: true,
    handler: onLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many failed login attempts. Please try again in 15 minutes.' }
});

// Dedicated limiter for booking creation: prevents rapid automated booking spam
const bookingLimiter = rateLimit({
    windowMs: 60 * 1000, //1 minute window
    max: 10, //max 10 booking requests per minute
    handler: onLimit,                                            
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many booking requests. Please try again in a minute.' }
});

module.exports = {
    registerLimiter,
    loginLimiter,
    bookingLimiter,
    authenticationLimiter
}; 
