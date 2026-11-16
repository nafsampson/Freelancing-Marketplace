const fs = require('fs');
const https = require('https');
const path = require('path');
const crypto = require('crypto');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_TO_FILE = process.env.LOG_TO_FILE !== 'false' && process.env.NODE_ENV !== 'test';
const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL] !== undefined ? process.env.LOG_LEVEL : 'info';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');

// any keys that contain these fragments will be replaced with redacted 
const SENSITIVE_KEYS = [
    'password', 'passwordhash', 'token', 'jwt', 'authorization', 'cookie',
    'secret', 'apikey', 'api_key', 'cardnumber', 'cvv', 'iban', 'accountnumber', 'email'
];

const isSensitiveKey = (key) => SENSITIVE_KEYS.some((s) => String(key).toLowerCase().includes(s));
const redact = (value, depth = 0) => {
    if (value === null || value === undefined) return value;
    if (depth > 5) return '[TRUNCATED]';
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = isSensitiveKey(k) ? '[REDACTED]' : redact(v, depth + 1);
        }
        return out;
    }
    return value;
};

// emails is data that is personal so logs will only carry a short one way hash for the correlating repeated attempts
const hashIdentifier = (value) =>
    crypto.createHash('sha256').update(String(value).toLowerCase().trim()).digest('hex').slice(0, 12);


// code is here to strip anyting that looks like a bearer token or jwt out of free text message
const scrubText = (text) =>
    String(text || '')
        .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, '[REDACTED_JWT]')
        .replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, 'mongodb://[REDACTED]');

let fileStream = null;
const getFileStream = () => {
    if (!LOG_TO_FILE) return null;
    if (!fileStream) {
        try {
            fs.mkdirSync(LOG_DIR, { recursive: true });
            fileStream = fs.createWriteStream(path.join(LOG_DIR, 'app.log'), { flags: 'a' });
            fileStream.on('error', () => { fileStream = null; });
        } catch (_e) { fileStream = null; }
    }
    return fileStream;
};

//code for the cloud shipping 
const CLOUD_TOKEN = process.env.LOGTAIL_SOURCE_TOKEN;
const CLOUD_HOST = process.env.LOGTAIL_INGEST_HOST; 
const CLOUD_ENABLED = Boolean(CLOUD_TOKEN && CLOUD_HOST) && process.env.NODE_ENV !== 'test';
let buffer = [];
let flushTimer = null;
const flushToCloud = () => {
    flushTimer = null;
    if (!buffer.length) return;
    const batch = buffer;
    buffer = [];
    const body = JSON.stringify(batch);
    const req = https.request({
        host: CLOUD_HOST, method: 'POST', path: '/',
        headers: {
            Authorization: `Bearer ${CLOUD_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        },
        timeout: 5000
    }, (res) => res.resume());

    // code for the logging it musnt never crash or block the app
    req.on('error', () => {});
    req.on('timeout', () => req.destroy());
    req.end(body);
};

const shipToCloud = (entry) => {
    if (!CLOUD_ENABLED) return;
    buffer.push({ dt: entry.timestamp, ...entry });
    if (buffer.length >= 20) return flushToCloud();
    if (!flushTimer) { flushTimer = setTimeout(flushToCloud, 2000); flushTimer.unref(); }
};

const write = (level, event, context = {}, baseContext = {}) => {
    if (LEVELS[level] > LEVELS[LOG_LEVEL]) return;
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        service: process.env.APP_NAME || 'HustleHub',
        event,
        ...redact({ ...baseContext, ...context })
    };
    if (entry.message) entry.message = scrubText(entry.message);
    const line = JSON.stringify(entry);
    (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
    const fs_ = getFileStream();
    if (fs_) fs_.write(line + '\n');
    shipToCloud(entry);
};

const makeLogger = (baseContext = {}) => ({
    error: (event, ctx) => write('error', event, ctx, baseContext),
    warn: (event, ctx) => write('warn', event, ctx, baseContext),
    info: (event, ctx) => write('info', event, ctx, baseContext),
    debug: (event, ctx) => write('debug', event, ctx, baseContext),
    child: (extra) => makeLogger({ ...baseContext, ...extra })
});

module.exports = makeLogger();
module.exports.redact = redact;
module.exports.scrubText = scrubText;
module.exports.hashIdentifier = hashIdentifier;
module.exports.flushToCloud = flushToCloud;




