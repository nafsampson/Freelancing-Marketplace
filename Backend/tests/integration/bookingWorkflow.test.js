const { describe, test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

// Deliberately do not read .env or MONGODB_URI. Only an explicitly supplied
// loopback server with no database path can be used by this destructive suite.
const uri = process.env.BOOKING_TEST_MONGODB_URI;
if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+\/(\?[^#\s]*)?$/.test(uri)) {
    throw new Error('Set BOOKING_TEST_MONGODB_URI to a local replica set URI without a database name, e.g. mongodb://127.0.0.1:27018/?replicaSet=rs0');
}

process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const Transaction = require('../../models/Transaction');
const Gig = require('../../models/Gig');
const controller = require('../../Controllers/bookingController');
const { getIncome } = require('../../Controllers/transactionController');

const databaseName = `hustlehub_booking_test_${randomUUID().replaceAll('-', '')}`;
const quietLog = { info() {}, warn() {}, error() {} };
let connected = false;

async function invoke(action, { userId, body = {}, bookingId } = {}) {
    const req = { user: { id: String(userId) }, body, params: { id: String(bookingId) }, log: quietLog };
    const res = {
        statusCode: null, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    let forwardedError;
    await controller[action](req, res, error => { forwardedError = error; });
    if (forwardedError) throw forwardedError;
    return res;
}

describe('Booking workflow against a real local replica set', { concurrency: false }, () => {
    let gig, freelancerId, clientId;

    before(async () => {
        await mongoose.connect(uri, { dbName: databaseName, serverSelectionTimeoutMS: 5000, maxPoolSize: 5 });
        connected = true;
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        assert.ok(hello.setName, 'A local replica set is required; standalone MongoDB cannot run these transactions.');
        assert.equal(mongoose.connection.name, databaseName);
        // Collections must exist before testing multi-document transactions.
        for (const model of [Gig, Booking, Transaction]) await model.createCollection();
    });

    after(async () => {
        try {
            if (connected && mongoose.connection.name === databaseName) {
                await mongoose.connection.dropDatabase();
            }
        } finally {
            await mongoose.disconnect();
        }
    });

    beforeEach(async () => {
        for (const model of [Booking, Transaction, Gig]) await model.deleteMany({});
        freelancerId = new mongoose.Types.ObjectId();
        clientId = new mongoose.Types.ObjectId();
        gig = await Gig.create({
            title: 'Portfolio website development',
            description: 'Build a responsive portfolio website for a graduate developer.',
            category: 'Development', price: 1250, freelancerId
        });
    });

    async function createBooking() {
        const response = await invoke('createBooking', {
            userId: clientId,
            body: { gigId: String(gig._id), amount: 1, freelancerId: String(clientId) }
        });
        assert.equal(response.statusCode, 201);
        return response.body.data.booking;
    }

    async function assertPair(bookingId, bookingStatus, transactionStatus) {
        const booking = await Booking.findById(bookingId).lean();
        const transactions = await Transaction.find({ bookingId }).lean();
        assert.equal(transactions.length, 1);
        assert.equal(booking.status, bookingStatus);
        assert.equal(transactions[0].status, transactionStatus);
        if (transactionStatus === 'Completed') assert.ok(transactions[0].completedAt instanceof Date);
    }

    test('creation persists one linked pair with the server price and identities', async () => {
        const booking = await createBooking();
        assert.equal(await Booking.countDocuments(), 1);
        assert.equal(await Transaction.countDocuments(), 1);
        const transaction = await Transaction.findOne({ bookingId: booking._id }).lean();
        assert.equal(booking.amount, gig.price);
        assert.equal(transaction.amount, gig.price);
        assert.equal(String(transaction.clientId), String(clientId));
        assert.equal(String(transaction.freelancerId), String(freelancerId));
        await assertPair(booking._id, 'Pending', 'Pending');
    });

    test('failure of the second creation write rolls back the first write', async t => {
        const original = Transaction.create;
        t.after(() => { Transaction.create = original; });
        Transaction.create = async () => { throw new Error('Forced financial record failure'); };
        await assert.rejects(createBooking, /Forced financial record failure/);
        assert.equal(await Booking.countDocuments(), 0);
        assert.equal(await Transaction.countDocuments(), 0);
    });

    test('accept then complete keeps both persisted statuses consistent', async () => {
        const booking = await createBooking();
        for (const [action, bookingStatus, transactionStatus] of [
            ['acceptBooking', 'Accepted', 'Pending'],
            ['completeBooking', 'Completed', 'Completed']
        ]) {
            const res = await invoke(action, { userId: freelancerId, bookingId: booking._id });
            assert.equal(res.statusCode, 200);
            await assertPair(booking._id, bookingStatus, transactionStatus);
        }
        const repeated = await invoke('completeBooking', { userId: freelancerId, bookingId: booking._id });
        assert.equal(repeated.statusCode, 409);
        await assertPair(booking._id, 'Completed', 'Completed');
    });

    test('reject cancels both records', async () => {
        const booking = await createBooking();
        const res = await invoke('rejectBooking', { userId: freelancerId, bookingId: booking._id });
        assert.equal(res.statusCode, 200);
        await assertPair(booking._id, 'Cancelled', 'Cancelled');
    });

    test('failure of the second status save rolls back the booking status', async t => {
        const booking = await createBooking();
        const original = Transaction.prototype.save;
        t.after(() => { Transaction.prototype.save = original; });
        Transaction.prototype.save = async () => { throw new Error('Forced status save failure'); };
        await assert.rejects(
            invoke('acceptBooking', { userId: freelancerId, bookingId: booking._id }),
            /Forced status save failure/
        );
        await assertPair(booking._id, 'Pending', 'Pending');
    });

    test('competing accept and reject yield one winner and one conflict', async () => {
        const booking = await createBooking();
        // Parallel requests use separate transactions. Operations WITHIN each
        // transaction remain sequential, as required by the driver.
        const responses = await Promise.all([
            invoke('acceptBooking', { userId: freelancerId, bookingId: booking._id }),
            invoke('rejectBooking', { userId: freelancerId, bookingId: booking._id })
        ]);
        assert.deepEqual(responses.map(res => res.statusCode).sort(), [200, 409]);
        const saved = await Booking.findById(booking._id).lean();
        assert.ok(['Accepted', 'Cancelled'].includes(saved.status));
        await assertPair(booking._id, saved.status, saved.status === 'Accepted' ? 'Pending' : 'Cancelled');
    });

    test('an unrelated freelancer cannot change another freelancer booking', async () => {
        const booking = await createBooking();
        const res = await invoke('acceptBooking', { userId: new mongoose.Types.ObjectId(), bookingId: booking._id });
        assert.equal(res.statusCode, 404);
        await assertPair(booking._id, 'Pending', 'Pending');
    });

    test('missing financial record blocks the booking update', async () => {
        const booking = await createBooking();
        await Transaction.deleteOne({ bookingId: booking._id });
        const res = await invoke('acceptBooking', { userId: freelancerId, bookingId: booking._id });
        assert.equal(res.statusCode, 409);
        assert.equal((await Booking.findById(booking._id)).status, 'Pending');
    });

    async function income() {
        let error;
        const res = { status() { return this; }, json(body) { this.body = body; } };
        await getIncome({ user: { id: String(freelancerId) }, log: quietLog }, res, value => { error = value; });
        if (error) throw error;
        return res.body.data;
    }

    test('income includes the start boundary and excludes the end boundary using completion dates', async () => {
        const booking = await createBooking();
        await Transaction.updateOne({ bookingId: booking._id }, { $set: {
            status: 'Completed', completedAt: new Date('2027-03-01T00:00:00+02:00')
        } });
        assert.equal((await income()).transactionCount, 0);
        await Transaction.updateOne({ bookingId: booking._id }, { $set: {
            completedAt: new Date('2026-03-01T00:00:00+02:00')
        } });
        const result = await income();
        assert.equal(result.transactionCount, 1);
        assert.equal(result.totalIncome, 1250);
    });

    test('undated completed records are flagged instead of assigned guessed completion dates', async () => {
        const booking = await createBooking();
        await Transaction.updateOne({ bookingId: booking._id }, { $set: { status: 'Completed', completedAt: null } });
        const result = await income();
        assert.equal(result.transactionCount, 0);
        assert.equal(result.missingCompletionDateCount, 1);
    });
});
