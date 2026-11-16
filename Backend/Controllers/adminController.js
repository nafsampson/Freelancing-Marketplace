const User = require('../models/usersModel');
const Gig = require('../models/Gig');
const Booking = require('../models/Booking');

const formatForUser = (user)=>({
    id: user._id,
    name: user.fullName,
    email: user.email,
    role: user.role
});
const formatGig = (gig)=>({
    id: gig._id,
    title: gig.title,
    description: gig.description,
    category: gig.category,
    price: gig.price,
    skills: gig.skills,
    createdAt: gig.createdAt,
    freelancer: {
        id: gig.freelancerId?._id || gig.freelancerId,
        name: gig.freelancerId?.fullName || 'Independent freelancer' // Maps fullName to 'name' for the frontend cards
    }
});
//getting the platform stats for admins to manage application
const getStats = async (req, res, next) =>{
    try{
        //counting stats
        const [
            totalUsers,
            clientUsers,
            freelancerUsers,
            totalGigs,
            totalBookings
        ] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ role: 'Client' }),
            User.countDocuments({ role: 'Freelancer' }),
            Gig.countDocuments({}),
            Booking.countDocuments({})
        ]);

        return res.status(200).json({
            success:true,
            data:{
                totalUsers,
                clientUsers,
                freelancerUsers,
                totalGigs,
                totalBookings
            }
        });
    }catch(error){
        next(error);
    }
};

//getting all users for admin to manage
const getUsers = async(req, res, next) =>{
    try{
        const users = await User.find({}).select('fullName email role createdAt').sort({ createdAt: -1 }).limit(100); //selecting only allowed fields from database and sorting by newest first with results capped to 100
        const formattedUsers = users.map(formatForUser);

        return res.status(200).json({
            success:true,
            count: formattedUsers.length,
            data:formattedUsers
        });
    }catch(error){
        next(error);
    }

};

const getGigs = async(req,res, next) =>{
    try{
        //getting all gigs only with name and email and sorting from newest first and capping at 100
        const gigsToGet = await Gig.find({}).populate('freelancerId', 'fullName').sort({ createdAt: -1 }).limit(100);
        const formattedGigs = gigsToGet.map(formatGig);
        return res.status(200).json({
            success:true,
            count:formattedGigs.length,
            data:formattedGigs
        });
    }catch(error){
        next(error);
    }
};
module.exports = {getStats, getUsers, getGigs};