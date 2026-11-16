const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Load the real controller with isolated database boundaries. No server, credentials,
// npm dependencies or database are needed. These are controller unit tests, not
// proof of MongoDB rollback, driver retries or concurrent-write behaviour.
const source = fs.readFileSync(path.join(__dirname, '../Controllers/bookingController.js'), 'utf8');

function fixture(options = {}) {
    const calls = [];
    const session = {};
    const gig = { _id: 'gig-1', freelancerId: 'freelancer-1', price: 1250 };
    const booking = {
        _id: 'booking-1', gigId: gig._id, clientId: 'client-1',
        freelancerId: gig.freelancerId, amount: gig.price,
        status: options.bookingStatus ?? 'Pending',
        async save(config) {
            assert.equal(config.session, session);
            calls.push('save-booking');
            if (options.bookingSaveError) throw options.bookingSaveError;
        }
    };
    const transaction = {
        _id: 'transaction-1', bookingId: booking._id,
        status: options.transactionStatus ?? 'Pending',
        async save(config) {
            assert.equal(config.session, session);
            calls.push('save-transaction');
            if (options.transactionSaveError) throw options.transactionSaveError;
        }
    };
    function query(value, event) {
        return { async session(actual) {
            assert.equal(actual, session);
            calls.push(event);
            return value;
        } };
    }
    const dependencies = {
        mongoose: { connection: { async transaction(callback) {
            calls.push('begin');
            if (options.sessionError) throw options.sessionError;
            try {
                const result = await callback(session);
                if (options.commitError) throw options.commitError;
                calls.push('commit');
                return result;
            } catch (error) {
                calls.push('reject');
                throw error;
            }
        } } },
        '../models/Gig': { findById(id) {
            assert.equal(id, gig._id);
            return query(options.missingGig ? null : gig, 'read-gig');
        } },
        '../models/Booking': {
            async create(items, config) {
                assert.equal(config.session, session);
                assert.equal(items.length, 1);
                assert.equal(items[0].amount, gig.price);
                assert.equal(items[0].freelancerId, gig.freelancerId);
                assert.equal(items[0].clientId, 'client-1');
                calls.push('create-booking');
                if (options.bookingCreateError) throw options.bookingCreateError;
                return [booking];
            },
            findOne(filter) {
                assert.equal(filter._id, booking._id);
                assert.equal(filter.freelancerId, 'freelancer-1');
                return query(options.missingBooking ? null : booking, 'read-booking');
            }
        },
        '../models/Transaction': {
            async create(items, config) {
                assert.equal(config.session, session);
                assert.equal(items.length, 1);
                assert.equal(items[0].bookingId, booking._id);
                assert.equal(items[0].clientId, booking.clientId);
                assert.equal(items[0].freelancerId, booking.freelancerId);
                assert.equal(items[0].amount, booking.amount);
                calls.push('create-transaction');
                if (options.transactionCreateError) throw options.transactionCreateError;
                return [transaction];
            },
            findOne(filter) {
                assert.equal(filter.bookingId, booking._id);
                assert.equal(filter.freelancerId, 'freelancer-1');
                return query(options.missingTransaction ? null : transaction, 'read-transaction');
            }
        },
        '../utils/logger': { info(event) { calls.push(event); } }
    };
    const sandbox = {
        module: { exports: {} },
        require(name) {
            assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
            return dependencies[name];
        }
    };
    vm.runInNewContext(source, sandbox, { filename: 'bookingController.js' });
    const res = {
        statusCode: null, body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { calls.push('response'); this.body = body; return this; }
    };
    let forwarded;
    async function invoke(action = 'createBooking') {
        const req = {
            body: { gigId: gig._id, amount: 1, freelancerId: 'attacker', clientId: 'attacker' },
            params: { id: booking._id },
            user: { id: action === 'createBooking' ? 'client-1' : 'freelancer-1' }
        };
        await sandbox.module.exports[action](req, res, (error) => { forwarded = error; });
        return { error: forwarded };
    }
    return { calls, booking, transaction, res, invoke };
}

test('creation uses one session, server-owned price/identities, and responds only after commit', async () => {
    const f = fixture();
    assert.equal((await f.invoke()).error, undefined);
    assert.equal(f.res.statusCode, 201);
    assert.equal(f.res.body.data.booking, f.booking);
    assert.equal(f.res.body.data.transaction, f.transaction);
    assert.deepEqual(f.calls, [
        'begin', 'read-gig', 'create-booking', 'create-transaction',
        'commit', 'booking_created', 'transaction_created', 'response'
    ]);
});

test('missing gig returns 404 without writes or success logs', async () => {
    const f = fixture({ missingGig: true });
    await f.invoke();
    assert.equal(f.res.statusCode, 404);
    assert.deepEqual(f.calls, ['begin', 'read-gig', 'reject', 'response']);
});

for (const failure of ['bookingCreateError', 'transactionCreateError', 'commitError', 'sessionError']) {
    test(`creation forwards ${failure} without reporting success`, async () => {
        const error = new Error(failure);
        const f = fixture({ [failure]: error });
        assert.equal((await f.invoke()).error, error);
        assert.equal(f.res.statusCode, null);
        assert.ok(!f.calls.includes('booking_created'));
        assert.ok(!f.calls.includes('transaction_created'));
        assert.ok(!f.calls.includes('commit'));
    });
}

for (const name of ['ValidationError', 'CastError']) {
    test(`creation maps ${name} to 400`, async () => {
        const error = new Error('Invalid data');
        error.name = name;
        const f = fixture({ bookingCreateError: error });
        await f.invoke();
        assert.equal(f.res.statusCode, 400);
        assert.equal(f.res.body.error, 'Invalid booking data');
    });
}

const transitions = [
    ['acceptBooking', 'Pending', 'Accepted', 'Pending'],
    ['rejectBooking', 'Pending', 'Cancelled', 'Cancelled'],
    ['completeBooking', 'Accepted', 'Completed', 'Completed']
];

for (const [action, before, after, transactionAfter] of transitions) {
    test(`${action} saves both records with the same session before responding`, async () => {
        const f = fixture({ bookingStatus: before });
        assert.equal((await f.invoke(action)).error, undefined);
        assert.equal(f.res.statusCode, 200);
        assert.equal(f.booking.status, after);
        assert.equal(f.transaction.status, transactionAfter);
        if (transactionAfter === 'Completed') {
            assert.ok(Number.isFinite(new Date(f.transaction.completedAt).getTime()));
        } else {
            assert.equal(f.transaction.completedAt, undefined);
        }
        assert.deepEqual(f.calls, [
            'begin', 'read-booking', 'read-transaction', 'save-booking',
            'save-transaction', 'commit', 'response'
        ]);
    });

    for (const invalid of ['Pending', 'Accepted', 'Completed', 'Cancelled'].filter(s => s !== before)) {
        test(`${action} rejects ${invalid} with 409 before writing`, async () => {
            const f = fixture({ bookingStatus: invalid });
            await f.invoke(action);
            assert.equal(f.res.statusCode, 409);
            assert.ok(!f.calls.includes('save-booking'));
            assert.ok(!f.calls.includes('save-transaction'));
        });
    }
}

test('booking lookup is scoped to the freelancer; missing or unowned booking returns 404', async () => {
    const f = fixture({ missingBooking: true });
    await f.invoke('acceptBooking');
    assert.equal(f.res.statusCode, 404);
    assert.ok(!f.calls.includes('read-transaction'));
    assert.ok(!f.calls.includes('save-booking'));
});

test('missing transaction blocks the booking update with 409', async () => {
    const f = fixture({ missingTransaction: true });
    await f.invoke('acceptBooking');
    assert.equal(f.res.statusCode, 409);
    assert.equal(f.booking.status, 'Pending');
    assert.ok(!f.calls.includes('save-booking'));
});

for (const status of ['Completed', 'Cancelled']) {
    test(`a ${status} transaction blocks the booking update`, async () => {
        const f = fixture({ transactionStatus: status });
        await f.invoke('acceptBooking');
        assert.equal(f.res.statusCode, 409);
        assert.ok(!f.calls.includes('save-booking'));
    });
}

for (const failure of ['bookingSaveError', 'transactionSaveError', 'commitError', 'sessionError']) {
    test(`status update forwards ${failure} without a successful response`, async () => {
        const error = new Error(failure);
        const f = fixture({ [failure]: error });
        assert.equal((await f.invoke('acceptBooking')).error, error);
        assert.equal(f.res.statusCode, null);
        assert.ok(!f.calls.includes('commit'));
    });
}
