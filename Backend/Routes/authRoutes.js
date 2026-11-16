//REFERENCE: INSY7314 module manual pg 90

const express = require('express');
const router = express.Router();

const { register, login, getUserProfile, logout } = require('../Controllers/authController');
const {protect} = require('../Middleware/authMiddleware');

const { validateRegisterInput, validateLoginInput } = require('../Middleware/validateAuthInput');
const { registerLimiter, loginLimiter } = require('../Middleware/rateLimiters');


//creating the routes for requests
router.post('/register', registerLimiter, validateRegisterInput, register); //ensuring users input is validated before registering
router.post('/login', loginLimiter, validateLoginInput, login); //ensuring users input is validated before logging in
router.get('/profile', protect, getUserProfile); //protecting access to user profile with role based access control
router.post('/logout', protect, logout);


module.exports = router; 