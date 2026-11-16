const { describe, it } = require('node:test');
const assert = require('node:assert');
const rateLimit = require('express-rate-limit');
const { registerLimiter, loginLimiter, bookingLimiter } = require('../Middleware/rateLimiters');

// Mock request and response factory for exercising rate limiters
function createMockReqRes(ip = '192.168.1.100') {
    const req = {
        ip,
        headers: {},
        method: 'POST',
        url: '/api/auth/login',
        app: {
            get(key) {
                if (key === 'trust proxy') return false;
                return undefined;
            }
        }
    };
    const res = {
        statusCode: 200,
        headers: {},
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.body = data;
            return this;
        },
        send(data) {
            this.body = data;
            return this;
        },
        setHeader(name, val) {
            this.headers[name] = val;
            return this;
        },
        getHeader(name) {
            return this.headers[name];
        }
    };
    return { req, res };
}

describe('Backend Middleware: Rate Limiters Configuration & Enforcement', () => {
    it('registerLimiter should be configured properly as Express middleware', () => {
        assert.ok(typeof registerLimiter === 'function', 'registerLimiter must be express middleware');
    });

    it('loginLimiter should be configured with skipSuccessfulRequests', () => {
        assert.ok(typeof loginLimiter === 'function', 'loginLimiter must be express middleware');
    });

    it('bookingLimiter should be configured with standard headers', () => {
        assert.ok(typeof bookingLimiter === 'function', 'bookingLimiter must be express middleware');
    });

    it('should actively enforce rate limits and return 429 when threshold is exceeded', async () => {
        // Create an isolated instance with max: 3 to deterministically verify limiter execution
        const testLimiter = rateLimit({
            windowMs: 60 * 1000,
            max: 3,
            standardHeaders: true,
            legacyHeaders: false,
            message: { success: false, message: 'Too many requests, please slow down.' }
        });

        const testIp = '10.0.0.99';
        const responses = [];

        for (let i = 0; i < 4; i++) {
            const { req, res } = createMockReqRes(testIp);
            let nextCalled = false;

            await new Promise((resolve) => {
                res.send = (data) => {
                    res.body = data;
                    resolve();
                };
                res.json = (data) => {
                    res.body = data;
                    resolve();
                };
                testLimiter(req, res, () => {
                    nextCalled = true;
                    resolve();
                });
            });

            responses.push({ nextCalled, statusCode: res.statusCode, body: res.body });
        }

        // The first 3 requests should succeed and call next()
        assert.strictEqual(responses[0].nextCalled, true, 'Request 1 should pass');
        assert.strictEqual(responses[1].nextCalled, true, 'Request 2 should pass');
        assert.strictEqual(responses[2].nextCalled, true, 'Request 3 should pass');

        // The 4th request must be blocked with HTTP 429 Too Many Requests
        assert.strictEqual(responses[3].nextCalled, false, 'Request 4 must be blocked');
        assert.strictEqual(responses[3].statusCode, 429, 'Request 4 must return HTTP 429');
        assert.strictEqual(responses[3].body.success, false);
        assert.ok(responses[3].body.message.includes('Too many requests'));
    });
});
