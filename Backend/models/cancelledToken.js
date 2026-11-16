const mongoose = require("mongoose");

//model to cancel a jwt token (security feature 2)
const cancelledTokenSchema = new mongoose.Schema({
    tokenHash:{
        type: String,
        required: true,
        unique:true
    },
    expiresAt:{
        type:Date,
        required:true,
        expires:0 //this automatically removes expired records in mongodb
    }
});
module.exports = mongoose.model('CancelledToken', cancelledTokenSchema);