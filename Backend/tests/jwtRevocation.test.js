/**
 * Unit tests for Connor's JWT Revocation & CancelledToken security feature (Stage 4, item 20).
 * Covers token hashing with SHA-256, storing in CancelledToken collection upon logout,
 * and middleware enforcement rejecting revoked tokens.
 */
const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const CancelledTokens = require('../models/cancelledToken');
const User = require('../models/usersModel');
const { logout } = require('../Controllers/authController');
const { protect } = require('../Middleware/authMiddleware');

function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        }
    };
}

describe('Security Feature: JWT Revocation & Cancelled Tokens (logout & protect)', () => {
    const origCreate = CancelledTokens.create;
    const origExists = CancelledTokens.exists;
    const origFindById = User.findById;
    const testSecret = 'revocation-test-secret-key-12345';

    before(() => {
        process.env.JWT_SECRET = testSecret;
    });

    afterEach(() => {
        CancelledTokens.create = origCreate;
        CancelledTokens.exists = origExists;
        User.findById = origFindById;
    });

    describe('authController.logout', () => {
        it('should hash token with SHA-256 and store in CancelledTokens upon logout', async () => {
            const rawToken = 'sample.jwt.token.string';
            const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiresAt = new Date(Date.now() + 3600 * 1000);

            let createdRecord = null;
            CancelledTokens.create = async (record) => {
                createdRecord = record;
                return record;
            };

            const req = {
                token: rawToken,
                tokenExpiresAt: expiresAt
            };
            const res = mockRes();

            await logout(req, res, () => {});

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.message, 'Logged out successfully');
            assert.ok(createdRecord, 'A CancelledToken record should be created');
            assert.equal(createdRecord.tokenHash, expectedHash, 'Token hash must match SHA-256 of raw token');
            assert.equal(createdRecord.expiresAt, expiresAt);
        });

        it('should call next(error) if storing cancelled token throws an error', async () => {
            CancelledTokens.create = async () => {
                throw new Error('Mongo connection dropped');
            };

            const req = {
                token: 'any.token',
                tokenExpiresAt: new Date()
            };
            const res = mockRes();
            let nextError = null;

            await logout(req, res, (err) => {
                nextError = err;
            });

            assert.ok(nextError, 'next() should be called on error');
            assert.equal(nextError.message, 'Mongo connection dropped');
        });
    });

    describe('authMiddleware.protect – Revocation Enforcement', () => {
        it('should reject request with 401 when token has been revoked / cancelled', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const validToken = jwt.sign({ id: userId, role: 'Freelancer' }, testSecret, { expiresIn: '1h' });
            const expectedHash = crypto.createHash('sha256').update(validToken).digest('hex');

            // Simulate token exists in CancelledTokens
            let queriedHash = null;
            CancelledTokens.exists = async (query) => {
                queriedHash = query.tokenHash;
                return { _id: 'cancelledId' }; // exists!
            };

            const req = {
                headers: { authorization: `Bearer ${validToken}` },
                originalUrl: '/api/gigs',
                ip: '127.0.0.1'
            };
            const res = mockRes();
            let nextCalled = false;

            await protect(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false, 'Revoked token must not proceed to next()');
            assert.equal(res.statusCode, 401);
            assert.equal(res.body.success, false);
            assert.equal(res.body.message, 'Invalid or expired token');
            assert.equal(queriedHash, expectedHash, 'Should query CancelledTokens with SHA-256 hash');
        });

        it('should allow request when token is valid and NOT present in CancelledTokens', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const validToken = jwt.sign({ id: userId, role: 'Freelancer' }, testSecret, { expiresIn: '1h' });

            // Token is NOT cancelled
            CancelledTokens.exists = async () => null;

            // User exists in database
            User.findById = (id) => ({
                select: async (fields) => ({
                    _id: id,
                    role: 'Freelancer'
                })
            });

            const req = {
                headers: { authorization: `Bearer ${validToken}` },
                originalUrl: '/api/gigs',
                ip: '127.0.0.1'
            };
            const res = mockRes();
            let nextCalled = false;

            await protect(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, true, 'Valid token should call next()');
            assert.equal(res.statusCode, null);
            assert.ok(req.user, 'req.user must be populated');
            assert.equal(req.user.id, userId);
            assert.equal(req.user.role, 'Freelancer');
            assert.equal(req.token, validToken, 'req.token must be attached for downstream logout');
            assert.ok(req.tokenExpiresAt instanceof Date);
        });

        it('should reject request with 401 when Authorization header is missing', async () => {
            const req = { headers: {}, originalUrl: '/api/profile', ip: '127.0.0.1' };
            const res = mockRes();
            let nextCalled = false;

            await protect(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res.statusCode, 401);
            assert.equal(res.body.message, 'No token provided');
        });

        it('should reject request with 401 when Authorization header is not Bearer format', async () => {
            const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' }, originalUrl: '/api/profile', ip: '127.0.0.1' };
            const res = mockRes();
            let nextCalled = false;

            await protect(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res.statusCode, 401);
            assert.equal(res.body.message, 'No token provided');
        });

        it('should reject request with 401 when token signature is invalid', async () => {
            const forgedToken = jwt.sign({ id: 'bad' }, 'wrong-secret');
            const req = {
                headers: { authorization: `Bearer ${forgedToken}` },
                originalUrl: '/api/profile',
                ip: '127.0.0.1'
            };
            const res = mockRes();
            let nextCalled = false;

            await protect(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res.statusCode, 401);
            assert.equal(res.body.message, 'Invalid or expired token');
        });

        it('should reject request with 401 when user from token no longer exists in DB', async () => {
            const userId = '507f1f77bcf86cd799439099';
            const validToken = jwt.sign({ id: userId, role: 'Client' }, testSecret, { expiresIn: '1h' });

            CancelledTokens.exists = async () => null;
            User.findById = () => ({
                select: async () => null // User deleted
            });

            const req = {
                headers: { authorization: `Bearer ${validToken}` },
                originalUrl: '/api/profile',
                ip: '127.0.0.1'
            };
            const res = mockRes();
            let nextCalled = false;

            await protect(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res.statusCode, 401);
            assert.equal(res.body.message, 'Invalid or expired token');
        });
    });
});
