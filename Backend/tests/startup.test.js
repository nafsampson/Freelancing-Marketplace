const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { startServer } = require('../startup');

test('server does not listen until its database connection succeeds', async () => {
    let resolveConnection;
    let listened = false;
    const server = new EventEmitter();
    server.listen = (port, host, ready) => {
        assert.equal(port, 4000);
        assert.equal(host, '127.0.0.1');
        listened = true;
        ready();
    };
    const started = startServer({ server, port: 4000, host: '127.0.0.1',
        connect: () => new Promise(resolve => { resolveConnection = resolve; }) });
    assert.equal(listened, false);
    resolveConnection();
    assert.equal(await started, server);
    assert.equal(listened, true);
});

test('database failure prevents the HTTP server from listening', async () => {
    let listened = false;
    const server = new EventEmitter();
    server.listen = () => { listened = true; };
    await assert.rejects(startServer({ server, connect: async () => { throw Error('Database unavailable'); } }), /Database unavailable/);
    assert.equal(listened, false);
});

test('port bind failures propagate to startup error handling', async () => {
    const server = new EventEmitter();
    server.listen = () => server.emit('error', Error('Port already in use'));
    await assert.rejects(startServer({ server, connect: async () => {} }), /Port already in use/);
});
