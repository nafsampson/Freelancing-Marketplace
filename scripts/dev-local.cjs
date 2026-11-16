// Local development only. No cloud account, API key, Docker or downloads.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const backendRequire = createRequire(path.join(root, 'Backend/package.json'));
    const { MongoClient } = backendRequire('mongoose').mongo;
    const vite = path.join(root, 'frontend/node_modules/vite/bin/vite.js');
    if (!fs.existsSync(vite)) throw Error('Install frontend dependencies first: cd frontend && npm ci');
    const directory = path.join(root, '.local');
    fs.mkdirSync(directory, { recursive: true });
    const secretPath = path.join(directory, 'jwt-secret');
    if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, crypto.randomBytes(32).toString('hex'), { flag: 'wx' });
    const secret = fs.readFileSync(secretPath, 'utf8').trim();
    if (secret.length < 32) throw Error('The local JWT secret is invalid; inspect .local/jwt-secret.');

    let mongo, client;
    const children = [];
    let closing = false;
    const close = async () => {
        if (closing) return;
        closing = true;
        for (const child of children) if (child.exitCode === null) child.kill();
        if (mongo && client) {
            try { await client.db('admin').command({ shutdown: 1 }); }
            catch { /* Shutdown closes the connection. */ }
        }
        if (client) await client.close();
        if (mongo && mongo.exitCode === null) {
            await wait(1500);
            if (mongo.exitCode === null) mongo.kill();
        }
    };
    process.once('SIGINT', () => { close().catch(console.error); });
    process.once('SIGTERM', () => { close().catch(console.error); });

    async function connect() {
        const candidate = new MongoClient('mongodb://127.0.0.1:27018/?directConnection=true', {
            serverSelectionTimeoutMS: 1500, connectTimeoutMS: 1500, maxPoolSize: 2
        });
        try { await candidate.connect(); return candidate; }
        catch (error) { await candidate.close(); throw error; }
    }
    try {
        try { client = await connect(); }
        catch {
            const executable = process.env.MONGOD_PATH || (process.platform === 'win32'
                ? 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe' : 'mongod');
            const dbPath = path.join(directory, 'mongodb');
            fs.mkdirSync(dbPath, { recursive: true });
            const log = fs.openSync(path.join(directory, 'mongod.log'), 'a');
            mongo = spawn(executable, ['--dbpath', dbPath, '--bind_ip', '127.0.0.1',
                '--port', '27018', '--replSet', 'rs0', '--wiredTigerCacheSizeGB', '0.25',
                '--setParameter', 'diagnosticDataCollectionEnabled=false'], {
                windowsHide: true, stdio: ['ignore', log, log]
            });
            fs.closeSync(log);
            let failure;
            mongo.on('error', error => { failure = error; });
            for (let attempt = 0; attempt < 10; attempt++) {
                if (closing) return;
                if (failure) throw Error('Cannot start mongod. Set MONGOD_PATH to your existing MongoDB executable.');
                if (mongo.exitCode !== null) throw Error('MongoDB could not start. Check .local/mongod.log and port 27018.');
                try { client = await connect(); break; } catch { await wait(250); }
            }
            if (!client) throw Error('Local MongoDB did not become available. Check .local/mongod.log.');
        }
        let hello = await client.db('admin').command({ hello: 1 });
        if (!hello.setName) {
            if (!mongo) throw Error('An existing uninitialized server uses port 27018. Initialize it yourself or stop it first.');
            await client.db('admin').command({ replSetInitiate: {
                _id: 'rs0', members: [{ _id: 0, host: 'localhost:27018' }]
            } });
        } else if (hello.setName !== 'rs0') {
            throw Error('Port 27018 belongs to a different replica set. No configuration was changed.');
        }
        for (let attempt = 0; attempt < 80; attempt++) {
            if (closing) return;
            hello = await client.db('admin').command({ hello: 1 });
            if (hello.isWritablePrimary) break;
            await wait(250);
        }
        if (!hello.isWritablePrimary) throw Error('Replica set did not become ready within 20 seconds.');
        const env = { ...process.env,
            MONGODB_URI: 'mongodb://127.0.0.1:27018/hustlehub_demo?replicaSet=rs0',
            JWT_SECRET: secret, HOST: '127.0.0.1', PORT: '4000', USE_HTTPS: 'false',
            CLIENT_ORIGIN: 'http://localhost:5173', NODE_ENV: 'development',
            VITE_API_URL: '/api', VITE_PROXY_TARGET: 'http://127.0.0.1:4000',
            LOGTAIL_SOURCE_TOKEN: '', LOGTAIL_INGEST_HOST: ''
        };
        function launch(file, cwd, args = []) {
            const child = spawn(process.execPath, [file, ...args], { cwd, env, windowsHide: true, stdio: 'inherit' });
            children.push(child);
            child.on('error', error => { console.error(error.message); process.exitCode = 1; close().catch(console.error); });
            child.on('exit', code => {
                if (!closing) { process.exitCode = code || 1; close().catch(console.error); }
            });
        }
        launch('index.js', path.join(root, 'Backend'));
        launch(vite, path.join(root, 'frontend'), ['--host', 'localhost', '--port', '5173', '--strictPort']);
        console.log('MongoDB is ready. Starting backend and frontend; watch their readiness messages.');
        console.log('Open http://localhost:5173. Keep this terminal open; Ctrl+C stops processes started here.');
        console.log(mongo ? 'Demo data persists in .local/mongodb.' : 'Reusing your existing local rs0 server; that server will be left running.');
    } catch (error) {
        await close();
        throw error;
    }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
