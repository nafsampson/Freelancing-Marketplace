const mongoose = require("mongoose");

const gigSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        minlength: [5, 'Title must be at least 5 characters'],
        maxlength: [100, 'Title must not exceed 100 characters'],
        trim: true
    },

    description: {
        type: String,
        required: [true, 'Description is required'],
        minlength: [20, 'Description must be at least 20 characters'],
        maxlength: [2000, 'Description must not exceed 2000 characters'],
        trim: true 
    },

    category: {
        type: String,
        required: [true, 'Category is required'],
        minlength: [2, 'Category must be at least 2 characters'],
        maxlength: [60, 'Category must not exceed 60 characters'],
        trim: true
    },

    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: 0,
        max: 10000000
    },

    skills: [String],

    freelancerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, 'Your freelancer ID is required'],
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.models.Gig || mongoose.model("Gig", gigSchema);