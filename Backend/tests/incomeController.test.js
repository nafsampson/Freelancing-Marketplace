const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const Transaction = require('../models/Transaction');
const { getIncome } = require('../Controllers/transactionController');
const original = { aggregate: Transaction.aggregate, find: Transaction.find, countDocuments: Transaction.countDocuments };
after(() => Object.assign(Transaction, original));

test('income uses completion dates and flags undated legacy records', async () => {
    let pipeline, legacyFilter;
    Transaction.aggregate = async value => { pipeline = value; return [{ totalIncome: 100000, transactionCount: 2 }]; };
    Transaction.countDocuments = async value => { legacyFilter = value; return 3; };
    Transaction.find = () => ({ sort: () => ({ limit: async () => [] }) });
    const res = { status() { return this; }, json(body) { this.body = body; } };
    await getIncome({ user: { id: '507f1f77bcf86cd799439011' }, log: { info() {} } }, res, error => { throw error; });
    assert.ok(pipeline[0].$match.completedAt);
    assert.equal(pipeline[0].$match.createdAt, undefined);
    assert.equal(pipeline[0].$match.completedAt.$gte.toISOString(), '2026-02-28T22:00:00.000Z');
    assert.equal(pipeline[0].$match.completedAt.$lt.toISOString(), '2027-02-28T22:00:00.000Z');
    assert.equal(legacyFilter.status, 'Completed');
    assert.equal(legacyFilter.completedAt, null);
    assert.equal(String(legacyFilter.freelancerId), '507f1f77bcf86cd799439011');
    assert.equal(res.body.data.missingCompletionDateCount, 3);
    assert.equal(res.body.data.estimatedTax, 180);
});

test('invalid freelancer account is rejected before querying the database', async () => {
    Transaction.aggregate = async () => { throw Error('Should not query'); };
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await getIncome({ user: { id: 'invalid' } }, res, error => { throw error; });
    assert.equal(res.code, 400);
});
