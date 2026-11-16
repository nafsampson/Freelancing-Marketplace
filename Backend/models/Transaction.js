const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        freelancerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        amount: { type: Number, required: true, min: 0 },
        completedAt: { type: Date, default: null },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Cancelled'],
            default: 'Pending'
        }
    },
    { timestamps: true }
);



module.exports = mongoose.model('Transaction', transactionSchema);


