const express = require('express');
const router = express.Router();

const { getStats, getUsers, getGigs } = require('../Controllers/adminController');
const {protect} = require('../Middleware/authMiddleware');
const {authorizeRoles} = require('../Middleware/authMiddleware');

// Protect all admin routes and restrict to Admin role automatically
router.use(protect, authorizeRoles('Admin'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/gigs', getGigs);

module.exports = router;