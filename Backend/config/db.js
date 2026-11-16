//reference module manual pg 72

const mongoose = require('mongoose');
const logger = require('../utils/logger'); 


const connectDB = async () => {
 try {
 await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
 logger.info('db_connected');
 } catch (error) { 
   logger.error('db_connection_failed', { message: error.message });
 throw error;
 }
};

module.exports = connectDB; 
