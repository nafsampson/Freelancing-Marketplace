require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const mongoose = require('mongoose');
const createApp = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { startServer } = require('./startup');

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. See Backend/.env.example.');
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters. Use the local demo launcher or generate a random secret.');
    }
    const secure = process.env.USE_HTTPS === 'true';
    const port = Number(process.env.PORT || 4000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
    const app = createApp();
    const server = secure ? https.createServer({
        key: fs.readFileSync(process.env.SSL_KEY_PATH || path.join(__dirname, 'certs/localhost-key.pem')),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH || path.join(__dirname, 'certs/localhost-cert.pem'))
    }, app) : http.createServer(app);
    await startServer({ server, connect: connectDB, port, host: process.env.HOST || '0.0.0.0' });
    logger.info('server_started', { protocol: secure ? 'HTTPS' : 'HTTP', port });
    let stopping = false;
    const stop = () => {
        if (stopping) return;
        stopping = true;
        const timer = setTimeout(() => process.exit(1), 10000);
        timer.unref();
        server.close(async () => {
            await mongoose.disconnect();
            clearTimeout(timer);
        });
        server.closeIdleConnections();
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return server;
}
if (require.main === module) {
    main().catch(async error => {
        logger.error('startup_failed', { message: error.message });
        await mongoose.disconnect();
        process.exitCode = 1;
    });
}
module.exports = { main };
