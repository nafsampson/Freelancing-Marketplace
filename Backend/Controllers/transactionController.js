const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const { calculateTax } = require('../utils/taxCalculator');
const logger = require('../utils/logger');   


// South African 2027 tax year:
// 1 March 2026 to 28 February 2027 (inclusive).
// The query uses an exclusive end date.
const TAX_YEAR = 2027;

const TAX_YEAR_START = new Date('2026-03-01T00:00:00+02:00');
const TAX_YEAR_END = new Date('2027-03-01T00:00:00+02:00');

const getIncome = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
            return res.status(400).json({
                message: 'Invalid freelancer account.'
            });
        }

        const freelancerId = new mongoose.Types.ObjectId(req.user.id);

        // Only completed, valid transactions belonging to this freelancer
        // and completed during the selected tax year count as earned income.
        const [summary] = await Transaction.aggregate([
            {
                $match: {
                    freelancerId,
                    status: 'Completed',
                    completedAt: {
                        $gte: TAX_YEAR_START,
                        $lt: TAX_YEAR_END
                    },
                    amount: {
                        $type: 'number',
                        $gte: 0
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalIncome: { $sum: '$amount' },
                    transactionCount: { $sum: 1 }
                }
            }
        ]);

        const totalIncome = Number(
            (summary?.totalIncome ?? 0).toFixed(2)
        );

        const { estimatedTax, incomeAfterTax } =
            calculateTax(totalIncome);
        const missingCompletionDateCount = await Transaction.countDocuments({
            freelancerId, status: 'Completed', completedAt: null
        });

        // Keep the existing transaction list for dashboard compatibility.
        // This list is scoped to the authenticated freelancer.
        const transactions = await Transaction.find({ freelancerId })
            .sort({ createdAt: -1 })
            .limit(100);

        (req.log || logger).info('income_viewed', { userId: req.user.id, transactionCount: summary ? summary.transactionCount : 0 });
        return res.status(200).json({
            data: {
                freelancerId: req.user.id,
                taxYear: TAX_YEAR,
                taxYearStart: TAX_YEAR_START,
                taxYearEnd: new Date(
                    TAX_YEAR_END.getTime() - 1
                ),
                totalIncome,
                estimatedTax,
                incomeAfterTax,
                transactionCount: summary?.transactionCount ?? 0,
                missingCompletionDateCount,
                transactions,
                disclaimer:
                    'This is a simplified estimate based only on work completed in the selected tax year, using the recorded completion date. Completed records without that date are excluded until reviewed. It assumes the freelancer is under 65, applies only the primary tax rebate, and excludes other income, expenses, deductions and tax credits. Completion is the demo reporting convention, not a statement of tax recognition law or payment received. It is not a SARS assessment or professional tax advice.'
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getIncome };
