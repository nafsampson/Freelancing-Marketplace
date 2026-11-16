// code for the logging test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_value_for_unit_tests_only';
process.env.LOG_LEVEL = 'debug';

const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');


// code here is the helpers
let captured = [];
let origOut, origErr;
beforeEach(() => {
    captured = [];
    origOut = process.stdout.write.bind(process.stdout);
    origErr = process.stderr.write.bind(process.stderr);
    const grab = (chunk) => { String(chunk).split('\n').filter(Boolean).forEach((l) => { try { captured.push(JSON.parse(l)); } catch (e) { /* not a log line */ } }); return true; };
    process.stdout.write = grab;
    process.stderr.write = grab;
});
afterEach(() => { process.stdout.write = origOut; process.stderr.write = origErr; });

const byEvent = (name) => captured.filter((e) => e.event === name);
const allText = () => JSON.stringify(captured);

// stub in a module in a require.cache before the code under the test so it loads it 
const stub = (relPath, exports) => {
    const full = require.resolve(path.join('..', relPath));
    require.cache[full] = { id: full, filename: full, loaded: true, exports };
};
const freshLoad = (relPath) => {
    const full = require.resolve(path.join('..', relPath));
    delete require.cache[full];
    return require(full);
};

const mockRes = () => {
    const res = {statusCode: 200, headers: {}, body: null, listeners: {} };
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (b) => { res.body = b; return res; };
    res.setHeader = (k, v) => { res.headers[k] = v; };
    res.on = (ev, fn) => { res.listeners[ev] = fn; };
    return res;
};

const logger = require('../utils/logger');

//this code here is the logger core 

test('the logger wil emit structured JSON with timestamp, level, event', () => {
    logger.info('unit_event', { userId: 'abc123' });
    const e = byEvent('unit_event')[0];
    assert.ok(e, 'entry written');
    assert.equal(e.level, 'info');
    assert.equal(e.userId, 'abc123');
    assert.ok(!Number.isNaN(Date.parse(e.timestamp)), 'ISO timestamp present');
});

test('the logger will redact passwords, tokens, auth headers and emails', () => {
    logger.info('redaction_check', {
        password: 'Sup3rSecret!', passwordHash: '$2b$12$abc', token: 'eyJhbGciOi.xxx.yyy',
        headers: { authorization: 'Bearer eyJhbGciOi.xxx.yyy', 'x-ok': 'fine' },
        email: 'person@example.com', amount: 700
    });
    const e = byEvent('redaction_check')[0];
    assert.equal(e.password, '[REDACTED]');
    assert.equal(e.passwordHash, '[REDACTED]');
    assert.equal(e.token, '[REDACTED]');
    assert.equal(e.headers.authorization, '[REDACTED]');
    assert.equal(e.email, '[REDACTED]');
    assert.equal(e.headers['x-ok'], 'fine');
    assert.ok(!allText().includes('Sup3rSecret!'));
});


test('the scrubText removes bearer tokens, JWTs and connection strings from message', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.c2lnbmF0dXJl';
    const out = logger.scrubText(`bad Bearer ${jwt} and mongodb+srv://user:pw@cluster/db and ${jwt}`);
    
    assert.ok(!out.includes(jwt));
    assert.ok(!out.includes('user:pw'));
});

test('the hashIdentifier is stable, case-insensitive and does not reveal the email', () => {
    const a = logger.hashIdentifier('Person@Example.com ');
    assert.equal(a, logger.hashIdentifier('person@example.com'));
    assert.ok(!a.includes('person'));
    assert.equal(a.length, 12);
});

test ('the child logger adds requestID to every entry', () => {
    logger.child({ requestId: 'req-1' }).warn('child_event');
    assert.equal(byEvent('child_event')[0].requestId, 'req-1');
});


// code here is for the request logger
test('the requestLogger will set a request ID header, logs without the query string', () => {
    const requestLogger = freshLoad('Middleware/requestLogger');
    const req = { headers: {}, method: 'GET', originalUrl: '/api/gigs?secret=abc', ip: '1.2.3.4' };
    const res = mockRes();
    let called = false;
    requestLogger(req, res, () => { called = true; });
    assert.ok(called);
    assert.match(req.id, /^[0-9a-f-]{36}$/);
    assert.equal(res.headers['X-Request-Id'], req.id);
    res.statusCode = 200;
    res.listeners.finish();
    const e = byEvent('http_request')[0];
    assert.equal(e.path, '/api/gigs');
    assert.equal(e.requestId, req.id);
    assert.ok(!allText().includes('secret=abc'));
});

test('the requestLogger will reject unsafe client supplied request IDs', () => {
    const requestLogger = freshLoad('Middleware/requestLogger');
    const req = { headers: { 'x-request-id': '<script>alert(1)</script>' }, method: 'GET', originalUrl: '/', ip: 'x' };
    requestLogger(req, mockRes(), () => {});
    assert.ok(!req.id.includes('<'));
});


// this code here is for the error handler
test('the errorHandler will log the real errpr but then it returns a generic message and requestID', () => {
    const errorHandler = freshLoad('Middleware/errorHandler');
    const err = new Error('connect failed mongodb+srv://admin:hunter2@cluster0/db');
    const req = { id: 'req-err-1', method: 'POST', originalUrl: '/api/bookings?x=1', user: { id: 'u1' }, log: logger.child({ requestId: 'req-err-1' }) };
    const res = mockRes();
    errorHandler(err, req, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, 'Something went wrong');
    assert.equal(res.body.requestId, 'req-err-1');
    assert.ok(!JSON.stringify(res.body).includes('mongodb'));
    const e = byEvent('application_error')[0];
    assert.equal(e.level, 'error');
    assert.equal(e.userId, 'u1');
    assert.ok(!allText().includes('hunter2'), 'connection string credentials scrubbed from logs');

});

test('the errorHandler will log client errors (4xx) as warnings without there being a stack', () => {
    const errorHandler = freshLoad('Middleware/errorHandler');
    const err = Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError' });
    const res = mockRes();
    errorHandler(err, { method: 'GET', originalUrl: '/api/x' }, res, () => {});
    assert.equal(res.statusCode, 400);
    const e = byEvent('application_error')[0];
    assert.equal(e.level, 'warn');
    assert.equal(e.stack, undefined);
});

// this code here is for the auth controller 

const Module = require('module');
const realLoad = Module._load;
const fakeMongoose = { connection: { transaction: async callback => callback({}) } };
Module._load = function (request, ...rest) {
    if (request === 'jsonwebtoken') return { sign: () => 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6InUifQ.c2ln', verify: () => ({}) };
    if (request === 'mongoose') return fakeMongoose;
    return realLoad.call(this, request, ...rest);
};
after(() => { Module._load = realLoad; });

const loadAuthController = ({user, passwordOk }) => {
    const mockUser = user
    ? {
        failedLoginAttempts: 0,
        lockedUntil: null,
        save: async () => {},
        ...user
    }
    : null;
    stub('models/usersModel', {
        findOne: () => ({ select: async () => mockUser }),
        create: async (d) => ({ _id: 'new-user-id', role: d.role, fullName: d.fullName, email: d.email })
    });
    stub('utils/hash', { hashedPassword: async () => 'hashed', comparePasswords: async () => passwordOk });
    stub('models/cancelledToken', {});
    return freshLoad('Controllers/authController');
};

test('the successful login will be logged with a userId and with no credentials or jwt ', async () => {
    const { login } = loadAuthController({ user: { _id: 'i_21', role: 'client', fullName: 'T', email: 'c@d.co', passwordHash: 'h' }, passwordOk: true });
    const res = mockRes();
    await login({ body: { email: 'c@d.co', password: 'MyyPWord678' }, ip: '9.5.9.5' }, res, () => {});
    assert.equal(res.statusCode, 200);
    const e = byEvent('login_success')[0];
    assert.equal(e.userId, 'i_21');
    assert.equal(e.role, 'client');
    const text = allText();
    assert.ok(!text.includes('MyyPWord678'));
    assert.ok(!text.includes(res.body.token), 'JWT has not been logged');
    assert.ok(!text.includes('c@d.co'), 'the raw email has not been logged');
})



test ('the failed login (the wrong pasword) is logged as a warning, the client message will stay generic', async () => {
    const { login } = loadAuthController({ user: { _id: 'i_21', role: 'Client', passwordHash: 'h' }, passwordOk: false });
    const res = mockRes();
    await login({ body: { email: 'c@d.co', password: 'WrngPsword1' }, ip: '9.5.9.5' }, res, () => {});
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Invalid credentials');
    const e = byEvent('login_failed')[0];
    assert.equal(e.level, 'warn');
    assert.equal(e.reason, 'incorrect_password');
    assert.equal(e.ip, '9.5.9.5');
    assert.ok(e.emailHash);
    assert.ok(!allText().includes('WrngPsword1'));
});

test(' the failed login ( unknown account) will be logged with a different internal reason', async () => {
    const { login } = loadAuthController({ user: null, passwordOk: false });
    const res = mockRes();
    await login({ body: { email: 'TFGhost@g.co', password: 'x' }, ip: '1.4.1.4'}, res, () => {})
    assert.equal(res.body.message, 'Invalid credentials');
    assert.equal(byEvent('login_failed')[0].reason, 'unknown_account');
});

//code here is for booking controller 
test(' the booking and the transaction creation are both logged using IDs', async () => {
    fakeMongoose.connection.transaction = async callback => {
        const result = await callback({});
        assert.equal(byEvent('booking_created').length, 0, 'no success log before commit');
        assert.equal(byEvent('transaction_created').length, 0, 'no success log before commit');
        return result;
    };
    stub('models/Gig', { findById: () => ({ session: async () => ({ _id: 'gig-1', freelancerId: 'f-1', price: 500 }) }) });
    stub('models/Booking', { create: async () => [{ _id: 'bk-1', gigId: 'gig-1', clientId: 'c-1', freelancerId: 'f-1', amount: 500 }] });
    stub('models/Transaction', { create: async () => [{ _id: 'tx-1' }] });
    const { createBooking } = freshLoad('Controllers/bookingController');
    const res = mockRes();
    await createBooking({ body: { gigId: 'gig-1' }, user: { id: 'c-1' } }, res, () => {});
    assert.equal(res.statusCode, 201);
    assert.equal(byEvent('booking_created')[0].bookingId, 'bk-1');
    const t = byEvent('transaction_created')[0];
    assert.equal(t.transactionId, 'tx-1');
    assert.equal(t.userId, 'c-1');
});


test('a failed transaction forwards the error without emitting success logs', async () => {
fakeMongoose.connection.transaction = async callback => callback({});
stub('models/Gig', { findById: () => ({ session: async () => ({ _id: 'gig-1', freelancerId: 'f-1', price: 500 }) }) });
stub('models/Booking', { create: async () => [{ _id: 'bk-2', clientId: 'c-1', freelancerId: 'f-1', amount: 500 }] });
stub('models/Transaction', { create: async () => { throw new Error('the db is down'); } });
const { createBooking } = freshLoad('Controllers/bookingController');
let forwarded;
await createBooking({ body: { gigId: 'gig-1' }, user: { id: 'c-1' } }, mockRes(), (e) => { forwarded = e; });
assert.ok(forwarded, 'error forwarded to errorHandler');
assert.equal(byEvent('booking_created').length, 0);
assert.equal(byEvent('transaction_created').length, 0);
// Actual database rollback is checked by the separate replica-set suite.

});


