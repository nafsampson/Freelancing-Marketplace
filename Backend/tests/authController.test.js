/**
 * Unit tests for authController (register, login, getUserProfile).
 * Monkey-patches the Mongoose model and hash utils so no database is needed.
 */
const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// ── Load real modules so we can monkey-patch them ────────
const User = require('../models/usersModel');
const hash = require('../utils/hash');
const { register, login, getUserProfile } = require('../Controllers/authController');

// ── Helpers ──────────────────────────────────────────────
function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
    };
}

/**
 * Returns a findOne stub that works for both:
 *   await User.findOne({...})              ← register (thenable)
 *   await User.findOne({...}).select(...)   ← login    (chainable)
 */
function makeFindOneStub(result) {
    return function fakeFindOne() {
        // The returned object is both a thenable and has a .select() method
        const chainable = {
            select() { return Promise.resolve(result); },
            then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
            catch(fn) { return Promise.resolve(result).catch(fn); }
        };
        return chainable;
    };
}

// Save originals so every test can restore them
const origFindOne = User.findOne;
const origCreate = User.create;
const origFindById = User.findById;

// ── Tests ────────────────────────────────────────────────

describe('authController – register()', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'unit-test-secret';
        // Default: no existing user
        User.findOne = makeFindOneStub(null);
        User.create = async (data) => ({
            _id: 'new123',
            fullName: data.fullName,
            email: data.email,
            role: data.role
        });
    });

    afterEach(() => {
        User.findOne = origFindOne;
        User.create = origCreate;
    });

    it('should return 201 on successful registration', async () => {
        const req = {
            body: { name: 'Jane Doe', email: 'jane@test.com', password: 'Str0ng!Pass1', role: 'Client' }
        };
        const res = mockRes();
        await register(req, res, () => {});

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.message, 'User registered');
        assert.equal(res.body.data.email, 'jane@test.com');
    });

    it('should return 409 when email already exists', async () => {
        User.findOne = makeFindOneStub({ _id: 'existing', email: 'jane@test.com' });

        const req = {
            body: { name: 'Jane', email: 'jane@test.com', password: 'Str0ng!', role: 'Client' }
        };
        const res = mockRes();
        await register(req, res, () => {});

        assert.equal(res.statusCode, 409);
        assert.equal(res.body.success, false);
        assert.match(res.body.message, /already exists/i);
    });

    it('should call next(error) on unexpected failure', async () => {
        User.create = async () => { throw new Error('DB down'); };

        const req = {
            body: { name: 'X', email: 'x@test.com', password: 'Str0ng!', role: 'Client' }
        };
        const res = mockRes();
        let nextErr = null;
        await register(req, res, (err) => { nextErr = err; });

        assert.ok(nextErr, 'next() should receive an error');
        assert.match(nextErr.message, /DB down/);
    });
});

describe('authController – login()', () => {
    // The controller destructures the hash helpers at import time, so they cannot
    // be monkey-patched. Use a real bcrypt hash of the correct password instead.
    let realHash;
    before(async () => {
        realHash = await hash.hashedPassword('Str0ng!');
    });

    beforeEach(() => {
        process.env.JWT_SECRET = 'unit-test-secret';
        User.findOne = makeFindOneStub({
            _id: 'u1', fullName: 'Jane', email: 'jane@test.com',
            role: 'Client', passwordHash: realHash,
            failedLoginAttempts: 0,
            lockedUntil: null,
            save: async () => {}
        });
    });

    afterEach(() => {
        User.findOne = origFindOne;
    });

    it('should return 200 with token on valid credentials', async () => {
        const req = { body: { email: 'jane@test.com', password: 'Str0ng!' } };
        const res = mockRes();
        await login(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.body.token, 'Response should include a JWT token');
        assert.equal(res.body.user.email, 'jane@test.com');
    });

    it('should return 401 when user does not exist', async () => {
        User.findOne = makeFindOneStub(null);

        const req = { body: { email: 'nobody@test.com', password: 'pass' } };
        const res = mockRes();
        await login(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.equal(res.body.success, false);
        assert.match(res.body.message, /invalid credentials/i);
    });

    it('should return 401 when password is wrong', async () => {
        const req = { body: { email: 'jane@test.com', password: 'Wr0ng!Pass' } };
        const res = mockRes();
        await login(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.equal(res.body.success, false);
        assert.match(res.body.message, /invalid credentials/i);
    });
});

describe('authController – getUserProfile()', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'unit-test-secret';
        User.findById = () => ({
            select: async () => ({
                _id: 'u1', fullName: 'Jane', email: 'jane@test.com', role: 'Client'
            })
        });
    });

    afterEach(() => {
        User.findById = origFindById;
    });

    it('should return 200 with user data', async () => {
        const req = { user: { id: 'u1' } };
        const res = mockRes();
        await getUserProfile(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.email, 'jane@test.com');
    });

    it('should return 404 when user not found', async () => {
        User.findById = () => ({ select: async () => null });

        const req = { user: { id: 'ghost' } };
        const res = mockRes();
        await getUserProfile(req, res, () => {});

        assert.equal(res.statusCode, 404);
        assert.equal(res.body.success, false);
        assert.match(res.body.message, /not found/i);
    });
});