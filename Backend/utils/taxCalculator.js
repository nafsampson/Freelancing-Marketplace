
const TAX_BRACKETS_2027 = [
    { limit: 245100, baseTax: 0, rate: 0.18 },
    { limit: 383100, baseTax: 44118, rate: 0.26 },
    { limit: 530200, baseTax: 79998, rate: 0.31 },
    { limit: 695800, baseTax: 125599, rate: 0.36 },
    { limit: 887000, baseTax: 185215, rate: 0.39 },
    { limit: 1878600, baseTax: 259783, rate: 0.41 },
    { limit: Infinity, baseTax: 666339, rate: 0.45 }
];

const PRIMARY_REBATE_2027 = 17820;

/**
 * Calculates an estimated South African income tax amount
 * using the 2027 tax-year brackets and primary rebate.
 *
 * We're using these assummptions:
 * - Taxpayer is under 65.
 * - Only the primary rebate applies.
 * - Supplied income represents all taxable income.
 * - No deductions or additional tax credits are applied.
 *
 * @param {number} totalIncome
 * @returns {{ estimatedTax: number, incomeAfterTax: number }}
 */
const calculateTax = (totalIncome) => {
    if (typeof totalIncome !== 'number' ||
        !Number.isFinite(totalIncome) ||
        totalIncome < 0) {
        throw new TypeError('Income must be a valid, non-negative number.');
    }

    if (totalIncome === 0) {
        return {
            estimatedTax: 0,
            incomeAfterTax: 0
        };
    }

    const bracket = TAX_BRACKETS_2027.find(
        (item) => totalIncome <= item.limit
    );

    const taxBeforeRebate =
        bracket.baseTax +
        (totalIncome -
            (bracket.limit === Infinity
                ? 1878600
                : getPreviousLimit(bracket.limit))) * bracket.rate;

    const estimatedTax = Math.max(
        0,
        taxBeforeRebate - PRIMARY_REBATE_2027
    );

    const roundedTax = Number(estimatedTax.toFixed(2));

    return {
        estimatedTax: roundedTax,
        incomeAfterTax: Number((totalIncome - roundedTax).toFixed(2))
    };
};

const getPreviousLimit = (currentLimit) => {
    const index = TAX_BRACKETS_2027.findIndex(
        (bracket) => bracket.limit === currentLimit
    );

    return index === 0
        ? 0
        : TAX_BRACKETS_2027[index - 1].limit;
};

module.exports = {
    calculateTax,
    TAX_BRACKETS_2027,
    PRIMARY_REBATE_2027
};
