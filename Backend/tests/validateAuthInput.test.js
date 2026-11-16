const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateRegisterInput, validateLoginInput } = require('../Middleware/validateAuthInput');

// Mock Express response helper
function createMockRes() {
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

describe('Backend Middleware: Auth Input Validation', () => {
    describe('validateRegisterInput', () => {
        it('should pass validation with valid Client registration data', () => {
            const req = {
                body: {
                    name: 'John Doe',
                    email: 'johndoe@example.com',
                    password: 'SecurePassword123!',
                    role: 'Client'
                }
            };
            const res = createMockRes();
            let nextCalled = false;

            validateRegisterInput(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
            assert.strictEqual(res.statusCode, null);
            assert.strictEqual(req.body.name, 'John Doe');
            assert.strictEqual(req.body.email, 'johndoe@example.com');
        });

        it('should pass validation with valid Freelancer role', () => {
            const req = {
                body: {
                    name: 'Bob Freelancer',
                    email: 'bob@example.com',
                    password: 'FreelancerPassword123!',
                    role: 'Freelancer'
                }
            };
            const res = createMockRes();
            let nextCalled = false;

            validateRegisterInput(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });

        it('should reject Admin self-registration with 400 to prevent privilege escalation', () => {
            const req = {
                body: {
                    name: 'Malicious Attacker',
                    email: 'attacker@example.com',
                    password: 'AdminPassword123!',
                    role: 'Admin'
                }
            };
            const res = createMockRes();
            let nextCalled = false;

            validateRegisterInput(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, false);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.message.includes('valid role'));
        });

        it('should reject missing required fields with 400', () => {
            const req = { body: { name: 'Only Name' } };
            const res = createMockRes();
            let nextCalled = false;

            validateRegisterInput(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, false);
            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.success, false);
            assert.ok(res.body.message.includes('required'));
        });

        it('should reject non-string types with 400', () => {
            const req = {
                body: {
                    name: 12345,
                    email: 'test@example.com',
                    password: 'Password123!',
                    role: 'Client'
                }
            };
            const res = createMockRes();

            validateRegisterInput(req, res, () => {});

            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.message.includes('text values'));
        });

        it('should reject XSS angle brackets < > in name with 400', () => {
            const req = {
                body: {
                    name: '<script>alert(1)</script>',
                    email: 'hacker@example.com',
                    password: 'Password123!',
                    role: 'Client'
                }
            };
            const res = createMockRes();

            validateRegisterInput(req, res, () => {});

            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.message.includes('< or >'));
        });

        it('should reject invalid email format with 400', () => {
            const req = {
                body: {
                    name: 'Bob Smith',
                    email: 'not-an-email',
                    password: 'Password123!',
                    role: 'Client'
                }
            };
            const res = createMockRes();

            validateRegisterInput(req, res, () => {});

            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.message.includes('valid email address'));
        });

        it('should reject short passwords under 8 characters with 400', () => {
            const req = {
                body: {
                    name: 'Bob Smith',
                    email: 'bob@example.com',
                    password: 'short',
                    role: 'Client'
                }
            };
            const res = createMockRes();

            validateRegisterInput(req, res, () => {});

            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.message.includes('at least 8 characters'));
        });

        it('should reject invalid roles with 400', () => {
            const req = {
                body: {
                    name: 'Bob Smith',
                    email: 'bob@example.com',
                    password: 'Password123!',
                    role: 'Footballer'
                }
            };
            const res = createMockRes();

            validateRegisterInput(req, res, () => {});

            assert.strictEqual(res.statusCode, 400);
            assert.ok(res.body.message.includes('valid role'));
        });
    });

    describe('validateLoginInput', () => {
        it('should pass validation with email and password provided', () => {
            const req = {
                body: {
                    email: 'user@example.com',
                    password: 'Password123!'
                }
            };
            const res = createMockRes();
            let nextCalled = false;

            validateLoginInput(req, res, () => { nextCalled = true; });

            assert.strictEqual(nextCalled, true);
        });

        it('should reject missing email or password with 400', () => {
            const req = { body: { email: 'user@example.com' } };
            const res = createMockRes();

            validateLoginInput(req, res, () => {});

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.body.success, false);
        });
    });
});

it('rejects passwords exceeding bcrypt byte capacity even below 72 characters', () => {
    const req = { body: { name: 'Demo User', email: 'demo@example.test', password: 'é'.repeat(40), role: 'Client' } };
    const res = createMockRes();
    validateRegisterInput(req, res, () => assert.fail('Oversized UTF-8 password accepted'));
    assert.strictEqual(res.statusCode, 400);
});
