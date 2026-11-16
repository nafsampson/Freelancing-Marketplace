//REFERENCE: INSY7314 Module Manual page 82, 83, 84

const jwt = require('jsonwebtoken');
const User = require('../models/usersModel')
const crypto = require('crypto'); //import to use SHA-256 hashing for jwt tokens
const CancelledTokens = require('../models/cancelledToken');
const logger = require('../utils/logger'); 
//const{findUserByEmail, createUser, findUserById} = require('../models/usersModel');
const{hashedPassword, comparePasswords} = require('../utils/hash');


//used to create a token when a user logs in
const createToken = (user) => {
 return jwt.sign(
    {
        id: String(user._id),
        role: user.role
    },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } //checking in env file for when the jwt token expires. If it cant be found then it defaults to 1 hour
    );
};
const formatForUser = (user)=>({
    id: user._id,
    name: user.fullName,
    email: user.email,
    role: user.role
});
//registering a new account
const register = async (req, res, next) => {
        try {
            const { name, email, password, role } = req.body;

            //checking if an account with that email address has already been created
            const existingUser = await User.findOne({email:email.toLowerCase().trim()});
            if(existingUser){
                (req.log || logger).warn('register_failed', { reason: 'duplicate_account', emailHash: logger.hashIdentifier(email), ip: req.ip });   // ADD
                return res.status(409).json({success:false, message:'User already exists'});
            }

            //hashing the entered password with bcrypt to ensure plain text password is never stored
            const hashPassword = await hashedPassword(password);

            //calling create user from usermodel to create the user with the following details
            const user = await User.create({
                fullName:name.trim(),
                email:email.toLowerCase().trim(),
                passwordHash: hashPassword,
                role
            });

            (req.log || logger).info('register_success', { userId: String(user._id), role: user.role, ip: req.ip });   // ADD


            //returning correct status code for creation along with a creation message as well as the users basic registration information
            res.status(201).json({
                success:true,
                message: 'User registered',
                data: formatForUser(user)
            }); 
    } catch (error) {
        

            next(error);
    }
};

//logging in to an existing account
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        //how many attempts until 
        const maxAttempts = 3;
        const lockedOutLength = 15*60*1000;//15 minutes in millieseconds

        //determining whether the user entered valid credentials
        const user = await User.findOne({email:email.toLowerCase().trim()}).select('+passwordHash');

        if (!user) {

             (req.log || logger).warn('login_failed', { reason: 'unknown_account', emailHash: logger.hashIdentifier(email), ip: req.ip });
            return res.status(401).json({ success:false, message: 'Invalid credentials' });
        }

        //preventing the login while the account is locked
        if(user.lockedUntil && user.lockedUntil> new Date()){
            return res.status(401).json({
                success: false,
                message: 'Account locked for 15 minutes'
            });
        }
        //resetting the locked out counter once the 15 minutes has ended
        if(user.lockedUntil && user.lockedUntil <= new Date()){
            user.failedLoginAttempts = 0;
            user.lockedUntil = null;
        }

        //checking if entered password matches the hashed stored password. Returning an error if it doesnt
        const passwordMatches = await comparePasswords(password, user.passwordHash);

        
        if (!passwordMatches) {
        // Increase the number of failed login attempts
        user.failedLoginAttempts += 1;

        // Lock the account after 3 incorrect passwords
        if (user.failedLoginAttempts >= maxAttempts) {
            user.lockedUntil = new Date(Date.now() + lockedOutLength);
        }

        // Save the failed attempts and lockout status
        await user.save();

        // Log the failed login without recording the password
        (req.log || logger).warn('login_failed', {
            reason: 'incorrect_password',
            userId: String(user._id),
            emailHash: logger.hashIdentifier(email),
            ip: req.ip
        });

        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

        //resetting the amount of failed attempts a user has had after they have logged in successfully
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
        await user.save();

        //creating the users dedicated token
        const token = createToken(user);
        (req.log || logger).info('login_success', { userId: String(user._id), role: user.role, ip: req.ip }); 
        

        //returning the token and their basic login information when they successfully login
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: formatForUser(user)
        });
    } catch (error) {
        next(error);
    }
};

//getting the users profile and returning their information. this is only allowed if a valid jwt token is provided in the request
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('fullName email role createdAt');

        if (!user) {
            return res.status(404).json({ success:false, message: 'User not found' });
        }

        res.status(200).json({success:true, data:formatForUser(user)});
    } catch (error) {
        next(error);
    }
}; 


//logs the user out by cancelling their jwt token
const logout = async(req, res, next)=>{
    try{
        //hashing the users jwt token
        const jwtHash = crypto.createHash('sha256').update(req.token).digest('hex');

        //storing the hashed cancelled token in mongodb once the user logs out
        await CancelledTokens.create({ tokenHash: jwtHash, expiresAt: req.tokenExpiresAt });

        //confirming the logout was successful
        res.status(200).json({success: true, message: 'Logged out successfully'});
    }catch(error){
        next(error);
    }
};
module.exports = {
 register,
 login,
 getUserProfile,
 logout
}; 
