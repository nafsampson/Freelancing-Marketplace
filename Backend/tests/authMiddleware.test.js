const { describe, it } = require('node:test');
const assert = require('node:assert');
const { authorizeRoles } = require('../Middleware/authMiddleware');

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

describe('Backend Middleware: Role-Based Access Control (authorizeRoles)', () => {
    it('should allow user whose role matches allowedRoles', () => {
        const req = { user: { id: 'user123', role: 'Freelancer' } };
        const res = createMockRes();
        let nextCalled = false;

        const middleware = authorizeRoles('Freelancer', 'Admin');
        middleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true, 'Next must be called when role matches');
        assert.strictEqual(res.statusCode, null);
    });

    it('should return 403 Forbidden when user role is not in allowedRoles', () => {
        const req = {originalUrl: '/api/admin', user: { id: 'client123', role: 'Client' } };
        const res = createMockRes();
        let nextCalled = false;

        const middleware = authorizeRoles('Freelancer');
        middleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false, 'Next must NOT be called');
        assert.strictEqual(res.statusCode, 403, 'Should respond with 403');
        assert.strictEqual(res.body.success, false);
        assert.strictEqual(res.body.message, 'Access denied');
    });

    it('should return 403 Forbidden when req.user is missing', () => {
        const req = { originalUrl: '/api/admin' };
        const res = createMockRes();
        let nextCalled = false;

        const middleware = authorizeRoles('Admin');
        middleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 403);
    });
});
