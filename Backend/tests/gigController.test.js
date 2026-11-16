/**
 * Unit tests for gigController (createGig, getGigs, getGigById, updateGig, deleteGig).
 * Monkey-patches the Gig model so no database is needed.
 */
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const Gig = require('../models/Gig');
const mongoose = require('mongoose');
const { createGig, getGigs, getGigById, updateGig, deleteGig } = require('../Controllers/gigController');

// ── Helpers ──────────────────────────────────────────────
function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.body = data; return this; }
    };
}

const VALID_ID = '507f1f77bcf86cd799439011';  // valid ObjectId
const INVALID_ID = 'not-an-id';

const sampleGig = {
    _id: VALID_ID,
    title: 'Web Development',
    description: 'Full stack web development services for small businesses',
    category: 'Development',
    price: 5000,
    skills: ['React', 'Node.js'],
    createdAt: new Date(),
    freelancerId: { _id: 'f1', fullName: 'Alice Dev' }
};

// Save originals
const origCreate = Gig.create;
const origFind = Gig.find;
const origFindById = Gig.findById;
const origFindByIdAndDelete = Gig.findByIdAndDelete;

// ── Chain builder for populate().sort().limit() ──────────
function makeChain(result) {
    return {
        populate() { return this; },
        sort() { return this; },
        limit() { return this; },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
        catch(fn) { return Promise.resolve(result).catch(fn); }
    };
}

// ── Tests ────────────────────────────────────────────────

describe('gigController – createGig()', () => {
    afterEach(() => {
        Gig.create = origCreate;
        Gig.findById = origFindById;
    });

    it('should return 201 with formatted gig data', async () => {
        Gig.create = async () => ({ _id: VALID_ID });
        Gig.findById = () => makeChain(sampleGig);

        const req = {
            body: { title: 'Web Dev', description: 'Full stack development service', category: 'Dev', price: 5000 },
            user: { id: 'f1', role: 'Freelancer' }
        };
        const res = mockRes();
        await createGig(req, res, () => {});

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.title, 'Web Development');
        assert.equal(res.body.data.freelancer.name, 'Alice Dev');
    });

    it('should call next(error) on database failure', async () => {
        Gig.create = async () => { throw new Error('Write failed'); };

        const req = {
            body: { title: 'X' },
            user: { id: 'f1' }
        };
        const res = mockRes();
        let nextErr = null;
        await createGig(req, res, (err) => { nextErr = err; });

        assert.ok(nextErr);
        assert.match(nextErr.message, /Write failed/);
    });
});

describe('gigController – getGigs()', () => {
    afterEach(() => {
        Gig.find = origFind;
    });

    it('should return 200 with an array of gigs', async () => {
        Gig.find = () => makeChain([sampleGig, sampleGig]);

        const req = {};
        const res = mockRes();
        await getGigs(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.count, 2);
        assert.ok(Array.isArray(res.body.data));
    });

    it('should return empty array when no gigs exist', async () => {
        Gig.find = () => makeChain([]);

        const req = {};
        const res = mockRes();
        await getGigs(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.count, 0);
    });
});

describe('gigController – getGigById()', () => {
    afterEach(() => {
        Gig.findById = origFindById;
    });

    it('should return 400 for invalid ObjectId', async () => {
        const req = { params: { id: INVALID_ID } };
        const res = mockRes();
        await getGigById(req, res, () => {});

        assert.equal(res.statusCode, 400);
        assert.equal(res.body.success, false);
    });

    it('should return 404 when gig does not exist', async () => {
        Gig.findById = () => makeChain(null);

        const req = { params: { id: VALID_ID } };
        const res = mockRes();
        await getGigById(req, res, () => {});

        assert.equal(res.statusCode, 404);
        assert.equal(res.body.success, false);
    });

    it('should return 200 with gig data when found', async () => {
        Gig.findById = () => makeChain(sampleGig);

        const req = { params: { id: VALID_ID } };
        const res = mockRes();
        await getGigById(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body.data.title, 'Web Development');
    });
});

describe('gigController – updateGig()', () => {
    afterEach(() => {
        Gig.findById = origFindById;
    });

    it('should return 400 for invalid ObjectId', async () => {
        const req = { params: { id: INVALID_ID }, user: { id: 'f1', role: 'Freelancer' } };
        const res = mockRes();
        await updateGig(req, res, () => {});

        assert.equal(res.statusCode, 400);
    });

    it('should return 404 when gig to update is not found', async () => {
        Gig.findById = () => makeChain(null);

        const req = {
            params: { id: VALID_ID },
            body: { title: 'Updated' },
            user: { id: 'f1', role: 'Freelancer' }
        };
        const res = mockRes();
        await updateGig(req, res, () => {});

        assert.equal(res.statusCode, 404);
    });

    it('should return 403 when user does not own the gig', async () => {
        // First findById (ownership check) returns a gig owned by someone else
        const gigDoc = {
            _id: VALID_ID,
            freelancerId: 'other-freelancer',
            save: async () => {}
        };
        let callCount = 0;
        Gig.findById = () => {
            callCount++;
            return makeChain(callCount === 1 ? gigDoc : sampleGig);
        };

        const req = {
            params: { id: VALID_ID },
            body: { title: 'Stolen' },
            user: { id: 'attacker', role: 'Freelancer' }
        };
        const res = mockRes();
        await updateGig(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.equal(res.body.success, false);
    });

    it('should return 200 when owner updates their gig', async () => {
        const gigDoc = {
            _id: VALID_ID,
            freelancerId: 'f1',
            title: 'Old Title',
            save: async () => {}
        };
        let callCount = 0;
        Gig.findById = () => {
            callCount++;
            if (callCount === 1) return makeChain(gigDoc);
            return makeChain(sampleGig); // populated version
        };

        const req = {
            params: { id: VALID_ID },
            body: { title: 'New Title' },
            user: { id: 'f1', role: 'Freelancer' }
        };
        const res = mockRes();
        await updateGig(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
    });

    it('should allow Admin to update any gig', async () => {
        const gigDoc = {
            _id: VALID_ID,
            freelancerId: 'someone-else',
            save: async () => {}
        };
        let callCount = 0;
        Gig.findById = () => {
            callCount++;
            if (callCount === 1) return makeChain(gigDoc);
            return makeChain(sampleGig);
        };

        const req = {
            params: { id: VALID_ID },
            body: { title: 'Admin Override' },
            user: { id: 'admin1', role: 'Admin' }
        };
        const res = mockRes();
        await updateGig(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
    });
});

describe('gigController – deleteGig()', () => {
    afterEach(() => {
        Gig.findById = origFindById;
        Gig.findByIdAndDelete = origFindByIdAndDelete;
    });

    it('should return 400 for invalid ObjectId', async () => {
        const req = { params: { id: INVALID_ID }, user: { id: 'f1', role: 'Freelancer' } };
        const res = mockRes();
        await deleteGig(req, res, () => {});

        assert.equal(res.statusCode, 400);
    });

    it('should return 404 when gig to delete is not found', async () => {
        Gig.findById = () => makeChain(null);

        const req = { params: { id: VALID_ID }, user: { id: 'f1', role: 'Freelancer' } };
        const res = mockRes();
        await deleteGig(req, res, () => {});

        assert.equal(res.statusCode, 404);
    });

    it('should return 403 when non-owner tries to delete', async () => {
        Gig.findById = () => makeChain({ _id: VALID_ID, freelancerId: 'real-owner' });

        const req = { params: { id: VALID_ID }, user: { id: 'attacker', role: 'Freelancer' } };
        const res = mockRes();
        await deleteGig(req, res, () => {});

        assert.equal(res.statusCode, 403);
    });

    it('should return 200 when owner deletes their gig', async () => {
        Gig.findById = () => makeChain({ _id: VALID_ID, freelancerId: 'f1' });
        Gig.findByIdAndDelete = async () => ({});

        const req = { params: { id: VALID_ID }, user: { id: 'f1', role: 'Freelancer' } };
        const res = mockRes();
        await deleteGig(req, res, () => {});

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.success, true);
        assert.match(res.body.message, /deleted/i);
    });
});
