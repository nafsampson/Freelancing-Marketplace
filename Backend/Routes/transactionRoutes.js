const express = require('express');
const router = express.Router();

const { getIncome } = require('../Controllers/transactionController');
const { protect, authorizeRoles } = require('../Middleware/authMiddleware');

router.get('/income', protect, authorizeRoles('Freelancer'), getIncome);



module.exports = router;

