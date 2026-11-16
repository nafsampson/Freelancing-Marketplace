const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(
    {
        fullName:{
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
            minlength: [2, 'Full name must be at least 2 characters'],
            maxlength: [80, 'Full name must not exceed 80 characters'] 
        },
        email:{
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'] //regex to ensure correct email syntax
        },
        passwordHash:{
            type: String,
            required: [true, 'Password hash is required'],
            select: false

        },
        role:{
            type: String,
            enum: ['Client', 'Admin', 'Freelancer'],
            default: 'Client'
        },
        //new security feature. Storing how many failed login attempts a user has had and how long their account is locked for after too many attempts
        failedLoginAttempts:{
            type: Number,
            default:0
        },
        lockedUntil:{
            type: Date,
            default:null
        }
    },
    {timestamps:true}
);
module.exports = mongoose.model('User', userSchema);