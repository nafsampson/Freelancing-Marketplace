const Gig = require('../models/Gig');
const mongoose = require('mongoose');


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


//function to check if the freelancer owns the gig or if the user is an admin. This is for deleting
const checkOwnGigOrAdmin = (gig, user) => {
    if(user.role ==='Admin'){
        return true;
    }

    // If user is a Freelancer, their ID must match the gig's freelancerId
    if (user.role === 'Freelancer' && gig.freelancerId.toString() === user.id) {
            return true;
    }
    return false; 
};



const createGig = async(req, res, next)=>{
    try{
        const idForGig = {...req.body, freelancerId:req.user.id}; //automatically setting the freelancer id from the users logged in id
        const newGig = await Gig.create(idForGig); 
        //populating the freelancers name when creating the gig
        const populatedGig = await Gig.findById(newGig._id).populate('freelancerId', 'fullName');
        return res.status(201).json({
            success:true,
            data:formatGig(populatedGig)
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

//getting freelancer gigs
const getMyGigs = async (req,res,next)=>{
    try{
        const myGigs = await Gig.find({ freelancerId: req.user.id }).populate('freelancerId', 'fullName').sort({ createdAt: -1 });
        const formattedGigs = myGigs.map(formatGig);
        return res.status(200).json({
            success:true,
            count:formattedGigs.length,
            data:formattedGigs
        });
    }catch(error){
        next(error);
    }
};

const getGigById = async(req,res,next)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.id)){ //checking if the id is valid and returning 400 if its invalid
            return res.status(400).json({
                success:false,
                message:'Incorrect gig ID format'
            });
        }

        const individualGig = await Gig.findById(req.params.id).populate('freelancerId', 'fullName');
        //checking if gig exists and returning a 404 not found if it isnt
        if (!individualGig) {
            return res.status(404).json({
                success: false,
                message: 'Gig not found'
            });
        }

        return res.status(200).json({
            success:true,
            data: formatGig(individualGig)
        });
    }catch(error){
        next(error);
    }
};

const updateGig = async(req,res,next)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.id)){ //checking if the id is valid and returning 400 if its invalid
            return res.status(400).json({
                success:false,
                message:'Incorrect gig ID format'
            });
        }

        const gigToUpdate = await Gig.findById(req.params.id); //finding the gig
        //checking if the gig exists before attempting to update
        if (!gigToUpdate) {
            return res.status(404).json({
                success: false,
                message: 'Gig to update was not found'
            });
        }

        //checking that they own the gig or are an admin before updating
        if (!checkOwnGigOrAdmin(gigToUpdate, req.user)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to update this gig'
            });
        }

        //assigning teh validated fields and saving
        Object.assign(gigToUpdate, req.body);
        await gigToUpdate.save();

        const updatedGig = await Gig.findById(gigToUpdate._id).populate('freelancerId', 'fullName');
        return res.status(200).json({
            success:true,
            data:formatGig(updatedGig)
        });

    }catch(error){
        next(error);
    }
};


const deleteGig = async (req, res, next)=>{
    try{
        if(!mongoose.isValidObjectId(req.params.id)){ //checking if the id is valid and returning 400 if its invalid
            return res.status(400).json({
                success:false,
                message:'Incorrect gig ID format'
            });
        }

        const gigToDelete = await Gig.findById(req.params.id); //finding the gig to delete
        if(!gigToDelete){
            return res.status(404).json({
                success:false,
                message:'Gig to delete was not found'
            });
        }

        //checking if the freelancer is trying to delete their own gig and if they arent then blocking them
        //checking that they own the gig or are an admin before updating
        if (!checkOwnGigOrAdmin(gigToDelete, req.user)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this gig'
            });
        }

        await Gig.findByIdAndDelete(req.params.id);
        return res.status(200).json({
            success:true,
            message:'Gig has been deleted'
        });
    }catch(error){
        next(error)
    }
};
module.exports = { createGig, getGigs, getMyGigs, getGigById, updateGig, deleteGig };