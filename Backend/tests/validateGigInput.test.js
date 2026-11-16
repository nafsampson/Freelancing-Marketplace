const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateGigInput } = require('../Middleware/validateGigInput');

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

describe('Backend Middleware: Gig Input Validation', () => {
    for (const price of [150.999, 10000001]) {
        it(`rejects an unsupported monetary amount: ${price}`, () => {
            const req = { body: { title: 'Website development', description: 'Build a complete responsive portfolio website.', category: 'Web Development', price } };
            const res = createMockRes();
            validateGigInput(req, res, () => assert.fail('Invalid price accepted'));
            assert.strictEqual(res.statusCode, 400);
        });
    }
    it('should pass validation with valid gig parameters', () => {
        const req = {
            body: {
                title: 'Professional Modern Logo Design',
                description: 'We will create an awesome custom brand identity and vector logo for your business.',
                category: 'Graphic Design',
                price: 150,
                skills: ['Illustrator', 'Branding']
            }
        };
        const res = createMockRes();
        let nextCalled = false;

        validateGigInput(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true);
        assert.strictEqual(res.statusCode, null);
        assert.strictEqual(req.body.price, 150);
        assert.deepStrictEqual(req.body.skills, ['Illustrator', 'Branding']);
    });

    it('should reject short title with 400', () => {
        const req = {
            body: {
                title: 'Logo',
                description: 'We will create an awesome custom brand identity and vector logo for your business.',
                category: 'Graphic Design',
                price: 150
            }
        };
        const res = createMockRes();

        validateGigInput(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.body.message.includes('between 5 and 100'));
    });

    it('should reject XSS angle brackets in title with 400', () => {
        const req = {
            body: {
                title: '<script>alert(1)</script> Graphic Design',
                description: 'We will create an awesome custom brand identity and vector logo for your business.',
                category: 'Graphic Design',
                price: 150
            }
        };
        const res = createMockRes();

        validateGigInput(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.body.message.includes('< or >'));
    });

    it('should reject category not on whitelist with 400', () => {
        const req = {
            body: {
                title: 'Custom Woodworking Furniture',
                description: 'Handmade oak dining table crafted to perfection with durable finishes.',
                category: 'Carpentry',
                price: 500
            }
        };
        const res = createMockRes();

        validateGigInput(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.body.message.includes('Category must be one of'));
    });

    it('should reject price less than 1 or non-numeric with 400', () => {
        const req = {
            body: {
                title: 'Professional Translation Service',
                description: 'English to German native translation of your technical documentation.',
                category: 'Writing & Translation',
                price: 0
            }
        };
        const res = createMockRes();

        validateGigInput(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.body.message.includes('Price must be at least 1'));
    });

    it('should strip spoofed freelancerId from body and preserve only validated fields', () => {
        const req = {
            body: {
                title: 'Search Engine Optimization Strategy',
                description: 'Audit your website to improve Google organic ranking and conversions.',
                category: 'Digital Marketing',
                price: 350,
                freelancerId: 'malicious_spoofed_id',
                isAdmin: true
            }
        };
        const res = createMockRes();
        let nextCalled = false;

        validateGigInput(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true);
        assert.strictEqual(req.body.freelancerId, undefined, 'Spoofed freelancerId must be stripped');
        assert.strictEqual(req.body.isAdmin, undefined, 'Spoofed isAdmin must be stripped');
    });
});
