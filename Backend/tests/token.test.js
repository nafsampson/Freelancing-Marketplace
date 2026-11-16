const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const generateToken = require('../utils/generateToken');

describe('Backend Utility: JWT Token Management', () => {
    before(() => {
        process.env.JWT_SECRET = 'test_secret_for_unit_tests_1234567890';
        process.env.JWT_EXPIRES_IN = '1h';
    });

    it('should generate a valid JWT containing user id and role', () => {
        const user = { id: '64b0f1a23c4d5e6f7a8b9c0d', role: 'Freelancer' };
        const token = generateToken(user);

        assert.ok(typeof token === 'string', 'Token should be a string');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        assert.strictEqual(decoded.id, user.id);
        assert.strictEqual(decoded.role, user.role);
    });

    it('should fail verification if token is signed with wrong secret', () => {
        const user = { id: '64b0f1a23c4d5e6f7a8b9c0d', role: 'Client' };
        const token = generateToken(user);

        assert.throws(() => {
            jwt.verify(token, 'completely_wrong_secret_key');
        }, /invalid signature/i);
    });

    it('should reject malformed or tampered token', () => {
        assert.throws(() => {
            jwt.verify('malformed.token.payload', process.env.JWT_SECRET);
        });
    });
});
