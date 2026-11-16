// REFERENCE: INSY 7314 module manual pg 88

const jwt = require('jsonwebtoken');
const User = require('../models/usersModel');
const crypto = require('crypto'); //import to use SHA-256 hashing for jwt tokens
const CancelledTokens = require('../models/cancelledToken');
const logger = require('../utils/logger');

//protecting requests with jwt. Ensures a token is provided in requests and verifies a valid token
const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) 
        {

            (req.log || logger).warn('auth_failed', { reason: 'missing_token', path: req.originalUrl.split('?')[0], ip: req.ip });
            return res.status(401).json({ success:false, message: 'No token provided' });
        }

    const token = authHeader.split(' ')[1];

    let decoded;
    try 
    {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        
    } catch (error)
     {
        (req.log || logger).warn('auth_failed', { reason: error.name, path: req.originalUrl.split('?')[0], ip: req.ip });   // ADD
        
        return res.status(401).json({ success:false, message: 'Invalid or expired token' });
     }

     //adding another try catch block to catch database errors
     try{
            //creating and storing a hash of the logged in users jwt token
            const hashedJwt = crypto.createHash('sha256').update(token).digest('hex');
            //checking if the token has been cancelled 
            const cancelled = await CancelledTokens.exists({ tokenHash: hashedJwt });
            //rejecting the token if it has been cancelled previously
            if(cancelled){
                return res.status(401).json({success:false,message:'Invalid or expired token'});
            }

            const user = await User.findById(decoded.id).select('role');
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid or expired token' });
            }

            req.user = { id: String(user._id), role: user.role };
            req.token = token;
            req.tokenExpiresAt = new Date(decoded.exp * 1000);
            next();
        }catch(error){
            next(error);
        }
     
}; 

// this is for later when we implement role based access for certain features
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {

        (req.log || logger).warn('access_denied', { userId: req.user ? req.user.id : undefined, role: req.user ? req.user.role : undefined, path: req.originalUrl.split('?')[0] });
        
        return res.status(403).json({ success:false, message: 'Access denied' });
    }

    next();
 };
};

module.exports = {
    protect,
    authorizeRoles
};