
const test = require("node:test");
const assert = require("node:assert/strict");

const {
    calculateTax,
    TAX_BRACKETS_2027,
    PRIMARY_REBATE_2027
} = require("../utils/taxCalculator");

test("Tax brackets are configured for the 2027 tax year", () => {
    assert.equal(TAX_BRACKETS_2027.length, 7);
    assert.equal(PRIMARY_REBATE_2027, 17820);
});

test("Zero income produces zero tax and zero after-tax income", () => {
    assert.deepEqual(calculateTax(0), {
        estimatedTax: 0,
        incomeAfterTax: 0
    });
});

test("Income below the taxable threshold produces zero tax", () => {
    const result = calculateTax(98000);

    assert.equal(result.estimatedTax, 0);
    assert.equal(result.incomeAfterTax, 98000);
});

test("Income exactly at the under-65 taxable threshold produces zero tax", () => {
    const result = calculateTax(99000);

    assert.equal(result.estimatedTax, 0);
    assert.equal(result.incomeAfterTax, 99000);
});

test("Primary rebate is correctly applied to income just above the threshold", () => {
    const result = calculateTax(100000);

    // R100,000 x 18% = R18,000
    // R18,000 - R17,820 primary rebate = R180
    assert.equal(result.estimatedTax, 180);
    assert.equal(result.incomeAfterTax, 99820);
});

test("Income within the first tax bracket is calculated correctly", () => {
    const result = calculateTax(150000);

    // R150,000 x 18% - R17,820 rebate = R9,180
    assert.equal(result.estimatedTax, 9180);
    assert.equal(result.incomeAfterTax, 140820);
});

test("Income crossing into the second tax bracket is calculated correctly", () => {
    const result = calculateTax(300000);

    // R44,118 + (R300,000 - R245,100) x 26%
    // Less R17,820 primary rebate.
    assert.equal(result.estimatedTax, 40572);
    assert.equal(result.incomeAfterTax, 259428);
});

test("Income crossing multiple tax brackets is calculated correctly", () => {
    const result = calculateTax(600000);

    // R125,599 + (R600,000 - R530,200) x 36%
    // Less R17,820 primary rebate.
    assert.equal(result.estimatedTax, 132907);
    assert.equal(result.incomeAfterTax, 467093);
});

test("High income uses the highest applicable tax bracket", () => {
    const result = calculateTax(1000000);

    assert.equal(result.estimatedTax, 288293);
    assert.equal(result.incomeAfterTax, 711707);
});

test("Income after tax plus estimated tax equals total income", () => {
    const income = 600000;
    const result = calculateTax(income);

    assert.equal(
        Number((result.estimatedTax + result.incomeAfterTax).toFixed(2)),
        income
    );
});

test("Tax calculation never produces a negative tax amount", () => {
    const result = calculateTax(50000);

    assert.ok(result.estimatedTax >= 0);
});

test("Invalid income values are rejected", () => {
    const invalidValues = [
        undefined,
        null,
        "100000",
        NaN,
        Infinity,
        -1,
        -100000
    ];

    for (const value of invalidValues) {
        assert.throws(
            () => calculateTax(value),
            {
                name: "TypeError",
                message: "Income must be a valid, non-negative number."
            }
        );
    }
});
