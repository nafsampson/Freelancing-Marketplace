/**
 * Unit tests for Connor's Account Lockout security feature (Stage 4, item 20).
 * Tests failed attempt tracking, lockout threshold (3 attempts), 15-minute lock duration,
 * blocking while locked, lockout expiry reset, and successful login reset.
 */
const { describe, it, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const User = require('../models/usersModel');
const hash = require('../utils/hash');
const { login } = require('../Controllers/authController');

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

function makeFindOneStub(userDoc) {
    return function fakeFindOne() {
        return {
            select() { return Promise.resolve(userDoc); },
            then(resolve, reject) { return Promise.resolve(userDoc).then(resolve, reject); },
            catch(fn) { return Promise.resolve(userDoc).catch(fn); }
        };
    };
}

describe('Security Feature: Account Lockout (authController.login)', () => {
    let correctPasswordHash;
    const origFindOne = User.findOne;

    before(async () => {
        correctPasswordHash = await hash.hashedPassword('CorrectPassword123!');
        process.env.JWT_SECRET = 'unit-test-lockout-secret';
    });

    afterEach(() => {
        User.findOne = origFindOne;
    });

    it('should increment failedLoginAttempts to 1 on first incorrect password', async () => {
        let saved = false;
        const fakeUser = {
            _id: 'user123',
            email: 'target@hustlehub.test',
            passwordHash: correctPasswordHash,
            failedLoginAttempts: 0,
            lockedUntil: null,
            role: 'Freelancer',
            async save() { saved = true; }
        };
        User.findOne = makeFindOneStub(fakeUser);

        const req = { body: { email: 'target@hustlehub.test', password: 'WrongPassword1' } };
        const res = mockRes();

        await login(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.equal(res.body.success, false);
        assert.equal(res.body.message, 'Invalid credentials');
        assert.equal(fakeUser.failedLoginAttempts, 1);
        assert.equal(fakeUser.lockedUntil, null, 'Account should not be locked after 1 failure');
        assert.equal(saved, true, 'User record must be saved');
    });

    it('should increment failedLoginAttempts to 2 on second incorrect password', async () => {
        const fakeUser = {
            _id: 'user123',
            email: 'target@hustlehub.test',
            passwordHash: correctPasswordHash,
            failedLoginAttempts: 1,
            lockedUntil: null,
            role: 'Freelancer',
            async save() {}
        };
        User.findOne = makeFindOneStub(fakeUser);

        const req = { body: { email: 'target@hustlehub.test', password: 'WrongPassword2' } };
        const res = mockRes();

        await login(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.equal(fakeUser.failedLoginAttempts, 2);
        assert.equal(fakeUser.lockedUntil, null, 'Account should not be locked after 2 failures');
    });

    it('should lock account for 15 minutes upon reaching 3 failed attempts (maxAttempts)', async () => {
        const beforeTime = Date.now();
        const fakeUser = {
            _id: 'user123',
            email: 'target@hustlehub.test',
            passwordHash: correctPasswordHash,
            failedLoginAttempts: 2,
            lockedUntil: null,
            role: 'Freelancer',
            async save() {}
        };
        User.findOne = makeFindOneStub(fakeUser);

        const req = { body: { email: 'target@hustlehub.test', password: 'WrongPassword3' } };
        const res = mockRes();

        await login(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.equal(fakeUser.failedLoginAttempts, 3);
        assert.ok(fakeUser.lockedUntil instanceof Date, 'lockedUntil should be a Date instance');
        
        // Lockout duration is 15 minutes (900,000 ms)
        const lockedTime = fakeUser.lockedUntil.getTime();
        const expectedMin = beforeTime + 14 * 60 * 1000;
        const expectedMax = Date.now() + 16 * 60 * 1000;
        assert.ok(lockedTime >= expectedMin && lockedTime <= expectedMax, 'Lockout must be set ~15 minutes into the future');
    });

    it('should reject login with 401 and lockout message while locked, even if password is correct', async () => {
        const fakeUser = {
            _id: 'user123',
            email: 'target@hustlehub.test',
            passwordHash: correctPasswordHash,
            failedLoginAttempts: 3,
            lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 mins remaining
            role: 'Freelancer',
            async save() { assert.fail('save() should not be called when rejecting locked account'); }
        };
        User.findOne = makeFindOneStub(fakeUser);

        const req = { body: { email: 'target@hustlehub.test', password: 'CorrectPassword123!' } };
        const res = mockRes();

        await login(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.equal(res.body.success, false);
        assert.equal(res.body.message, 'Account locked for 15 minutes');
    });

    it('should reject login with 401 and lockout message while locked when password is wrong', async () => {
        const fakeUser = {
            _id: 'user123',
            email: 'target@hustlehub.test',
            passwordHash: correctPasswordHash,
            failedLoginAttempts: 3,
            lockedUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 mins remaining
            role: 'Freelancer',
            async save() {}
        };
        User.findOne = makeFindOneStub(fakeUser);

        const req = { body: { email: 'target@hustlehub.test', password: 'AnotherWrongPassword' } };
        const res = mockRes();

        await login(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.equal(res.body.message, 'Account locked for 15 minutes');
    });

    it('should automatically reset failedLoginAttempts and allow login once 15 minutes have expired', async () => {
        let saved = false;
        const fakeUser = {
            _id: 'user123',
            fullName: 'Target User',
            email: 'target@hustlehub.test',
            passwordHash: correctPasswordHash,
            failedLoginAttempts: 3,
            lockedUntil: new Date(Date.now() - 1000), // expired 1s ago
            role: 'Freelancer',
            async save() { saved = true; }
        };
        User.findOne = makeFindOneStub(fakeUser);

        const req = { body: { email: 'target@hustlehub.test', password: 'CorrectPassword123!' } };
        const res = mockRes();

        await login(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.ok(res.body.token, 'Should issue a JWT upon successful login after lockout expired');
        assert.equal(fakeUser.failedLoginAttempts, 0, 'Failed attempts must be reset to 0');
        assert.equal(fakeUser.lockedUntil, null, 'lockedUntil must be cleared to null');
        assert.equal(saved, true);
    });

    it('should reset failedLoginAttempts and clear lockedUntil on successful login before reaching limit', async () => {
        let saved = false;
        const fakeUser = {
            _id: 'user123',
            fullName: 'Target User',
            email: 'target@hustlehub.test',
            passwordHash: correctPasswordHash,
            failedLoginAttempts: 2, // had 2 failed attempts previously
            lockedUntil: null,
            role: 'Freelancer',
            async save() { saved = true; }
        };
        User.findOne = makeFindOneStub(fakeUser);

        const req = { body: { email: 'target@hustlehub.test', password: 'CorrectPassword123!' } };
        const res = mockRes();

        await login(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(fakeUser.failedLoginAttempts, 0, 'Failed attempts must be reset to 0');
        assert.equal(fakeUser.lockedUntil, null);
        assert.equal(saved, true);
    });
});
