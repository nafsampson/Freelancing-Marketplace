const express = require('express');
const router = express.Router();

const { deleteGig, createGig, getGigs, getMyGigs, getGigById, updateGig } = require('../Controllers/gigController');
const {protect} = require('../Middleware/authMiddleware');
const {authorizeRoles} = require('../Middleware/authMiddleware');
const { validateGigInput } = require('../Middleware/validateGigInput');

router.get('/', getGigs); //getting all the public gigs
router.get('/mine', protect, authorizeRoles('Freelancer'), getMyGigs); //getting logged in freelancers gigs
router.get('/:id', getGigById); //getting individual gig 
router.post('/', protect, authorizeRoles('Freelancer'), validateGigInput, createGig); //creating a new gig
router.put('/:id', protect, authorizeRoles('Freelancer', 'Admin'), validateGigInput, updateGig); //updating a gig
router.delete('/:id', protect, authorizeRoles('Freelancer', 'Admin'), deleteGig); //deleting a gig

module.exports = router;